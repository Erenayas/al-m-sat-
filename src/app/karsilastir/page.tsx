import Link from "next/link";
import { Card, DealBadge, Empty, PressureBar } from "@/components/ui";
import { formatKm, formatPct, formatTL, formatTLShort, timeAgo } from "@/lib/format";
import { getListingsByIds } from "@/lib/queries";
import type { ListingRow } from "@/lib/listings";

export const dynamic = "force-dynamic";

/**
 * Karşılaştırma tablosu.
 *
 * Satırlar özellik, sütunlar araç. Bu yön bilinçli: galeri "hangisi daha iyi"
 * sorusunu özellik özellik yatay okuyarak cevaplıyor. Her satırda en iyi değer
 * işaretleniyor, çünkü asıl iş kararı orada veriliyor.
 */

type Direction = "lower" | "higher" | "none";

interface Row {
  label: string;
  /** Hücrede gösterilecek metin */
  render: (l: ListingRow) => React.ReactNode;
  /** Karşılaştırılabilir sayısal değer; yoksa satırda "en iyi" işaretlenmez */
  value?: (l: ListingRow) => number | null;
  better?: Direction;
  hint?: string;
}

const ROWS: Row[] = [
  {
    label: "Fiyat",
    render: (l) => <span className="font-semibold">{formatTL(l.price)}</span>,
    value: (l) => l.price,
    better: "lower",
  },
  {
    label: "Beklenen fiyat",
    hint: "Kohort medyanının yıl, km, donanım ve hasara göre düzeltilmiş hali",
    render: (l) => formatTL(l.expectedPrice),
    value: (l) => l.expectedPrice,
    better: "none",
  },
  {
    label: "Fırsat skoru",
    hint: "Pozitif = beklenen fiyatın altında",
    render: (l) => <DealBadge score={l.dealScore} confidence={l.scoreConfidence} />,
    value: (l) => l.dealScore,
    better: "higher",
  },
  {
    label: "Skor güveni",
    hint: "Kohort ne kadar kalabalık ve ne kadar derli toplu",
    render: (l) =>
      l.scoreConfidence == null ? "—" : `${Math.round(l.scoreConfidence * 100)}%`,
    value: (l) => l.scoreConfidence,
    better: "higher",
  },
  { label: "Model yılı", render: (l) => l.year ?? "—", value: (l) => l.year, better: "higher" },
  { label: "Kilometre", render: (l) => formatKm(l.km), value: (l) => l.km, better: "lower" },
  {
    label: "Yıllık ortalama km",
    hint: "Yaşına göre çok mu kullanılmış",
    render: (l) => {
      const age = l.year ? Math.max(1, new Date().getFullYear() - l.year) : null;
      return age && l.km ? formatKm(Math.round(l.km / age)) : "—";
    },
    value: (l) => {
      const age = l.year ? Math.max(1, new Date().getFullYear() - l.year) : null;
      return age && l.km ? l.km / age : null;
    },
    better: "lower",
  },
  {
    label: "Hasar kaydı",
    render: (l) =>
      l.damageRecord ? (
        <span className="text-high">{formatTLShort(l.damageRecord)}</span>
      ) : (
        <span className="text-hot">Hasarsız</span>
      ),
    value: (l) => l.damageRecord ?? 0,
    better: "lower",
  },
  {
    label: "Boyalı / değişen",
    render: (l) => `${l.paintedParts ?? 0} / ${l.changedParts ?? 0}`,
    value: (l) => (l.paintedParts ?? 0) + (l.changedParts ?? 0) * 2,
    better: "lower",
  },
  { label: "Yakıt", render: (l) => l.fuel ?? "—" },
  { label: "Vites", render: (l) => l.transmission ?? "—" },
  { label: "Motor", render: (l) => l.engine ?? "—" },
  { label: "Paket", render: (l) => l.trim ?? "—" },
  {
    label: "İlanda kalma",
    hint: "Uzun süre satılmayan araçta pazarlık payı yüksek",
    render: (l) => `${l.daysOnMarket} gün`,
    value: (l) => l.daysOnMarket,
    better: "higher",
  },
  {
    label: "Fiyat değişimi",
    render: (l) =>
      l.totalChangePct == null || l.totalChangePct === 0 ? (
        <span className="text-muted">Hiç kırmadı</span>
      ) : (
        <span className={l.totalChangePct < 0 ? "text-hot" : "text-high"}>
          {formatPct(l.totalChangePct)} ({l.dropCount}x)
        </span>
      ),
    value: (l) => l.totalChangePct ?? 0,
    better: "lower",
  },
  {
    label: "Satıcı baskısı",
    hint: "0-100. Yüksekse teklif verilecek adres burası.",
    render: (l) => <PressureBar value={l.pressure} />,
    value: (l) => l.pressure,
    better: "higher",
  },
  { label: "Galeri", render: (l) => l.sellerName ?? "—" },
  {
    label: "Konum",
    render: (l) => [l.city, l.district].filter(Boolean).join(" / ") || "—",
  },
  { label: "İlk görülme", render: (l) => timeAgo(l.firstSeenAt) },
];

/** Satırdaki en iyi değeri taşıyan ilan id'leri (beraberlik olabilir) */
function bestIds(row: Row, listings: ListingRow[]): Set<number> {
  if (!row.value || !row.better || row.better === "none") return new Set();
  const pairs = listings
    .map((l) => ({ id: l.id, v: row.value!(l) }))
    .filter((p): p is { id: number; v: number } => p.v != null);
  if (pairs.length < 2) return new Set();

  const best = row.better === "lower"
    ? Math.min(...pairs.map((p) => p.v))
    : Math.max(...pairs.map((p) => p.v));
  // Hepsi eşitse "en iyi" işaretlemenin bilgi değeri yok
  if (pairs.every((p) => p.v === best)) return new Set();
  return new Set(pairs.filter((p) => p.v === best).map((p) => p.id));
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string | string[] }>;
}) {
  const { ids: raw } = await searchParams;
  const idParam = Array.isArray(raw) ? raw[0] : raw;
  const ids = (idParam ?? "")
    .split(",")
    .map((s) => Number.parseInt(s, 10))
    .filter((n) => Number.isFinite(n))
    .slice(0, 6);

  const listings = await getListingsByIds(ids);

  if (!listings.length) {
    return (
      <Card title="Karşılaştırma">
        <Empty>
          Karşılaştırmak için{" "}
          <Link href="/ilanlar" className="text-accent">
            ilanlar
          </Link>{" "}
          sayfasından araç seç.
        </Empty>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-xl font-semibold">Karşılaştırma</h1>
        <p className="text-sm text-muted">{listings.length} araç · fiyata göre sıralı</p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="sticky left-0 bg-surface text-left text-xs font-medium text-muted px-3 py-3 min-w-40">
                  Özellik
                </th>
                {listings.map((l) => (
                  <th key={l.id} className="px-3 py-3 text-left align-top min-w-52">
                    <Link href={`/ilan/${l.id}`} className="block">
                      <span className="block font-medium">
                        {l.make} {l.model}
                      </span>
                      <span className="block text-xs text-muted">
                        {[l.year, l.trim, l.engine].filter(Boolean).join(" · ")}
                      </span>
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => {
                const best = bestIds(row, listings);
                return (
                  <tr key={row.label} className="border-b border-border last:border-0">
                    <th
                      scope="row"
                      className="sticky left-0 bg-surface text-left font-normal text-muted px-3 py-2.5 align-top"
                      title={row.hint}
                    >
                      {row.label}
                      {row.hint && <span className="text-muted/60"> ⓘ</span>}
                    </th>
                    {listings.map((l) => (
                      <td
                        key={l.id}
                        className={`px-3 py-2.5 whitespace-nowrap ${
                          best.has(l.id) ? "bg-hot-bg/60 font-medium" : ""
                        }`}
                      >
                        {row.render(l)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-xs text-muted">
        Yeşil hücreler o satırdaki en iyi değeri gösterir. Fırsat skoru ve satıcı
        baskısı birlikte okunmalı: skoru yüksek ama baskısı düşük bir ilanda pazarlık
        payı az, tersi durumda fiyat daha da inebilir.
      </p>
    </div>
  );
}
