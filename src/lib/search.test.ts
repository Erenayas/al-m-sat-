import assert from "node:assert/strict";
import { test } from "node:test";
import { fold, searchOptions } from "./search";
import {
  COLORS,
  ENGINE_SIZES,
  MAKE_ALIASES,
  MAKE_NAMES,
  MODELS_BY_MAKE,
  TRIMS_BY_MODEL,
} from "@/domain/taxonomy";

const MAKES = MAKE_NAMES.map((name) => ({ value: name, aliases: MAKE_ALIASES[name] }));
const first = (q: string) => searchOptions(q, MAKES)[0]?.value ?? null;

test("Türkçe karakterler katlanır", () => {
  assert.equal(fold("Şkoda"), "skoda");
  assert.equal(fold("Citroën"), "citroen");
  assert.equal(fold("Land Rover"), "landrover");
});

test("baştan yazınca doğru marka ilk sırada", () => {
  assert.equal(first("vol"), "Volkswagen");
  assert.equal(first("mer"), "Mercedes-Benz");
  assert.equal(first("toy"), "Toyota");
  assert.equal(first("fer"), "Ferrari");
  assert.equal(first("ren"), "Renault");
});

test("yanlış yazımlar doğru markaya gider", () => {
  // Kullanıcının bizzat verdiği örnek
  assert.equal(first("vosvogen"), "Volkswagen");
  assert.equal(first("vosvagen"), "Volkswagen");
  assert.equal(first("wolksvagen"), "Volkswagen");
  assert.equal(first("merdeces"), "Mercedes-Benz");
  assert.equal(first("pejo"), "Peugeot");
  assert.equal(first("ferari"), "Ferrari");
  assert.equal(first("şkoda"), "Skoda");
  assert.equal(first("hunday"), "Hyundai");
  assert.equal(first("sitroen"), "Citroën");
  assert.equal(first("mitsubisi"), "Mitsubishi");
});

test("kısaltma ve takma adlar çalışır", () => {
  assert.equal(first("vw"), "Volkswagen");
  assert.equal(first("mb"), "Mercedes-Benz");
  assert.equal(first("bmw"), "BMW");
  assert.equal(first("alfa"), "Alfa Romeo");
});

test("büyük/küçük harf ve boşluk fark etmez", () => {
  assert.equal(first("LAND ROVER"), "Land Rover");
  assert.equal(first("landrover"), "Land Rover");
  assert.equal(first("  audi  "), "Audi");
});

test("boş sorgu tüm markaları döndürür", () => {
  const all = searchOptions("", MAKES, 200);
  assert.equal(all.length, MAKE_NAMES.length);
});

test("alakasız sorgu eşleşme üretmez", () => {
  assert.equal(searchOptions("zzzqqqxyz", MAKES).length, 0);
});

test("model araması marka içinde çalışır", () => {
  const vwModels = MODELS_BY_MAKE["Volkswagen"].map((v) => ({ value: v }));
  assert.equal(searchOptions("pasat", vwModels)[0]?.value, "Passat");
  assert.equal(searchOptions("golf", vwModels)[0]?.value, "Golf");
  assert.equal(searchOptions("tıguan", vwModels)[0]?.value, "Tiguan");

  const toyotaModels = MODELS_BY_MAKE["Toyota"].map((v) => ({ value: v }));
  assert.equal(searchOptions("corola", toyotaModels)[0]?.value, "Corolla");
});

test("taksonomi kapsamı ürünü taşıyacak genişlikte", () => {
  assert.ok(MAKE_NAMES.length >= 50, `marka sayısı yetersiz: ${MAKE_NAMES.length}`);

  const totalModels = Object.values(MODELS_BY_MAKE).reduce((s, ms) => s + ms.length, 0);
  assert.ok(totalModels >= 350, `model sayısı yetersiz: ${totalModels}`);

  // Türkiye'de fiilen satılan markalar eksik kalmamalı
  for (const brand of [
    "Volkswagen", "Renault", "Fiat", "Ford", "Toyota", "Hyundai", "Peugeot",
    "Citroën", "Opel", "Dacia", "Kia", "Nissan", "Honda", "BMW", "Mercedes-Benz",
    "Audi", "Skoda", "Seat", "Volvo", "Tesla", "Togg", "BYD", "Ferrari",
  ]) {
    assert.ok(MAKE_NAMES.includes(brand), `eksik marka: ${brand}`);
  }
});

test("her markanın en az bir modeli var", () => {
  for (const make of MAKE_NAMES) {
    assert.ok((MODELS_BY_MAKE[make] ?? []).length > 0, `${make} modelsiz kalmış`);
  }
});

test("her modelin paket listesi dolu", () => {
  const empty = Object.entries(TRIMS_BY_MODEL)
    .filter(([, trims]) => trims.length === 0)
    .map(([key]) => key);
  assert.deepEqual(empty, [], `paketsiz model kalmış: ${empty.slice(0, 5).join(", ")}`);
});

test("paket araması yazım hatasını tolere eder", () => {
  const golf = TRIMS_BY_MODEL["Volkswagen|Golf"].map((v) => ({ value: v }));
  assert.equal(searchOptions("comfortlıne", golf)[0]?.value, "Comfortline");
  assert.equal(searchOptions("highline", golf)[0]?.value, "Highline");

  const kia = TRIMS_BY_MODEL["Kia|Sportage"].map((v) => ({ value: v }));
  assert.equal(searchOptions("prestij", kia)[0]?.value, "Prestige");
});

test("renk ve motor listeleri seçim kutusunu besleyecek kadar dolu", () => {
  assert.ok(COLORS.length >= 15, "renk listesi kısa");
  assert.ok(ENGINE_SIZES.length >= 12, "motor listesi kısa");

  const colors = COLORS.map((v) => ({ value: v }));
  assert.equal(searchOptions("beyz", colors)[0]?.value, "Beyaz");
  assert.equal(searchOptions("gumus", colors)[0]?.value, "Gümüş Gri");
});
