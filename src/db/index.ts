import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL tanımlı değil (.env.local dosyasına ekle)");

/**
 * `bigint` (int8) kolonları JS `number` olarak oku.
 *
 * postgres.js varsayılanda int8'i string döndürüyor — 2^53'ü aşabildiği için
 * doğru bir varsayılan, ama bizim bigint alanlarımız fiyat (TL) ve bu sınırın
 * çok altında. String dönerse formatlama ve aritmetik sessizce bozuluyor.
 */
const bigintAsNumber = {
  to: 20,
  from: [20],
  serialize: (x: number) => String(x),
  parse: (x: string) => Number(x),
};

// Next.js dev modunda hot reload her seferinde yeni havuz açmasın diye global'de tutuyoruz.
const globalForDb = globalThis as unknown as { __sql?: ReturnType<typeof postgres> };
const sql =
  globalForDb.__sql ?? postgres(url, { max: 10, types: { bigint: bigintAsNumber } });
if (process.env.NODE_ENV !== "production") globalForDb.__sql = sql;

export const db = drizzle(sql, { schema });
export { schema, sql };
