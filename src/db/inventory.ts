import {
  pgTable,
  serial,
  integer,
  bigint,
  text,
  date,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { vehicles } from "./schema";
import { tenants } from "./auth";

/**
 * Galerinin KENDİ stoğu.
 *
 * `listings` tablosundan ayrı duruyor ve bilinçli olarak öyle: `listings`
 * piyasada gördüğümüz başkasının ilanı, burası ise galerinin sahip olduğu,
 * parasını bağladığı araç. İkisinin soruları farklı — biri "piyasa ne diyor",
 * diğeri "benim param nerede ve ne kazandırdı".
 */

/** Masraf kalemleri — galeride fiilen karşılaşılan kategoriler */
export const EXPENSE_CATEGORIES = [
  "ekspertiz",
  "boya_kaporta",
  "bakim_onarim",
  "lastik_jant",
  "noter_harc",
  "cekici_nakliye",
  "temizlik_detay",
  "ilan_reklam",
  "sigorta_kasko",
  "diger",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
  ekspertiz: "Ekspertiz",
  boya_kaporta: "Boya / kaporta",
  bakim_onarim: "Bakım / onarım",
  lastik_jant: "Lastik / jant",
  noter_harc: "Noter / harç",
  cekici_nakliye: "Çekici / nakliye",
  temizlik_detay: "Temizlik / detaylı",
  ilan_reklam: "İlan / reklam",
  sigorta_kasko: "Sigorta / kasko",
  diger: "Diğer",
};

export const VEHICLE_STATUSES = ["stokta", "rezerve", "satildi"] as const;
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

export const STATUS_LABELS: Record<VehicleStatus, string> = {
  stokta: "Stokta",
  rezerve: "Rezerve",
  satildi: "Satıldı",
};

export const PAYMENT_METHODS = ["nakit", "havale", "kredi", "takas", "senet"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  nakit: "Nakit",
  havale: "Havale / EFT",
  kredi: "Banka kredisi",
  takas: "Takas",
  senet: "Senet / vade",
};

/** Cari — hem alınan hem satılan taraf aynı tabloda; galeride aynı kişi ikisi de olabiliyor */
export const contacts = pgTable(
  "contacts",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone"),
    city: text("city"),
    /** musteri | tedarikci | her_ikisi */
    kind: text("kind").notNull().default("musteri"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (tbl) => [
    index("contacts_tenant_idx").on(tbl.tenantId),
    index("contacts_name_idx").on(tbl.tenantId, tbl.name),
  ],
);

/**
 * Stoktaki araç.
 *
 * Kâr hesabı burada tutulmuyor, türetiliyor: maliyet = alış + masraflar.
 * Materyalize edilirse masraf eklendiğinde bayatlıyor; galeride masraf
 * araç satıldıktan sonra bile geliyor (gecikmiş fatura), o yüzden her
 * okumada yeniden hesaplanıyor.
 */
export const stockVehicles = pgTable(
  "stock_vehicles",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    /** Plaka galeride aracın günlük konuşulan kimliği */
    plate: text("plate"),
    make: text("make").notNull(),
    model: text("model").notNull(),
    trim: text("trim"),
    year: integer("year").notNull(),
    km: integer("km"),
    engine: text("engine"),
    fuel: text("fuel"),
    transmission: text("transmission"),
    body: text("body"),
    color: text("color"),
    /** Şasi — noter ve ekspertiz işlerinde gerekiyor */
    chassisNo: text("chassis_no"),

    /** Piyasa kohortuna bağlanırsa fiyat karşılaştırması açılıyor */
    vehicleId: integer("vehicle_id").references(() => vehicles.id),

    purchasePrice: bigint("purchase_price", { mode: "number" }).notNull(),
    purchaseDate: date("purchase_date").notNull(),
    purchasedFromId: integer("purchased_from_id").references(() => contacts.id),

    /** İlanda istenen fiyat */
    askingPrice: bigint("asking_price", { mode: "number" }),

    damageRecord: bigint("damage_record", { mode: "number" }),
    status: text("status").notNull().default("stokta"),

    salePrice: bigint("sale_price", { mode: "number" }),
    saleDate: date("sale_date"),
    soldToId: integer("sold_to_id").references(() => contacts.id),
    paymentMethod: text("payment_method"),

    /**
     * Takasla gelen araç. Galeride çok yaygın: müşteri arabasını verip
     * üstüne para ekliyor. O araç yeni bir stok kaydı oluyor ve hangi
     * satıştan geldiği buradan izleniyor — takas zincirinin kopmaması için.
     */
    tradeInForId: integer("trade_in_for_id"),

    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (tbl) => [
    index("stock_tenant_idx").on(tbl.tenantId),
    index("stock_status_idx").on(tbl.tenantId, tbl.status),
    index("stock_purchase_date_idx").on(tbl.tenantId, tbl.purchaseDate),
    // Plaka yalnızca kendi galerisi içinde benzersiz; iki galeri aynı aracı
    // farklı zamanlarda almış olabilir ve bu geçerli bir durum.
    uniqueIndex("stock_plate_idx").on(tbl.tenantId, tbl.plate),
  ],
);

/** Araca yapılan her harcama. Gerçek maliyet buradan çıkıyor. */
export const stockExpenses = pgTable(
  "stock_expenses",
  {
    id: serial("id").primaryKey(),
    stockVehicleId: integer("stock_vehicle_id")
      .notNull()
      .references(() => stockVehicles.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    spentAt: date("spent_at").notNull(),
    note: text("note"),
    /** Belge no — mali müşavire giderken lazım oluyor */
    documentNo: text("document_no"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (tbl) => [index("expenses_vehicle_idx").on(tbl.stockVehicleId)],
);

/**
 * Tahsilat ve ödeme hareketleri.
 * Galeride satış çoğu zaman tek seferde kapanmıyor: kapora, ara ödeme, bakiye.
 */
export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    stockVehicleId: integer("stock_vehicle_id")
      .notNull()
      .references(() => stockVehicles.id, { onDelete: "cascade" }),
    /** tahsilat (bize giren) | odeme (bizden çıkan) */
    direction: text("direction").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    method: text("method"),
    paidAt: date("paid_at").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (tbl) => [index("payments_vehicle_idx").on(tbl.stockVehicleId)],
);

export type StockVehicle = typeof stockVehicles.$inferSelect;
export type StockExpense = typeof stockExpenses.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Payment = typeof payments.$inferSelect;
