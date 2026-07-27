import Link from "next/link";
import { BrandBadge } from "@/components/BrandBadge";
import { Badge, Empty } from "@/components/ui";
import { STATUS_LABELS, type VehicleStatus } from "@/db/inventory";
import { formatKm, formatPct, formatTL, formatTLShort } from "@/lib/format";
import type { StockRow } from "@/lib/stock";

const STATUS_TONE = {
  stokta: "fair",
  rezerve: "good",
  satildi: "hot",
} as const;

/**
 * Stok tablosu.
 *
 * Kolon sırası bilinçli: maliyet ve kâr, alış fiyatından önce geliyor.
 * Galericinin bildiği rakam alış fiyatı zaten; ürünün gösterdiği yeni bilgi
 * gerçek maliyet ve günlük kâr, o yüzden göz önünde duruyorlar.
 */
export function StockTable({ rows }: { rows: StockRow[] }) {
  if (!rows.length) {
    return (
      <Empty>
        Bu listede araç yok.{" "}
        <Link href="/araclar/yeni" className="text-brand font-medium">
          Araç ekle
        </Link>
      </Empty>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="th">Araç</th>
            <th className="th text-right">Alış</th>
            <th className="th text-right">Masraf</th>
            <th className="th text-right">Maliyet</th>
            <th className="th text-right">Satış / İstenen</th>
            <th className="th text-right">Kâr</th>
            <th className="th text-right">Günlük</th>
            <th className="th text-right">Süre</th>
            <th className="th">Durum</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const p = r.profit;
            const aging = r.age.level === "olu" || r.age.level === "yaslanan";
            return (
              <tr key={r.id} className="row-hover last:[&>td]:border-0">
                <td className="td">
                  <Link
                    href={`/araclar/${r.id}`}
                    className="flex items-center gap-3 max-w-[22rem] group"
                  >
                    <BrandBadge make={r.make} size={34} />
                    <span className="min-w-0">
                      <span className="block font-medium truncate group-hover:text-brand transition-colors">
                        {r.make} {r.model}
                        {r.trim ? ` ${r.trim}` : ""}
                      </span>
                      <span className="block text-xs text-muted truncate">
                        {[r.plate, r.year, formatKm(r.km)].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </Link>
                </td>

                <td className="td text-right tabular-nums text-muted whitespace-nowrap">
                  {formatTLShort(r.purchasePrice)}
                </td>

                <td className="td text-right tabular-nums whitespace-nowrap">
                  {r.expenseTotal > 0 ? (
                    <span title={`${r.expenseCount} kalem`}>{formatTLShort(r.expenseTotal)}</span>
                  ) : (
                    <span className="text-faint">—</span>
                  )}
                </td>

                <td className="td text-right tabular-nums font-semibold whitespace-nowrap">
                  {formatTL(p.cost)}
                </td>

                <td className="td text-right tabular-nums whitespace-nowrap">
                  {p.revenue == null ? (
                    <span className="text-faint">—</span>
                  ) : (
                    <span className={p.projected ? "text-muted" : ""}>
                      {formatTL(p.revenue)}
                      {p.projected && <span className="block text-xs text-faint">istenen</span>}
                    </span>
                  )}
                </td>

                <td className="td text-right tabular-nums whitespace-nowrap">
                  {p.profit == null ? (
                    <span className="text-faint">—</span>
                  ) : (
                    <span className={p.profit >= 0 ? "text-hot" : "text-high"}>
                      <span className="font-semibold">{formatTL(p.profit)}</span>
                      {p.returnPct != null && (
                        <span className="block text-xs opacity-80">{formatPct(p.returnPct)}</span>
                      )}
                    </span>
                  )}
                </td>

                <td className="td text-right tabular-nums whitespace-nowrap">
                  {p.profitPerDay == null ? (
                    <span className="text-faint">—</span>
                  ) : (
                    <span className={p.profitPerDay >= 0 ? "" : "text-high"}>
                      {formatTLShort(p.profitPerDay)}
                    </span>
                  )}
                </td>

                <td className="td text-right tabular-nums whitespace-nowrap">
                  <span className={aging ? "text-high font-medium" : ""}>{p.daysHeld} gün</span>
                  {aging && <span className="block text-xs text-high">{r.age.label}</span>}
                </td>

                <td className="td whitespace-nowrap">
                  <Badge tone={STATUS_TONE[r.status as VehicleStatus] ?? "fair"}>
                    {STATUS_LABELS[r.status as VehicleStatus] ?? r.status}
                  </Badge>
                  {r.outstanding != null && r.outstanding > 0 && (
                    <span className="block text-xs text-high mt-1">
                      {formatTLShort(r.outstanding)} bakiye
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
