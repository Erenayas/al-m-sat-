import assert from "node:assert/strict";
import { test } from "node:test";
import {
  analyzePricePressure,
  computeCohortStats,
  computePressure,
  damageAdjustment,
  dealLabel,
  kmAdjustment,
  percentile,
  scoreListing,
  turnoverDays,
  yearAdjustment,
} from "./pricing";

const points = (prices: number[], km = 100_000, year = 2020) =>
  prices.map((price) => ({ price, km, year }));

test("yüzdelik hesabı", () => {
  const s = [10, 20, 30, 40, 50];
  assert.equal(percentile(s, 0), 10);
  assert.equal(percentile(s, 0.5), 30);
  assert.equal(percentile(s, 1), 50);
  assert.equal(percentile([], 0.5), 0);
});

test("örneklem yetersizse kohort kurulmaz", () => {
  assert.equal(computeCohortStats(points([100, 110, 120, 130])), null);
});

test("düşük eşleşme güvenli ilanlar istatistiğe girmez", () => {
  const noisy = points([100, 110, 120, 130, 140]).map((p) => ({ ...p, confidence: 0.3 }));
  assert.equal(computeCohortStats(noisy), null);
});

test("uç fiyatlar medyanı bozmaz", () => {
  // 1 TL'lik giriş hatası ve bir sıfır fazlası atılmalı
  const stats = computeCohortStats(
    points([1, 950_000, 980_000, 1_000_000, 1_020_000, 1_050_000, 9_999_999]),
  );
  assert.ok(stats);
  assert.equal(stats.sampleSize, 5, "iki uç değer atılmalı");
  assert.ok(stats.median > 950_000 && stats.median < 1_050_000);
});

test("temizlemeden sonra örneklem kalmazsa kohort kurulmaz", () => {
  // Uç değer ayıklaması örneklemi eşiğin altına düşürüyorsa istatistik üretmemek
  // doğru davranış: yanlış bir medyan, medyansızlıktan daha zararlı.
  assert.equal(computeCohortStats(points([1, 1_000_000, 1_010_000, 1_020_000, 9_999_999])), null);
});

test("km düzeltmesi yönü ve sınırı", () => {
  assert.equal(kmAdjustment(100_000, 100_000, "C"), 1);
  assert.ok(kmAdjustment(200_000, 100_000, "C") < 1, "fazla km beklenen fiyatı düşürmeli");
  assert.ok(kmAdjustment(50_000, 100_000, "C") > 1, "az km beklenen fiyatı yükseltmeli");
  // Uç değerler modelin ekstrapolasyonuna bırakılmıyor
  assert.ok(kmAdjustment(900_000, 100_000, "C") >= 0.75);
  assert.equal(kmAdjustment(null, 100_000, "C"), 1);
});

test("premium segmentte km daha sert vurur", () => {
  const c = kmAdjustment(200_000, 100_000, "C");
  const e = kmAdjustment(200_000, 100_000, "E");
  assert.ok(e < c);
});

test("yıl düzeltmesi üstel ve sınırlı", () => {
  assert.equal(yearAdjustment(2020, 2020, "C"), 1);
  assert.ok(yearAdjustment(2023, 2020, "C") > 1.3);
  assert.ok(yearAdjustment(2015, 2020, "C") < 0.7);
  // 10 yıllık farkta bile kırpılmadan hesaplanabilmeli
  assert.ok(yearAdjustment(2025, 2015, "C") > 2.4);
  assert.equal(yearAdjustment(null, 2020, "C"), 1);
});

test("hasar cezası artan ama azalan hızda", () => {
  const price = 1_000_000;
  assert.equal(damageAdjustment(0, price), 1);
  assert.equal(damageAdjustment(null, price), 1);

  const small = 1 - damageAdjustment(20_000, price);
  const large = 1 - damageAdjustment(40_000, price);
  assert.ok(large > small, "daha büyük hasar daha çok düşürmeli");
  assert.ok(large < small * 2, "ceza doğrusal değil, azalan hızda artmalı");
  assert.ok(damageAdjustment(500_000, price) >= 0.65, "ceza tavanı olmalı");
});

test("piyasanın altındaki ilan pozitif skor alır", () => {
  const stats = computeCohortStats(points([1_000_000, 1_000_000, 1_000_000, 1_000_000, 1_000_000]));
  assert.ok(stats);

  const cheap = scoreListing(
    { price: 850_000, km: 100_000, year: 2020, trimTier: null, damageRecord: 0, segment: "C" },
    stats,
  );
  assert.ok(cheap.dealScore > 10);
  assert.equal(cheap.expectedPrice, 1_000_000);

  const pricey = scoreListing(
    { price: 1_200_000, km: 100_000, year: 2020, trimTier: null, damageRecord: 0, segment: "C" },
    stats,
  );
  assert.ok(pricey.dealScore < -10);
});

test("kohortun ortalama hasarı normalize edilir", () => {
  const stats = computeCohortStats(points([1_000_000, 1_000_000, 1_000_000, 1_000_000, 1_000_000]));
  assert.ok(stats);

  const input = {
    price: 1_000_000,
    km: 100_000,
    year: 2020,
    trimTier: null,
    damageRecord: 0,
    segment: "C" as const,
  };

  // Kohortun tamamı hasarlıysa, hasarsız bir araç medyanın üstünde beklenmeli —
  // aksi halde temiz araçlar sistematik olarak "pahalı" görünüyor.
  const meanDamageFactor = damageAdjustment(60_000, 1_000_000);
  const withBaseline = scoreListing(input, stats, { meanDamageFactor });
  assert.ok(
    withBaseline.expectedPrice > 1_000_000,
    "hasarsız araç, hasarlı kohortta medyanın üstünde beklenmeli",
  );

  const withoutBaseline = scoreListing(input, stats);
  assert.equal(withoutBaseline.expectedPrice, 1_000_000);
});

test("örneklem büyüdükçe güven artar, kohort dağıldıkça düşer", () => {
  const tight = computeCohortStats(points(Array(30).fill(1_000_000)));
  const wide = computeCohortStats(points([600_000, 800_000, 1_000_000, 1_300_000, 1_500_000]));
  assert.ok(tight && wide);

  const input = {
    price: 1_000_000,
    km: 100_000,
    year: 2020,
    trimTier: null,
    damageRecord: 0,
    segment: "C" as const,
  };
  assert.ok(scoreListing(input, tight).confidence > scoreListing(input, wide).confidence);
});

test("satıcı baskısı indirim ve beklemeyle artar", () => {
  assert.equal(computePressure(0, 0), 0);
  assert.ok(computePressure(-10, 0) >= 60);
  assert.ok(computePressure(0, 90) >= 40);
  assert.equal(computePressure(-50, 365), 100, "100 ile sınırlı olmalı");
});

test("fiyat geçmişinden indirim sayısı ve değişim çıkar", () => {
  const day = (n: number) => new Date(2026, 0, n);
  const p = analyzePricePressure(
    [
      { price: 1_000_000, observedAt: day(1) },
      { price: 950_000, observedAt: day(10) },
      { price: 950_000, observedAt: day(15) },
      { price: 900_000, observedAt: day(20) },
    ],
    30,
    day(25),
  );

  assert.equal(p.dropCount, 2);
  assert.equal(p.totalChange, -100_000);
  assert.equal(p.totalChangePct, -10);
  assert.equal(p.daysSinceLastDrop, 5);
  assert.ok(p.pressure > 60);
});

test("boş geçmiş baskı üretmez", () => {
  const p = analyzePricePressure([], 0, new Date());
  assert.equal(p.dropCount, 0);
  assert.equal(p.pressure, 0);
});

test("devir hızı yeterli örneklem ister", () => {
  const span = (days: number) => ({
    firstSeenAt: new Date(2026, 0, 1),
    removedAt: new Date(2026, 0, 1 + days),
  });
  assert.equal(turnoverDays([span(10), span(20)]), null);
  assert.equal(turnoverDays([span(10), span(20), span(30)]), 20);
});

test("düşük güvende fırsat iddiası edilmez", () => {
  assert.equal(dealLabel(25, 0.2).tone, "unknown");
  assert.equal(dealLabel(25, 0.8).tone, "hot");
  assert.equal(dealLabel(-20, 0.8).tone, "high");
  assert.equal(dealLabel(null, 0.9).tone, "unknown");
});
