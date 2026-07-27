import Link from "next/link";
import { BrandBadge } from "./BrandBadge";
import { CompareToggle } from "./CompareContext";
import { DealBadge, Empty, PressureBar } from "./ui";
import { formatKm, formatPct, formatTL, formatTLShort, timeAgo } from "@/lib/format";
import { isDemoUrl, type ListingRow } from "@/lib/listings";

type Column =
  | "compare"
  | "vehicle"
  | "km"
  | "price"
  | "expected"
  | "deal"
  | "pressure"
  | "change"
  | "seller"
  | "age"
  | "link";

const DEFAULT_COLUMNS: Column[] = [
  "compare",
  "vehicle",
  "km",
  "price",
  "expected",
  "deal",
  "seller",
  "age",
  "link",
];

const HEADERS: Record<Column, string> = {
  compare: "",
  vehicle: "Araç",
  km: "KM",
  price: "Fiyat",
  expected: "Beklenen",
  deal: "Fırsat",
  pressure: "Baskı",
  change: "Değişim",
  seller: "Galeri",
  age: "İlan",
  link: "",
};

const NUMERIC: Partial<Record<Column, boolean>> = {
  km: true,
  price: true,
  expected: true,
  change: true,
};

export function ListingTable({
  rows,
  columns = DEFAULT_COLUMNS,
  emptyText = "Bu kriterlere uyan ilan yok.",
}: {
  rows: ListingRow[];
  columns?: Column[];
  emptyText?: string;
}) {
  if (!rows.length) return <Empty>{emptyText}</Empty>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted text-left border-b border-border">
            {columns.map((c) => (
              <th
                key={c}
                className={`font-medium px-3 py-2 whitespace-nowrap ${NUMERIC[c] ? "text-right" : ""}`}
              >
                {HEADERS[c]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-2">
              {columns.map((c) => (
                <td
                  key={c}
                  className={`px-3 py-2.5 align-middle whitespace-nowrap ${NUMERIC[c] ? "text-right tabular-nums" : ""}`}
                >
                  <Cell column={c} row={r} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cell({ column, row: r }: { column: Column; row: ListingRow }) {
  switch (column) {
    case "compare":
      return <CompareToggle id={r.id} />;

    case "vehicle":
      return (
        <Link href={`/pazar/ilan/${r.id}`} className="flex items-center gap-2.5 max-w-[24rem]">
          <BrandBadge make={r.make} size={30} />
          <span className="min-w-0">
            <span className="block font-medium truncate">
              {r.make} {r.model}
              {r.trim ? ` ${r.trim}` : ""}
            </span>
            <span className="block text-xs text-muted truncate">
              {[r.year, r.engine, r.fuel, r.transmission].filter(Boolean).join(" · ")}
              {r.damageRecord ? ` · Tramer ${formatTLShort(r.damageRecord)}` : " · Hasarsız"}
            </span>
          </span>
        </Link>
      );

    case "km":
      return <>{formatKm(r.km)}</>;

    case "price":
      return <span className="font-semibold">{formatTL(r.price)}</span>;

    case "expected":
      return <span className="text-muted">{formatTL(r.expectedPrice)}</span>;

    case "deal":
      return <DealBadge score={r.dealScore} confidence={r.scoreConfidence} />;

    case "pressure":
      return <PressureBar value={r.pressure} />;

    case "change":
      return r.totalChangePct == null || r.totalChangePct === 0 ? (
        <span className="text-muted">—</span>
      ) : (
        <span className={r.totalChangePct < 0 ? "text-hot font-medium" : "text-high"}>
          {formatPct(r.totalChangePct)}
          {r.dropCount > 1 && (
            <span className="text-muted font-normal"> ({r.dropCount}x)</span>
          )}
        </span>
      );

    case "seller":
      return (
        <span className="block max-w-[12rem]">
          <span className="block truncate">{r.sellerName ?? "—"}</span>
          <span className="block text-xs text-muted truncate">
            {[r.city, r.district].filter(Boolean).join(" / ")}
          </span>
        </span>
      );

    case "age":
      return (
        <span className="text-muted text-xs">
          <span className="block">{timeAgo(r.firstSeenAt)}</span>
          <span className="block">{r.daysOnMarket} gündür ilanda</span>
        </span>
      );

    case "link":
      return <SourceLink url={r.url} />;
  }
}

/**
 * Kaynaktaki ilana giden dış link.
 *
 * Akışı tarayan galeri, aracı beğendiği anda ilana atlamak istiyor; araya
 * bizim detay sayfamızı sokmak gereksiz bir tık. Demo verisindeki
 * çözümlenmeyen adresler tıklanabilir gösterilmiyor — kırık link,
 * link olmamasından daha kötü.
 */
export function SourceLink({ url }: { url: string | null }) {
  if (!url) return <span className="text-muted text-xs">—</span>;

  if (isDemoUrl(url)) {
    return (
      <span
        className="text-muted text-xs cursor-help"
        title={`Demo verisi — bu adres gerçek değil: ${url}`}
      >
        demo
      </span>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title="İlanı kaynağında aç"
      className="text-brand whitespace-nowrap hover:underline"
    >
      ilana git ↗
    </a>
  );
}
