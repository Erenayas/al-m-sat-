import assert from "node:assert/strict";
import { test } from "node:test";
import { generatePassword, hashPassword, verifyPassword } from "./password";

test("doğru parola doğrulanır", async () => {
  const hash = await hashPassword("galeri-parolasi-123");
  assert.equal(await verifyPassword("galeri-parolasi-123", hash), true);
});

test("yanlış parola reddedilir", async () => {
  const hash = await hashPassword("galeri-parolasi-123");
  assert.equal(await verifyPassword("galeri-parolasi-124", hash), false);
  assert.equal(await verifyPassword("", hash), false);
  assert.equal(await verifyPassword("galeri-parolasi-123 ", hash), false);
});

test("aynı parola her seferinde farklı özet üretir", async () => {
  // Tuz rastgele; aksi halde aynı parolayı kullanan iki hesap özetten anlaşılırdı
  const a = await hashPassword("aynisi");
  const b = await hashPassword("aynisi");
  assert.notEqual(a, b);
  assert.equal(await verifyPassword("aynisi", a), true);
  assert.equal(await verifyPassword("aynisi", b), true);
});

test("özet ham parolayı içermez", async () => {
  const hash = await hashPassword("cokGizliParola");
  assert.ok(!hash.includes("cokGizliParola"));
  assert.ok(hash.startsWith("scrypt$"));
});

test("bozuk özet çökmez, false döner", async () => {
  assert.equal(await verifyPassword("x", ""), false);
  assert.equal(await verifyPassword("x", "duz-metin"), false);
  assert.equal(await verifyPassword("x", "bcrypt$1$2$3"), false);
  assert.equal(await verifyPassword("x", "scrypt$16384$eksik"), false);
});

test("üretilen parola yeterince uzun ve URL güvenli", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 50; i++) {
    const p = generatePassword();
    assert.ok(p.length >= 12, "parola en az 12 karakter olmalı");
    assert.match(p, /^[A-Za-z0-9]+$/, "elle okunup yazılabilmeli");
    seen.add(p);
  }
  assert.equal(seen.size, 50, "üretilen parolalar tekrar etmemeli");
});
