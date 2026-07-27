import { loadEnvFile } from "node:process";
import type { Config } from "drizzle-kit";

// drizzle-kit `.env.local` dosyasını kendiliğinden okumuyor.
try {
  loadEnvFile(".env.local");
} catch {
  // dosya yoksa ortam değişkeninden gelmesi bekleniyor
}

export default {
  schema: ["./src/db/schema.ts", "./src/db/inventory.ts", "./src/db/auth.ts"],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://localhost:5432/otopanel",
  },
} satisfies Config;
