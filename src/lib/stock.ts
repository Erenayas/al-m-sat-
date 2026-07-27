import "server-only";
import { sql } from "@/db";
import {
  computeProfit,
  stockAge,
  summarizePortfolio,
  type ProfitResult,
  type PortfolioSummary,
  type StockAge,
} from "@/domain/profit";

/**
 * Stok (galerinin kendi araçları) sorguları.
 *
 * Her fonksiyon ilk argüman olarak `tenantId` alıyor ve sorgusunu bu kolona
 * göre daraltıyor. Zorunlu argüman olması bilinçli: varsayılan değeri olsaydı
 * ya da opsiyonel olsaydı, bir çağrıda unutulduğunda sessizce tüm galerilerin
 * verisi dönerdi. Bu üründe yapılabilecek en ağır hata bu.
 *
 * Kâr ve maliyet SQL'de değil `domain/profit.ts` üzerinden hesaplanıyor:
 * masraf araç satıldıktan sonra da gelebildiği için materyalize bir kâr
 * kolonu sessizce bayatlardı.
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
    coalesce(e.total, 0)::bigint     as "expenseTotal",
    coalesce(e.cnt, 0)::int          as "expenseCount",
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
  tenantId: number,
  opts: { filter?: StockFilter; search?: string } = {},
): Promise<StockRow[]> {
  const { filter = "stokta", search } = opts;
  const term = search?.trim() ? `%${search.trim()}%` : null;

  const rows = await sql<StockRowRaw[]>`
    ${stockSelect}
    where sv.tenant_id = ${tenantId}
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

export async function getStockVehicle(
  tenantId: number,
  id: number,
): Promise<StockRow | null> {
  const rows = await sql<StockRowRaw[]>`
    ${stockSelect} where sv.id = ${id} and sv.tenant_id = ${tenantId} limit 1`;
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

/** Masraflar araç üzerinden galeriye bağlanıyor; id tahmin ederek başkasının verisi okunamıyor */
export async function getExpenses(tenantId: number, vehicleId: number): Promise<ExpenseRow[]> {
  return sql<ExpenseRow[]>`
    select x.id, x.category, x.amount, x.spent_at as "spentAt", x.note,
           x.document_no as "documentNo"
    from stock_expenses x
    join stock_vehicles sv on sv.id = x.stock_vehicle_id
    where x.stock_vehicle_id = ${vehicleId} and sv.tenant_id = ${tenantId}
    order by x.spent_at, x.id`;
}

export interface PaymentRow {
  id: number;
  direction: string;
  amount: number;
  method: string | null;
  paidAt: string;
  note: string | null;
}

export async function getPayments(tenantId: number, vehicleId: number): Promise<PaymentRow[]> {
  return sql<PaymentRow[]>`
    select p.id, p.direction, p.amount, p.method, p.paid_at as "paidAt", p.note
    from payments p
    join stock_vehicles sv on sv.id = p.stock_vehicle_id
    where p.stock_vehicle_id = ${vehicleId} and sv.tenant_id = ${tenantId}
    order by p.paid_at, p.id`;
}

export interface PortfolioView extends PortfolioSummary {
  soldThisMonth: number;
  profitThisMonth: number;
  /** Stoktakilerin istenen fiyatına göre beklenen kâr */
  projectedProfit: number;
}

export async function getPortfolio(tenantId: number): Promise<PortfolioView> {
  const rows = await sql<StockRowRaw[]>`${stockSelect} where sv.tenant_id = ${tenantId}`;
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

export async function listContacts(tenantId: number, search?: string): Promise<ContactRow[]> {
  const term = search?.trim() ? `%${search.trim()}%` : null;
  return sql<ContactRow[]>`
    select c.id, c.name, c.phone, c.city, c.kind, c.note,
      (select count(*) from stock_vehicles
        where purchased_from_id = c.id and tenant_id = ${tenantId})::int as "boughtCount",
      (select count(*) from stock_vehicles
        where sold_to_id = c.id and tenant_id = ${tenantId})::int        as "soldCount"
    from contacts c
    where c.tenant_id = ${tenantId}
      ${term ? sql`and (c.name ilike ${term} or c.phone ilike ${term})` : sql``}
    order by c.name`;
}

export async function getExpenseTotals(
  tenantId: number,
): Promise<{ category: string; total: number; cnt: number }[]> {
  return sql<{ category: string; total: number; cnt: number }[]>`
    select x.category, sum(x.amount)::bigint as total, count(*)::int as cnt
    from stock_expenses x
    join stock_vehicles sv on sv.id = x.stock_vehicle_id
    where sv.tenant_id = ${tenantId}
    group by x.category
    order by sum(x.amount) desc`;
}
