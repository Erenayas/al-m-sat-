import Link from "next/link";
import { StockTable } from "@/components/stock/StockTable";
import { Card, PageHeader } from "@/components/ui";
import { formatNumber, formatTL } from "@/lib/format";
import {
  listStock,
  sortStock,
  STOCK_SORT_LABELS,
  type StockFilter,
  type StockSort,
} from "@/lib/stock";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const FILTERS: { key: StockFilter; label: string }[] = [
  { key: "stokta", label: "Stokta" },
  { key: "rezerve", label: "Rezerve" },
  { key: "satildi", label: "Satılan" },
  { key: "olu", label: "Ölü stok" },
  { key: "hepsi", label: "Hepsi" },
];

const FILTER_KEYS = FILTERS.map((f) => f.key);
const SORT_KEYS = Object.keys(STOCK_SORT_LABELS) as StockSort[];

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { tenantId } = await requireSession();
  const params = await searchParams;

  const rawFilter = one(params.filtre);
  const filter: StockFilter = FILTER_KEYS.includes(rawFilter as StockFilter)
    ? (rawFilter as StockFilter)
    : "stokta";

  const rawSort = one(params.sirala);
  const sort: StockSort = SORT_KEYS.includes(rawSort as StockSort)
    ? (rawSort as StockSort)
    : "yeni";

  const search = one(params.q);

  const rows = sortStock(await listStock(tenantId, { filter, search }), sort);
  const totalCost = rows.reduce((s, r) => s + r.profit.cost, 0);
  const totalProfit = rows.reduce((s, r) => s + (r.profit.profit ?? 0), 0);

  const qs = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { filtre: filter, sirala: sort, q: search, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, v);
    return `/araclar?${next.toString()}`;
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Araçlar"
        description={
          `${formatNumber(rows.length)} araç · toplam maliyet ${formatTL(totalCost)}` +
          (filter === "satildi" ? ` · toplam kâr ${formatTL(totalProfit)}` : "")
        }
        action={
          <Link href="/araclar/yeni" className="btn btn-primary">
            + Araç ekle
          </Link>
        }
      />

      <div className="card p-3 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={qs({ filtre: f.key })}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                f.key === filter
                  ? "bg-brand-soft text-brand font-semibold"
                  : "text-muted hover:text-text hover:bg-surface-2"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap gap-1 ml-auto items-center">
          <span className="text-xs text-muted mr-1">Sırala:</span>
          {SORT_KEYS.map((s) => (
            <Link
              key={s}
              href={qs({ sirala: s })}
              className={`rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                s === sort ? "bg-surface-2 font-semibold text-text" : "text-muted hover:text-text"
              }`}
            >
              {STOCK_SORT_LABELS[s]}
            </Link>
          ))}
        </div>

        {/* Arama sunucuda çalışıyor; JS olmadan da işlemesi için düz form */}
        <form className="flex gap-2 w-full sm:w-auto" action="/araclar">
          <input type="hidden" name="filtre" value={filter} />
          <input type="hidden" name="sirala" value={sort} />
          <input
            name="q"
            defaultValue={search ?? ""}
            placeholder="Plaka, marka, model ara"
            className="input flex-1 sm:!w-56"
          />
          <button className="btn btn-ghost">
            Ara
          </button>
        </form>
      </div>

      <Card>
        <StockTable rows={rows} />
      </Card>
    </div>
  );
}
