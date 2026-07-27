/**
 * Fiyatlama ve fırsat skoru motoru.
 *
 * Galeriye satılan şey "yeni ilan bildirimi" değil, bu dosya:
 *   - bu araç piyasanın ne kadar altında/üstünde
 *   - bu kohort kaç günde dönüyor
 *   - satıcı kaç kez indirim yapmış (ne kadar sıkışmış)
 */

import type { Segment } from "./taxonomy";

export interface PricePoint {
  price: number;
  km: number | null;
  /** Kohort yıl kırılımına inemediğinde yıl düzeltmesi için gerekiyor */
  year?: number | null;
  /** normalize.ts'ten gelen eşleşme güveni; düşükse istatistiğe alınmaz */
  confidence?: number;
}

export interface CohortStats {
  sampleSize: number;
  p25: number;
  median: number;
  p75: number;
  medianKm: number | null;
  /** Kohortun medyan model yılı — yıl düzeltmesinin referansı */
  medianYear: number | null;
  /** IQR / medyan — kohort ne kadar dağınık. 0.35 üstü "güvenilmez" sayılıyor. */
  dispersion: number;
}

/** İstatistiğe girmek için asgari eşleşme güveni */
export const MIN_CONFIDENCE_FOR_STATS = 0.6;
/** Anlamlı bir medyan için asgari örneklem */
export const MIN_SAMPLE_SIZE = 5;

export function percentile(sortedAsc: number[], p: number): number {
  if (!sortedAsc.length) return 0;
  if (sortedAsc.length === 1) return sortedAsc[0];
  const idx = (sortedAsc.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo];
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (idx - lo);
}

function median(values: number[]): number {
  return percentile([...values].sort((a, b) => a - b), 0.5);
}

/**
 * Kohort istatistiği. Fiyat girişi hatalarına karşı iki aşamalı:
 * önce kaba medyan, sonra o medyanın 0.35x–2.5x bandı dışındakiler atılıyor.
 * (İlan girerken fiyatı 1 TL yazan ya da bir sıfır fazla atan çok fazla.)
 */
export function computeCohortStats(points: PricePoint[]): CohortStats | null {
  const usable = points.filter(
    (p) =>
      p.price > 0 &&
      (p.confidence == null || p.confidence >= MIN_CONFIDENCE_FOR_STATS),
  );
  if (usable.length < MIN_SAMPLE_SIZE) return null;

  const rough = median(usable.map((p) => p.price));
  const trimmed = usable.filter((p) => p.price >= rough * 0.35 && p.price <= rough * 2.5);
  if (trimmed.length < MIN_SAMPLE_SIZE) return null;

  const prices = trimmed.map((p) => p.price).sort((a, b) => a - b);
  const kms = trimmed.map((p) => p.km).filter((k): k is number => k != null && k >= 0);
  const years = trimmed.map((p) => p.year).filter((y): y is number => y != null && y > 1900);

  const p25 = Math.round(percentile(prices, 0.25));
  const med = Math.round(percentile(prices, 0.5));
  const p75 = Math.round(percentile(prices, 0.75));

  return {
    sampleSize: trimmed.length,
    p25,
    median: med,
    p75,
    medianKm: kms.length ? Math.round(median(kms)) : null,
    medianYear: years.length ? Math.round(median(years)) : null,
    dispersion: med > 0 ? Math.round(((p75 - p25) / med) * 1000) / 1000 : 0,
  };
}

/**
 * Segment başına 10.000 km fazlalığın fiyata etkisi (oran).
 * Premium segmentte km, fiyatı daha sert vuruyor; ticaride daha toleranslı.
 */
const KM_SENSITIVITY: Record<Segment, number> = {
  A: 0.009,
  B: 0.010,
  C: 0.011,
  D: 0.014,
  E: 0.017,
  "SUV-B": 0.011,
  "SUV-C": 0.013,
  "SUV-D": 0.016,
  ticari: 0.007,
};

/**
 * Kohort medyan km'sine göre beklenen fiyat çarpanı.
 * ±%25 ile sınırlanıyor — 400.000 km'lik bir aracı modelin ekstrapolasyonuna
 * bırakmak yerine skoru düşük güvenli işaretlemek daha doğru.
 */
export function kmAdjustment(
  km: number | null,
  medianKm: number | null,
  segment: Segment | null,
): number {
  if (km == null || medianKm == null || medianKm <= 0) return 1;
  const sensitivity = KM_SENSITIVITY[segment ?? "C"] ?? 0.011;
  const deltaTenK = (km - medianKm) / 10_000;
  const factor = 1 - deltaTenK * sensitivity;
  return Math.min(1.25, Math.max(0.75, factor));
}

/**
 * Segment başına yıllık değer farkı.
 * Kohort yıl kırılımına inemediğinde (ör. "Golf" havuzu 2015-2025 karışık)
 * beklenen fiyat model yılına göre buradan düzeltiliyor.
 */
const YEAR_APPRECIATION: Record<Segment, number> = {
  A: 0.095,
  B: 0.098,
  C: 0.100,
  D: 0.108,
  E: 0.115,
  "SUV-B": 0.100,
  "SUV-C": 0.106,
  "SUV-D": 0.112,
  ticari: 0.090,
};

/**
 * Model yılı düzeltmesi. Kohort medyan yılına göre üstel.
 *
 * Sınır geniş tutuluyor: en geniş kohort rung'u (marka+model) 10 yıllık bir
 * aralığı kapsayabiliyor ve %10 bileşikte bu 2.6 kata denk geliyor. Dar bir
 * kırpma, kohortun uçlarındaki araçları sistematik olarak "pahalı" gösteriyordu.
 */
export function yearAdjustment(
  year: number | null,
  medianYear: number | null,
  segment: Segment | null,
): number {
  if (year == null || medianYear == null) return 1;
  const rate = YEAR_APPRECIATION[segment ?? "C"] ?? 0.1;
  const factor = Math.pow(1 + rate, year - medianYear);
  return Math.min(2.8, Math.max(0.35, factor));
}

/**
 * Donanım farkı düzeltmesi. Kohort paket kırılımına inemediğinde
 * (örneklem yetmediği için) devreye giriyor: tier farkı başına ~%0.25.
 */
export function trimAdjustment(
  listingTier: number | null,
  cohortMeanTier: number | null,
): number {
  if (listingTier == null || cohortMeanTier == null) return 1;
  const factor = 1 + ((listingTier - cohortMeanTier) / 100) * 0.25;
  return Math.min(1.15, Math.max(0.85, factor));
}

/**
 * Hasar kaydı düzeltmesi. TRAMER tutarı arttıkça beklenen fiyat düşüyor;
 * eğri logaritmik çünkü ilk 20 bin TL'lik hasar, ikinci 20 binden çok daha fazla vuruyor.
 */
export function damageAdjustment(damageRecord: number | null, marketPrice: number): number {
  if (damageRecord == null || damageRecord <= 0 || marketPrice <= 0) return 1;
  const ratio = damageRecord / marketPrice;
  const penalty = Math.min(0.35, 0.18 * Math.log1p(ratio * 12));
  return 1 - penalty;
}

/** Türkiye ortalaması — kohort yıl karışıkken beklenen km'yi yaşa göre kaydırmak için */
export const AVG_KM_PER_YEAR = 15_000;

export interface ScoreInput {
  price: number;
  km: number | null;
  year: number | null;
  trimTier: number | null;
  damageRecord: number | null;
  segment: Segment | null;
}

export interface ScoreResult {
  expectedPrice: number;
  /** Pozitif = piyasanın altında (fırsat). Yüzde cinsinden. */
  dealScore: number;
  /** 0-1. Örneklem küçük ya da kohort dağınıksa düşüyor. */
  confidence: number;
  /** Skorun nasıl çıktığını panelde göstermek için */
  breakdown: {
    cohortMedian: number;
    yearFactor: number;
    kmFactor: number;
    trimFactor: number;
    damageFactor: number;
    sampleSize: number;
  };
}

export interface CohortBaseline {
  /** Kohortun ortalama donanım seviyesi */
  meanTrimTier?: number | null;
  /**
   * Kohortun ortalama hasar çarpanı.
   *
   * Kritik: kohort medyanı zaten hasarlı araçları içerdiği için ortalama bir
   * hasar cezasını üstünde taşıyor. Bunu normalize etmezsek hasarsız araçlar
   * sistematik olarak "pahalı", hasarlılar "fırsat" görünüyor.
   */
  meanDamageFactor?: number | null;
}

/**
 * Bir ilanı kohortuna göre skorlar.
 * Beklenen fiyat = kohort medyanı × yıl × km × donanım × (hasar / kohort ort. hasarı).
 */
export function scoreListing(
  input: ScoreInput,
  stats: CohortStats,
  cohort: CohortBaseline = {},
): ScoreResult {
  const cohortMeanTier = cohort.meanTrimTier ?? null;
  const yearFactor = yearAdjustment(input.year, stats.medianYear, input.segment);

  // Kohort birden çok model yılını kapsıyorsa, beklenen km de yaşa göre kayar.
  // Bu kaydırma yapılmazsa yıl ve km düzeltmeleri aynı yaş farkını iki kez cezalandırıyor.
  const expectedKm =
    stats.medianKm != null && stats.medianYear != null && input.year != null
      ? stats.medianKm + (stats.medianYear - input.year) * AVG_KM_PER_YEAR
      : stats.medianKm;

  const kmFactor = kmAdjustment(input.km, expectedKm, input.segment);
  const trimFactor = trimAdjustment(input.trimTier, cohortMeanTier);
  const preDamage = stats.median * yearFactor * kmFactor * trimFactor;

  const rawDamageFactor = damageAdjustment(input.damageRecord, preDamage);
  const baselineDamage = cohort.meanDamageFactor ?? 1;
  const damageFactor = baselineDamage > 0 ? rawDamageFactor / baselineDamage : rawDamageFactor;

  const expectedPrice = Math.round(preDamage * damageFactor);
  const dealScore =
    expectedPrice > 0
      ? Math.round(((expectedPrice - input.price) / expectedPrice) * 1000) / 10
      : 0;

  // Güven: örneklem büyüdükçe artar, kohort dağıldıkça düşer.
  const sampleConf = Math.min(1, Math.log10(stats.sampleSize + 1) / Math.log10(31));
  const dispersionConf = Math.max(0, 1 - stats.dispersion / 0.5);
  const kmConf = input.km == null ? 0.8 : 1;
  const confidence =
    Math.round(sampleConf * 0.5 * 100 + dispersionConf * 0.35 * 100 + kmConf * 0.15 * 100) / 100;

  return {
    expectedPrice,
    dealScore,
    confidence: Math.min(1, Math.round(confidence * 100) / 100),
    breakdown: {
      cohortMedian: stats.median,
      yearFactor: Math.round(yearFactor * 1000) / 1000,
      kmFactor: Math.round(kmFactor * 1000) / 1000,
      trimFactor: Math.round(trimFactor * 1000) / 1000,
      damageFactor: Math.round(damageFactor * 1000) / 1000,
      sampleSize: stats.sampleSize,
    },
  };
}

/** İlanın kaç gündür yayında olduğu (satıldıysa kaç günde satıldığı) */
export function daysOnMarket(
  firstSeenAt: Date,
  removedAt: Date | null,
  now: Date,
): number {
  const end = removedAt ?? now;
  return Math.max(0, Math.round((end.getTime() - firstSeenAt.getTime()) / 86_400_000));
}

/** Kohortun devir hızı — satılmış ilanların medyan ilanda kalma süresi */
export function turnoverDays(
  closed: { firstSeenAt: Date; removedAt: Date }[],
): number | null {
  if (closed.length < 3) return null;
  const spans = closed.map((c) => daysOnMarket(c.firstSeenAt, c.removedAt, c.removedAt));
  return Math.round(median(spans) * 10) / 10;
}

export interface PriceHistoryPoint {
  price: number;
  observedAt: Date;
}

export interface PricePressure {
  /** Kaç kez indirim yapılmış */
  dropCount: number;
  /** İlk fiyattan bugüne toplam değişim (TL) */
  totalChange: number;
  /** Toplam değişimin ilk fiyata oranı (%) */
  totalChangePct: number;
  /** Son indirimin üzerinden kaç gün geçti */
  daysSinceLastDrop: number | null;
  /**
   * 0-100. Yüksek = satıcı sıkışmış, pazarlık payı var.
   * Sık ve büyük indirim + uzun süre ilanda kalma = yüksek baskı.
   */
  pressure: number;
}

/**
 * Satıcı baskısı skoru (0-100).
 *
 * İndirim yüzdesi 60 puana, ilanda bekleme 40 puana kadar katkı veriyor:
 * %10 indirmiş ve 90 gündür satamamış bir satıcı, pazarlığa en açık olan.
 * Ayrı fonksiyon çünkü hem ilan geçmişinden hem de özet sorgudan çağrılıyor.
 */
export function computePressure(totalChangePct: number | null, daysListed: number): number {
  const discountScore = Math.min(60, Math.max(0, -(totalChangePct ?? 0)) * 6);
  const stalenessScore = Math.min(40, (Math.max(0, daysListed) / 90) * 40);
  return Math.round(Math.min(100, discountScore + stalenessScore));
}

/**
 * Fiyat geçmişinden satıcı baskısı çıkarır.
 * Galeri için en operasyonel sinyal bu: kime, ne zaman, ne kadar teklif verilir.
 */
export function analyzePricePressure(
  history: PriceHistoryPoint[],
  daysListed: number,
  now: Date,
): PricePressure {
  const sorted = [...history].sort((a, b) => a.observedAt.getTime() - b.observedAt.getTime());
  if (sorted.length === 0) {
    return { dropCount: 0, totalChange: 0, totalChangePct: 0, daysSinceLastDrop: null, pressure: 0 };
  }

  let dropCount = 0;
  let lastDropAt: Date | null = null;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].price < sorted[i - 1].price) {
      dropCount++;
      lastDropAt = sorted[i].observedAt;
    }
  }

  const first = sorted[0].price;
  const last = sorted[sorted.length - 1].price;
  const totalChange = last - first;
  const totalChangePct = first > 0 ? Math.round((totalChange / first) * 1000) / 10 : 0;
  const daysSinceLastDrop = lastDropAt
    ? Math.max(0, Math.round((now.getTime() - lastDropAt.getTime()) / 86_400_000))
    : null;

  return {
    dropCount,
    totalChange,
    totalChangePct,
    daysSinceLastDrop,
    pressure: computePressure(totalChangePct, daysListed),
  };
}

/** Fırsat etiketi — panelde renkli rozet olarak gösteriliyor */
export function dealLabel(dealScore: number | null, confidence: number): {
  label: string;
  tone: "hot" | "good" | "fair" | "high" | "unknown";
} {
  if (dealScore == null || confidence < 0.4) return { label: "Veri yetersiz", tone: "unknown" };
  if (dealScore >= 15) return { label: "Kaçırma", tone: "hot" };
  if (dealScore >= 7) return { label: "Fırsat", tone: "good" };
  if (dealScore >= -7) return { label: "Piyasa", tone: "fair" };
  return { label: "Pahalı", tone: "high" };
}
