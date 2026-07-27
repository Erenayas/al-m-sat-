"use server";

import { revalidatePath } from "next/cache";
import { parseGalleryXml } from "@/ingest/adapters/galleryXml";
import { FeedFetchError, fetchFeedBody } from "@/ingest/fetchFeed";
import { ingestListings, recomputeStatsAndScores, upsertSource } from "@/ingest/pipeline";
import { normalizeVehicle } from "@/domain/normalize";
import type { RawListing } from "@/ingest/types";

/**
 * Feed bağlama akışı.
 *
 * İki adım: önce "çözümle" (hiçbir şey yazmadan feed'in ne getirdiğini göster),
 * sonra "içe aktar". Gerçek bir galeri feed'i ilk seferde hiç temiz gelmiyor —
 * galeriye "şu 12 ilanı eşleştiremedim" diyebilmek, kör bir import'tan çok
 * daha kullanışlı.
 */

export interface SampleRow {
  title: string;
  matched: boolean;
  vehicle: string | null;
  confidence: number | null;
  price: number;
  reason: string;
}

export interface FeedState {
  status: "idle" | "ok" | "error";
  message?: string;
  /** Çözümleme raporu */
  report?: {
    total: number;
    matched: number;
    unmatched: number;
    withPrice: number;
    samples: SampleRow[];
    unmatchedSamples: SampleRow[];
  };
  /** İçe aktarma sonucu */
  imported?: {
    source: string;
    inserted: number;
    updated: number;
    priceChanges: number;
    removed: number;
    cohorts: number;
    scored: number;
  };
  /** Formun yeniden doldurulması için */
  values?: { code: string; name: string; city: string; url: string };
}

/** Girdiden ham ilanları üretir: ya adresten çeker ya da yapıştırılan gövdeyi ayrıştırır */
async function readListings(formData: FormData): Promise<{
  raws: RawListing[];
  sourceLabel: string;
}> {
  const url = String(formData.get("url") ?? "").trim();
  const pasted = String(formData.get("xml") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();

  if (!url && !pasted) {
    throw new FeedFetchError("Bir feed adresi gir ya da XML içeriğini yapıştır.");
  }

  const body = url ? await fetchFeedBody(url) : pasted;
  if (!body.trim()) throw new FeedFetchError("Feed boş döndü.");

  const raws = parseGalleryXml(body, {
    sellerName: name || undefined,
    city: city || undefined,
    sellerType: "galeri",
  });

  if (!raws.length) {
    throw new FeedFetchError(
      "Feed ayrıştırıldı ama tek bir ilan çıkmadı. Etiket adları beklenenden farklı olabilir — XML'den birkaç satır paylaş, adaptöre ekleyeyim.",
    );
  }

  return { raws, sourceLabel: name || url || "yapıştırılan XML" };
}

function describe(raw: RawListing): SampleRow {
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

  return {
    title: raw.title,
    matched: norm != null,
    vehicle: norm ? `${norm.make} ${norm.model}${norm.trim ? ` ${norm.trim}` : ""} ${norm.year}` : null,
    confidence: norm?.confidence ?? null,
    price: raw.price,
    reason: norm ? norm.matchLog.join(" · ") : "marka/model/yıl çözülemedi",
  };
}

/** Adım 1 — hiçbir şey yazmadan feed'i çözümle */
export async function analyzeFeed(_prev: FeedState, formData: FormData): Promise<FeedState> {
  const values = {
    code: String(formData.get("code") ?? ""),
    name: String(formData.get("name") ?? ""),
    city: String(formData.get("city") ?? ""),
    url: String(formData.get("url") ?? ""),
  };

  try {
    const { raws } = await readListings(formData);
    const described = raws.map(describe);
    const matched = described.filter((d) => d.matched);
    const unmatched = described.filter((d) => !d.matched);

    return {
      status: "ok",
      values,
      report: {
        total: raws.length,
        matched: matched.length,
        unmatched: unmatched.length,
        withPrice: raws.filter((r) => r.price > 0).length,
        samples: matched.slice(0, 8),
        unmatchedSamples: unmatched.slice(0, 8),
      },
    };
  } catch (err) {
    return {
      status: "error",
      values,
      message:
        err instanceof FeedFetchError
          ? err.message
          : `Feed okunamadı: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/** Adım 2 — kaynağı kaydet, ilanları içe aktar, skorları yeniden hesapla */
export async function importFeed(_prev: FeedState, formData: FormData): Promise<FeedState> {
  const values = {
    code: String(formData.get("code") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    url: String(formData.get("url") ?? "").trim(),
  };

  if (!/^[a-z0-9-]{2,40}$/.test(values.code)) {
    return {
      status: "error",
      values,
      message: "Kaynak kodu 2-40 karakter olmalı; yalnızca küçük harf, rakam ve tire.",
    };
  }
  if (!values.name) {
    return { status: "error", values, message: "Galeri adı gerekli." };
  }

  try {
    const { raws } = await readListings(formData);

    const sourceId = await upsertSource({
      code: values.code,
      name: values.name,
      kind: "gallery_xml",
      url: values.url || undefined,
      city: values.city || undefined,
    });

    const report = await ingestListings(sourceId, values.code, raws, {
      // Tek seferlik yapıştırma tam envanter olmayabilir; eksikleri "satıldı"
      // saymak yanlış olur. Yalnızca adresten çekildiğinde tam liste varsayılıyor.
      markMissingAsRemoved: Boolean(values.url),
    });

    const scores = await recomputeStatsAndScores();

    revalidatePath("/");
    revalidatePath("/ilanlar");
    revalidatePath("/stok");
    revalidatePath("/kaynaklar");

    return {
      status: "ok",
      values,
      imported: {
        source: values.name,
        inserted: report.inserted,
        updated: report.updated,
        priceChanges: report.priceChanges,
        removed: report.removed,
        cohorts: scores.cohorts,
        scored: scores.scored,
      },
    };
  } catch (err) {
    return {
      status: "error",
      values,
      message:
        err instanceof FeedFetchError
          ? err.message
          : `İçe aktarma başarısız: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
