/**
 * İlan metnini kanonik araca çeviren eşleştirme motoru.
 *
 * Bu dosya projenin en kritik parçası: aynı araba beş kaynakta beş farklı
 * yazıldığı için, kohortlar burada doğru kurulmazsa fiyat istatistiğinin
 * tamamı çöp oluyor. O yüzden her eşleşme bir `confidence` ile dönüyor —
 * düşük güvenli eşleşmeler istatistiğe sokulmuyor (bkz. pricing.ts).
 */

import {
  TAXONOMY,
  FUEL_ALIASES,
  TRANSMISSION_ALIASES,
  BODY_ALIASES,
  type BodyType,
  type FuelType,
  type MakeDef,
  type ModelDef,
  type Segment,
  type Transmission,
} from "./taxonomy";

export interface RawListingFields {
  title?: string;
  make?: string;
  model?: string;
  trim?: string;
  year?: number | string;
  fuel?: string;
  transmission?: string;
  body?: string;
  engine?: string;
  description?: string;
}

export interface NormalizedVehicle {
  canonicalKey: string;
  make: string;
  model: string;
  trim: string | null;
  year: number;
  engine: string | null;
  fuel: FuelType | null;
  transmission: Transmission | null;
  body: BodyType | null;
  segment: Segment | null;
  trimTier: number | null;
  /** 0-1 arası. 0.6 altındaki eşleşmeler piyasa istatistiğine katılmaz. */
  confidence: number;
  /** Neyin nasıl eşleştiğini gösterir — hatalı eşleşme ayıklarken lazım oluyor */
  matchLog: string[];
}

const TR_MAP: Record<string, string> = {
  ç: "c", Ç: "c", ğ: "g", Ğ: "g", ı: "i", I: "i", İ: "i",
  ö: "o", Ö: "o", ş: "s", Ş: "s", ü: "u", Ü: "u", â: "a", î: "i", û: "u",
};

/**
 * Türkçe karakterleri ASCII'ye katlayıp küçük harfe çevirir.
 *
 * `I`/`İ` ayrımı JS'in varsayılan toLowerCase'inde bozulduğu için elle yapılıyor.
 * NFD ayrıştırması ayrıca Avrupa aksanlarını temizliyor (Citroën, Škoda,
 * Huracán gibi marka adları ilanlarda hem aksanlı hem aksansız yazılıyor).
 */
export function fold(input: string): string {
  let out = "";
  for (const ch of input) out += TR_MAP[ch] ?? ch;
  return out
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Alias'ın metinde kelime sınırında geçip geçmediğine bakar */
function containsToken(haystack: string, needle: string): boolean {
  const n = fold(needle);
  if (!n) return false;
  const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(haystack);
}

/** Kısa dizeler için Levenshtein — yalnızca alias eşleşmesi tutmazsa devreye giriyor */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length || !b.length) return Math.max(a.length, b.length);
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Metindeki en uzun eşleşen alias'ı döner — "3 serisi" varken "3"e takılmasın diye */
function bestAlias(haystack: string, aliases: string[]): string | null {
  let best: string | null = null;
  for (const alias of aliases) {
    if (!containsToken(haystack, alias)) continue;
    if (!best || alias.length > best.length) best = alias;
  }
  return best;
}

function fuzzyAlias(haystack: string, aliases: string[]): string | null {
  const tokens = haystack.split(" ").filter((t) => t.length >= 5);
  for (const alias of aliases) {
    const a = fold(alias);
    if (a.length < 5) continue;
    for (const tok of tokens) {
      if (editDistance(tok, a) <= (a.length >= 8 ? 2 : 1)) return alias;
    }
  }
  return null;
}

function matchMake(hay: string): { make: MakeDef; fuzzy: boolean } | null {
  let exact: MakeDef | null = null;
  let exactLen = 0;
  for (const make of TAXONOMY) {
    const hit = bestAlias(hay, make.aliases);
    if (hit && hit.length > exactLen) {
      exact = make;
      exactLen = hit.length;
    }
  }
  if (exact) return { make: exact, fuzzy: false };

  for (const make of TAXONOMY) {
    if (fuzzyAlias(hay, make.aliases)) return { make, fuzzy: true };
  }
  return null;
}

function matchModel(hay: string, make: MakeDef): { model: ModelDef; fuzzy: boolean } | null {
  let exact: ModelDef | null = null;
  let exactLen = 0;
  for (const model of make.models) {
    const hit = bestAlias(hay, model.aliases);
    if (hit && hit.length > exactLen) {
      exact = model;
      exactLen = hit.length;
    }
  }
  if (exact) return { model: exact, fuzzy: false };

  for (const model of make.models) {
    if (fuzzyAlias(hay, model.aliases)) return { model, fuzzy: true };
  }
  return null;
}

/** Marka gelmemişse tüm modeller içinde ara — bazı feed'ler yalnızca model yazıyor */
function matchModelGlobally(hay: string): { make: MakeDef; model: ModelDef } | null {
  let best: { make: MakeDef; model: ModelDef; len: number } | null = null;
  for (const make of TAXONOMY) {
    for (const model of make.models) {
      const hit = bestAlias(hay, model.aliases);
      if (hit && (!best || hit.length > best.len)) best = { make, model, len: hit.length };
    }
  }
  return best ? { make: best.make, model: best.model } : null;
}

function matchEnum<T extends string>(
  hay: string,
  explicit: string | undefined,
  dict: Record<string, T>,
): T | null {
  if (explicit) {
    const direct = dict[fold(explicit)];
    if (direct) return direct;
  }
  // Uzun anahtarlar önce denenmeli: "benzin lpg" varken "benzin"e düşmesin.
  const keys = Object.keys(dict).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (containsToken(hay, key)) return dict[key];
  }
  return null;
}

/** "1.6 TDI 110 hp" → "1.6" */
function matchEngine(hay: string, explicit?: string): string | null {
  const source = explicit ? fold(explicit) : hay;
  const m = source.match(/(?:^|[^0-9.])([0-9])\.([0-9])(?:[^0-9]|$)/);
  if (!m) return null;
  const val = `${m[1]}.${m[2]}`;
  // 0.9-8.0 dışındaki değerler motor hacmi değil (km, fiyat vb. yakalamış olabilir)
  const num = Number(val);
  return num >= 0.6 && num <= 8 ? val : null;
}

function matchYear(hay: string, explicit?: number | string): number | null {
  if (explicit != null) {
    const n = typeof explicit === "number" ? explicit : parseInt(String(explicit), 10);
    if (Number.isFinite(n) && n >= 1970 && n <= 2100) return n;
  }
  const years = [...hay.matchAll(/(?:^|[^0-9])((?:19|20)[0-9]{2})(?:[^0-9]|$)/g)]
    .map((m) => Number(m[1]))
    .filter((y) => y >= 1980 && y <= new Date().getFullYear() + 1);
  return years.length ? Math.max(...years) : null;
}

export function buildCanonicalKey(v: {
  make: string;
  model: string;
  trim: string | null;
  year: number;
  engine: string | null;
  fuel: string | null;
  transmission: string | null;
  body: string | null;
}): string {
  return [
    fold(v.make),
    fold(v.model),
    v.trim ? fold(v.trim) : "-",
    v.year,
    v.engine ?? "-",
    v.fuel ?? "-",
    v.transmission ?? "-",
    v.body ?? "-",
  ].join("|");
}

/**
 * Ham ilan alanlarını kanonik araca çevirir.
 * Marka/model çözülemezse `null` döner — böyle ilanlar panelde
 * "eşleşmeyen" kuyruğuna düşüp elle düzeltilebiliyor.
 */
export function normalizeVehicle(raw: RawListingFields): NormalizedVehicle | null {
  const haystack = fold(
    [raw.make, raw.model, raw.trim, raw.title, raw.engine, raw.description]
      .filter(Boolean)
      .join(" "),
  );
  if (!haystack) return null;

  const log: string[] = [];
  let confidence = 1;

  // --- Marka ---
  const makeHay = raw.make ? fold(raw.make) : haystack;
  let makeHit = matchMake(makeHay);
  if (!makeHit && raw.make) makeHit = matchMake(haystack);

  let make: MakeDef;
  let model: ModelDef;

  if (makeHit) {
    make = makeHit.make;
    if (makeHit.fuzzy) {
      confidence -= 0.15;
      log.push(`marka bulanık eşleşti: ${make.name}`);
    } else {
      log.push(`marka: ${make.name}`);
    }

    const modelHay = raw.model ? `${fold(raw.model)} ${haystack}` : haystack;
    const modelHit = matchModel(modelHay, make);
    if (!modelHit) {
      log.push("model eşleşmedi");
      return null;
    }
    model = modelHit.model;
    if (modelHit.fuzzy) {
      confidence -= 0.15;
      log.push(`model bulanık eşleşti: ${model.name}`);
    } else {
      log.push(`model: ${model.name}`);
    }
  } else {
    const global = matchModelGlobally(haystack);
    if (!global) {
      log.push("marka ve model eşleşmedi");
      return null;
    }
    make = global.make;
    model = global.model;
    confidence -= 0.2;
    log.push(`marka model üzerinden çıkarıldı: ${make.name} ${model.name}`);
  }

  // --- Yıl (kohortun zorunlu parçası) ---
  const year = matchYear(haystack, raw.year);
  if (!year) {
    log.push("yıl bulunamadı");
    return null;
  }

  // --- Paket ---
  const trimHay = raw.trim ? `${fold(raw.trim)} ${haystack}` : haystack;
  let trim: string | null = null;
  let trimTier: number | null = null;
  let bestTrimLen = 0;
  for (const td of model.trims) {
    const hit = bestAlias(trimHay, td.aliases);
    if (hit && hit.length > bestTrimLen) {
      trim = td.name;
      trimTier = td.tier;
      bestTrimLen = hit.length;
    }
  }
  if (!trim) {
    confidence -= 0.1;
    log.push("paket eşleşmedi (kohort paketsiz kurulacak)");
  } else {
    log.push(`paket: ${trim}`);
  }

  // --- Teknik alanlar ---
  const fuel = matchEnum(haystack, raw.fuel, FUEL_ALIASES);
  const transmission = matchEnum(haystack, raw.transmission, TRANSMISSION_ALIASES);
  let body = matchEnum(haystack, raw.body, BODY_ALIASES);
  // Kasa tipi yoksa ve model tek kasa üretiyorsa oradan doldur
  if (!body && model.body.length === 1) body = model.body[0];

  const engine = matchEngine(haystack, raw.engine);

  if (!fuel) confidence -= 0.05;
  if (!transmission) confidence -= 0.05;
  if (!engine) confidence -= 0.05;

  const normalized = {
    make: make.name,
    model: model.name,
    trim,
    year,
    engine,
    fuel,
    transmission,
    body,
    segment: model.segment,
    trimTier,
  };

  return {
    ...normalized,
    canonicalKey: buildCanonicalKey(normalized),
    confidence: Math.max(0, Math.round(confidence * 100) / 100),
    matchLog: log,
  };
}
