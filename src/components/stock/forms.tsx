"use client";

import { useActionState, useMemo, useState } from "react";
import { addExpense, addPayment, createVehicle, recordSale } from "@/app/araclar/actions";
import { Combobox } from "@/components/Combobox";
import { IDLE, type ActionState } from "@/lib/action-state";
import {
  BODY_OPTIONS,
  COLORS,
  ENGINE_SIZES,
  FUEL_OPTIONS,
  MAKE_ALIASES,
  MAKE_NAMES,
  MODELS_BY_MAKE,
  TRANSMISSION_OPTIONS,
  TRIMS_BY_MAKE,
  TRIMS_BY_MODEL,
} from "@/domain/taxonomy";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_LABELS,
  PAYMENT_METHODS,
  PAYMENT_LABELS,
  type ExpenseCategory,
  type PaymentMethod,
} from "@/db/inventory";

const CONTROL =
  "input";

/** Bugünün tarihi, date input'unun beklediği biçimde */
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Field({
  label,
  hint,
  error,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs text-muted mb-1">
        {label}
        {hint && <span className="text-muted/70"> · {hint}</span>}
      </span>
      {children}
      {error && <span className="block text-xs text-high mt-1">{error}</span>}
    </label>
  );
}

function Alert({ state }: { state: ActionState }) {
  if (state.status === "idle" || !state.message) return null;
  const ok = state.status === "ok";
  return (
    <p
      className={`rounded-lg px-3 py-2 text-sm ${ok ? "bg-hot-bg text-hot" : "bg-high-bg text-high"}`}
    >
      {state.message}
    </p>
  );
}

/** Marka seçenekleri; yazım varyantları arama için alias olarak veriliyor */
const MAKE_OPTIONS = MAKE_NAMES.map((name) => ({ value: name, aliases: MAKE_ALIASES[name] }));
const COLOR_OPTIONS = COLORS.map((v) => ({ value: v }));
const ENGINE_OPTIONS = ENGINE_SIZES.map((v) => ({ value: v }));
const FUEL_OPTS = FUEL_OPTIONS.map((v) => ({ value: v }));
const TRANSMISSION_OPTS = TRANSMISSION_OPTIONS.map((v) => ({ value: v }));
const BODY_OPTS = BODY_OPTIONS.map((v) => ({ value: v }));

/** Araç alımı — panelin en çok kullanılan formu, o yüzden tek ekranda ve kısa */
export function VehicleForm() {
  const [state, action, pending] = useActionState(createVehicle, IDLE);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [trim, setTrim] = useState("");
  const [color, setColor] = useState("");
  const [engine, setEngine] = useState("");
  const [fuel, setFuel] = useState("");
  const [transmission, setTransmission] = useState("");
  const [body, setBody] = useState("");
  const e = state.errors ?? {};

  // Model listesi seçili markaya göre daralıyor; marka listede yoksa serbest giriş kalıyor
  const modelOptions = useMemo(
    () => (MODELS_BY_MAKE[make] ?? []).map((v) => ({ value: v })),
    [make],
  );

  // Paket önce model, model yoksa marka üzerinden öneriliyor
  const trimOptions = useMemo(() => {
    const list = TRIMS_BY_MODEL[`${make}|${model}`] ?? TRIMS_BY_MAKE[make] ?? [];
    return list.map((v) => ({ value: v }));
  }, [make, model]);

  return (
    <form action={action} className="p-4 space-y-5">
      <Alert state={state} />

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Araç</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Plaka" hint="opsiyonel" error={e.plate}>
            <input name="plate" placeholder="34 ABC 123" className={CONTROL} />
          </Field>
          <Field label="Marka" hint="yazmaya başla" error={e.make}>
            <Combobox
              name="make"
              options={MAKE_OPTIONS}
              value={make}
              onChange={(v) => {
                setMake(v);
                // Marka değişince eski model ve paket geçersiz kalıyor
                if (MODELS_BY_MAKE[v] && !MODELS_BY_MAKE[v].includes(model)) {
                  setModel("");
                  setTrim("");
                }
              }}
              placeholder="Volkswagen"
              showBrandBadge
              required
            />
          </Field>
          <Field label="Model" error={e.model}>
            <Combobox
              name="model"
              options={modelOptions}
              value={model}
              onChange={setModel}
              placeholder={make ? "Passat" : "Önce marka seç"}
              required
            />
          </Field>
          <Field label="Paket" error={e.trim}>
            <Combobox
              name="trim"
              options={trimOptions}
              value={trim}
              onChange={setTrim}
              placeholder={make ? "Highline" : "Önce marka seç"}
            />
          </Field>

          <Field label="Model yılı" error={e.year}>
            <input
              name="year"
              type="number"
              required
              defaultValue={new Date().getFullYear()}
              className={CONTROL}
            />
          </Field>
          <Field label="Kilometre" error={e.km}>
            <input name="km" type="number" placeholder="120000" className={CONTROL} />
          </Field>
          <Field label="Motor" error={e.engine}>
            <Combobox
              name="engine"
              options={ENGINE_OPTIONS}
              value={engine}
              onChange={setEngine}
              placeholder="1.6"
            />
          </Field>
          <Field label="Renk" error={e.color}>
            <Combobox
              name="color"
              options={COLOR_OPTIONS}
              value={color}
              onChange={setColor}
              placeholder="Beyaz"
            />
          </Field>

          <Field label="Yakıt" error={e.fuel}>
            <Combobox
              name="fuel"
              options={FUEL_OPTS}
              value={fuel}
              onChange={setFuel}
              placeholder="Dizel"
            />
          </Field>
          <Field label="Vites" error={e.transmission}>
            <Combobox
              name="transmission"
              options={TRANSMISSION_OPTS}
              value={transmission}
              onChange={setTransmission}
              placeholder="Otomatik"
            />
          </Field>
          <Field label="Kasa" error={e.body}>
            <Combobox
              name="body"
              options={BODY_OPTS}
              value={body}
              onChange={setBody}
              placeholder="Sedan"
            />
          </Field>
          <Field label="Şasi no" hint="noter için" error={e.chassisNo}>
            <input name="chassisNo" className={CONTROL} />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Alış</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Alış fiyatı (TL)" error={e.purchasePrice}>
            <input name="purchasePrice" required placeholder="1.250.000" className={CONTROL} />
          </Field>
          <Field label="Alış tarihi" error={e.purchaseDate}>
            <input
              name="purchaseDate"
              type="date"
              required
              defaultValue={today()}
              className={CONTROL}
            />
          </Field>
          <Field label="Kimden alındı" hint="cari otomatik açılır" error={e.sellerName}>
            <input name="sellerName" placeholder="Ahmet Yılmaz" className={CONTROL} />
          </Field>
          <Field label="Telefon" error={e.sellerPhone}>
            <input name="sellerPhone" placeholder="0532 ..." className={CONTROL} />
          </Field>

          <Field label="İstenen satış fiyatı" hint="beklenen kâr bundan çıkar" error={e.askingPrice}>
            <input name="askingPrice" placeholder="1.450.000" className={CONTROL} />
          </Field>
          <Field label="Tramer (TL)" error={e.damageRecord}>
            <input name="damageRecord" placeholder="0" className={CONTROL} />
          </Field>
          <Field label="Not" className="lg:col-span-2" error={e.note}>
            <input name="note" placeholder="Serviste, 2 anahtar var…" className={CONTROL} />
          </Field>
        </div>
      </section>

      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary !h-10 !px-5"
      >
        {pending ? "Kaydediliyor…" : "Aracı stoğa ekle"}
      </button>
    </form>
  );
}

export function ExpenseForm({ vehicleId }: { vehicleId: number }) {
  const [state, action, pending] = useActionState(addExpense, IDLE);
  const e = state.errors ?? {};

  return (
    <form action={action} className="p-4 space-y-3">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <Alert state={state} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Kalem" error={e.category}>
          <select name="category" defaultValue="bakim_onarim" className={CONTROL}>
            {EXPENSE_CATEGORIES.map((c: ExpenseCategory) => (
              <option key={c} value={c}>
                {EXPENSE_LABELS[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tutar (TL)" error={e.amount}>
          <input name="amount" required placeholder="12.500" className={CONTROL} />
        </Field>
        <Field label="Tarih" error={e.spentAt}>
          <input name="spentAt" type="date" required defaultValue={today()} className={CONTROL} />
        </Field>
        <Field label="Belge no" hint="opsiyonel" error={e.documentNo}>
          <input name="documentNo" className={CONTROL} />
        </Field>
        <Field label="Açıklama" error={e.note}>
          <input name="note" placeholder="Ön fren balata" className={CONTROL} />
        </Field>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="btn btn-ghost"
      >
        {pending ? "Ekleniyor…" : "Masraf ekle"}
      </button>
    </form>
  );
}

export function SaleForm({ vehicleId, suggested }: { vehicleId: number; suggested?: number | null }) {
  const [state, action, pending] = useActionState(recordSale, IDLE);
  const e = state.errors ?? {};

  return (
    <form action={action} className="p-4 space-y-3">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <Alert state={state} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Satış fiyatı (TL)" error={e.salePrice}>
          <input
            name="salePrice"
            required
            defaultValue={suggested ? String(suggested) : ""}
            className={CONTROL}
          />
        </Field>
        <Field label="Satış tarihi" error={e.saleDate}>
          <input name="saleDate" type="date" required defaultValue={today()} className={CONTROL} />
        </Field>
        <Field label="Ödeme şekli" error={e.paymentMethod}>
          <select name="paymentMethod" defaultValue="nakit" className={CONTROL}>
            {PAYMENT_METHODS.map((m: PaymentMethod) => (
              <option key={m} value={m}>
                {PAYMENT_LABELS[m]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Kime satıldı" error={e.buyerName}>
          <input name="buyerName" placeholder="Mehmet Demir" className={CONTROL} />
        </Field>
        <Field label="Telefon" error={e.buyerPhone}>
          <input name="buyerPhone" placeholder="0555 ..." className={CONTROL} />
        </Field>
        <Field label="Tahsil edilen" hint="kalanı bakiye olarak izlenir" error={e.collected}>
          <input name="collected" placeholder="peşin tutar" className={CONTROL} />
        </Field>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary"
      >
        {pending ? "Kaydediliyor…" : "Satışı kaydet"}
      </button>
    </form>
  );
}

export function PaymentForm({ vehicleId }: { vehicleId: number }) {
  const [state, action, pending] = useActionState(addPayment, IDLE);
  const e = state.errors ?? {};

  return (
    <form action={action} className="p-4 space-y-3">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <Alert state={state} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Hareket" error={e.direction}>
          <select name="direction" defaultValue="tahsilat" className={CONTROL}>
            <option value="tahsilat">Tahsilat (giren)</option>
            <option value="odeme">Ödeme (çıkan)</option>
          </select>
        </Field>
        <Field label="Tutar (TL)" error={e.amount}>
          <input name="amount" required className={CONTROL} />
        </Field>
        <Field label="Tarih" error={e.paidAt}>
          <input name="paidAt" type="date" required defaultValue={today()} className={CONTROL} />
        </Field>
        <Field label="Yöntem" error={e.method}>
          <select name="method" defaultValue="" className={CONTROL}>
            <option value="">Seç</option>
            {PAYMENT_METHODS.map((m: PaymentMethod) => (
              <option key={m} value={m}>
                {PAYMENT_LABELS[m]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="btn btn-ghost"
      >
        {pending ? "Ekleniyor…" : "Hareket ekle"}
      </button>
    </form>
  );
}
