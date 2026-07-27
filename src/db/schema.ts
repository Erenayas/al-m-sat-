import {
  pgTable,
  serial,
  integer,
  bigint,
  text,
  timestamp,
  boolean,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Veri kaynakları. Her galeri feed'i, her portal entegrasyonu bir satır.
 * Kaynak bazlı güven skoru (`trust`) fiyat istatistiğinde ağırlık olarak kullanılır —
 * kendi stoğunu şişiren bir galeri medyanı bozmasın diye.
 */
export const sources = pgTable("sources", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  /** gallery_xml | portal_feed | manual */
  kind: text("kind").notNull(),
  url: text("url"),
  city: text("city"),
  isActive: boolean("is_active").notNull().default(true),
  trust: real("trust").notNull().default(1),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Kanonik araç kohortu. Farklı kaynaklarda farklı yazılmış aynı araç
 * buraya tek satır olarak düşer; fiyat istatistiği bu kohort üzerinden hesaplanır.
 */
export const vehicles = pgTable(
  "vehicles",
  {
    id: serial("id").primaryKey(),
    /** make|model|trim|year|fuel|transmission|body — eşleştirme anahtarı */
    canonicalKey: text("canonical_key").notNull(),
    make: text("make").notNull(),
    model: text("model").notNull(),
    trim: text("trim"),
    year: integer("year").notNull(),
    /** Motor hacmi, ör. "1.6" — fiyata ciddi etki ettiği için kohortun parçası */
    engine: text("engine"),
    fuel: text("fuel"),
    transmission: text("transmission"),
    body: text("body"),
    segment: text("segment"),
    /** Donanım seviyesi 0-100; kohort daraltılamadığında fiyat düzeltmesinde kullanılır */
    trimTier: integer("trim_tier"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (tbl) => [
    uniqueIndex("vehicles_canonical_key_idx").on(tbl.canonicalKey),
    index("vehicles_lookup_idx").on(tbl.make, tbl.model, tbl.year),
  ],
);

/**
 * İlan. Aynı ilan her tarama turunda güncellenir (`lastSeenAt`),
 * kaybolduğunda `removedAt` damgalanır — satış süresi buradan çıkıyor.
 */
export const listings = pgTable(
  "listings",
  {
    id: serial("id").primaryKey(),
    sourceId: integer("source_id")
      .notNull()
      .references(() => sources.id),
    /** Kaynaktaki ilan kimliği */
    externalId: text("external_id").notNull(),
    vehicleId: integer("vehicle_id").references(() => vehicles.id),

    title: text("title").notNull(),
    /** Normalizasyon öncesi ham alanlar — eşleştirme hatası ayıklamak için saklanıyor */
    rawMake: text("raw_make"),
    rawModel: text("raw_model"),
    rawTrim: text("raw_trim"),

    price: bigint("price", { mode: "number" }).notNull(),
    currency: text("currency").notNull().default("TRY"),
    km: integer("km"),
    year: integer("year"),

    city: text("city"),
    district: text("district"),
    /** galeri | sahibinden | yetkili_bayi */
    sellerType: text("seller_type"),
    sellerName: text("seller_name"),

    /** TRAMER kaydı (TL). 0 = hasarsız, null = bilinmiyor */
    damageRecord: bigint("damage_record", { mode: "number" }),
    /** Boyalı/değişen parça sayısı */
    paintedParts: integer("painted_parts"),
    changedParts: integer("changed_parts"),

    url: text("url"),
    imageUrl: text("image_url"),

    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    /** active | removed */
    status: text("status").notNull().default("active"),

    /** normalize.ts eşleşme güveni (0-1). Düşükse ilan "elle kontrol" kuyruğuna düşer. */
    matchConfidence: real("match_confidence"),

    /** Son hesaplanan fırsat skoru — sıralama sorgularını hızlandırmak için materyalize */
    dealScore: real("deal_score"),
    expectedPrice: bigint("expected_price", { mode: "number" }),
    /** Skorun güveni (0-1): örneklem, kohort dağınıklığı ve kohort genişletmesinin bileşimi */
    scoreConfidence: real("score_confidence"),
    scoredAt: timestamp("scored_at", { withTimezone: true }),
  },
  (tbl) => [
    uniqueIndex("listings_source_external_idx").on(tbl.sourceId, tbl.externalId),
    index("listings_vehicle_idx").on(tbl.vehicleId),
    index("listings_status_idx").on(tbl.status),
    index("listings_deal_idx").on(tbl.dealScore),
    index("listings_first_seen_idx").on(tbl.firstSeenAt),
  ],
);

/**
 * Fiyat geçmişi. Bir ilanın kaç kez indirim gördüğü, satıcının ne kadar
 * sıkıştığının en net göstergesi — panelin en çok bakılan kolonu olacak.
 */
export const priceEvents = pgTable(
  "price_events",
  {
    id: serial("id").primaryKey(),
    listingId: integer("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    price: bigint("price", { mode: "number" }).notNull(),
    /** Bir önceki fiyata göre fark (TL). İlk kayıtta 0. */
    delta: bigint("delta", { mode: "number" }).notNull().default(0),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (tbl) => [index("price_events_listing_idx").on(tbl.listingId, tbl.observedAt)],
);

/**
 * Kohort bazlı piyasa istatistikleri. Ingest sonrası toplu hesaplanır;
 * panel bunları okur, canlı hesap yapmaz.
 */
export const marketStats = pgTable(
  "market_stats",
  {
    id: serial("id").primaryKey(),
    vehicleId: integer("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    sampleSize: integer("sample_size").notNull(),
    p25: bigint("p25", { mode: "number" }).notNull(),
    median: bigint("median", { mode: "number" }).notNull(),
    p75: bigint("p75", { mode: "number" }).notNull(),
    medianKm: integer("median_km"),
    /** Satılan ilanların medyan ilanda kalma süresi (gün) */
    medianDaysOnMarket: real("median_days_on_market"),
    /** Son 30 günde bu kohorttan kaç ilan düştü */
    supply30d: integer("supply_30d").notNull().default(0),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (tbl) => [uniqueIndex("market_stats_vehicle_idx").on(tbl.vehicleId)],
);

/** Kullanıcının kayıtlı araması — bildirim motoru bunları döner */
export const savedSearches = pgTable("saved_searches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  /** JSON filtre gövdesi */
  filters: text("filters").notNull(),
  /** Bu skorun üzerindeki ilanlar bildirilir */
  minDealScore: real("min_deal_score").default(10),
  notifyChannel: text("notify_channel").default("panel"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Source = typeof sources.$inferSelect;
export type Vehicle = typeof vehicles.$inferSelect;
export type Listing = typeof listings.$inferSelect;
export type MarketStat = typeof marketStats.$inferSelect;
