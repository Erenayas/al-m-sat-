# Durum ve Yol Haritası

Projenin nerede olduğunu, hangi kararların neden alındığını ve sıradaki işleri
tutan not. Kaldığımız yerden devam ederken önce burası okunmalı.

Son güncelleme: 27 Temmuz 2026

---

## Ürün ne

Oto galerileri için **stok, maliyet ve kâr takibi** paneli. Satış argümanı tek
bir soruya verilen cevap:

> Bu araç bana gerçekte kaça mal oldu ve kaç gün sermayemi yedi?

Galerici alış ve satış fiyatını biliyor; ekspertiz, boya, bakım, noter, çekici
masraflarını **biliyor ama toplamıyor**. Doğrulanmış örnek: 1.250.000'e alınan
araca 55.000 masraf biniyor, gerçek maliyet 1.305.000. 1.480.000'e satılınca
galericinin sandığı kâr 230.000, gerçek kâr **175.000**.

İkinci ve daha ayırt edici metrik **günlük kâr / yıllık getiri**: 200 günde
80 bin kazandıran araç, 30 günde 50 bin kazandırandan kötüdür. Hiçbir galeri
programı bu karşılaştırmayı yapmıyor.

## İş modeli

- Hedef: **3-5 müşteriye** doğrudan satış, aylık abonelik
- Gerçekçi bant: aylık 500-3.000 TL. 15 müşteri x 1.500 = 22.500 TL/ay
- Reklam bütçesi yok; satış tek tek görüşmeyle yapılacak
- Ürün önce yazılıyor, sonra pazarlanıyor (sipariş üzerine değil)

## Neden bu ürün seçildi

Sektörün iş akışı her galeride birebir aynı: araç al → masraf yap → ilana koy →
sat. Tahmine dayalı ürün ancak böyle standart bir sektörde çalışıyor. Ayrıca
kodun büyük kısmı zaten elde hazırdı ve galerinin ödeme gücü yüksek.

---

## Kapatılmış konu: piyasa verisi

Proje "sahibinden'den anlık ilan çekelim" fikriyle başladı. Araştırıldı ve
**kapatıldı**:

- Portalların kullanım şartları veri kazımayı yasaklıyor; ticari üründe
  haksız rekabet davası riski gerçek
- `ikinciyeni.com` robots.txt'inde ClaudeBot'u ismen `Disallow: /` yapmış
- `arabam.com` GPTBot ve diğer AI botlarını engelliyor, filtre yolları kapalı
- Galeri XML feed'leri var ama indekslenmiyor; portallara özel veriliyor

Sonuç: piyasa verisi ancak bir galerinin **kendi feed'ini vermesiyle** gelir.
`/pazar` modülü bunun için hazır bekliyor ama bağlı kaynak yokken **gizli**.

---

## Teknik durum

| | |
|---|---|
| Depo | https://github.com/Erenayas/al-m-sat- |
| Yerel | `~/dev/alim-satim-panel` |
| Yığın | Next.js 16 · React 19 · TypeScript · PostgreSQL 16 · Drizzle · Tailwind 4 |
| Test | 77 birim testi, hepsi geçiyor |
| Veritabanı | yerel `otopanel`, `brew services` ile çalışıyor |

### Çalışan modüller

- **Stok/kâr takibi** — araç, masraf, satış, tahsilat, cari. Ana ürün.
- **Cariler** — kimden alındı/kime satıldı + o kişiyle tüm araç geçmişi
- **Çoklu galeri + giriş** — her galeri ayrı tenant, veriler tenant'a kilitli
- **Taksonomi** — 59 marka, 448 model, %100 paket kapsamı
- **Seçim kutuları** — yazım hatası toleranslı ("vosvogen" → Volkswagen)
- **Marka logoları** — 38 marka gerçek logo (simple-icons, CC0)
- **Piyasa modülü** — kod hazır, kaynak yokken gizli

### Alınmış teknik kararlar

- **Kâr materyalize edilmiyor**, her okumada `domain/profit.ts` ile hesaplanıyor.
  Masraf araç satıldıktan sonra da gelebiliyor; kolonda tutulsa bayatlardı.
- **Sermaye getirisi maliyet ağırlıklı**. 2 milyonluk araçtaki %5 ile 300
  binlik araçtaki %20'yi eşit saymak performansı yanlış gösteriyor.
- **Sorgu fonksiyonları `tenantId`'yi zorunlu ilk argüman alıyor.** Opsiyonel
  olsaydı bir çağrıda unutulunca sessizce tüm galerilerin verisi dönerdi.
- **`proxy.ts` yetkilendirme yapmıyor**, sadece iyimser çerez kontrolü.
  Gerçek kontrol her sayfa ve her action içinde `requireSession()` ile.
- **Paketler marka bazında** tanımlı; üreticiler zaten öyle adlandırıyor.

### Yolda yakalanan gerçek hatalar

1. `seed` betiğindeki `TRUNCATE ... CASCADE`, `stock_vehicles.vehicle_id` bağı
   üzerinden **galerinin gerçek araç kayıtlarına yayılıyordu**. Artık bağ
   koparılıp sırayla siliniyor ve gerçek stok varken betik `--force` olmadan
   çalışmayı reddediyor.
2. Fiyat modelinde yıl ve km düzeltmesi aynı yaş farkını iki kez
   cezalandırıyordu; hasar cezası kohort ortalamasına göre normalize edilmiyordu.
3. Seçim kutusunda değer seçilince kutuda görünmüyordu (görünen metin ile
   seçili değer ayrı durumlardaydı).
4. `fold` Avrupa aksanlarını katlamıyordu ("Citroën" → "citron").
5. Menü ikonlarının SVG yolları elle yazılmıştı ve viewBox dışına taşıyordu.

---

## Kurulum ve komutlar

```bash
npm install
cp .env.example .env.local
createdb otopanel
npm run db:push
npm run tenant -- ekle "Galeri Adı" slug eposta@ornek.com "Ad Soyad"
npm run dev
```

| Komut | İş |
|---|---|
| `npm run tenant -- liste` | Galeriler, araç sayıları, son giriş |
| `npm run tenant -- parola <eposta>` | Parola sıfırla (oturumları düşürür) |
| `npm run tenant -- askiya <slug>` | Ödeme gelmezse girişi kapat, veri durur |
| `npm run logos` | 38 markanın logosunu üret |
| `npm run logos:add -- "Marka" <url>` | Eksik logoyu indir |
| `npm test` · `npm run typecheck` · `npm run build` | Kontroller |

Mevcut hesap: `bertayeren@gmail.com` / galeri "Eren Oto Galeri" (`eren`).
Parolayı unutursan `npm run tenant -- parola bertayeren@gmail.com`.

---

## Sıradaki işler

### Satmadan önce şart

1. **Sunucuya kurulum** — alan adı, HTTPS, yönetilen PostgreSQL, **otomatik
   yedek**. Yedek kritik: galerinin tüm alım-satım kaydı orada duracak.
2. **Kullanıcının kendi parolasını değiştirebileceği ayarlar ekranı.** Şu an
   her sıfırlama CLI'dan yapılıyor.

### Ürünü zorunlu hale getiren (tartışıldı, seçim yapılmadı)

Panel şu an iyi bir **analiz aracı** ama günlük açılan bir araç değil.
"Bu ay ne kazandım" aylık bir soru; aylık açılan yazılıma aylık ücret
ödetmek zor. İki aday:

- **Müşteri/talep takibi** — galeriye gün boyu "şu araba duruyor mu" diye
  telefon geliyor ve çoğu unutuluyor. "3 gün önce Golf soran Ahmet'i
  aramadın" diyen panel her sabah açılır. *Önerilen.*
- **Evrak üretimi** — satış sözleşmesi ve teslim tutanağını doldurup PDF
  vermek. Satış yapmak için paneli açmak zorunda kalır.

### İkinci öncelik

- Takas zinciri arayüzü (`trade_in_for_id` alanı hazır)
- Araç fotoğrafı ve belge yükleme
- Aylık kâr/zarar raporu, Excel dışa aktarma
- Galeri başına birden fazla çalışan hesabı ve yetki ayrımı
- Eksik 21 markanın logosu (`npm run logos:add`)

---

## Açık uyarılar

- Marka logoları tescillidir. `simple-icons` SVG'leri CC0 ama markanın
  kendisi sahibine ait; ürünü satarken bu senin değerlendirmen.
- `npm run seed` demo piyasa verisi üretir ve piyasa tablolarını siler.
  **Müşteri kurulumunda asla çalıştırılmamalı.**
- Panel henüz tek makinede; müşteriye verilmeden önce sunucu şart.
