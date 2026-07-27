import assert from "node:assert/strict";
import { test } from "node:test";
import { parseNumber } from "../types";
import { parseGalleryXml } from "./galleryXml";

test("Türkçe ve İngilizce sayı yazımlarını ayrıştırır", () => {
  assert.equal(parseNumber("1.150.000"), 1_150_000);
  assert.equal(parseNumber("1.150.000,50"), 1_150_000.5);
  assert.equal(parseNumber("1,150,000.50"), 1_150_000.5);
  assert.equal(parseNumber("850.000 TL"), 850_000);
  assert.equal(parseNumber("95.000 km"), 95_000);
  assert.equal(parseNumber("1.6"), 1.6);
  assert.equal(parseNumber(42), 42);
  assert.equal(parseNumber(""), undefined);
  assert.equal(parseNumber(null), undefined);
  assert.equal(parseNumber("bilinmiyor"), undefined);
});

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<ilanlar>
  <ilan>
    <ilanNo>A-1001</ilanNo>
    <marka>Volkswagen</marka>
    <model>Golf</model>
    <paket>Comfortline</paket>
    <modelYili>2018</modelYili>
    <kilometre>95.000</kilometre>
    <fiyat>1.150.000 TL</fiyat>
    <yakitTipi>Dizel</yakitTipi>
    <vites>Otomatik</vites>
    <kasaTipi>Hatchback</kasaTipi>
    <il>İstanbul</il>
    <ilce>Kadıköy</ilce>
    <tramer>0</tramer>
    <boyali>2</boyali>
    <fotograflar>
      <fotograf>https://ornek.test/1.jpg</fotograf>
      <fotograf>https://ornek.test/2.jpg</fotograf>
    </fotograflar>
    <aciklama>Hasar kaydı yoktur.</aciklama>
  </ilan>
  <ilan>
    <stokKodu>A-1002</stokKodu>
    <baslik>FIAT EGEA 1.6 MULTIJET LOUNGE</baslik>
    <marka>Fiat</marka>
    <model>Egea</model>
    <yil>2021</yil>
    <km>62000</km>
    <satisFiyati>980000</satisFiyati>
  </ilan>
  <ilan>
    <ilanNo>A-1003</ilanNo>
    <marka>Opel</marka>
  </ilan>
</ilanlar>`;

test("farklı etiket adlarını aynı alana eşler", () => {
  const rows = parseGalleryXml(XML, { sellerName: "Test Galeri", city: "İstanbul" });

  // Fiyatı olmayan üçüncü kayıt atılmalı
  assert.equal(rows.length, 2);

  const [golf, egea] = rows;
  assert.equal(golf.externalId, "A-1001");
  assert.equal(golf.make, "Volkswagen");
  assert.equal(golf.year, 2018);
  assert.equal(golf.km, 95_000);
  assert.equal(golf.price, 1_150_000);
  assert.equal(golf.fuel, "Dizel");
  assert.equal(golf.city, "İstanbul");
  assert.equal(golf.damageRecord, 0);
  assert.equal(golf.paintedParts, 2);
  assert.equal(golf.imageUrl, "https://ornek.test/1.jpg");

  // İkinci kayıt farklı etiketler kullanıyor: stokKodu / satisFiyati / yil
  assert.equal(egea.externalId, "A-1002");
  assert.equal(egea.price, 980_000);
  assert.equal(egea.year, 2021);
  assert.equal(egea.title, "FIAT EGEA 1.6 MULTIJET LOUNGE");
});

test("başlık yoksa marka/model/paketten üretilir", () => {
  const [golf] = parseGalleryXml(XML);
  assert.equal(golf.title, "Volkswagen Golf Comfortline");
});

test("kök etiket adı farklı olsa da ilan dizisini bulur", () => {
  const alt = `<root><stok><arac><id>X1</id><marka>Renault</marka><model>Clio</model><fiyat>750000</fiyat></arac>
    <arac><id>X2</id><marka>Renault</marka><model>Megane</model><fiyat>900000</fiyat></arac></stok></root>`;
  const rows = parseGalleryXml(alt);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].externalId, "X1");
  assert.equal(rows[1].model, "Megane");
});

test("boş gövde hata fırlatmaz", () => {
  assert.deepEqual(parseGalleryXml("<ilanlar></ilanlar>"), []);
});
