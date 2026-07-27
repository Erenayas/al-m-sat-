import Link from "next/link";
import { StockTable } from "@/components/stock/StockTable";
import { Card } from "@/components/ui";
import { formatNumber, formatTL } from "@/lib/format";
import {
  listStock,
  sortStock,
  STOCK_SORT_LABELS,
  type StockFilter,
  type StockSort,
} from "@/lib/stock";

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

  const rows = sortStock(await listStock({ filter, search }), sort);
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
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Araçlar</h1>
          <p className="text-sm text-muted mt-1">
            {formatNumber(rows.length)} araç · toplam maliyet {formatTL(totalCost)}
            {filter === "satildi" && ` · toplam kâr ${formatTL(totalProfit)}`}
          </p>
        </div>
        <Link
          href="/araclar/yeni"
          className="rounded-lg bg-accent px-4 h-9 leading-9 text-sm font-medium text-white whitespace-nowrap"
        >
          + Araç ekle
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-surface p-3 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={qs({ filtre: f.key })}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                f.key === filter ? "bg-surface-2 font-medium" : "text-muted hover:text-text"
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
              className={`rounded-lg px-2.5 py-1.5 text-xs ${
                s === sort ? "bg-surface-2 font-medium" : "text-muted hover:text-text"
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
            className="h-9 flex-1 sm:w-56 rounded-lg border border-border bg-surface-2 px-2.5 text-sm outline-none focus:border-accent"
          />
          <button className="h-9 rounded-lg border border-border px-3 text-sm hover:bg-surface-2">
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
