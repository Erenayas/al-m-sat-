import assert from "node:assert/strict";
import { test } from "node:test";
import {
  computeProfit,
  daysBetween,
  expenseBreakdown,
  stockAge,
  summarizePortfolio,
  totalCost,
} from "./profit";

test("gerçek maliyet alış artı tüm masraflar", () => {
  assert.equal(
    totalCost({
      purchasePrice: 1_000_000,
      expenses: [{ amount: 25_000 }, { amount: 8_500 }, { amount: 4_000 }],
    }),
    1_037_500,
  );
  assert.equal(totalCost({ purchasePrice: 500_000, expenses: [] }), 500_000);
});

test("masraf kırılımı kategoriye göre toplanır", () => {
  const b = expenseBreakdown([
    { amount: 20_000, category: "boya_kaporta" },
    { amount: 5_000, category: "boya_kaporta" },
    { amount: 3_000, category: "ekspertiz" },
    { amount: 1_000 },
  ]);
  assert.equal(b.boya_kaporta, 25_000);
  assert.equal(b.ekspertiz, 3_000);
  assert.equal(b.diger, 1_000);
});

test("gün farkı tarihten hesaplanır ve negatif olmaz", () => {
  assert.equal(daysBetween("2026-01-01", "2026-01-31"), 30);
  assert.equal(daysBetween("2026-03-01", "2026-03-01"), 0);
  assert.equal(daysBetween("2026-05-10", "2026-05-01"), 0);
});

test("satılan araçta kâr, marj ve getiri", () => {
  const r = computeProfit({
    purchasePrice: 1_000_000,
    expenses: [{ amount: 50_000 }],
    salePrice: 1_260_000,
    purchaseDate: "2026-01-01",
    saleDate: "2026-02-01",
  });

  assert.equal(r.cost, 1_050_000);
  assert.equal(r.profit, 210_000);
  assert.equal(r.daysHeld, 31);
  assert.equal(r.projected, false);
  // 210.000 / 1.260.000 = %16,7 marj
  assert.equal(r.marginPct, 16.7);
  // 210.000 / 1.050.000 = %20 getiri
  assert.equal(r.returnPct, 20);
  assert.equal(r.profitPerDay, Math.round(210_000 / 31));
});

test("hızlı dönen araç, çok kâr eden yavaş araçtan üstün çıkar", () => {
  const hizli = computeProfit({
    purchasePrice: 1_000_000,
    expenses: [],
    salePrice: 1_050_000,
    purchaseDate: "2026-01-01",
    saleDate: "2026-01-31", // 30 gün, 50 bin kâr
  });
  const yavas = computeProfit({
    purchasePrice: 1_000_000,
    expenses: [],
    salePrice: 1_080_000,
    purchaseDate: "2026-01-01",
    saleDate: "2026-07-20", // 200 gün, 80 bin kâr
  });

  assert.ok(yavas.profit! > hizli.profit!, "ham kârda yavaş araç önde");
  assert.ok(
    hizli.annualizedPct! > yavas.annualizedPct!,
    "sermaye getirisinde hızlı araç önde olmalı — ürünün asıl iddiası bu",
  );
  assert.ok(hizli.profitPerDay! > yavas.profitPerDay!);
});

test("stoktaki araç istenen fiyattan beklenen kâr üretir", () => {
  const r = computeProfit(
    {
      purchasePrice: 800_000,
      expenses: [{ amount: 30_000 }],
      salePrice: null,
      askingPrice: 950_000,
      purchaseDate: "2026-06-01",
    },
    new Date("2026-07-01T12:00:00"),
  );

  assert.equal(r.projected, true, "satılmamış araç tahmini olarak işaretlenmeli");
  assert.equal(r.cost, 830_000);
  assert.equal(r.profit, 120_000);
  assert.equal(r.daysHeld, 30);
});

test("fiyat bilgisi yoksa kâr uydurulmaz", () => {
  const r = computeProfit(
    {
      purchasePrice: 800_000,
      expenses: [],
      salePrice: null,
      askingPrice: null,
      purchaseDate: "2026-06-01",
    },
    new Date("2026-07-01T12:00:00"),
  );
  assert.equal(r.profit, null);
  assert.equal(r.annualizedPct, null);
  assert.equal(r.cost, 800_000);
  assert.equal(r.daysHeld, 30);
});

test("aynı gün alınıp satılan araçta bölme hatası olmaz", () => {
  const r = computeProfit({
    purchasePrice: 500_000,
    expenses: [],
    salePrice: 530_000,
    purchaseDate: "2026-04-10",
    saleDate: "2026-04-10",
  });
  assert.equal(r.daysHeld, 0);
  assert.equal(r.profitPerDay, 30_000);
  assert.ok(Number.isFinite(r.annualizedPct!), "yıllıklandırma sonsuza gitmemeli");
});

test("zararına satış negatif kâr verir", () => {
  const r = computeProfit({
    purchasePrice: 1_000_000,
    expenses: [{ amount: 60_000 }],
    salePrice: 980_000,
    purchaseDate: "2026-01-01",
    saleDate: "2026-03-01",
  });
  assert.equal(r.profit, -80_000);
  assert.ok(r.returnPct! < 0);
  assert.ok(r.annualizedPct! < 0);
});

test("stok yaşı eşikleri", () => {
  assert.equal(stockAge(5).level, "taze");
  assert.equal(stockAge(45).level, "normal");
  assert.equal(stockAge(70).level, "yaslanan");
  assert.equal(stockAge(95).level, "olu");
});

test("portföy özeti bağlı sermayeyi ve ölü stoğu ayırır", () => {
  const s = summarizePortfolio([
    { cost: 1_000_000, profit: null, daysHeld: 20, sold: false },
    { cost: 800_000, profit: null, daysHeld: 120, sold: false },
    { cost: 600_000, profit: 90_000, daysHeld: 30, sold: true },
    { cost: 1_400_000, profit: 70_000, daysHeld: 60, sold: true },
  ]);

  assert.equal(s.inStockCount, 2);
  assert.equal(s.soldCount, 2);
  assert.equal(s.tiedCapital, 1_800_000);
  assert.equal(s.totalProfit, 160_000);
  assert.equal(s.deadStockCount, 1);
  assert.equal(s.deadStockCapital, 800_000);
  assert.equal(s.avgDaysToSell, 45);
});

test("sermaye getirisi maliyet ağırlıklı hesaplanır", () => {
  // Küçük tutarda yüksek yüzde, büyük tutarda düşük yüzde.
  // Basit ortalama %35 derdi; ağırlıklı hesap gerçeği gösteriyor.
  const s = summarizePortfolio([
    { cost: 100_000, profit: 60_000, daysHeld: 365, sold: true }, // %60
    { cost: 1_900_000, profit: 190_000, daysHeld: 365, sold: true }, // %10
  ]);
  // (60.000 + 190.000) / 2.000.000 = %12,5
  assert.equal(s.capitalReturnPct, 12.5);
});

test("hiç satış yoksa getiri uydurulmaz", () => {
  const s = summarizePortfolio([{ cost: 500_000, profit: null, daysHeld: 10, sold: false }]);
  assert.equal(s.capitalReturnPct, null);
  assert.equal(s.avgDaysToSell, null);
  assert.equal(s.totalProfit, 0);
});
