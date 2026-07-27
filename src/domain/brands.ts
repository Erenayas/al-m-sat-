/**
 * Marka görsel kimliği.
 *
 * `taxonomy.ts` eşleştirme için; burası arayüz için. Ayrı duruyorlar çünkü
 * taksonomi sunucuda normalizasyonda, bu dosya istemcide seçim kutusunda
 * kullanılıyor ve trim sözlüklerini tarayıcıya taşımanın anlamı yok.
 *
 * `slug` aynı zamanda logo dosyasının adı: `public/logos/<slug>.svg` varsa
 * o basılıyor, yoksa markanın renginde harf rozeti gösteriliyor. Gerçek
 * logolar tescilli olduğu için depoya gömülmüyor; dosyayı klasöre atmak
 * yeterli, kod değişmiyor.
 */

export interface BrandStyle {
  slug: string;
  /** Rozet zemin rengi — markanın bilinen kurumsal rengi */
  color: string;
  /** Zemin üstünde okunabilir metin rengi */
  ink?: string;
  /** Rozette gösterilecek kısaltma; verilmezse addan üretilir */
  short?: string;
}

export const BRAND_STYLES: Record<string, BrandStyle> = {
  "Alfa Romeo": { slug: "alfa-romeo", color: "#8f1c2e", short: "AR" },
  "Aston Martin": { slug: "aston-martin", color: "#00594f", short: "AM" },
  Audi: { slug: "audi", color: "#bb0a30" },
  Bentley: { slug: "bentley", color: "#00332b" },
  BMW: { slug: "bmw", color: "#0066b1" },
  BYD: { slug: "byd", color: "#1a3668" },
  Chery: { slug: "chery", color: "#b31217" },
  Chevrolet: { slug: "chevrolet", color: "#d1a01e", ink: "#1a1a1a" },
  Chrysler: { slug: "chrysler", color: "#12233f" },
  Citroën: { slug: "citroen", color: "#a4141e" },
  Cupra: { slug: "cupra", color: "#94714a" },
  Dacia: { slug: "dacia", color: "#154f8e" },
  Daihatsu: { slug: "daihatsu", color: "#c8102e" },
  DFSK: { slug: "dfsk", color: "#0f4c81" },
  Dodge: { slug: "dodge", color: "#b8232f" },
  "DS Automobiles": { slug: "ds", color: "#54596b", short: "DS" },
  Ferrari: { slug: "ferrari", color: "#d40000" },
  Fiat: { slug: "fiat", color: "#8c1d2c" },
  Ford: { slug: "ford", color: "#1c4d9e" },
  Geely: { slug: "geely", color: "#0b3c8a" },
  Honda: { slug: "honda", color: "#cc0000" },
  Hyundai: { slug: "hyundai", color: "#00287a" },
  Infiniti: { slug: "infiniti", color: "#20272c" },
  Isuzu: { slug: "isuzu", color: "#b8232f" },
  Iveco: { slug: "iveco", color: "#004c97" },
  Jaguar: { slug: "jaguar", color: "#1d3d2e" },
  Jeep: { slug: "jeep", color: "#2b4b3c" },
  Kia: { slug: "kia", color: "#05141f" },
  Lada: { slug: "lada", color: "#1d4f91" },
  Lamborghini: { slug: "lamborghini", color: "#111111", short: "L" },
  Lancia: { slug: "lancia", color: "#12335c" },
  "Land Rover": { slug: "land-rover", color: "#005a2b", short: "LR" },
  Leapmotor: { slug: "leapmotor", color: "#1f4fd8" },
  Lexus: { slug: "lexus", color: "#1a1a1a" },
  Maserati: { slug: "maserati", color: "#0c2340" },
  Mazda: { slug: "mazda", color: "#101010" },
  "Mercedes-Benz": { slug: "mercedes-benz", color: "#1b1b1b", short: "MB" },
  MG: { slug: "mg", color: "#b3161f" },
  Mini: { slug: "mini", color: "#1a1a1a" },
  Mitsubishi: { slug: "mitsubishi", color: "#c8102e" },
  Nissan: { slug: "nissan", color: "#c3002f" },
  Opel: { slug: "opel", color: "#f7b500", ink: "#1a1a1a" },
  Peugeot: { slug: "peugeot", color: "#0a2b4c" },
  Porsche: { slug: "porsche", color: "#171717" },
  Proton: { slug: "proton", color: "#0f4c9a" },
  Renault: { slug: "renault", color: "#efdf00", ink: "#1a1a1a" },
  Rover: { slug: "rover", color: "#7a1f2b" },
  Saab: { slug: "saab", color: "#0d3b66" },
  Seat: { slug: "seat", color: "#a5122a" },
  Skoda: { slug: "skoda", color: "#0e3a2f" },
  Smart: { slug: "smart", color: "#2f3a44" },
  SsangYong: { slug: "ssangyong", color: "#0b3b7a", short: "SY" },
  Subaru: { slug: "subaru", color: "#0f2f7f" },
  Suzuki: { slug: "suzuki", color: "#e2001a" },
  Tesla: { slug: "tesla", color: "#cc0000" },
  Togg: { slug: "togg", color: "#00a3a1" },
  Toyota: { slug: "toyota", color: "#d10a1e" },
  Volkswagen: { slug: "volkswagen", color: "#0a3d91", short: "VW" },
  Volvo: { slug: "volvo", color: "#1a3f74" },
};

const FALLBACK: BrandStyle = { slug: "diger", color: "#5a6272" };

export function brandStyle(make: string | null | undefined): BrandStyle {
  if (!make) return FALLBACK;
  return BRAND_STYLES[make] ?? FALLBACK;
}

/** Rozette gösterilecek harfler */
export function brandInitials(make: string | null | undefined): string {
  if (!make) return "?";
  const style = BRAND_STYLES[make];
  if (style?.short) return style.short;

  const words = make.split(/[\s-]+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return make.slice(0, 2).toUpperCase();
}
