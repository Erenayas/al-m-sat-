/**
 * Marka logolarını üretir: `npm run logos`
 *
 * Kaynak `simple-icons` paketi — SVG dosyaları CC0 lisanslı, yani depoya
 * konabilir ve dağıtılabilir. Google'dan görsel indirmek yerine bu yol
 * seçildi: oradaki dosyalar üçüncü kişilerin telifli dosyaları.
 *
 * Eşleme elle ve doğrulamalı yapılıyor. `simple-icons` içinde "Proton"
 * e-posta şirketi, "Toggl" zaman takip uygulaması olarak geçiyor; slug
 * benzerliğine güvenip otomatik eşleştirmek yanlış logo basardı.
 *
 * Eşleşmeyen markalar dosyasız kalıyor ve panelde kurumsal renkli harf
 * rozetiyle görünüyor (bkz. BrandBadge).
 *
 * Not: SVG dosyaları CC0 olsa da markaların kendisi tescillidir. Ürünü
 * satarken logoları kullanma hakkını kendin değerlendirmelisin.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import * as si from "simple-icons";
import { BRAND_STYLES } from "@/domain/brands";

/** Marka adı -> simple-icons anahtarı. Beklenen başlık, yanlış eşleşmeye karşı. */
const MAP: Record<string, { key: string; title: string }> = {
  "Alfa Romeo": { key: "siAlfaromeo", title: "Alfa Romeo" },
  "Aston Martin": { key: "siAstonmartin", title: "Aston Martin" },
  Audi: { key: "siAudi", title: "Audi" },
  Bentley: { key: "siBentley", title: "Bentley" },
  BMW: { key: "siBmw", title: "BMW" },
  Chevrolet: { key: "siChevrolet", title: "Chevrolet" },
  Chrysler: { key: "siChrysler", title: "Chrysler" },
  "Citroën": { key: "siCitroen", title: "Citroën" },
  Dacia: { key: "siDacia", title: "Dacia" },
  Ferrari: { key: "siFerrari", title: "Ferrari" },
  Fiat: { key: "siFiat", title: "Fiat" },
  Ford: { key: "siFord", title: "Ford" },
  Honda: { key: "siHonda", title: "Honda" },
  Hyundai: { key: "siHyundai", title: "Hyundai" },
  Infiniti: { key: "siInfiniti", title: "INFINITI" },
  Iveco: { key: "siIveco", title: "IVECO" },
  Jeep: { key: "siJeep", title: "Jeep" },
  Kia: { key: "siKia", title: "Kia" },
  Lada: { key: "siLada", title: "LADA" },
  Lamborghini: { key: "siLamborghini", title: "Lamborghini" },
  Maserati: { key: "siMaserati", title: "Maserati" },
  Mazda: { key: "siMazda", title: "Mazda" },
  MG: { key: "siMg", title: "MG" },
  Mini: { key: "siMini", title: "Mini" },
  Mitsubishi: { key: "siMitsubishi", title: "Mitsubishi" },
  Nissan: { key: "siNissan", title: "Nissan" },
  Opel: { key: "siOpel", title: "Opel" },
  Peugeot: { key: "siPeugeot", title: "Peugeot" },
  Porsche: { key: "siPorsche", title: "Porsche" },
  Renault: { key: "siRenault", title: "Renault" },
  Seat: { key: "siSeat", title: "SEAT" },
  Skoda: { key: "siSkoda", title: "ŠKODA" },
  Smart: { key: "siSmart", title: "smart" },
  Subaru: { key: "siSubaru", title: "Subaru" },
  Suzuki: { key: "siSuzuki", title: "Suzuki" },
  Tesla: { key: "siTesla", title: "Tesla" },
  Toyota: { key: "siToyota", title: "Toyota" },
  Volkswagen: { key: "siVolkswagen", title: "Volkswagen" },
  Volvo: { key: "siVolvo", title: "Volvo" },
};

interface Icon {
  title: string;
  path: string;
}

async function main() {
  const outDir = path.join(process.cwd(), "public", "logos");
  await mkdir(outDir, { recursive: true });

  const icons = si as unknown as Record<string, Icon | undefined>;
  let written = 0;
  const skipped: string[] = [];
  const mismatched: string[] = [];

  for (const [make, style] of Object.entries(BRAND_STYLES)) {
    const entry = MAP[make];
    if (!entry) {
      skipped.push(make);
      continue;
    }

    const icon = icons[entry.key];
    if (!icon) {
      skipped.push(`${make} (${entry.key} bulunamadı)`);
      continue;
    }

    // Paket güncellenince başka bir markanın logosu gelmesin diye
    if (icon.title !== entry.title) {
      mismatched.push(`${make}: beklenen "${entry.title}", gelen "${icon.title}"`);
      continue;
    }

    // Rozet zemini markanın rengi; logo, zemin üstünde okunan renkte basılıyor
    const fill = style.ink ?? "#ffffff";
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" role="img" aria-label="${icon.title}">` +
      `<title>${icon.title}</title>` +
      `<path fill="${fill}" d="${icon.path}"/>` +
      `</svg>\n`;

    await writeFile(path.join(outDir, `${style.slug}.svg`), svg, "utf8");
    written++;
  }

  console.log(`${written} logo üretildi -> public/logos/`);

  if (mismatched.length) {
    console.error("\nUYUŞMAYAN (logo yazılmadı):");
    for (const s of mismatched) console.error(`  ${s}`);
  }

  console.log(`\n${skipped.length} marka logosuz — harf rozetiyle gösterilecek:`);
  console.log("  " + skipped.join(", "));

  if (mismatched.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
