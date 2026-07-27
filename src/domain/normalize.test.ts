import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCanonicalKey, fold, normalizeVehicle } from "./normalize";

test("Türkçe karakterleri ASCII'ye katlar", () => {
  assert.equal(fold("Şkoda Octavia"), "skoda octavia");
  assert.equal(fold("İSTANBUL"), "istanbul");
  assert.equal(fold("Ağrı  Dağı"), "agri dagi");
});

test("yapılandırılmış alanlardan aracı çözer", () => {
  const v = normalizeVehicle({
    make: "Volkswagen",
    model: "Golf",
    trim: "Comfortline",
    year: 2018,
    fuel: "Dizel",
    transmission: "Otomatik",
    body: "Hatchback",
    engine: "1.6",
  });

  assert.ok(v);
  assert.equal(v.make, "Volkswagen");
  assert.equal(v.model, "Golf");
  assert.equal(v.trim, "Comfortline");
  assert.equal(v.year, 2018);
  assert.equal(v.fuel, "dizel");
  assert.equal(v.transmission, "otomatik");
  assert.equal(v.engine, "1.6");
  assert.ok(v.confidence > 0.9);
});

test("her şey başlıkta olsa bile çözer", () => {
  const v = normalizeVehicle({
    title: "2019 Model VW PASSAT 1.6 TDI Highline DSG 95.000 KM",
  });

  assert.ok(v);
  assert.equal(v.make, "Volkswagen");
  assert.equal(v.model, "Passat");
  assert.equal(v.trim, "Highline");
  assert.equal(v.year, 2019);
  assert.equal(v.fuel, "dizel");
  assert.equal(v.engine, "1.6");
});

test("yazım hatalarını bulanık eşleştirir ve güveni düşürür", () => {
  const v = normalizeVehicle({ title: "Toyota Corola 1.6 Dream 2020 Otomatik" });
  assert.ok(v);
  assert.equal(v.model, "Corolla");
  assert.ok(v.confidence < 1, "bulanık eşleşme güveni düşürmeli");
});

test("marka yazılmasa bile modelden markayı çıkarır", () => {
  const v = normalizeVehicle({ title: "Egea 1.6 Multijet Lounge 2021 Sedan" });
  assert.ok(v);
  assert.equal(v.make, "Fiat");
  assert.equal(v.model, "Egea");
  assert.equal(v.fuel, "dizel");
});

test("en uzun alias kazanır — '3' değil '3 Serisi'", () => {
  const v = normalizeVehicle({ title: "BMW 320i 3 Serisi M Sport 2021 Otomatik 2.0" });
  assert.ok(v);
  assert.equal(v.model, "3 Serisi");
  assert.equal(v.trim, "M Sport");
});

test("LPG'yi benzinden ayırt eder", () => {
  const v = normalizeVehicle({ title: "Fiat Egea 1.4 Benzin & LPG Urban 2020" });
  assert.ok(v);
  assert.equal(v.fuel, "lpg");
});

test("model çözülemezse null döner", () => {
  assert.equal(normalizeVehicle({ title: "Ferrari F40 1990" }), null);
  assert.equal(normalizeVehicle({ title: "" }), null);
});

test("yıl yoksa kohort kurulamaz", () => {
  assert.equal(normalizeVehicle({ make: "Fiat", model: "Egea", trim: "Urban" }), null);
});

test("aynı araç farklı yazımlarda aynı anahtara düşer", () => {
  const a = normalizeVehicle({ title: "Volkswagen Golf 1.6 TDI Comfortline 2018 Otomatik" });
  const b = normalizeVehicle({ title: "VW GOLF 1.6 TDi COMFORTLINE 2018 OTOMATIK" });
  assert.ok(a && b);
  assert.equal(a.canonicalKey, b.canonicalKey);
});

test("kanonik anahtar tüm ayırt edici alanları içerir", () => {
  const key = buildCanonicalKey({
    make: "Fiat",
    model: "Egea",
    trim: "Urban",
    year: 2020,
    engine: "1.4",
    fuel: "benzin",
    transmission: "manuel",
    body: "sedan",
  });
  assert.equal(key, "fiat|egea|urban|2020|1.4|benzin|manuel|sedan");
});

test("kilometre motor hacmi sanılmaz", () => {
  const v = normalizeVehicle({ title: "Renault Clio Icon 2021 Otomatik 45.000 km" });
  assert.ok(v);
  assert.equal(v.engine, null);
});
