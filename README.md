# Oto Galeri Paneli

Oto galerileri ve araç alım-satımı yapanlar için **stok, maliyet ve kâr takibi**.

Piyasadaki galeri programlarının çoğu "ilan bas" aracı. Bu panelin cevapladığı
soru başka — galeri sahibinin gerçekten merak ettiği soru:

> **Bu araç bana gerçekte kaça mal oldu ve kaç gün sermayemi yedi?**

Alış fiyatını herkes biliyor. Üstüne ekspertiz, boya, bakım, lastik, noter,
çekici biniyor ve gerçek kâr çoğu galeride **tahminen** biliniyor. Panel bunu
kalem kalem takip edip net rakamı çıkarıyor.

## Ne gösteriyor

- **Gerçek maliyet** — alış + tüm masraflar, araç başına
- **Net kâr ve getiri** — hem tutar hem yatırılan paranın yüzdesi
- **Günlük kâr ve yıllık getiri** — asıl kritik metrik. 200 günde 80 bin
  kazandıran araç, 30 günde 50 bin kazandırandan **kötüdür**; sermaye devir
  hızını hesaba katmayan her karşılaştırma yanlış sıralama üretir.
- **Bağlı sermaye** — şu an stokta ne kadar para duruyor
- **Ölü stok uyarısı** — 90 günü aşan araçlar ve orada kilitlenen tutar
- **Masraf dağılımı** — para hangi kaleme gidiyor
- **Cari takibi** — kimden kaç araç alındı, kime kaç araç satıldı
- **Vadeli satışta bakiye** — tahsil edilen ve kalan

Sermaye getirisi **maliyet ağırlıklı** hesaplanıyor: 2 milyonluk araçtaki %5 ile
300 binlik araçtaki %20'yi eşit saymak galerinin performansını yanlış gösteriyor.

## Kurulum

```bash
npm install
cp .env.example .env.local        # DATABASE_URL'i düzenle
createdb otopanel
npm run db:push
npm run dev
```

`http://localhost:3000` — panel boş başlar, ilk aracı ekleyince çalışmaya başlar.

## Komutlar

| Komut | İş |
|---|---|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` / `npm start` | Üretim derlemesi ve sunucu |
| `npm run typecheck` | TypeScript kontrolü |
| `npm test` | Birim testleri |
| `npm run db:push` | Şemayı veritabanına uygula |
| `npm run db:studio` | Drizzle Studio |
| `npm run seed` | **Demo** piyasa verisi üretir (bkz. uyarı) |
| `npm run ingest [feeds.json]` | Galeri feed'lerini tara |

> `npm run seed` demo verisi üretir ve piyasa tablolarını siler. Panelde gerçek
> stok kaydı varsa betik kendini durdurur; zorlamak için `npm run seed -- --force`.
> Müşteri kurulumunda bu komut hiç çalıştırılmamalı.

## Ekranlar

| Yol | İş |
|---|---|
| `/` | Panel — bağlı sermaye, bu ay kâr, sermaye getirisi, ölü stok, masraf dağılımı |
| `/araclar` | Stok listesi — filtre (stokta/rezerve/satılan/ölü) ve sıralama |
| `/araclar/yeni` | Araç alımı kaydı |
| `/araclar/[id]` | Araç detayı — masraf ekleme, satış kaydı, tahsilat takibi |
| `/cariler` | Müşteri ve tedarikçiler |
| `/pazar/*` | Piyasa analizi (ikinci katman — aşağıya bak) |

## İkinci katman: piyasa analizi

`/pazar` altındaki ekranlar galerinin **kendi** stoğunu değil, piyasadaki
ilanları analiz ediyor: fırsat skoru, fiyat kıranlar, kohort karşılaştırması.

Bu modül ancak bir veri kaynağı bağlandığında anlam kazanıyor. Kaynak, galerilerin
stok programlarından çıkan XML feed'leri — portal kazıma değil. `/pazar/kaynaklar`
ekranından iki adımda bağlanıyor: **Çözümle** (hiçbir şey yazmadan feed'in ne
getirdiğini raporlar) → **İçe aktar**.

Feed adresi kullanıcıdan gelip isteği sunucu attığı için SSRF koruması var:
yalnızca http/https, yalnızca standart portlar, DNS çözümlemesi sonrası
özel/döngü/link-local aralıklar reddediliyor (bulut metadata servisi dahil),
yönlendirme hedefi yeniden doğrulanıyor, gövde 25 MB ile sınırlı.

## Mimari

```
src/
  domain/
    profit.ts      maliyet, kâr, günlük kâr, yıllık getiri, portföy özeti
    pricing.ts     piyasa kohort istatistiği, fırsat skoru, satıcı baskısı
    normalize.ts   ilan metni → kanonik araç (alias sözlüğü + bulanık eşleşme)
    taxonomy.ts    Türkiye pazarı marka/model/paket sözlüğü
  db/
    inventory.ts   stok tarafı: araç, masraf, tahsilat, cari
    schema.ts      piyasa tarafı: ilan, kohort, fiyat geçmişi, kaynak
  ingest/          feed adaptörleri, güvenli çekme, işleme hattı
  lib/             sorgu katmanı ve biçimlendirme
  app/             Next.js App Router sayfaları
```

Kâr ve maliyet veritabanında materyalize **edilmiyor**, her okumada
`domain/profit.ts` üzerinden hesaplanıyor: masraf araç satıldıktan sonra da
gelebiliyor (gecikmiş fatura) ve materyalize bir kâr kolonu sessizce bayatlardı.

## Yığın

Next.js 16 (App Router) · React 19 · TypeScript · PostgreSQL 16 · Drizzle ORM ·
Tailwind CSS 4 · Zod

## Yol haritası

- [ ] Çoklu galeri (tenant) desteği ve kullanıcı hesapları
- [ ] Takas zinciri arayüzü (`trade_in_for_id` alanı hazır)
- [ ] Araç fotoğrafları ve belge yükleme
- [ ] Aylık kâr/zarar raporu ve dışa aktarma (Excel)
- [ ] Piyasa kohortuna bağlı araçlarda "stoğum piyasaya göre nerede" karşılaştırması
