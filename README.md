# Oto Alım-Satım Paneli

Galeriler ve araç alım-satımı yapanlar için ilan akışı, fiyat konumlandırma ve
stok analizi paneli.

Panelin sattığı şey "yeni ilan bildirimi" değil — onu galeri zaten alıyor.
Sattığı şey şu üç soruya verilen cevap:

- **Bu araç piyasanın ne kadar altında/üstünde?** (fırsat skoru)
- **Bu kohort kaç günde dönüyor?** (devir hızı)
- **Satıcı ne kadar sıkışmış?** (fiyat geçmişi + satıcı baskısı)

## Veri kaynağı yaklaşımı

Portal sitelerinden veri kazımak üzerine kurulu **değil**. Ticari bir üründe
bu hem kullanım şartları ihlali hem de haksız rekabet davası riski.

Bunun yerine arz tarafı toplanıyor: galeriler stoklarını zaten XML olarak dışa
veriyor (Otoplus, Oto Yazılım vb. stok programlarından). Galeri onboard edildiğinde
feed'ini kendisi veriyor — hem veri sorunu çözülüyor hem de zaten müşteri olacak
kitle toplanmış oluyor.

Yeni bir kaynak eklemek `FeedAdapter` arayüzünü uygulamak demek; normalize ve
skorlama katmanı hiç değişmiyor.

## Kurulum

```bash
npm install
cp .env.example .env.local        # DATABASE_URL'i kendine göre düzenle
createdb otopanel
npm run db:push                   # şemayı veritabanına uygula
npm run seed                      # gerçekçi demo verisi üret (90 günlük geçmiş)
npm run dev
```

`http://localhost:3000`

## Komutlar

| Komut | İş |
|---|---|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` / `npm start` | Üretim derlemesi ve sunucu |
| `npm run typecheck` | TypeScript kontrolü |
| `npm test` | Birim testleri (normalize, fiyatlama, XML ayrıştırma) |
| `npm run db:push` | Şemayı veritabanına uygula |
| `npm run db:studio` | Drizzle Studio |
| `npm run seed` | Demo verisi üret (mevcut veriyi siler) |
| `npm run ingest [feeds.json]` | Gerçek feed'leri tara ve skorları güncelle |

## Gerçek feed bağlama

`feeds.example.json` dosyasını `feeds.json` olarak kopyala ve galerilerin
XML adreslerini yaz:

```json
[{ "code": "ornek-galeri", "name": "Örnek Oto", "url": "https://...", "city": "İstanbul" }]
```

Sonra periyodik çalıştır:

```
*/15 * * * *  cd /path/to/panel && npm run ingest
```

Her tur idempotent: aynı ilan tekrar geldiğinde `lastSeenAt` güncellenir, fiyat
değiştiyse `price_events`'e satır düşer, feed'den kaybolduğunda `removedAt`
damgalanır. Satış süresi ve devir hızı buradan üretilir.

## Mimari

```
feed (XML/JSON)
   ↓  src/ingest/adapters/*      kaynağa özgü ayrıştırma
   ↓  src/domain/normalize.ts    metin → kanonik araç (kohort anahtarı)
   ↓  src/ingest/pipeline.ts     upsert + fiyat geçmişi + kohort istatistiği
   ↓  src/domain/pricing.ts      beklenen fiyat, fırsat skoru, satıcı baskısı
   ↓  src/lib/queries.ts         panelin okuduğu sorgular
   ↓  src/app/*                  Next.js App Router sayfaları
```

### Kritik parça: eşleştirme (`src/domain/normalize.ts`)

Aynı araba beş kaynakta beş farklı yazılıyor ("VW GOLF 1.6 TDi COMFORTLINE",
"Volkswagen Golf Comfortline 1.6", "Golf 1.6 Comfortlıne"). Kohortlar burada
doğru kurulmazsa fiyat istatistiğinin tamamı çöp oluyor.

Motor; marka/model/paket sözlüğünü alias'larla tarıyor, tutmazsa Levenshtein
mesafesiyle bulanık eşleştiriyor ve her eşleşmeyi bir `confidence` ile döndürüyor.
Güveni düşük eşleşmeler piyasa istatistiğine katılmıyor.

### Fiyatlama (`src/domain/pricing.ts`)

```
beklenen fiyat = kohort medyanı × yıl × km × donanım × (hasar / kohort ort. hasarı)
fırsat skoru   = (beklenen − ilan fiyatı) / beklenen × 100
```

Kohort merdiveni dardan genişe iniyor — tam kanonik araç → marka+model+yıl+yakıt+vites
→ marka+model+yıl → marka+model. 2.el pazarının uzun kuyruğunda en dar kohort
neredeyse hiç dolmadığı için bu kademe şart; geniş kohorta düşüldüğünde skorun
güveni otomatik olarak azalıyor.

İki nokta özellikle önemli:

- **Yıl düzeltmesi**, geniş kohortta model yılı kohortun parçası olmadığı için
  devreye giriyor. Beklenen km de yaşa göre kaydırılıyor — yoksa yıl ve km
  düzeltmeleri aynı yaş farkını iki kez cezalandırıyor.
- **Hasar düzeltmesi kohort ortalamasına göre normalize ediliyor.** Kohort medyanı
  zaten hasarlı araçları içerdiği için ortalama bir hasar cezasını üstünde taşıyor;
  normalize edilmezse hasarsız araçlar sistematik olarak "pahalı" görünüyor.

## Ekranlar

- **Fırsatlar** — KPI'lar, son 24 saatin akışı, en iyi fırsatlar, fiyat kıranlar,
  uzun süredir dönmeyenler
- **İlanlar** — filtreli liste (marka/model/il/galeri/yıl/fiyat/km/skor), URL'de
  saklanan filtre durumu, çoklu seçim
- **Karşılaştırma** — özellik özellik yan yana; her satırda en iyi değer işaretli
- **Stok Analizi** — galerinin kendi stoğu: fazla fiyatlanmış araçlar, ölü stok
- **İlan detayı** — fiyat geçmişi grafiği, satıcı baskısı, aynı kohorttaki rakipler

## Yığın

Next.js 16 (App Router) · React 19 · TypeScript · PostgreSQL 16 · Drizzle ORM ·
Tailwind CSS 4

## Yol haritası

- [ ] Kayıtlı arama + Telegram/push bildirimi (`saved_searches` tablosu hazır)
- [ ] Kullanıcı/galeri hesapları ve yetkilendirme
- [ ] TRAMER / muayene km kaydı doğrulaması (km tutarsızlığı bayrağı)
- [ ] Kohort bazlı devir hızı tahmini ("bu araç bu fiyata ~kaç günde satılır")
- [ ] Eşleşmeyen ilanlar için elle düzeltme kuyruğu
