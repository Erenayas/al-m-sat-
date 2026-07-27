import Link from "next/link";
import { StockTable } from "@/components/stock/StockTable";
import { Card, Empty, PageHeader, Stat } from "@/components/ui";
import { EXPENSE_LABELS, type ExpenseCategory } from "@/db/inventory";
import { DEAD_STOCK_DAYS } from "@/domain/profit";
import { formatDays, formatNumber, formatPct, formatTL, formatTLShort } from "@/lib/format";
import { getExpenseTotals, getPortfolio, listStock, sortStock } from "@/lib/stock";
import { requireSession } from "@/lib/auth";
import { hasMarketData } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { tenantId } = await requireSession();

  const [portfolio, inStock, sold, expenseTotals] = await Promise.all([
    getPortfolio(tenantId),
    listStock(tenantId, { filter: "stokta" }),
    listStock(tenantId, { filter: "satildi" }),
    getExpenseTotals(tenantId),
  ]);

  const dead = inStock.filter((r) => r.profit.daysHeld >= DEAD_STOCK_DAYS);
  const bestSellers = sortStock(sold, "gunluk_kar").slice(0, 8);
  const totalExpenses = expenseTotals.reduce((s, e) => s + e.total, 0);

  if (!inStock.length && !sold.length) {
    return (
      <div className="space-y-6">
        <PageHeader title="Panel" />
        <Card>
          <div className="px-4 py-12 text-center space-y-3">
            <p className="text-sm text-muted">
              Henüz hiç araç kaydı yok. İlk aracı ekleyince maliyet, kâr ve
              sermaye takibi çalışmaya başlar.
            </p>
            <Link href="/araclar/yeni" className="btn btn-primary !h-10 !px-5">
              İlk aracı ekle
            </Link>
          </div>
        </Card>
        <MarketHint />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Panel"
        description="Sermayen nerede, ne kazandırdı, ne kadar bekliyor."
        action={
          <Link href="/araclar/yeni" className="btn btn-primary">
            + Araç ekle
          </Link>
        }
      />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Bağlı sermaye"
          value={formatTLShort(portfolio.tiedCapital)}
          sub={`${portfolio.inStockCount} araç stokta`}
          tone="brand"
        />
        <Stat
          label="Bu ay kâr"
          value={formatTLShort(portfolio.profitThisMonth)}
          sub={`${portfolio.soldThisMonth} araç satıldı`}
          tone={portfolio.profitThisMonth >= 0 ? "good" : "warn"}
        />
        <Stat
          label="Sermaye getirisi"
          value={portfolio.capitalReturnPct == null ? "—" : formatPct(portfolio.capitalReturnPct)}
          sub="yıllık, maliyet ağırlıklı"
          tone={(portfolio.capitalReturnPct ?? 0) >= 0 ? "good" : "warn"}
        />
        <Stat
          label="Ortalama devir"
          value={formatDays(portfolio.avgDaysToSell)}
          sub="alıştan satışa"
        />
      </div>

      {dead.length > 0 && (
        <Card
          title={`Ölü stok — ${dead.length} araç`}
          hint={`${DEAD_STOCK_DAYS} günü aşmış araçlar. ${formatTL(portfolio.deadStockCapital)} burada bağlı duruyor.`}
        >
          <StockTable rows={dead} />
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card
          title="Stoktaki araçlar"
          hint="Beklenen kâr, istenen satış fiyatına göre hesaplanır"
          action={
            <Link href="/araclar" className="text-xs text-brand">
              tümü →
            </Link>
          }
        >
          <StockTable rows={sortStock(inStock, "bekleyen").slice(0, 8)} />
        </Card>

        <Card
          title="En verimli satışlar"
          hint="Günlük kâra göre — yavaş dönen yüksek kâr, hızlı dönen düşük kârdan iyi değildir"
          action={
            <Link href="/araclar?filtre=satildi&sirala=gunluk_kar" className="text-xs text-brand">
              tümü →
            </Link>
          }
        >
          <StockTable rows={bestSellers} />
        </Card>
      </div>

      <Card
        title="Masraflar nereye gidiyor"
        hint={`Toplam ${formatTL(totalExpenses)} — alış fiyatının üstüne binen gerçek yük`}
      >
        {expenseTotals.length === 0 ? (
          <Empty>Henüz masraf kaydı yok.</Empty>
        ) : (
          <div className="p-4 space-y-2">
            {expenseTotals.map((e) => {
              const pct = totalExpenses > 0 ? (e.total / totalExpenses) * 100 : 0;
              return (
                <div key={e.category} className="flex items-center gap-3 text-sm">
                  <span className="w-36 shrink-0 text-muted">
                    {EXPENSE_LABELS[e.category as ExpenseCategory] ?? e.category}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-surface-3 overflow-hidden">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-28 text-right tabular-nums">{formatTL(e.total)}</span>
                  <span className="w-16 text-right tabular-nums text-xs text-muted">
                    {formatNumber(e.cnt)} kalem
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <MarketHint />
    </div>
  );
}

/**
 * Piyasa modülü sekmesi bağlı kaynak yokken gizleniyor; bağlama yolunun
 * tamamen kaybolmaması için giriş noktası burada duruyor.
 */
async function MarketHint() {
  if (await hasMarketData()) return null;
  return (
    <p className="text-xs text-muted">
      Piyasa analizi modülü kapalı — bağlı bir ilan kaynağı yok.{" "}
      <Link href="/pazar/kaynaklar" className="text-brand">
        Kaynak bağla
      </Link>{" "}
      dediğinde piyasadaki ilanları fırsat skoruyla izleyen ekranlar açılır.
    </p>
  );
}
