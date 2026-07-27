import "server-only";
import { sql } from "@/db";
import {
  computeProfit,
  stockAge,
  summarizePortfolio,
  type ProfitResult,
  type PortfolioSummary,
} from "@/domain/profit";
import type { StockAge } from "@/domain/profit";

/**
 * Stok (galerinin kendi araçları) sorguları.
 *
 * Kâr ve maliyet SQL'de değil, `domain/profit.ts` üzerinden hesaplanıyor.
 * Masraf araç satıldıktan sonra bile gelebildiği için materyalize edilmiş bir
 * kâr kolonu sessizce bayatlardı; formülün de tek bir yerde durması gerekiyor.
 */

interface StockRowRaw {
  id: number;
  plate: string | null;
  make: string;
  model: string;
  trim: string | null;
  year: number;
  km: number | null;
  engine: string | null;
  fuel: string | null;
  transmission: string | null;
  body: string | null;
  color: string | null;
  chassisNo: string | null;
  purchasePrice: number;
  purchaseDate: string;
  askingPrice: number | null;
  damageRecord: number | null;
  status: string;
  salePrice: number | null;
  saleDate: string | null;
  paymentMethod: string | null;
  note: string | null;
  boughtFrom: string | null;
  soldTo: string | null;
  purchasedFromId: number | null;
  soldToId: number | null;
  expenseTotal: number;
  expenseCount: number;
  collected: number;
}

export interface StockRow extends StockRowRaw {
  profit: ProfitResult;
  age: { level: StockAge; label: string };
  /** Satış bedelinden tahsil edilmemiş kısım */
  outstanding: number | null;
}

const stockSelect = sql`
  select
    sv.id, sv.plate, sv.make, sv.model, sv.trim, sv.year, sv.km,
    sv.engine, sv.fuel, sv.transmission, sv.body, sv.color,
    sv.chassis_no        as "chassisNo",
    sv.purchase_price    as "purchasePrice",
    sv.purchase_date     as "purchaseDate",
    sv.asking_price      as "askingPrice",
    sv.damage_record     as "damageRecord",
    sv.status,
    sv.sale_price        as "salePrice",
    sv.sale_date         as "saleDate",
    sv.payment_method    as "paymentMethod",
    sv.note,
    sv.purchased_from_id as "purchasedFromId",
    sv.sold_to_id        as "soldToId",
    cb.name              as "boughtFrom",
    cs.name              as "soldTo",
    coalesce(e.total, 0)::bigint as "expenseTotal",
    coalesce(e.cnt, 0)::int      as "expenseCount",
    coalesce(p.collected, 0)::bigint as "collected"
  from stock_vehicles sv
  left join contacts cb on cb.id = sv.purchased_from_id
  left join contacts cs on cs.id = sv.sold_to_id
  left join lateral (
    select sum(amount) as total, count(*) as cnt
    from stock_expenses where stock_vehicle_id = sv.id
  ) e on true
  left join lateral (
    select sum(case when direction = 'tahsilat' then amount else -amount end) as collected
    from payments where stock_vehicle_id = sv.id
  ) p on true
`;

function enrich(rows: StockRowRaw[], now = new Date()): StockRow[] {
  return rows.map((r) => {
    const profit = computeProfit(
      {
        purchasePrice: r.purchasePrice,
        // Toplam zaten SQL'de alındı; tek kalem olarak veriliyor
        expenses: [{ amount: r.expenseTotal }],
        salePrice: r.status === "satildi" ? r.salePrice : null,
        askingPrice: r.askingPrice,
        purchaseDate: r.purchaseDate,
        saleDate: r.saleDate,
      },
      now,
    );

    const outstanding =
      r.status === "satildi" && r.salePrice != null ? r.salePrice - r.collected : null;

    return { ...r, profit, age: stockAge(profit.daysHeld), outstanding };
  });
}

export type StockFilter = "hepsi" | "stokta" | "rezerve" | "satildi" | "olu";
export type StockSort = "yeni" | "eski" | "kar" | "gunluk_kar" | "maliyet" | "bekleyen";

export const STOCK_SORT_LABELS: Record<StockSort, string> = {
  yeni: "En yeni alım",
  eski: "En eski alım",
  bekleyen: "En çok bekleyen",
  kar: "Kâr (yüksek)",
  gunluk_kar: "Günlük kâr",
  maliyet: "Maliyet (yüksek)",
};

export async function listStock(
  opts: { filter?: StockFilter; search?: string } = {},
): Promise<StockRow[]> {
  const { filter = "stokta", search } = opts;
  const term = search?.trim() ? `%${search.trim()}%` : null;

  const rows = await sql<StockRowRaw[]>`
    ${stockSelect}
    where true
      ${filter === "hepsi" || filter === "olu" ? sql`` : sql`and sv.status = ${filter}`}
      ${
        filter === "olu"
          ? sql`and sv.status = 'stokta' and sv.purchase_date <= current_date - 90`
          : sql``
      }
      ${
        term
          ? sql`and (sv.plate ilike ${term} or sv.make ilike ${term}
                     or sv.model ilike ${term} or sv.trim ilike ${term})`
          : sql``
      }
    order by sv.purchase_date desc, sv.id desc
  `;
  return enrich(rows);
}

/** Sıralama kâr gibi türetilmiş alanlara göre yapıldığı için bellekte uygulanıyor */
export function sortStock(rows: StockRow[], sort: StockSort): StockRow[] {
  const by = [...rows];
  switch (sort) {
    case "eski":
      return by.sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate));
    case "bekleyen":
      return by.sort((a, b) => b.profit.daysHeld - a.profit.daysHeld);
    case "kar":
      return by.sort((a, b) => (b.profit.profit ?? -Infinity) - (a.profit.profit ?? -Infinity));
    case "gunluk_kar":
      return by.sort(
        (a, b) => (b.profit.profitPerDay ?? -Infinity) - (a.profit.profitPerDay ?? -Infinity),
      );
    case "maliyet":
      return by.sort((a, b) => b.profit.cost - a.profit.cost);
    default:
      return by.sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));
  }
}

export async function getStockVehicle(id: number): Promise<StockRow | null> {
  const rows = await sql<StockRowRaw[]>`${stockSelect} where sv.id = ${id} limit 1`;
  return enrich(rows)[0] ?? null;
}

export interface ExpenseRow {
  id: number;
  category: string;
  amount: number;
  spentAt: string;
  note: string | null;
  documentNo: string | null;
}

export async function getExpenses(stockVehicleId: number): Promise<ExpenseRow[]> {
  return sql<ExpenseRow[]>`
    select id, category, amount, spent_at as "spentAt", note, document_no as "documentNo"
    from stock_expenses where stock_vehicle_id = ${stockVehicleId}
    order by spent_at, id`;
}

export interface PaymentRow {
  id: number;
  direction: string;
  amount: number;
  method: string | null;
  paidAt: string;
  note: string | null;
}

export async function getPayments(stockVehicleId: number): Promise<PaymentRow[]> {
  return sql<PaymentRow[]>`
    select id, direction, amount, method, paid_at as "paidAt", note
    from payments where stock_vehicle_id = ${stockVehicleId}
    order by paid_at, id`;
}

export interface PortfolioView extends PortfolioSummary {
  /** Bu ay satılan araç ve kâr */
  soldThisMonth: number;
  profitThisMonth: number;
  /** Stoktakilerin istenen fiyatına göre beklenen kâr */
  projectedProfit: number;
}

export async function getPortfolio(): Promise<PortfolioView> {
  const rows = await sql<StockRowRaw[]>`${stockSelect}`;
  const all = enrich(rows);

  const summary = summarizePortfolio(
    all.map((r) => ({
      cost: r.profit.cost,
      profit: r.status === "satildi" ? r.profit.profit : null,
      daysHeld: r.profit.daysHeld,
      sold: r.status === "satildi",
    })),
  );

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const soldThisMonth = all.filter(
    (r) => r.status === "satildi" && r.saleDate && r.saleDate >= monthStart,
  );

  return {
    ...summary,
    soldThisMonth: soldThisMonth.length,
    profitThisMonth: soldThisMonth.reduce((s, r) => s + (r.profit.profit ?? 0), 0),
    projectedProfit: all
      .filter((r) => r.status !== "satildi")
      .reduce((s, r) => s + (r.profit.profit ?? 0), 0),
  };
}

export interface ContactRow {
  id: number;
  name: string;
  phone: string | null;
  city: string | null;
  kind: string;
  note: string | null;
  boughtCount: number;
  soldCount: number;
}

export async function listContacts(search?: string): Promise<ContactRow[]> {
  const term = search?.trim() ? `%${search.trim()}%` : null;
  return sql<ContactRow[]>`
    select c.id, c.name, c.phone, c.city, c.kind, c.note,
      (select count(*) from stock_vehicles where purchased_from_id = c.id)::int as "boughtCount",
      (select count(*) from stock_vehicles where sold_to_id = c.id)::int        as "soldCount"
    from contacts c
    ${term ? sql`where c.name ilike ${term} or c.phone ilike ${term}` : sql``}
    order by c.name`;
}

/** Masrafların kategori bazında toplamı — "param nereye gidiyor" ekranı için */
export async function getExpenseTotals(): Promise<{ category: string; total: number; cnt: number }[]> {
  return sql<{ category: string; total: number; cnt: number }[]>`
    select category, sum(amount)::bigint as total, count(*)::int as cnt
    from stock_expenses group by category order by sum(amount) desc`;
}
