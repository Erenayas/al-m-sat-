import assert from "node:assert/strict";
import { test } from "node:test";
import { isDemoUrl } from "./listings";

test("çözümlenmeyen demo adresleri ayırt edilir", () => {
  assert.equal(isDemoUrl("https://ornek-galeri.test/oto-kadikoy/ilan/123"), true);
  assert.equal(isDemoUrl("https://foo.example/ilan/1"), true);
  assert.equal(isDemoUrl("http://bir.sey.invalid/x"), true);
  assert.equal(isDemoUrl("http://localhost/x"), true);
});

test("gerçek adresler link olarak açılır", () => {
  assert.equal(isDemoUrl("https://kadikoyoto.com.tr/ilan/123"), false);
  assert.equal(isDemoUrl("https://www.galeri-x.com/stok/vw-golf-2018"), false);
  // ".test" yalnızca alan adının sonundaysa demo sayılmalı
  assert.equal(isDemoUrl("https://test.galerim.com/ilan/9"), false);
  assert.equal(isDemoUrl("https://galerim.com/test/9"), false);
});

test("eksik veya bozuk adres link üretmez", () => {
  assert.equal(isDemoUrl(null), false);
  assert.equal(isDemoUrl(undefined), false);
  assert.equal(isDemoUrl(""), false);
  assert.equal(isDemoUrl("bu bir url değil"), false);
});
