/**
 * Tek bir markanın logosunu adresinden indirir:
 *
 *   npm run logos:add -- "Mercedes-Benz" https://ornek.com/mercedes.svg
 *   npm run logos:add -- Lexus https://ornek.com/lexus.png
 *
 * `npm run logos` komutu simple-icons'ta bulunan markaları toplu üretiyor;
 * bu komut orada olmayanlar için. Kaynağı sen seçiyorsun — indirilen dosyanın
 * kullanım hakkı da sana ait, marka logoları tescillidir.
 *
 * SVG ise rengi rozetin zeminine uyacak şekilde yeniden boyanıyor; PNG/WebP
 * olduğu gibi kaydediliyor (şeffaf zeminli sürüm tercih edilmeli).
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { BRAND_STYLES } from "@/domain/brands";
import { assertSafeFeedUrl, FeedFetchError } from "@/ingest/fetchFeed";

const MAX_BYTES = 2 * 1024 * 1024;

/** Uzantıyı içerik türünden belirler; sunucu yanlış söylerse gövdeye bakılıyor */
function pickExtension(contentType: string, body: Buffer): "svg" | "png" | "webp" | "jpg" | null {
  const head = body.subarray(0, 512).toString("utf8").trimStart().toLowerCase();
  if (head.startsWith("<svg") || head.startsWith("<?xml")) return "svg";

  if (body[0] === 0x89 && body[1] === 0x50) return "png";
  if (body[0] === 0xff && body[1] === 0xd8) return "jpg";
  if (body.subarray(8, 12).toString("ascii") === "WEBP") return "webp";

  if (contentType.includes("svg")) return "svg";
  return null;
}

/**
 * SVG'yi rozet zemini üstünde okunacak renge boyar.
 * Mevcut `fill` değerleri ve stil öznitelikleri temizleniyor; aksi halde
 * koyu zeminde koyu logo görünmez oluyor.
 */
function recolorSvg(svg: string, color: string): string {
  return svg
    .replace(/\s(fill|stroke)="(?!none")[^"]*"/gi, "")
    .replace(/\s(fill|stroke):\s*(?!none)[^;"']*/gi, "")
    .replace(/<svg([^>]*)>/i, (_all, attrs) => `<svg${attrs} fill="${color}">`);
}

async function main() {
  const [makeArg, url] = process.argv.slice(2);

  if (!makeArg || !url) {
    console.error('Kullanım: npm run logos:add -- "Marka Adı" <logo-adresi>');
    console.error("\nLogosu eksik markalar:");
    const missing = Object.keys(BRAND_STYLES).filter((m) => !HAS_LOGO.has(m));
    console.error("  " + missing.join(", "));
    process.exit(1);
  }

  // Marka adı büyük/küçük harf ve aksan farkına takılmasın
  const key =
    Object.keys(BRAND_STYLES).find(
      (m) => m.toLocaleLowerCase("tr") === makeArg.toLocaleLowerCase("tr"),
    ) ?? null;

  if (!key) {
    console.error(`Tanınmayan marka: ${makeArg}`);
    console.error("Geçerli adlar src/domain/brands.ts içinde tanımlı.");
    process.exit(1);
  }

  const style = BRAND_STYLES[key];

  try {
    await assertSafeFeedUrl(url);
  } catch (err) {
    console.error(err instanceof FeedFetchError ? err.message : String(err));
    process.exit(1);
  }

  const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(20_000) });
  if (!res.ok) {
    console.error(`Adres ${res.status} döndü.`);
    process.exit(1);
  }

  const body = Buffer.from(await res.arrayBuffer());
  if (body.length > MAX_BYTES) {
    console.error("Dosya çok büyük (2 MB üstü).");
    process.exit(1);
  }

  const ext = pickExtension(res.headers.get("content-type") ?? "", body);
  if (!ext) {
    console.error("İndirilen dosya bir görsel değil (SVG/PNG/WebP/JPG bekleniyordu).");
    process.exit(1);
  }

  const outDir = path.join(process.cwd(), "public", "logos");
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `${style.slug}.${ext}`);

  if (ext === "svg") {
    await writeFile(outPath, recolorSvg(body.toString("utf8"), style.ink ?? "#ffffff"), "utf8");
  } else {
    await writeFile(outPath, body);
  }

  console.log(`${key} logosu kaydedildi -> public/logos/${style.slug}.${ext}`);
  if (ext !== "svg") {
    console.log("Not: PNG şeffaf zeminli değilse rozette kutu gibi görünebilir.");
  }
}

/** `npm run logos` ile üretilen markalar — eksik listesini doğru göstermek için */
const HAS_LOGO = new Set([
  "Alfa Romeo", "Aston Martin", "Audi", "Bentley", "BMW", "Chevrolet", "Chrysler",
  "Citroën", "Dacia", "Ferrari", "Fiat", "Ford", "Honda", "Hyundai", "Infiniti",
  "Iveco", "Jeep", "Kia", "Lada", "Lamborghini", "Maserati", "Mazda", "MG", "Mini",
  "Mitsubishi", "Nissan", "Opel", "Peugeot", "Porsche", "Renault", "Seat", "Skoda",
  "Smart", "Subaru", "Suzuki", "Tesla", "Toyota", "Volkswagen", "Volvo",
]);

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
