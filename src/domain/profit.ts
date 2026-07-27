/**
 * Araç başına gerçek maliyet ve kâr hesabı.
 *
 * Galerinin mevcut programlarında göremediği şey burada: alış fiyatı herkesin
 * bildiği rakam, ama ekspertiz + boya + bakım + noter + çekici üstüne binince
 * gerçek maliyet başka çıkıyor. Ve asıl önemlisi — kâr tek başına yanıltıcı:
 * 200 günde 80 bin kazandıran araç, 30 günde 50 bin kazandırandan kötüdür.
 * Sermaye devir hızını hesaba katmayan her karşılaştırma yanlış sıralama üretir.
 */

export interface ExpenseLike {
  amount: number;
  category?: string;
}

export interface VehicleCostInput {
  purchasePrice: number;
  expenses: ExpenseLike[];
}

/** Alış + tüm masraflar. Aracın bize gerçekte kaça mal olduğu. */
export function totalCost({ purchasePrice, expenses }: VehicleCostInput): number {
  return expenses.reduce((sum, e) => sum + (e.amount || 0), purchasePrice);
}

/** Masrafların kategori kırılımı — "para nereye gitti" sorusunun cevabı */
export function expenseBreakdown(expenses: ExpenseLike[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of expenses) {
    const key = e.category ?? "diger";
    out[key] = (out[key] ?? 0) + (e.amount || 0);
  }
  return out;
}

/** Gün farkı; saat/zaman dilimi gürültüsünü elemek için tarihler güne yuvarlanıyor */
export function daysBetween(from: Date | string, to: Date | string): number {
  const a = typeof from === "string" ? new Date(`${from}T00:00:00`) : from;
  const b = typeof to === "string" ? new Date(`${to}T00:00:00`) : to;
  const days = Math.floor((b.getTime() - a.getTime()) / 86_400_000);
  return Math.max(0, days);
}

export interface ProfitInput {
  purchasePrice: number;
  expenses: ExpenseLike[];
  /** Satıldıysa satış fiyatı, satılmadıysa null */
  salePrice: number | null;
  /** Stoktakiler için beklenen kârı hesaplamakta kullanılır */
  askingPrice?: number | null;
  purchaseDate: Date | string;
  saleDate?: Date | string | null;
}

export interface ProfitResult {
  cost: number;
  /** Satıldıysa gerçekleşen, satılmadıysa istenen fiyat üzerinden beklenen */
  revenue: number | null;
  profit: number | null;
  /** Kârın satış fiyatına oranı (%) */
  marginPct: number | null;
  /** Kârın maliyete oranı (%) — yatırılan paranın getirisi */
  returnPct: number | null;
  /** Stokta geçen gün (satıldıysa alıştan satışa) */
  daysHeld: number;
  /** Günlük kâr — sermaye devir hızını içeren tek sayı */
  profitPerDay: number | null;
  /**
   * Yıllıklandırılmış getiri (%). Farklı süre ve tutardaki araçları
   * karşılaştırmanın tek doğru yolu; galerinin göremediği asıl metrik bu.
   */
  annualizedPct: number | null;
  /** Satılmamış araçta rakamlar istenen fiyata dayanıyor demek */
  projected: boolean;
}

/** Süresi çok kısa satışlarda yıllıklandırma patlıyor; taban gün uygulanıyor */
const MIN_DAYS_FOR_ANNUALIZED = 7;

export function computeProfit(input: ProfitInput, now: Date = new Date()): ProfitResult {
  const cost = totalCost(input);
  const sold = input.salePrice != null;
  const revenue = sold ? input.salePrice : (input.askingPrice ?? null);

  const daysHeld = daysBetween(input.purchaseDate, sold && input.saleDate ? input.saleDate : now);

  if (revenue == null) {
    return {
      cost,
      revenue: null,
      profit: null,
      marginPct: null,
      returnPct: null,
      daysHeld,
      profitPerDay: null,
      annualizedPct: null,
      projected: !sold,
    };
  }

  const profit = revenue - cost;
  const marginPct = revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : null;
  const returnPct = cost > 0 ? Math.round((profit / cost) * 1000) / 10 : null;

  // Gün 0 olan araçta (aynı gün al-sat) bölme yapılamıyor; 1 güne yuvarlanıyor
  const effectiveDays = Math.max(1, daysHeld);
  const profitPerDay = Math.round(profit / effectiveDays);

  const annualizedPct =
    cost > 0
      ? Math.round(((profit / cost) * (365 / Math.max(MIN_DAYS_FOR_ANNUALIZED, daysHeld))) * 1000) / 10
      : null;

  return {
    cost,
    revenue,
    profit,
    marginPct,
    returnPct,
    daysHeld,
    profitPerDay,
    annualizedPct,
    projected: !sold,
  };
}

/** Ölü stok eşiği — galericilerin kendi konuştuğu sınır 90 gün */
export const DEAD_STOCK_DAYS = 90;
export const AGING_WARN_DAYS = 60;

export type StockAge = "taze" | "normal" | "yaslanan" | "olu";

export function stockAge(daysHeld: number): { level: StockAge; label: string } {
  if (daysHeld >= DEAD_STOCK_DAYS) return { level: "olu", label: "Ölü stok" };
  if (daysHeld >= AGING_WARN_DAYS) return { level: "yaslanan", label: "Yaşlanıyor" };
  if (daysHeld >= 30) return { level: "normal", label: "Normal" };
  return { level: "taze", label: "Taze" };
}

export interface PortfolioInput {
  cost: number;
  profit: number | null;
  daysHeld: number;
  sold: boolean;
}

export interface PortfolioSummary {
  /** Stoktaki araçlara bağlanmış toplam para */
  tiedCapital: number;
  inStockCount: number;
  soldCount: number;
  totalProfit: number;
  /** Satılanların ortalama stokta kalma süresi */
  avgDaysToSell: number | null;
  /** Sermayenin yıllık getirisi — satılan araçların ağırlıklı ortalaması */
  capitalReturnPct: number | null;
  deadStockCount: number;
  deadStockCapital: number;
}

/**
 * Portföy özeti.
 *
 * Sermaye getirisi araç başına ortalama değil, **maliyet ağırlıklı** hesaplanıyor:
 * 2 milyonluk bir araçtaki %5 getiri ile 300 binlik bir araçtaki %20 getiriyi
 * eşit saymak, galerinin gerçek performansını yanlış gösteriyor.
 */
export function summarizePortfolio(items: PortfolioInput[]): PortfolioSummary {
  const inStock = items.filter((i) => !i.sold);
  const sold = items.filter((i) => i.sold);

  const dead = inStock.filter((i) => i.daysHeld >= DEAD_STOCK_DAYS);

  const totalProfit = sold.reduce((s, i) => s + (i.profit ?? 0), 0);
  const soldCost = sold.reduce((s, i) => s + i.cost, 0);

  const weightedDays = soldCost > 0
    ? sold.reduce((s, i) => s + i.daysHeld * i.cost, 0) / soldCost
    : null;

  const capitalReturnPct =
    soldCost > 0 && weightedDays && weightedDays > 0
      ? Math.round(((totalProfit / soldCost) * (365 / Math.max(MIN_DAYS_FOR_ANNUALIZED, weightedDays))) * 1000) / 10
      : null;

  return {
    tiedCapital: inStock.reduce((s, i) => s + i.cost, 0),
    inStockCount: inStock.length,
    soldCount: sold.length,
    totalProfit,
    avgDaysToSell: sold.length
      ? Math.round((sold.reduce((s, i) => s + i.daysHeld, 0) / sold.length) * 10) / 10
      : null,
    capitalReturnPct,
    deadStockCount: dead.length,
    deadStockCapital: dead.reduce((s, i) => s + i.cost, 0),
  };
}
