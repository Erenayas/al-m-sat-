/**
 * Feed adaptör sözleşmesi.
 *
 * Her yeni kaynak (galeri stok XML'i, portal feed'i, kurumsal envanter)
 * yalnızca bu arayüzü uygular; normalize/skorlama tarafı hiç değişmez.
 */

export interface RawListing {
  /** Kaynaktaki benzersiz ilan kimliği */
  externalId: string;
  title: string;

  make?: string;
  model?: string;
  trim?: string;
  year?: number;
  engine?: string;
  fuel?: string;
  transmission?: string;
  body?: string;

  price: number;
  currency?: string;
  km?: number;

  city?: string;
  district?: string;
  sellerType?: "galeri" | "sahibinden" | "yetkili_bayi";
  sellerName?: string;

  /** TRAMER tutarı (TL). 0 = hasarsız, undefined = bilinmiyor */
  damageRecord?: number;
  paintedParts?: number;
  changedParts?: number;

  url?: string;
  imageUrl?: string;
  description?: string;
}

export interface FeedAdapter {
  /** sources.code ile eşleşir */
  code: string;
  name: string;
  kind: "gallery_xml" | "portal_feed" | "manual";
  /** Kaynaktan ham ilanları çeker */
  fetch(): Promise<RawListing[]>;
}

/** Sayı ayrıştırma — feed'ler "1.150.000 TL", "1150000,00", "85.000 km" gibi her türlü yazımı gönderiyor */
export function parseNumber(input: unknown): number | undefined {
  if (input == null) return undefined;
  if (typeof input === "number") return Number.isFinite(input) ? input : undefined;

  let s = String(input).trim();
  if (!s) return undefined;
  s = s.replace(/[^\d.,-]/g, "");
  if (!s) return undefined;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  if (lastComma > -1 && lastDot > -1) {
    // İki ayraç da var: sonuncusu ondalık ayracıdır (tr: 1.150.000,50 / en: 1,150,000.50)
    if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (lastComma > -1) {
    // Yalnızca virgül: son grup 3 haneliyse binlik ayracı, değilse ondalık
    const tail = s.slice(lastComma + 1);
    s = tail.length === 3 ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (lastDot > -1) {
    const tail = s.slice(lastDot + 1);
    if (tail.length === 3) s = s.replace(/\./g, "");
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}
