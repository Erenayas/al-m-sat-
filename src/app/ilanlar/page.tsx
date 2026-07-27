import { Suspense } from "react";
import { FilterBar } from "@/components/FilterBar";
import { ListingTable } from "@/components/ListingTable";
import { Card } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import { SORT_KEYS, type ListingFilters, type SortKey } from "@/lib/listings";
import { getFilterOptions, searchListings } from "@/lib/queries";

export const dynamic = "force-dynamic";

function toInt(v: string | string[] | undefined): number | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  if (!s) return undefined;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : undefined;
}

function toStr(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s || undefined;
}

/** URL parametrelerini filtreye çevirir. Bilinmeyen/bozuk değerler sessizce düşer. */
function parseFilters(params: Record<string, string | string[] | undefined>): ListingFilters {
  const sort = toStr(params.sort);
  return {
    make: toStr(params.make),
    model: toStr(params.model),
    city: toStr(params.city),
    source: toStr(params.source),
    yearMin: toInt(params.yearMin),
    yearMax: toInt(params.yearMax),
    priceMin: toInt(params.priceMin),
    priceMax: toInt(params.priceMax),
    kmMax: toInt(params.kmMax),
    minDealScore: toInt(params.minDealScore),
    cleanOnly: toStr(params.clean) === "1",
    sort: SORT_KEYS.includes(sort as SortKey) ? (sort as SortKey) : "deal",
  };
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);

  const [options, rows] = await Promise.all([getFilterOptions(), searchListings(filters)]);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-xl font-semibold">İlanlar</h1>
        <p className="text-sm text-muted">
          {formatNumber(rows.length)} ilan
          {rows.length >= 120 && " (ilk 120)"}
        </p>
      </div>

      <Suspense fallback={<div className="h-24 rounded-xl border border-border bg-surface" />}>
        <FilterBar options={options} />
      </Suspense>

      <Card>
        <ListingTable
          rows={rows}
          columns={[
            "compare",
            "vehicle",
            "km",
            "price",
            "expected",
            "deal",
            "change",
            "pressure",
            "seller",
            "age",
          ]}
        />
      </Card>
    </div>
  );
}
