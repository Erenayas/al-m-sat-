/**
 * İlan katmanının tip ve sabitleri.
 *
 * `queries.ts`'ten ayrı duruyor çünkü istemci bileşenleri (filtre çubuğu)
 * bunlara ihtiyaç duyuyor; aynı dosyada olsalardı veritabanı sürücüsü
 * tarayıcı paketine sızardı.
 */

export interface ListingRowBase {
  id: number;
  title: string;
  make: string | null;
  model: string | null;
  trim: string | null;
  year: number | null;
  engine: string | null;
  fuel: string | null;
  transmission: string | null;
  body: string | null;
  km: number | null;
  price: number;
  expectedPrice: number | null;
  dealScore: number | null;
  scoreConfidence: number | null;
  damageRecord: number | null;
  paintedParts: number | null;
  changedParts: number | null;
  city: string | null;
  district: string | null;
  sellerName: string | null;
  sourceCode: string | null;
  url: string | null;
  firstSeenAt: Date;
  daysOnMarket: number;
  dropCount: number;
  firstPrice: number | null;
  cohortMedian: number | null;
  cohortSample: number | null;
}

export interface ListingRow extends ListingRowBase {
  /** İlk fiyata göre toplam değişim (%) */
  totalChangePct: number | null;
  /** 0-100 satıcı baskısı */
  pressure: number;
}

export type SortKey = "deal" | "price_asc" | "price_desc" | "newest" | "km_asc" | "pressure";

export const SORT_LABELS: Record<SortKey, string> = {
  deal: "Fırsat skoru",
  newest: "En yeni ilan",
  price_asc: "Fiyat (artan)",
  price_desc: "Fiyat (azalan)",
  km_asc: "Kilometre (artan)",
  pressure: "En çok fiyat kıran",
};

export const SORT_KEYS = Object.keys(SORT_LABELS) as SortKey[];

export interface ListingFilters {
  make?: string;
  model?: string;
  city?: string;
  source?: string;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  kmMax?: number;
  minDealScore?: number;
  cleanOnly?: boolean;
  sort?: SortKey;
  limit?: number;
}

export interface FilterOptions {
  makes: string[];
  cities: string[];
  sources: { code: string; name: string }[];
  modelsByMake: Record<string, string[]>;
}

export interface Kpis {
  activeListings: number;
  newLast24h: number;
  deals: number;
  medianTurnoverDays: number | null;
  droppedLast7d: number;
  trackedGalleries: number;
}

export interface StockSummary {
  code: string;
  name: string;
  city: string | null;
  activeCount: number;
  totalValue: number;
  /** Piyasanın belirgin üstünde fiyatlanmış stok adedi */
  overpriced: number;
  /** 60 günü aşmış stok adedi */
  deadStock: number;
  medianDealScore: number | null;
  medianDaysOnMarket: number | null;
}

export interface PriceHistoryRow {
  price: number;
  observedAt: Date;
}

/**
 * RFC 2606/6761 ile ayrılmış, hiçbir zaman çözümlenmeyen alan adları.
 * Demo verisi bunları kullanıyor; tıklanabilir gösterilirse kırık link gibi
 * duruyor, o yüzden arayüzde ayırt ediliyor.
 */
const UNRESOLVABLE_SUFFIXES = [".test", ".example", ".invalid", ".localhost"];

export function isDemoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return UNRESOLVABLE_SUFFIXES.some((s) => host === s.slice(1) || host.endsWith(s));
  } catch {
    return false;
  }
}
