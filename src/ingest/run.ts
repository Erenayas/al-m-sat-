/**
 * Ingest çalıştırıcısı. Cron'dan çağrılmak üzere tasarlandı:
 *
 *   *\/15 * * * *  npm run ingest
 *
 * Kaynak listesi `feeds.json` dosyasından okunuyor; yeni bir galeri eklemek
 * kod değişikliği değil, tek satır konfigürasyon.
 */

import { readFile } from "node:fs/promises";
import { sql } from "@/db";
import { galleryXmlAdapter } from "./adapters/galleryXml";
import { recomputeStatsAndScores, runAdapter } from "./pipeline";
import type { FeedAdapter } from "./types";

interface FeedConfig {
  code: string;
  name: string;
  url: string;
  city?: string;
  kind?: "gallery_xml";
}

async function loadAdapters(path: string): Promise<FeedAdapter[]> {
  const raw = await readFile(path, "utf8");
  const feeds = JSON.parse(raw) as FeedConfig[];
  return feeds.map((f) => galleryXmlAdapter(f));
}

async function main() {
  const configPath = process.argv[2] ?? "feeds.json";

  let adapters: FeedAdapter[];
  try {
    adapters = await loadAdapters(configPath);
  } catch (err) {
    console.error(
      `Feed konfigürasyonu okunamadı (${configPath}). Örnek için feeds.example.json dosyasına bak.`,
    );
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }

  if (!adapters.length) {
    console.log("Tanımlı feed yok, yapılacak iş yok.");
    await sql.end();
    return;
  }

  console.log(`${adapters.length} kaynak taranıyor...`);
  let failed = 0;

  // Kaynaklar sırayla işleniyor: bir galerinin feed'i çökse bile diğerleri devam etsin
  // ve tek bir hata tüm turu düşürmesin.
  for (const adapter of adapters) {
    try {
      const report = await runAdapter(adapter);
      console.log(
        `  ${report.source}: ${report.fetched} ilan · ${report.inserted} yeni · ` +
          `${report.priceChanges} fiyat değişimi · ${report.removed} düştü · ` +
          `${report.unmatched} eşleşmedi`,
      );
    } catch (err) {
      failed++;
      console.error(`  ${adapter.code}: HATA — ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log("Kohort istatistikleri ve skorlar güncelleniyor...");
  const res = await recomputeStatsAndScores();
  console.log(`  ${res.cohorts} kohort, ${res.scored} ilan skorlandı`);

  await sql.end();
  if (failed) process.exitCode = 1;
}

main().catch(async (err) => {
  console.error(err);
  await sql.end().catch(() => {});
  process.exit(1);
});
