import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteExpense, setStatus } from "../actions";
import { ExpenseForm, PaymentForm, SaleForm } from "@/components/stock/forms";
import { Card, Empty, Stat } from "@/components/ui";
import {
  EXPENSE_LABELS,
  PAYMENT_LABELS,
  STATUS_LABELS,
  type ExpenseCategory,
  type PaymentMethod,
  type VehicleStatus,
} from "@/db/inventory";
import { formatDate, formatKm, formatPct, formatTL } from "@/lib/format";
import { getExpenses, getPayments, getStockVehicle } from "@/lib/stock";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { tenantId } = await requireSession();
  const { id: rawId } = await params;
  const id = Number.parseInt(rawId, 10);
  if (!Number.isFinite(id)) notFound();

  const vehicle = await getStockVehicle(tenantId, id);
  if (!vehicle) notFound();

  const [expenses, paymentRows] = await Promise.all([getExpenses(tenantId, id), getPayments(tenantId, id)]);
  const p = vehicle.profit;
  const sold = vehicle.status === "satildi";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/araclar" className="text-xs text-brand">
            ← araçlar
          </Link>
          <h1 className="text-xl font-semibold mt-1">
            {vehicle.make} {vehicle.model} {vehicle.trim ?? ""}
          </h1>
          <p className="text-sm text-muted mt-1">
            {[
              vehicle.plate,
              vehicle.year,
              formatKm(vehicle.km),
              vehicle.engine,
              vehicle.fuel,
              vehicle.transmission,
              vehicle.color,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="text-xs text-muted mt-1">
            {formatDate(vehicle.purchaseDate)} tarihinde
            {vehicle.boughtFrom ? ` ${vehicle.boughtFrom}` : ""} alındı ·{" "}
            {STATUS_LABELS[vehicle.status as VehicleStatus] ?? vehicle.status}
            {vehicle.damageRecord ? ` · Tramer ${formatTL(vehicle.damageRecord)}` : " · Hasarsız"}
          </p>
        </div>

        {!sold && (
          <form action={setStatus}>
            <input type="hidden" name="vehicleId" value={vehicle.id} />
            <input
              type="hidden"
              name="status"
              value={vehicle.status === "rezerve" ? "stokta" : "rezerve"}
            />
            <button className="h-9 rounded-lg border border-border px-4 text-sm hover:bg-surface-2 whitespace-nowrap">
              {vehicle.status === "rezerve" ? "Rezervi kaldır" : "Rezerve al"}
            </button>
          </form>
        )}
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Stat label="Alış fiyatı" value={formatTL(vehicle.purchasePrice)} />
        <Stat
          label="Masraf"
          value={formatTL(vehicle.expenseTotal)}
          sub={`${vehicle.expenseCount} kalem`}
        />
        <Stat label="Gerçek maliyet" value={formatTL(p.cost)} sub="alış + masraflar" />
        <Stat
          label={sold ? "Kâr" : "Beklenen kâr"}
          value={p.profit == null ? "—" : formatTL(p.profit)}
          sub={p.returnPct == null ? "istenen fiyat girilmemiş" : `${formatPct(p.returnPct)} getiri`}
          tone={p.profit == null ? "default" : p.profit >= 0 ? "good" : "warn"}
        />
        <Stat
          label={sold ? "Satış süresi" : "Stokta"}
          value={`${p.daysHeld} gün`}
          sub={
            p.profitPerDay == null
              ? vehicle.age.label
              : `günlük ${formatTL(p.profitPerDay)}`
          }
          tone={vehicle.age.level === "olu" ? "warn" : "default"}
        />
      </div>

      {sold && (
        <Card title="Satış">
          <dl className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div>
              <dt className="text-xs text-muted">Satış fiyatı</dt>
              <dd className="font-medium">{formatTL(vehicle.salePrice)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Tarih</dt>
              <dd className="font-medium">{formatDate(vehicle.saleDate)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Alıcı</dt>
              <dd className="font-medium">{vehicle.soldTo ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Ödeme</dt>
              <dd className="font-medium">
                {vehicle.paymentMethod
                  ? (PAYMENT_LABELS[vehicle.paymentMethod as PaymentMethod] ??
                    vehicle.paymentMethod)
                  : "—"}
              </dd>
            </div>
            {vehicle.outstanding != null && vehicle.outstanding > 0 && (
              <div>
                <dt className="text-xs text-muted">Kalan bakiye</dt>
                <dd className="font-medium text-high">{formatTL(vehicle.outstanding)}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-muted">Yıllık getiri</dt>
              <dd className="font-medium">{formatPct(p.annualizedPct)}</dd>
            </div>
          </dl>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card
          title="Masraflar"
          hint="Her kalem gerçek maliyete ekleniyor — kâr buradan doğru çıkıyor"
        >
          <ExpenseForm vehicleId={vehicle.id} />
          {expenses.length === 0 ? (
            <Empty>Henüz masraf eklenmemiş.</Empty>
          ) : (
            <div className="overflow-x-auto border-t border-border">
              <table className="w-full text-sm">
                <tbody>
                  {expenses.map((x) => (
                    <tr key={x.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">
                        <span className="font-medium">
                          {EXPENSE_LABELS[x.category as ExpenseCategory] ?? x.category}
                        </span>
                        {x.note && (
                          <span className="block text-xs text-muted">{x.note}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted whitespace-nowrap">
                        {formatDate(x.spentAt)}
                        {x.documentNo && <span className="block">Belge: {x.documentNo}</span>}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium whitespace-nowrap">
                        {formatTL(x.amount)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <form action={deleteExpense}>
                          <input type="hidden" name="expenseId" value={x.id} />
                          <input type="hidden" name="vehicleId" value={vehicle.id} />
                          <button
                            className="text-xs text-muted hover:text-high"
                            aria-label="Masrafı sil"
                          >
                            sil
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-surface-2 font-medium">
                    <td className="px-3 py-2" colSpan={2}>
                      Toplam
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatTL(vehicle.expenseTotal)}
                    </td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          {!sold ? (
            <Card title="Satışı kaydet" hint="Kaydedince kâr gerçekleşen rakamdan hesaplanır">
              <SaleForm vehicleId={vehicle.id} suggested={vehicle.askingPrice} />
            </Card>
          ) : (
            <Card title="Tahsilat / ödeme" hint="Vadeli satışta kalan bakiyeyi buradan izle">
              <PaymentForm vehicleId={vehicle.id} />
              {paymentRows.length === 0 ? (
                <Empty>Hareket yok.</Empty>
              ) : (
                <div className="overflow-x-auto border-t border-border">
                  <table className="w-full text-sm">
                    <tbody>
                      {paymentRows.map((x) => (
                        <tr key={x.id} className="border-b border-border last:border-0">
                          <td className="px-3 py-2">
                            <span
                              className={
                                x.direction === "tahsilat" ? "text-hot" : "text-high"
                              }
                            >
                              {x.direction === "tahsilat" ? "Tahsilat" : "Ödeme"}
                            </span>
                            {x.note && <span className="block text-xs text-muted">{x.note}</span>}
                          </td>
                          <td className="px-3 py-2 text-xs text-muted whitespace-nowrap">
                            {formatDate(x.paidAt)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                            {formatTL(x.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {vehicle.note && (
            <Card title="Not">
              <p className="p-4 text-sm whitespace-pre-wrap">{vehicle.note}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
