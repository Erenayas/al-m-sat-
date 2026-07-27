"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, sql } from "@/db";
import {
  contacts,
  payments,
  stockExpenses,
  stockVehicles,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
} from "@/db/inventory";
import { vehicles } from "@/db/schema";
import { buildCanonicalKey, normalizeVehicle } from "@/domain/normalize";
import { requireSession } from "@/lib/auth";
import type { ActionState } from "@/lib/action-state";

/**
 * Stok işlemleri.
 *
 * Her action `requireSession()` ile başlıyor. Server action'lar doğrudan POST
 * ile de çağrılabildiği için arayüzde düğmeyi gizlemek yetkilendirme değil;
 * kontrol burada, işlemin kendisinde yapılmak zorunda.
 *
 * Kimliği dışarıdan gelen her kayıt (araç, masraf) ayrıca galeriye ait mi diye
 * doğrulanıyor — aksi halde id değiştirerek başka galerinin verisi düzenlenebilir.
 */

const emptyToUndefined = (v: unknown) => (v === "" || v == null ? undefined : v);

const moneySchema = z.preprocess(
  (v) => {
    if (v === "" || v == null) return undefined;
    // "1.250.000" / "1250000,50" gibi Türkçe yazımları da kabul et
    const s = String(v).replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? Math.round(n) : undefined;
  },
  z.number().int().min(0, "Tutar negatif olamaz"),
);

const optionalMoney = moneySchema.optional();

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tarih geçersiz")
  .refine((d) => !Number.isNaN(Date.parse(d)), "Tarih geçersiz");

function fail(err: z.ZodError): ActionState {
  const errors: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return { status: "error", message: "Formda eksik ya da hatalı alanlar var.", errors };
}

/** Aracın gerçekten bu galeriye ait olduğunu doğrular */
async function ownsVehicle(tenantId: number, vehicleId: number): Promise<boolean> {
  const [row] = await sql<{ id: number }[]>`
    select id from stock_vehicles where id = ${vehicleId} and tenant_id = ${tenantId} limit 1`;
  return Boolean(row);
}

const NOT_FOUND: ActionState = { status: "error", message: "Araç bulunamadı." };

/** Adı verilen cariyi galeri içinde bulur ya da oluşturur */
async function resolveContact(
  tenantId: number,
  name: string | undefined,
  phone: string | undefined,
  kind: "musteri" | "tedarikci",
): Promise<number | null> {
  if (!name?.trim()) return null;
  const trimmed = name.trim();

  const [existing] = await sql<{ id: number }[]>`
    select id from contacts
    where tenant_id = ${tenantId} and lower(name) = lower(${trimmed})
      ${phone ? sql`and coalesce(phone, '') = ${phone}` : sql``}
    limit 1`;
  if (existing) return existing.id;

  const [row] = await db
    .insert(contacts)
    .values({ tenantId, name: trimmed, phone: phone ?? null, kind })
    .returning({ id: contacts.id });
  return row.id;
}

/**
 * Aracı piyasa kohortuna bağlamayı dener.
 * Başarısız olması sorun değil — kohort yalnızca piyasa karşılaştırmasını
 * açıyor, kâr hesabı buna bağlı değil.
 */
async function resolveCohort(input: {
  make: string;
  model: string;
  trim?: string;
  year: number;
  fuel?: string;
  transmission?: string;
  body?: string;
  engine?: string;
}): Promise<number | null> {
  const norm = normalizeVehicle(input);
  if (!norm) return null;

  const [row] = await db
    .insert(vehicles)
    .values({
      canonicalKey: norm.canonicalKey,
      make: norm.make,
      model: norm.model,
      trim: norm.trim,
      year: norm.year,
      engine: norm.engine,
      fuel: norm.fuel,
      transmission: norm.transmission,
      body: norm.body,
      segment: norm.segment,
      trimTier: norm.trimTier,
    })
    .onConflictDoUpdate({
      target: vehicles.canonicalKey,
      set: { canonicalKey: buildCanonicalKey(norm) },
    })
    .returning({ id: vehicles.id });
  return row.id;
}

const vehicleSchema = z.object({
  plate: z.preprocess(emptyToUndefined, z.string().max(20).optional()),
  make: z.string().min(1, "Marka gerekli").max(60),
  model: z.string().min(1, "Model gerekli").max(60),
  trim: z.preprocess(emptyToUndefined, z.string().max(60).optional()),
  year: z.coerce.number().int().min(1970).max(new Date().getFullYear() + 1),
  km: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).max(2_000_000).optional()),
  engine: z.preprocess(emptyToUndefined, z.string().max(20).optional()),
  fuel: z.preprocess(emptyToUndefined, z.string().max(30).optional()),
  transmission: z.preprocess(emptyToUndefined, z.string().max(30).optional()),
  body: z.preprocess(emptyToUndefined, z.string().max(30).optional()),
  color: z.preprocess(emptyToUndefined, z.string().max(30).optional()),
  chassisNo: z.preprocess(emptyToUndefined, z.string().max(40).optional()),
  purchasePrice: moneySchema,
  purchaseDate: dateSchema,
  askingPrice: optionalMoney,
  damageRecord: optionalMoney,
  note: z.preprocess(emptyToUndefined, z.string().max(2000).optional()),
  sellerName: z.preprocess(emptyToUndefined, z.string().max(120).optional()),
  sellerPhone: z.preprocess(emptyToUndefined, z.string().max(40).optional()),
});

export async function createVehicle(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { tenantId } = await requireSession();

  const parsed = vehicleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error);
  const v = parsed.data;

  if (v.plate) {
    const [dup] = await sql<{ id: number }[]>`
      select id from stock_vehicles
      where tenant_id = ${tenantId} and upper(plate) = upper(${v.plate}) limit 1`;
    if (dup) {
      return {
        status: "error",
        message: `${v.plate} plakalı araç zaten kayıtlı.`,
        errors: { plate: "Bu plaka kullanımda" },
      };
    }
  }

  const sellerId = await resolveContact(tenantId, v.sellerName, v.sellerPhone, "tedarikci");
  const vehicleId = await resolveCohort(v);

  const [created] = await db
    .insert(stockVehicles)
    .values({
      tenantId,
      plate: v.plate?.toUpperCase() ?? null,
      make: v.make,
      model: v.model,
      trim: v.trim ?? null,
      year: v.year,
      km: v.km ?? null,
      engine: v.engine ?? null,
      fuel: v.fuel ?? null,
      transmission: v.transmission ?? null,
      body: v.body ?? null,
      color: v.color ?? null,
      chassisNo: v.chassisNo ?? null,
      vehicleId,
      purchasePrice: v.purchasePrice,
      purchaseDate: v.purchaseDate,
      purchasedFromId: sellerId,
      askingPrice: v.askingPrice ?? null,
      damageRecord: v.damageRecord ?? null,
      note: v.note ?? null,
      status: "stokta",
    })
    .returning({ id: stockVehicles.id });

  revalidatePath("/");
  revalidatePath("/araclar");
  redirect(`/araclar/${created.id}`);
}

const expenseSchema = z.object({
  vehicleId: z.coerce.number().int().positive(),
  category: z.enum(EXPENSE_CATEGORIES),
  amount: moneySchema.refine((n) => n > 0, "Tutar sıfırdan büyük olmalı"),
  spentAt: dateSchema,
  note: z.preprocess(emptyToUndefined, z.string().max(500).optional()),
  documentNo: z.preprocess(emptyToUndefined, z.string().max(60).optional()),
});

export async function addExpense(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { tenantId } = await requireSession();

  const parsed = expenseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error);
  const e = parsed.data;

  if (!(await ownsVehicle(tenantId, e.vehicleId))) return NOT_FOUND;

  await db.insert(stockExpenses).values({
    stockVehicleId: e.vehicleId,
    category: e.category,
    amount: e.amount,
    spentAt: e.spentAt,
    note: e.note ?? null,
    documentNo: e.documentNo ?? null,
  });

  revalidatePath(`/araclar/${e.vehicleId}`);
  revalidatePath("/araclar");
  revalidatePath("/");
  return { status: "ok", message: "Masraf eklendi." };
}

export async function deleteExpense(formData: FormData): Promise<void> {
  const { tenantId } = await requireSession();

  const id = Number(formData.get("expenseId"));
  const vehicleId = Number(formData.get("vehicleId"));
  if (!Number.isFinite(id) || !Number.isFinite(vehicleId)) return;
  if (!(await ownsVehicle(tenantId, vehicleId))) return;

  // Masrafın hem verilen araca hem de bu galeriye ait olduğu tek sorguda garanti
  await sql`
    delete from stock_expenses x
    using stock_vehicles sv
    where x.id = ${id}
      and x.stock_vehicle_id = sv.id
      and sv.id = ${vehicleId}
      and sv.tenant_id = ${tenantId}`;

  revalidatePath(`/araclar/${vehicleId}`);
  revalidatePath("/");
}

const saleSchema = z.object({
  vehicleId: z.coerce.number().int().positive(),
  salePrice: moneySchema.refine((n) => n > 0, "Satış fiyatı gerekli"),
  saleDate: dateSchema,
  paymentMethod: z.enum(PAYMENT_METHODS),
  buyerName: z.preprocess(emptyToUndefined, z.string().max(120).optional()),
  buyerPhone: z.preprocess(emptyToUndefined, z.string().max(40).optional()),
  /** Peşin tahsil edilen tutar; kalanı bakiye olarak izleniyor */
  collected: optionalMoney,
});

export async function recordSale(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { tenantId } = await requireSession();

  const parsed = saleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error);
  const s = parsed.data;

  const [vehicle] = await sql<{ purchase_date: string }[]>`
    select purchase_date from stock_vehicles
    where id = ${s.vehicleId} and tenant_id = ${tenantId}`;
  if (!vehicle) return NOT_FOUND;

  if (s.saleDate < vehicle.purchase_date) {
    return {
      status: "error",
      message: "Satış tarihi alış tarihinden önce olamaz.",
      errors: { saleDate: "Alış tarihinden önce" },
    };
  }

  const buyerId = await resolveContact(tenantId, s.buyerName, s.buyerPhone, "musteri");

  await db
    .update(stockVehicles)
    .set({
      status: "satildi",
      salePrice: s.salePrice,
      saleDate: s.saleDate,
      soldToId: buyerId,
      paymentMethod: s.paymentMethod,
      updatedAt: new Date(),
    })
    .where(and(eq(stockVehicles.id, s.vehicleId), eq(stockVehicles.tenantId, tenantId)));

  if (s.collected && s.collected > 0) {
    await db.insert(payments).values({
      stockVehicleId: s.vehicleId,
      direction: "tahsilat",
      amount: s.collected,
      method: s.paymentMethod,
      paidAt: s.saleDate,
      note: "Satış tahsilatı",
    });
  }

  revalidatePath(`/araclar/${s.vehicleId}`);
  revalidatePath("/araclar");
  revalidatePath("/");
  return { status: "ok", message: "Satış kaydedildi." };
}

const paymentSchema = z.object({
  vehicleId: z.coerce.number().int().positive(),
  direction: z.enum(["tahsilat", "odeme"]),
  amount: moneySchema.refine((n) => n > 0, "Tutar sıfırdan büyük olmalı"),
  method: z.preprocess(emptyToUndefined, z.enum(PAYMENT_METHODS).optional()),
  paidAt: dateSchema,
  note: z.preprocess(emptyToUndefined, z.string().max(300).optional()),
});

export async function addPayment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { tenantId } = await requireSession();

  const parsed = paymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error);
  const p = parsed.data;

  if (!(await ownsVehicle(tenantId, p.vehicleId))) return NOT_FOUND;

  await db.insert(payments).values({
    stockVehicleId: p.vehicleId,
    direction: p.direction,
    amount: p.amount,
    method: p.method ?? null,
    paidAt: p.paidAt,
    note: p.note ?? null,
  });

  revalidatePath(`/araclar/${p.vehicleId}`);
  return { status: "ok", message: "Hareket eklendi." };
}

export async function setStatus(formData: FormData): Promise<void> {
  const { tenantId } = await requireSession();

  const id = Number(formData.get("vehicleId"));
  const status = String(formData.get("status"));
  if (!Number.isFinite(id) || !["stokta", "rezerve"].includes(status)) return;

  await db
    .update(stockVehicles)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(stockVehicles.id, id), eq(stockVehicles.tenantId, tenantId)));

  revalidatePath(`/araclar/${id}`);
  revalidatePath("/araclar");
}
