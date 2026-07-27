import Link from "next/link";
import { ListingTable } from "@/components/ListingTable";
import { Card, Empty } from "@/components/ui";
import { formatDays, formatNumber, formatPct, formatTLShort } from "@/lib/format";
import { getStockSummaries, searchListings } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * Stok analizi.
 *
 * Diğer ekranlar galeriye pazarı gösteriyor; bu ekran galeriye kendini gösteriyor:
 * hangi araç piyasanın üstünde fiyatlanmış, hangisi ölü stok olmuş. Abonelik
 * yenilemesini asıl bu ekran taşıyor.
 */
export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ galeri?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.galeri) ? params.galeri[0] : params.galeri;

  const summaries = await getStockSummaries();
  const selected = summaries.find((s) => s.code === raw) ?? summaries[0];

  const problems = selected
    ? await searchListings({ source: selected.code, sort: "deal", limit: 200 })
    : [];

  // Sorunlu stok: piyasanın belirgin üstünde fiyatlanmış ya da 60 günü aşmış olanlar
  const overpriced = problems
    .filter((l) => (l.dealScore ?? 0) <= -7 && (l.scoreConfidence ?? 0) >= 0.4)
    .sort((a, b) => (a.dealScore ?? 0) - (b.dealScore ?? 0))
    .slice(0, 15);

  const deadStock = problems
    .filter((l) => l.daysOnMarket >= 60)
    .sort((a, b) => b.daysOnMarket - a.daysOnMarket)
    .slice(0, 15);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Stok Analizi</h1>
        <p className="text-sm text-muted mt-1">
          Kendi stoğunun piyasaya göre konumu: fazla fiyatlanan araçlar ve dönmeyen stok.
        </p>
      </div>

      <Card title="Galeriler" hint="Satır seçerek o galerinin stok detayına in">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted text-left border-b border-border">
                <th className="font-medium px-3 py-2">Galeri</th>
                <th className="font-medium px-3 py-2 text-right">Stok</th>
                <th className="font-medium px-3 py-2 text-right">Stok değeri</th>
                <th className="font-medium px-3 py-2 text-right">Medyan skor</th>
                <th className="font-medium px-3 py-2 text-right">Medyan yaş</th>
                <th className="font-medium px-3 py-2 text-right">Pahalı</th>
                <th className="font-medium px-3 py-2 text-right">Ölü stok</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((s) => {
                const active = s.code === selected?.code;
                return (
                  <tr
                    key={s.code}
                    className={`border-b border-border last:border-0 ${
                      active ? "bg-surface-2" : "hover:bg-surface-2"
                    }`}
                  >
                    <td className="px-3 py-2.5">
                      <Link href={`/stok?galeri=${s.code}`} className="block">
                        <span className="font-medium">{s.name}</span>
                        <span className="block text-xs text-muted">{s.city}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {formatNumber(s.activeCount)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {formatTLShort(s.totalValue)}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right tabular-nums ${
                        (s.medianDealScore ?? 0) < -3 ? "text-high" : ""
                      }`}
                    >
                      {formatPct(s.medianDealScore)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {formatDays(s.medianDaysOnMarket)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {formatNumber(s.overpriced)}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right tabular-nums ${
                        s.deadStock > 0 ? "text-high" : ""
                      }`}
                    >
                      {formatNumber(s.deadStock)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {!selected ? (
        <Card>
          <Empty>Henüz bağlı bir galeri feed&apos;i yok.</Empty>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card
            title={`Fazla fiyatlanmış — ${selected.name}`}
            hint="Piyasanın %7+ üstünde. Fiyat güncellenmezse dönmesi zor."
          >
            <ListingTable
              rows={overpriced}
              columns={["vehicle", "km", "price", "expected", "deal", "age"]}
              emptyText="Piyasanın belirgin üstünde fiyatlanmış araç yok."
            />
          </Card>

          <Card
            title={`Ölü stok — ${selected.name}`}
            hint="60 günü aşmış araçlar. Sermayenin en çok bağlandığı yer burası."
          >
            <ListingTable
              rows={deadStock}
              columns={["vehicle", "km", "price", "change", "pressure", "age"]}
              emptyText="60 günü aşan araç yok."
            />
          </Card>
        </div>
      )}
    </div>
  );
}
