import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Çoklu galeri (tenant) ve kimlik doğrulama.
 *
 * Her galeri ayrı bir `tenant`. Stok tarafındaki her satır bir tenant'a bağlı ve
 * sorgular istisnasız bu kolona göre filtreleniyor — bir galerinin diğerinin
 * araçlarını görmesi bu üründe yapılabilecek en ağır hata.
 */

export const tenants = pgTable(
  "tenants",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    /** URL ve fatura eşleşmesi için okunabilir kimlik */
    slug: text("slug").notNull(),
    city: text("city"),
    phone: text("phone"),
    /** deneme | aktif | askida */
    status: text("status").notNull().default("deneme"),
    /** Deneme süresi bitiş tarihi; null ise sınırsız */
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (tbl) => [uniqueIndex("tenants_slug_idx").on(tbl.slug)],
);

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    /** scrypt$N$r$p$salt$hash biçiminde; ham parola hiçbir yerde tutulmuyor */
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    /** sahip | calisan */
    role: text("role").notNull().default("sahip"),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (tbl) => [
    uniqueIndex("users_email_idx").on(tbl.email),
    index("users_tenant_idx").on(tbl.tenantId),
  ],
);

/**
 * Oturumlar veritabanında tutuluyor (imzalı çerez değil):
 * böyle olunca bir oturum tek tek iptal edilebiliyor ve parola değişince
 * tüm oturumlar düşürülebiliyor.
 */
export const sessions = pgTable(
  "sessions",
  {
    /** Çerezdeki ham jetonun SHA-256 özeti — veritabanı sızsa bile oturum çalınamaz */
    tokenHash: text("token_hash").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (tbl) => [index("sessions_user_idx").on(tbl.userId)],
);

export type Tenant = typeof tenants.$inferSelect;
export type User = typeof users.$inferSelect;
