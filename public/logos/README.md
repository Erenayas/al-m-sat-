# Marka logoları

Panel `<slug>.svg` (ya da `.png` / `.webp` / `.jpg`) dosyasını arar; bulursa
basar, bulamazsa markanın kurumsal renginde harf rozeti gösterir. Kod değişmez.

Slug'lar `src/domain/brands.ts` içindeki `BRAND_STYLES` tablosunda tanımlı.
Örnek: `ferrari.svg`, `volkswagen.svg`, `mercedes-benz.svg`, `land-rover.svg`

## Toplu üretim

```bash
npm run logos
```

`simple-icons` paketinden 38 markayı üretir. O paketteki SVG'ler CC0 lisanslı.
Eşleme elle doğrulanır: pakette "Proton" e-posta şirketi, "Toggl" zaman takip
uygulaması olarak geçtiği için slug benzerliğine güvenilmez.

## Tek marka ekleme

```bash
npm run logos:add -- "Mercedes-Benz" https://kaynak.com/mercedes.svg
```

Adresi doğrular, indirir, SVG ise rozet zeminine uyacak renge boyar ve doğru
isimle kaydeder. Argümansız çalıştırırsan logosu eksik markaları listeler.

## Telif

Marka logoları tescilli markadır. `npm run logos` ile üretilenlerin SVG
dosyaları CC0 olsa da markanın kendisi sahibine aittir. Elle eklediklerinin
kaynağı ve kullanım hakkı senin sorumluluğunda.
