/**
 * Ingest hattı: ham feed -> normalize -> kohort -> fiyat geçmişi -> skor.
 *
 * Her tur idempotent. Aynı ilan tekrar geldiğinde `lastSeenAt` güncelleniyor,
 * fiyat değiştiyse `price_events`'e satır düşüyor, feed'den kaybolduğunda
 * `removedAt` damgalanıyor — satış süresi ve devir hızı buradan üretiliyor.
 */

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { listings, marketStats, priceEvents, sources, vehicles } from "@/db/schema";
import { normalizeVehicle } from "@/domain/normalize";
import {
  computeCohortStats,
  damageAdjustment,
  scoreListing,
  MIN_SAMPLE_SIZE,
  type CohortBaseline,
  type CohortStats,
  type PricePoint,
} from "@/domain/pricing";
import type { Segment } from "@/domain/taxonomy";
import type { FeedAdapter, RawListing } from "./types";

export interface IngestReport {
  source: string;
  fetched: number;
  inserted: number;
  updated: number;
  priceChanges: number;
  removed: number;
  unmatched: number;
}

export async function upsertSource(adapter: {
  code: string;
  name: string;
  kind: string;
  url?: string;
  city?: string;
}): Promise<number> {
  const [row] = await db
    .insert(sources)
    .values({
      code: adapter.code,
      name: adapter.name,
      kind: adapter.kind,
      url: adapter.url ?? null,
      city: adapter.city ?? null,
    })
    .onConflictDoUpdate({
      target: sources.code,
      set: { name: adapter.name, kind: adapter.kind, url: adapter.url ?? null },
    })
    .returning({ id: sources.id });
  return row.id;
}

/** Kanonik aracı bulur ya da yaratır. Sıcak yolda olduğu için süreç içi önbellekli. */
const vehicleCache = new Map<string, number>();

async function resolveVehicleId(raw: RawListing): Promise<{
  vehicleId: number | null;
  confidence: number;
}> {
  const norm = normalizeVehicle({
    title: raw.title,
    make: raw.make,
    model: raw.model,
    trim: raw.trim,
    year: raw.year,
    fuel: raw.fuel,
    transmission: raw.transmission,
    body: raw.body,
    engine: raw.engine,
    description: raw.description,
  });
  if (!norm) return { vehicleId: null, confidence: 0 };

  const cached = vehicleCache.get(norm.canonicalKey);
  if (cached) return { vehicleId: cached, confidence: norm.confidence };

  const [row] = await db
    .insert(vehicles)
    .values({
      canonicalKey: norm.canonicalKey,
      make: norm.make,
      model: norm.model,
      trim: norm.trim,
      year: norm.year,
      engine: norm.engine,
      fuel: norm.fuel,
      transmission: norm.transmission,
      body: norm.body,
      segment: norm.segment,
      trimTier: norm.trimTier,
    })
    .onConflictDoUpdate({
      target: vehicles.canonicalKey,
      // Çakışmada gerçek bir güncelleme yok; `returning` id verebilsin diye no-op set.
      set: { canonicalKey: norm.canonicalKey },
    })
    .returning({ id: vehicles.id });

  vehicleCache.set(norm.canonicalKey, row.id);
  return { vehicleId: row.id, confidence: norm.confidence };
}

/**
 * Bir kaynağın ilanlarını veritabanına işler.
 * `now` dışarıdan verilebiliyor — seed betiği geçmişi gün gün simüle ediyor.
 */
export async function ingestListings(
  sourceId: number,
  sourceCode: string,
  raws: RawListing[],
  opts: { now?: Date; markMissingAsRemoved?: boolean } = {},
): Promise<IngestReport> {
  const now = opts.now ?? new Date();
  const report: IngestReport = {
    source: sourceCode,
    fetched: raws.length,
    inserted: 0,
    updated: 0,
    priceChanges: 0,
    removed: 0,
    unmatched: 0,
  };

  const existing = await db
    .select({
      id: listings.id,
      externalId: listings.externalId,
      price: listings.price,
      status: listings.status,
    })
    .from(listings)
    .where(eq(listings.sourceId, sourceId));

  const byExternalId = new Map(existing.map((e) => [e.externalId, e]));
  const seen = new Set<string>();

  for (const raw of raws) {
    seen.add(raw.externalId);
    const { vehicleId, confidence } = await resolveVehicleId(raw);
    if (!vehicleId) report.unmatched++;

    const prev = byExternalId.get(raw.externalId);

    if (!prev) {
      const [inserted] = await db
        .insert(listings)
        .values({
          sourceId,
          externalId: raw.externalId,
          vehicleId,
          title: raw.title,
          rawMake: raw.make ?? null,
          rawModel: raw.model ?? null,
          rawTrim: raw.trim ?? null,
          price: Math.round(raw.price),
          currency: raw.currency ?? "TRY",
          km: raw.km ?? null,
          year: raw.year ?? null,
          city: raw.city ?? null,
          district: raw.district ?? null,
          sellerType: raw.sellerType ?? null,
          sellerName: raw.sellerName ?? null,
          damageRecord: raw.damageRecord ?? null,
          paintedParts: raw.paintedParts ?? null,
          changedParts: raw.changedParts ?? null,
          url: raw.url ?? null,
          imageUrl: raw.imageUrl ?? null,
          matchConfidence: confidence,
          firstSeenAt: now,
          lastSeenAt: now,
          status: "active",
        })
        .returning({ id: listings.id });

      await db.insert(priceEvents).values({
        listingId: inserted.id,
        price: Math.round(raw.price),
        delta: 0,
        observedAt: now,
      });
      report.inserted++;
      continue;
    }

    const newPrice = Math.round(raw.price);
    const priceChanged = newPrice !== prev.price;

    await db
      .update(listings)
      .set({
        vehicleId,
        price: newPrice,
        km: raw.km ?? null,
        lastSeenAt: now,
        status: "active",
        removedAt: null,
        title: raw.title,
        matchConfidence: confidence,
      })
      .where(eq(listings.id, prev.id));

    if (priceChanged) {
      await db.insert(priceEvents).values({
        listingId: prev.id,
        price: newPrice,
        delta: newPrice - prev.price,
        observedAt: now,
      });
      report.priceChanges++;
    }
    report.updated++;
  }

  // Feed'de görünmeyenler satılmış/kaldırılmış sayılıyor.
  if (opts.markMissingAsRemoved !== false) {
    const missing = existing.filter((e) => e.status === "active" && !seen.has(e.externalId));
    if (missing.length) {
      await db
        .update(listings)
        .set({ status: "removed", removedAt: now })
        .where(
          inArray(
            listings.id,
            missing.map((m) => m.id),
          ),
        );
      report.removed = missing.length;
    }
  }

  await db.update(sources).set({ lastRunAt: now }).where(eq(sources.id, sourceId));
  return report;
}

export async function runAdapter(adapter: FeedAdapter): Promise<IngestReport> {
  const sourceId = await upsertSource(adapter);
  const raws = await adapter.fetch();
  return ingestListings(sourceId, adapter.code, raws);
}

// ---------------------------------------------------------------------------
// İstatistik ve skorlama
// ---------------------------------------------------------------------------

interface CohortRow {
  listingId: number;
  vehicleId: number;
  price: number;
  km: number | null;
  damageRecord: number | null;
  make: string;
  model: string;
  year: number;
  fuel: string | null;
  transmission: string | null;
  segment: string | null;
  trimTier: number | null;
}

/**
 * Dar kohorttan geniş kohorta doğru fallback anahtarları.
 *
 * En dar rung (tam kanonik araç) 2.el pazarının uzun kuyruğunda neredeyse hiç
 * dolmuyor; bu yüzden merdiven marka+modele kadar iniyor. Geniş rung'larda
 * model yılı kohortun parçası olmadığı için fiyat, `yearAdjustment` ile
 * düzeltiliyor (bkz. pricing.ts).
 */
function cohortKeys(r: CohortRow): string[] {
  return [
    `v:${r.vehicleId}`,
    `mmyft:${r.make}|${r.model}|${r.year}|${r.fuel ?? "-"}|${r.transmission ?? "-"}`,
    `mmy:${r.make}|${r.model}|${r.year}`,
    `mmft:${r.make}|${r.model}|${r.fuel ?? "-"}|${r.transmission ?? "-"}`,
    `mm:${r.make}|${r.model}`,
  ];
}

/** Kohort ne kadar genişletildiyse skorun güveni o kadar düşük */
const COHORT_CONFIDENCE: Record<string, number> = {
  v: 1,
  mmyft: 0.9,
  mmy: 0.82,
  mmft: 0.7,
  mm: 0.62,
};

/**
 * Aktif ilanlardan kohort istatistiklerini kurar ve her ilanı skorlar.
 *
 * Örneklem dar kohortta yetmezse kademeli olarak genişletiliyor
 * (paket/motor -> yakıt+vites -> yalnız marka/model/yıl). Böylece niş
 * araçlarda "veri yok" yerine düşük güvenli ama kullanılabilir bir skor çıkıyor.
 */
export async function recomputeStatsAndScores(now: Date = new Date()): Promise<{
  cohorts: number;
  scored: number;
}> {
  const rows: CohortRow[] = await db
    .select({
      listingId: listings.id,
      vehicleId: vehicles.id,
      price: listings.price,
      km: listings.km,
      damageRecord: listings.damageRecord,
      make: vehicles.make,
      model: vehicles.model,
      year: vehicles.year,
      fuel: vehicles.fuel,
      transmission: vehicles.transmission,
      segment: vehicles.segment,
      trimTier: vehicles.trimTier,
    })
    .from(listings)
    .innerJoin(vehicles, eq(listings.vehicleId, vehicles.id))
    .where(and(eq(listings.status, "active"), isNull(listings.removedAt)));

  // Kademeli kohort havuzları
  const pools = new Map<string, CohortRow[]>();
  for (const r of rows) {
    for (const key of cohortKeys(r)) {
      const pool = pools.get(key);
      if (pool) pool.push(r);
      else pools.set(key, [r]);
    }
  }

  const statsByKey = new Map<string, CohortStats>();
  const baselineByKey = new Map<string, CohortBaseline>();

  for (const [key, pool] of pools) {
    if (pool.length < MIN_SAMPLE_SIZE) continue;
    const points: PricePoint[] = pool.map((r) => ({ price: r.price, km: r.km, year: r.year }));
    const stats = computeCohortStats(points);
    if (!stats) continue;
    statsByKey.set(key, stats);

    const tierList = pool.map((r) => r.trimTier).filter((t): t is number => t != null);
    // Hasar çarpanı referansı kohort medyan fiyatı üzerinden alınıyor; ilan bazlı
    // beklenen fiyat henüz bilinmediği için bu, döngüsel bağımlılığı kıran yaklaşım.
    const damageFactors = pool.map((r) => damageAdjustment(r.damageRecord, stats.median));

    baselineByKey.set(key, {
      meanTrimTier: tierList.length ? tierList.reduce((a, b) => a + b, 0) / tierList.length : null,
      meanDamageFactor: damageFactors.reduce((a, b) => a + b, 0) / damageFactors.length,
    });
  }

  // Dar kohort için hesaplananları market_stats'a yaz (panel bunları okuyor)
  const vehicleStatRows = [...statsByKey.entries()]
    .filter(([k]) => k.startsWith("v:"))
    .map(([k, s]) => ({
      vehicleId: Number(k.slice(2)),
      sampleSize: s.sampleSize,
      p25: s.p25,
      median: s.median,
      p75: s.p75,
      medianKm: s.medianKm,
      computedAt: now,
    }));


  if (vehicleStatRows.length) {
    await db
      .insert(marketStats)
      .values(vehicleStatRows)
      .onConflictDoUpdate({
        target: marketStats.vehicleId,
        set: {
          sampleSize: sql`excluded.sample_size`,
          p25: sql`excluded.p25`,
          median: sql`excluded.median`,
          p75: sql`excluded.p75`,
          medianKm: sql`excluded.median_km`,
          computedAt: sql`excluded.computed_at`,
        },
      });
  }

  let scored = 0;
  for (const r of rows) {
    const key = cohortKeys(r).find((k) => statsByKey.has(k));
    if (!key) continue;
    const stats = statsByKey.get(key)!;

    const result = scoreListing(
      {
        price: r.price,
        km: r.km,
        year: r.year,
        trimTier: r.trimTier,
        damageRecord: r.damageRecord,
        segment: (r.segment as Segment | null) ?? null,
      },
      stats,
      baselineByKey.get(key) ?? {},
    );

    // Geniş kohorta düşüldüyse skor daha az güvenilir — bunu skorun kendisine yansıt.
    const widened = COHORT_CONFIDENCE[key.slice(0, key.indexOf(":"))] ?? 0.6;

    await db
      .update(listings)
      .set({
        dealScore: result.dealScore,
        expectedPrice: result.expectedPrice,
        scoreConfidence: Math.round(result.confidence * widened * 100) / 100,
        scoredAt: now,
      })
      .where(eq(listings.id, r.listingId));
    scored++;
  }

  return { cohorts: statsByKey.size, scored };
}
