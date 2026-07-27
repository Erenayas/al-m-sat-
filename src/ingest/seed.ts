/**
 * Demo veri üreteci.
 *
 * Gerçek feed bağlanana kadar paneli anlamlı veriyle çalıştırmak için.
 * İki şeye dikkat ediliyor:
 *   1. Başlıklar bilerek düzensiz yazılıyor (kısaltma, büyük harf, Türkçe karakter
 *      hatası, eksik alan) — normalizer'ın gerçek feed'lerde göreceği kirlilik bu.
 *   2. 45 günlük geçmiş gün gün simüle ediliyor; ilanlar giriyor, fiyat kırıyor,
 *      satılıp düşüyor. Devir hızı ve satıcı baskısı ancak böyle anlam kazanıyor.
 */

import { sql as rawSql } from "@/db";
import { TAXONOMY } from "@/domain/taxonomy";
import { ingestListings, recomputeStatsAndScores, upsertSource } from "./pipeline";
import type { RawListing } from "./types";

/**
 * Simülasyon penceresi. 90 gün, çünkü "ölü stok" (60 gün+) ve devir hızı
 * göstergelerinin anlamlı olması için ilanların o kadar yaşlanabilmesi gerekiyor.
 */
const DAYS = 90;
/** Pencere her zaman "şimdi"de biter — böylece panel ne zaman çalıştırılırsa çalıştırılsın taze görünür */
const TODAY = new Date();

/** Deterministik PRNG — seed aynıysa üretilen pazar da aynı */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260727);

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];
const between = (lo: number, hi: number) => lo + rnd() * (hi - lo);
const intBetween = (lo: number, hi: number) => Math.floor(between(lo, hi + 1));
/** Ortalaması 0 olan kaba normal dağılım */
const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) / 1.155;

/** 2020 model referans fiyatları (TL) — yıl ve donanım buradan türetiliyor */
const BASE_PRICE_2020: Record<string, number> = {
  "Volkswagen Golf": 1_450_000, "Volkswagen Passat": 1_900_000, "Volkswagen Polo": 1_050_000,
  "Volkswagen Tiguan": 2_100_000, "Volkswagen Jetta": 1_350_000,
  "Renault Clio": 950_000, "Renault Megane": 1_150_000, "Renault Symbol": 850_000,
  "Renault Captur": 1_150_000, "Renault Taliant": 850_000,
  "Fiat Egea": 950_000, "Fiat Fiorino": 850_000, "Fiat Doblo": 900_000,
  "Ford Focus": 1_250_000, "Ford Fiesta": 900_000, "Ford Kuga": 1_800_000,
  "Ford Transit Custom": 1_600_000,
  "Opel Astra": 1_150_000, "Opel Corsa": 950_000, "Opel Insignia": 1_500_000,
  "Opel Grandland": 1_700_000,
  "Toyota Corolla": 1_400_000, "Toyota C-HR": 1_750_000, "Toyota Yaris": 1_050_000,
  "Toyota RAV4": 2_400_000,
  "Honda Civic": 1_500_000, "Honda CR-V": 2_200_000, "Honda City": 1_100_000,
  "BMW 3 Serisi": 2_600_000, "BMW 5 Serisi": 3_600_000, "BMW 1 Serisi": 1_900_000,
  "BMW X1": 2_600_000,
  "Mercedes-Benz C-Serisi": 2_700_000, "Mercedes-Benz E-Serisi": 3_800_000,
  "Mercedes-Benz A-Serisi": 2_000_000, "Mercedes-Benz Vito": 2_100_000,
  "Audi A3": 1_900_000, "Audi A4": 2_500_000, "Audi A6": 3_400_000, "Audi Q3": 2_400_000,
  "Hyundai i20": 950_000, "Hyundai Tucson": 1_900_000, "Hyundai Bayon": 1_100_000,
  "Peugeot 301": 800_000, "Peugeot 308": 1_150_000, "Peugeot 3008": 1_700_000,
  "Dacia Duster": 1_150_000, "Dacia Sandero": 900_000,
  "Skoda Octavia": 1_350_000, "Skoda Superb": 1_800_000,
};

const GALLERIES = [
  { code: "oto-kadikoy", name: "Kadıköy Oto Galeri", city: "İstanbul", district: "Kadıköy", size: 1000 },
  { code: "bayrampasa-motors", name: "Bayrampaşa Motors", city: "İstanbul", district: "Bayrampaşa", size: 1260 },
  { code: "ankara-oto-plaza", name: "Ankara Oto Plaza", city: "Ankara", district: "Çankaya", size: 900 },
  { code: "izmir-ege-oto", name: "Ege Oto", city: "İzmir", district: "Bornova", size: 740 },
  { code: "bursa-nilufer-auto", name: "Nilüfer Auto", city: "Bursa", district: "Nilüfer", size: 630 },
  { code: "antalya-akdeniz-oto", name: "Akdeniz Oto", city: "Antalya", district: "Muratpaşa", size: 580 },
  { code: "konya-selcuk-oto", name: "Selçuk Oto", city: "Konya", district: "Selçuklu", size: 470 },
  { code: "adana-cukurova-oto", name: "Çukurova Oto", city: "Adana", district: "Seyhan", size: 420 },
];

/**
 * Model yılı dağılımı. Galeri stoğu düz dağılmıyor; 4-8 yaş bandında yoğunlaşıyor
 * (çok yenisi bayide, çok eskisi galeri stoğuna girmiyor).
 */
const YEAR_POOL = [
  2015, 2015, 2016, 2016, 2016,
  2017, 2017, 2017, 2018, 2018, 2018, 2018,
  2019, 2019, 2019, 2019, 2020, 2020, 2020, 2020,
  2021, 2021, 2021, 2022, 2022, 2022, 2023, 2023, 2024, 2025,
];

/**
 * Model popülerliği. Gerçek pazar birkaç modelde yoğunlaşıyor (Egea, Clio, Corolla...),
 * uzun kuyruk seyrek. Düz dağıtım yapılırsa hiçbir kohortta istatistik oluşmuyor —
 * bu ağırlıklar o yoğunlaşmayı taklit ediyor.
 */
const MODEL_POPULARITY: Record<string, number> = {
  "Fiat Egea": 10, "Renault Clio": 8, "Renault Megane": 7, "Volkswagen Passat": 7,
  "Toyota Corolla": 7, "Volkswagen Golf": 6, "Opel Astra": 6, "Ford Focus": 6,
  "Hyundai i20": 5, "Renault Symbol": 5, "Dacia Sandero": 5, "Peugeot 301": 4,
  "Volkswagen Polo": 4, "Opel Corsa": 4, "Honda Civic": 4, "Skoda Octavia": 4,
  "Dacia Duster": 4, "Peugeot 308": 3, "Toyota Yaris": 3, "Renault Captur": 3,
  "Fiat Fiorino": 3, "Fiat Doblo": 3, "Renault Taliant": 3, "Hyundai Tucson": 3,
  "Volkswagen Jetta": 2, "Volkswagen Tiguan": 2, "Ford Fiesta": 2, "Opel Insignia": 2,
  "Mercedes-Benz C-Serisi": 2, "BMW 3 Serisi": 2, "Audi A3": 2, "Toyota C-HR": 2,
  "Peugeot 3008": 2, "Hyundai Bayon": 2, "Honda City": 2, "Ford Transit Custom": 2,
  "Mercedes-Benz Vito": 2, "Audi A4": 1, "BMW 1 Serisi": 1, "BMW 5 Serisi": 1,
  "BMW X1": 1, "Mercedes-Benz E-Serisi": 1, "Mercedes-Benz A-Serisi": 1,
  "Audi A6": 1, "Audi Q3": 1, "Skoda Superb": 1, "Opel Grandland": 1,
  "Ford Kuga": 1, "Toyota RAV4": 1, "Honda CR-V": 1,
};

/** Ağırlıklara göre genişletilmiş (marka, model) havuzu — seçim tek satırda kalsın diye */
const MODEL_POOL = TAXONOMY.flatMap((make) =>
  make.models.flatMap((model) => {
    const key = `${make.name} ${model.name}`;
    const weight = MODEL_POPULARITY[key] ?? 1;
    // Fiyat tablosunda karşılığı olmayan modeli havuza alma
    return BASE_PRICE_2020[key] ? Array<{ make: typeof make; model: typeof model }>(weight).fill({ make, model }) : [];
  }),
);

const FUEL_WORDS = ["Dizel", "Benzin", "Benzin & LPG", "Hibrit"];
const TRANS_WORDS = ["Manuel", "Otomatik", "Yarı Otomatik", "DSG", "Düz Vites"];

interface Car {
  id: string;
  gallery: (typeof GALLERIES)[number];
  make: string;
  model: string;
  trim: string;
  trimTier: number;
  year: number;
  engine: string;
  fuel: string;
  transmission: string;
  body: string;
  km: number;
  damage: number;
  painted: number;
  changed: number;
  /** Simülasyonda hangi gün ilana çıktı */
  listedOn: number;
  /** Hangi gün satıldı (>= DAYS ise hâlâ ilanda) */
  soldOn: number;
  startPrice: number;
  /** Gün -> yeni fiyat */
  priceDrops: Map<number, number>;
  /** Kirli başlık üretim biçimi */
  titleStyle: number;
}

/** Yıla göre fiyat çarpanı — 2020 referans, yıllık ~%10 */
const yearFactor = (year: number) => Math.pow(1.1, year - 2020);

function buildCar(idx: number): Car {
  const gallery = pick(GALLERIES);
  const { make, model } = pick(MODEL_POOL);
  const base = BASE_PRICE_2020[`${make.name} ${model.name}`];

  const trimDef = pick(model.trims);
  const year = pick(YEAR_POOL);
  const age = Math.max(0, 2026 - year);
  const km = Math.max(1_000, Math.round((age * 15_000 + gauss() * 22_000) / 1000) * 1000);

  // Fiyatın kendisi: taban x yıl x donanım x km x hasar x satıcı gürültüsü
  const expectedKm = age * 15_000;
  const kmFactor = Math.min(1.25, Math.max(0.75, 1 - ((km - expectedKm) / 10_000) * 0.011));
  const trimFactor = 1 + ((trimDef.tier - 50) / 100) * 0.25;

  const hasDamage = rnd() < 0.42;
  const damage = hasDamage ? Math.round((base * yearFactor(year) * between(0.005, 0.09)) / 1000) * 1000 : 0;
  const damageFactor = damage > 0 ? 1 - Math.min(0.3, 0.18 * Math.log1p((damage / (base * yearFactor(year))) * 12)) : 1;

  // Satıcı gürültüsü: çoğu piyasa, bir kısmı bilinçli ucuz/pahalı
  const roll = rnd();
  const sellerFactor =
    roll < 0.08 ? between(0.80, 0.90) : // gerçek fırsat
    roll < 0.20 ? between(0.90, 0.96) :
    roll > 0.92 ? between(1.10, 1.22) : // hayal fiyat
    1 + gauss() * 0.035;

  const price =
    Math.round((base * yearFactor(year) * kmFactor * trimFactor * damageFactor * sellerFactor) / 5000) * 5000;

  // Ucuz araç hızlı döner: satış süresi fiyat pozisyonuyla ters orantılı
  const baseDom = Math.round(28 * Math.pow(sellerFactor, 4) + between(-6, 10));
  // Kesirli gün: son 3 gün saatlik tarandığı için ilanlar gün içine de dağılıyor
  const listedOn = intBetween(-20, DAYS - 1) + rnd();
  const soldOn = listedOn + Math.max(3, baseDom);

  // Uzun süre satılmayanlar fiyat kırıyor
  const priceDrops = new Map<number, number>();
  let current = price;
  for (let d = listedOn + 21; d < Math.min(soldOn, DAYS); d += intBetween(14, 25)) {
    current = Math.round((current * between(0.93, 0.98)) / 5000) * 5000;
    priceDrops.set(d, current);
  }

  const fuelWord =
    model.segment === "ticari" ? "Dizel" : pick(FUEL_WORDS);
  const transWord = pick(TRANS_WORDS);

  return {
    id: `${gallery.code}-${1000 + idx}`,
    gallery,
    make: make.name,
    model: model.name,
    trim: trimDef.name,
    trimTier: trimDef.tier,
    year,
    engine: pick(["1.0", "1.2", "1.4", "1.5", "1.6", "1.8", "2.0"]),
    fuel: fuelWord,
    transmission: transWord,
    body: pick(model.body),
    km,
    damage,
    painted: hasDamage ? intBetween(1, 6) : 0,
    changed: hasDamage && rnd() < 0.4 ? intBetween(1, 3) : 0,
    listedOn,
    soldOn,
    startPrice: price,
    priceDrops,
    titleStyle: intBetween(0, 4),
  };
}

/** Türkçe karakterleri bozarak gerçek ilanlardaki yazım hatalarını taklit eder */
function mangle(s: string): string {
  return s.replace(/İ/g, "I").replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g");
}

const MAKE_SHORTHAND: Record<string, string> = {
  Volkswagen: "VW",
  "Mercedes-Benz": "Mercedes",
};

/** Aynı araç için kaynaktan kaynağa değişen başlık formatları */
function buildTitle(car: Car): string {
  const make = car.titleStyle % 2 === 0 ? (MAKE_SHORTHAND[car.make] ?? car.make) : car.make;
  const parts = [make, car.model, car.engine, car.fuel === "Dizel" ? "TDI" : "", car.trim];
  switch (car.titleStyle) {
    case 0:
      return parts.filter(Boolean).join(" ");
    case 1:
      return `${car.year} Model ${parts.filter(Boolean).join(" ")}`;
    case 2:
      return mangle(parts.filter(Boolean).join(" ").toUpperCase());
    case 3:
      return `${parts.filter(Boolean).join(" ")} ${car.transmission} ${car.km.toLocaleString("tr-TR")} KM`;
    default:
      return mangle(`${car.model} ${car.engine} ${car.trim} ${car.year}`);
  }
}

function priceOnDay(car: Car, day: number): number {
  let price = car.startPrice;
  for (const [d, p] of car.priceDrops) if (d <= day) price = p;
  return price;
}

/** Belirli bir günde, belirli bir galerinin feed'inde görünen ilanlar */
function feedFor(gallery: (typeof GALLERIES)[number], cars: Car[], day: number): RawListing[] {
  return cars
    .filter((c) => c.gallery.code === gallery.code && c.listedOn <= day && c.soldOn > day)
    .map((car) => {
      // Bazı feed'ler yapılandırılmış alan göndermiyor, her şey başlıkta —
      // normalizer'ın bu durumu da çözebildiğini görmek için bilinçli olarak boş bırakılıyor.
      const sparse = car.titleStyle === 4;
      return {
        externalId: car.id,
        title: buildTitle(car),
        make: sparse ? undefined : car.make,
        model: sparse ? undefined : car.model,
        trim: sparse ? undefined : car.trim,
        year: sparse ? undefined : car.year,
        engine: car.engine,
        fuel: sparse ? undefined : car.fuel,
        transmission: sparse ? undefined : car.transmission,
        body: sparse ? undefined : car.body,
        price: priceOnDay(car, day),
        currency: "TRY",
        km: car.km,
        city: gallery.city,
        district: gallery.district,
        sellerType: "galeri" as const,
        sellerName: gallery.name,
        damageRecord: car.damage,
        paintedParts: car.painted,
        changedParts: car.changed,
        url: `https://ornek-galeri.test/${gallery.code}/ilan/${car.id}`,
        description: `${car.year} model ${car.make} ${car.model} ${car.trim}. ${
          car.damage === 0 ? "Hasar kaydı yoktur." : `Tramer ${car.damage.toLocaleString("tr-TR")} TL.`
        } ${car.transmission} vites, ${car.fuel}.`,
      };
    });
}

async function main() {
  // Güvenlik kilidi: bu betik demo verisi üretiyor ve piyasa tablolarını siliyor.
  // Panelde gerçek stok varsa, kazayla çalıştırılması galerinin araç kayıtlarını
  // riske atıyor — açık onay olmadan devam etmiyor.
  const [{ count }] = await rawSql<{ count: string }[]>`
    select count(*)::text as count from stock_vehicles`;
  if (Number(count) > 0 && !process.argv.includes("--force")) {
    console.error(
      `DURDURULDU: panelde ${count} gerçek stok kaydı var.\n` +
        "Bu betik demo verisi üretir ve piyasa tablolarını siler.\n" +
        "Gerçekten istiyorsan: npm run seed -- --force",
    );
    await rawSql.end();
    process.exit(1);
  }

  console.log("Piyasa tabloları temizleniyor...");
  // TRUNCATE ... CASCADE kullanılmıyor: `stock_vehicles.vehicle_id` kanonik araç
  // tablosuna bağlı olduğu için cascade, galerinin kendi stoğunu da siliyordu.
  // Önce bağ koparılıp sonra sırayla siliniyor; stok tablolarına dokunulmuyor.
  await rawSql`update stock_vehicles set vehicle_id = null where vehicle_id is not null`;
  await rawSql`delete from price_events`;
  await rawSql`delete from market_stats`;
  await rawSql`delete from listings`;
  await rawSql`delete from vehicles`;
  await rawSql`delete from sources`;
  await rawSql`delete from saved_searches`;

  const total = GALLERIES.reduce((a, g) => a + g.size, 0);
  console.log(`${total} araçlık envanter üretiliyor...`);
  const cars: Car[] = [];
  for (let i = 0; i < total; i++) cars.push(buildCar(i));

  const sourceIds = new Map<string, number>();
  for (const g of GALLERIES) {
    sourceIds.set(
      g.code,
      await upsertSource({
        code: g.code,
        name: g.name,
        kind: "gallery_xml",
        url: `https://ornek-galeri.test/${g.code}/stok.xml`,
        city: g.city,
      }),
    );
  }

  // Tarama takvimi: eski geçmiş günlük, son 3 gün 3 saatlik.
  // Gerçek sistemde de feed'ler periyodik yoklanıyor; sık tarama yalnızca
  // "anlık akış" ekranının anlamlı olduğu yakın geçmişte gerekiyor.
  const ticks: { index: number; at: Date }[] = [];
  for (let d = 0; d <= DAYS - 4; d++) {
    ticks.push({ index: d, at: new Date(TODAY.getTime() - (DAYS - 1 - d) * 86_400_000) });
  }
  for (let hoursAgo = 69; hoursAgo >= 0; hoursAgo -= 3) {
    ticks.push({
      index: DAYS - 1 - hoursAgo / 24,
      at: new Date(TODAY.getTime() - hoursAgo * 3_600_000),
    });
  }

  console.log(`${DAYS} günlük geçmiş ${ticks.length} taramada simüle ediliyor...`);
  for (const [i, tick] of ticks.entries()) {
    for (const g of GALLERIES) {
      const raws = feedFor(g, cars, tick.index);
      await ingestListings(sourceIds.get(g.code)!, g.code, raws, { now: tick.at });
    }
    if (i % 20 === 0 || i === ticks.length - 1) {
      process.stdout.write(`  tarama ${i + 1}/${ticks.length}\n`);
    }
  }

  console.log("Kohort istatistikleri ve fırsat skorları hesaplanıyor...");
  const res = await recomputeStatsAndScores(TODAY);
  console.log(`  ${res.cohorts} kohort, ${res.scored} ilan skorlandı`);

  const [summary] = await rawSql<{ active: string; sold: string; unmatched: string }[]>`
    select
      count(*) filter (where status = 'active')::text  as active,
      count(*) filter (where status = 'removed')::text as sold,
      count(*) filter (where vehicle_id is null)::text as unmatched
    from listings
  `;

  console.log(
    `\nHazır: ${summary.active} aktif ilan, ${summary.sold} satılmış, ${summary.unmatched} eşleşmeyen.`,
  );
  await rawSql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
