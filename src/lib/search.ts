/**
 * Seçim kutusu arama mantığı.
 *
 * Bileşenden ayrı duruyor çünkü asıl kıymetli kısım bu: galerici "vosvogen"
 * ya da "corola" yazdığında doğru markayı bulmak. Test edilebilir olması,
 * arayüzü elle deneyerek doğrulamaktan çok daha güvenilir.
 */

const TR_MAP: Record<string, string> = {
  ç: "c", Ç: "c", ğ: "g", Ğ: "g", ı: "i", I: "i", İ: "i",
  ö: "o", Ö: "o", ş: "s", Ş: "s", ü: "u", Ü: "u", â: "a", î: "i", û: "u",
};

/**
 * Türkçe ve Avrupa aksanlarını katlar, harf/rakam dışını atar.
 *
 * NFD ayrıştırması `ë é ñ š` gibi işaretleri tek başına ayırıp temizliyor —
 * marka adlarında bunlar bolca var (Citroën, Škoda, Huracán). Türkçe `ı`
 * ayrıştırılamadığı için tabloyla ayrıca ele alınıyor.
 */
export function fold(input: string): string {
  let out = "";
  for (const ch of input) out += TR_MAP[ch] ?? ch;
  return out
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/** Kısa dizeler için Levenshtein mesafesi */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length || !b.length) return Math.max(a.length, b.length);
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

export interface SearchOption {
  value: string;
  /** Eşleşmeyi genişleten yazım varyantları */
  aliases?: string[];
}

/**
 * Sıralama puanı; küçük daha iyi.
 * 0 tam eşleşme · 1 baştan · 2 içinde · 3+ bulanık · null eşleşme yok
 */
export function scoreOption(query: string, option: SearchOption): number | null {
  const q = fold(query);
  if (!q) return 1;

  const candidates = [option.value, ...(option.aliases ?? [])].map(fold).filter(Boolean);

  let best: number | null = null;
  for (const c of candidates) {
    let s: number | null = null;
    if (c === q) s = 0;
    else if (c.startsWith(q)) s = 1;
    else if (c.includes(q)) s = 2;
    else if (q.length >= 4) {
      // Yazım hatası toleransı; eşiği adayın uzunluğuna göre ölçekliyoruz ki
      // kısa adlarda ("Kia") rastgele eşleşme olmasın.
      const d = editDistance(q, c);
      const limit = Math.max(2, Math.floor(c.length * 0.34));
      if (d <= limit) s = 3 + d / 10;
    }
    if (s != null && (best == null || s < best)) best = s;
  }
  return best;
}

/** Seçenekleri sorguya göre süzüp sıralar */
export function searchOptions<T extends SearchOption>(
  query: string,
  options: T[],
  limit = 60,
): T[] {
  return options
    .map((o) => ({ o, s: scoreOption(query, o) }))
    .filter((x): x is { o: T; s: number } => x.s != null)
    .sort((a, b) => a.s - b.s || a.o.value.localeCompare(b.o.value, "tr"))
    .slice(0, limit)
    .map((x) => x.o);
}
