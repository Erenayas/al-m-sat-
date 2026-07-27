/**
 * Galeri stok XML adaptörü.
 *
 * Galeriler stoklarını zaten XML olarak dışa veriyor (Otoplus, Oto Yazılım vb.
 * stok programlarından). Standart yok — her yazılım etiketleri farklı adlandırıyor —
 * bu yüzden adaptör etiket adlarını esnek eşleştiriyor.
 */

import { XMLParser } from "fast-xml-parser";
import { parseNumber, type FeedAdapter, type RawListing } from "../types";

/** Aynı alanın karşılaşılan tüm etiket adları */
const FIELD_ALIASES: Record<string, string[]> = {
  externalId: ["ilanno", "ilanid", "id", "stokkodu", "stokno", "aracid", "kod", "referansno"],
  title: ["baslik", "ilanbasligi", "aracadi", "title", "aciklamabaslik"],
  make: ["marka", "make", "brand"],
  model: ["model", "seri", "modeladi"],
  trim: ["paket", "donanim", "versiyon", "trim", "tip", "modeldetay"],
  year: ["yil", "model_yili", "modelyili", "year", "uretimyili"],
  engine: ["motorhacmi", "motor", "hacim", "engine", "silindirhacmi"],
  fuel: ["yakit", "yakittipi", "yakit_turu", "fuel"],
  transmission: ["vites", "vitestipi", "sanziman", "transmission"],
  body: ["kasatipi", "kasa", "govde", "body", "arackasa"],
  price: ["fiyat", "price", "satisfiyati", "tutar"],
  currency: ["parabirimi", "currency", "dovizcinsi"],
  km: ["km", "kilometre", "mileage"],
  city: ["il", "sehir", "city"],
  district: ["ilce", "district"],
  sellerName: ["galeriadi", "firmaadi", "satici", "bayi", "magaza"],
  damageRecord: ["tramer", "tramertutari", "hasarkaydi", "hasar"],
  paintedParts: ["boyali", "boyaliparca", "boyasayisi"],
  changedParts: ["degisen", "degisenparca", "degisensayisi"],
  url: ["link", "url", "ilanlinki", "detayurl"],
  imageUrl: ["resim", "foto", "fotograf", "gorsel", "image", "resimurl"],
  description: ["aciklama", "detay", "description", "ilanaciklamasi"],
};

/** Etiket adlarını karşılaştırmak için sadeleştirir: "Model_Yili" -> "modelyili" */
function normalizeTag(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]/g, "");
}

/** Bir düğümün tüm alanlarını sadeleştirilmiş anahtarlarla düz bir haritaya indirir */
function flatten(node: unknown, out: Map<string, string> = new Map()): Map<string, string> {
  if (node == null || typeof node !== "object") return out;

  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    const tag = normalizeTag(key);
    if (value == null) continue;

    if (typeof value === "object") {
      // Fotoğraf listesi gibi iç içe düğümler: ilk yaprak değeri al
      if (Array.isArray(value)) {
        const first = value.find((v) => v != null);
        if (first != null && typeof first !== "object") {
          if (!out.has(tag)) out.set(tag, String(first));
        } else if (first != null) {
          flatten(first, out);
        }
      } else {
        flatten(value, out);
      }
      continue;
    }

    const str = String(value).trim();
    if (str && !out.has(tag)) out.set(tag, str);
  }
  return out;
}

function pick(fields: Map<string, string>, field: string): string | undefined {
  for (const alias of FIELD_ALIASES[field] ?? []) {
    const v = fields.get(alias);
    if (v) return v;
  }
  return undefined;
}

/** XML gövdesindeki ilan dizisini bulur — kök etiket adı kaynaktan kaynağa değişiyor */
function findListingArray(root: unknown): unknown[] {
  const seen = new Set<unknown>();
  const walk = (node: unknown, depth: number): unknown[] | null => {
    if (node == null || typeof node !== "object" || depth > 6 || seen.has(node)) return null;
    seen.add(node);

    if (Array.isArray(node)) {
      return node.length && typeof node[0] === "object" ? node : null;
    }
    for (const value of Object.values(node as Record<string, unknown>)) {
      const hit = walk(value, depth + 1);
      if (hit) return hit;
    }
    return null;
  };
  return walk(root, 0) ?? [];
}

const SELLER_TYPES: Record<string, RawListing["sellerType"]> = {
  galeri: "galeri",
  bayi: "yetkili_bayi",
  yetkili: "yetkili_bayi",
  sahibinden: "sahibinden",
};

/** XML gövdesini `RawListing` dizisine çevirir. Ağ erişimi yok — test edilebilir tutuluyor. */
export function parseGalleryXml(xml: string, defaults: Partial<RawListing> = {}): RawListing[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    trimValues: true,
    parseTagValue: false,
    cdataPropName: "__cdata",
  });

  const root = parser.parse(xml);
  const nodes = findListingArray(root);
  const out: RawListing[] = [];

  for (const node of nodes) {
    const f = flatten(node);

    const price = parseNumber(pick(f, "price"));
    const externalId = pick(f, "externalId");
    // Kimliği ya da fiyatı olmayan kayıt işe yaramaz; sessizce atlanıyor.
    if (!externalId || price == null || price <= 0) continue;

    const sellerRaw = (pick(f, "sellerName") ?? "").toLowerCase();
    const sellerType =
      Object.entries(SELLER_TYPES).find(([k]) => sellerRaw.includes(k))?.[1] ??
      defaults.sellerType ??
      "galeri";

    const make = pick(f, "make");
    const model = pick(f, "model");
    const trim = pick(f, "trim");
    const composed = [make, model, trim].filter(Boolean).join(" ");
    const title = pick(f, "title") ?? (composed || `İlan ${externalId}`);

    out.push({
      externalId,
      title,
      make,
      model,
      trim,
      year: parseNumber(pick(f, "year")),
      engine: pick(f, "engine"),
      fuel: pick(f, "fuel"),
      transmission: pick(f, "transmission"),
      body: pick(f, "body"),
      price,
      currency: pick(f, "currency") ?? defaults.currency ?? "TRY",
      km: parseNumber(pick(f, "km")),
      city: pick(f, "city") ?? defaults.city,
      district: pick(f, "district"),
      sellerType,
      sellerName: pick(f, "sellerName") ?? defaults.sellerName,
      damageRecord: parseNumber(pick(f, "damageRecord")),
      paintedParts: parseNumber(pick(f, "paintedParts")),
      changedParts: parseNumber(pick(f, "changedParts")),
      url: pick(f, "url"),
      imageUrl: pick(f, "imageUrl"),
      description: pick(f, "description"),
    });
  }

  return out;
}

/** URL'den çeken hazır adaptör üreticisi */
export function galleryXmlAdapter(opts: {
  code: string;
  name: string;
  url: string;
  city?: string;
}): FeedAdapter {
  return {
    code: opts.code,
    name: opts.name,
    kind: "gallery_xml",
    async fetch() {
      const res = await fetch(opts.url, {
        headers: { accept: "application/xml,text/xml;q=0.9,*/*;q=0.8" },
      });
      if (!res.ok) throw new Error(`${opts.code}: feed ${res.status} döndü`);
      return parseGalleryXml(await res.text(), {
        city: opts.city,
        sellerName: opts.name,
        sellerType: "galeri",
      });
    },
  };
}
