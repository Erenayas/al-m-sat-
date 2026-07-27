import Link from "next/link";
import { Empty } from "@/components/ui";
import { STATUS_LABELS, type VehicleStatus } from "@/db/inventory";
import { formatKm, formatPct, formatTL, formatTLShort } from "@/lib/format";
import type { StockRow } from "@/lib/stock";

const AGE_CLASS = {
  taze: "text-muted",
  normal: "text-muted",
  yaslanan: "text-high",
  olu: "text-high font-medium",
} as const;

const STATUS_CLASS: Record<string, string> = {
  stokta: "bg-fair-bg text-fair",
  rezerve: "bg-good-bg text-good",
  satildi: "bg-hot-bg text-hot",
};

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
        <Link href="/araclar/yeni" className="text-accent">
          Araç ekle
        </Link>
      </Empty>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted text-left border-b border-border">
            <th className="font-medium px-3 py-2">Araç</th>
            <th className="font-medium px-3 py-2 text-right">Alış</th>
            <th className="font-medium px-3 py-2 text-right">Masraf</th>
            <th className="font-medium px-3 py-2 text-right">Maliyet</th>
            <th className="font-medium px-3 py-2 text-right">Satış / İstenen</th>
            <th className="font-medium px-3 py-2 text-right">Kâr</th>
            <th className="font-medium px-3 py-2 text-right">Günlük</th>
            <th className="font-medium px-3 py-2 text-right">Süre</th>
            <th className="font-medium px-3 py-2">Durum</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const p = r.profit;
            return (
              <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-2">
                <td className="px-3 py-2.5">
                  <Link href={`/araclar/${r.id}`} className="block max-w-[20rem]">
                    <span className="font-medium">
                      {r.make} {r.model}
                      {r.trim ? ` ${r.trim}` : ""}
                    </span>
                    <span className="block text-xs text-muted truncate">
                      {[r.plate, r.year, formatKm(r.km)].filter(Boolean).join(" · ")}
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted">
                  {formatTLShort(r.purchasePrice)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {r.expenseTotal > 0 ? (
                    <span title={`${r.expenseCount} kalem`}>{formatTLShort(r.expenseTotal)}</span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                  {formatTL(p.cost)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {p.revenue == null ? (
                    <span className="text-muted">—</span>
                  ) : (
                    <span className={p.projected ? "text-muted" : ""}>
                      {formatTL(p.revenue)}
                      {p.projected && <span className="text-xs"> (istenen)</span>}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {p.profit == null ? (
                    <span className="text-muted">—</span>
                  ) : (
                    <span className={p.profit >= 0 ? "text-hot font-medium" : "text-high font-medium"}>
                      {formatTL(p.profit)}
                      {p.returnPct != null && (
                        <span className="block text-xs font-normal opacity-80">
                          {formatPct(p.returnPct)}
                        </span>
                      )}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {p.profitPerDay == null ? (
                    <span className="text-muted">—</span>
                  ) : (
                    <span className={p.profitPerDay >= 0 ? "" : "text-high"}>
                      {formatTLShort(p.profitPerDay)}
                    </span>
                  )}
                </td>
                <td className={`px-3 py-2.5 text-right tabular-nums ${AGE_CLASS[r.age.level]}`}>
                  {p.daysHeld} gün
                  {r.age.level !== "taze" && r.age.level !== "normal" && (
                    <span className="block text-xs">{r.age.label}</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${
                      STATUS_CLASS[r.status] ?? "bg-fair-bg text-fair"
                    }`}
                  >
                    {STATUS_LABELS[r.status as VehicleStatus] ?? r.status}
                  </span>
                  {r.outstanding != null && r.outstanding > 0 && (
                    <span className="block text-xs text-high mt-0.5">
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
