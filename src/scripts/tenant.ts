/**
 * Galeri (tenant) ve kullanıcı yönetimi.
 *
 * Panelde kayıt ekranı bilinçli olarak yok: müşteriyi sen açıyorsun, kimse
 * kendi kendine hesap yaratamıyor. 3-5 müşterilik bir üründe doğru yaklaşım bu.
 *
 *   npm run tenant -- ekle    "Kadıköy Oto" kadikoy ahmet@ornek.com "Ahmet Yılmaz"
 *   npm run tenant -- liste
 *   npm run tenant -- parola  ahmet@ornek.com
 *   npm run tenant -- askiya  kadikoy
 *   npm run tenant -- aktif   kadikoy
 */

import { eq } from "drizzle-orm";
import { db, sql } from "@/db";
import { sessions, tenants, users } from "@/db/auth";
import { generatePassword, hashPassword } from "@/lib/password";

function slugify(input: string): string {
  const map: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" };
  return input
    .toLowerCase()
    .replace(/[çğıöşü]/g, (c) => map[c] ?? c)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

async function ekle(args: string[]) {
  const [name, slugArg, email, personName] = args;
  if (!name || !email) {
    console.error('Kullanım: npm run tenant -- ekle "Galeri Adı" slug eposta@ornek.com "Ad Soyad"');
    process.exit(1);
  }

  const slug = slugify(slugArg || name);
  const normalizedEmail = email.trim().toLowerCase();

  const [existingUser] = await sql<{ id: number }[]>`
    select id from users where email = ${normalizedEmail}`;
  if (existingUser) {
    console.error(`Bu e-posta zaten kayıtlı: ${normalizedEmail}`);
    process.exit(1);
  }

  const [existingTenant] = await sql<{ id: number }[]>`
    select id from tenants where slug = ${slug}`;
  if (existingTenant) {
    console.error(`Bu slug kullanımda: ${slug}`);
    process.exit(1);
  }

  const password = generatePassword();

  const [tenant] = await db
    .insert(tenants)
    .values({ name, slug, status: "aktif" })
    .returning({ id: tenants.id });

  await db.insert(users).values({
    tenantId: tenant.id,
    email: normalizedEmail,
    passwordHash: await hashPassword(password),
    name: personName || name,
    role: "sahip",
  });

  console.log(`\nGaleri açıldı: ${name} (${slug})`);
  console.log(`  E-posta : ${normalizedEmail}`);
  console.log(`  Parola  : ${password}`);
  console.log("\nBu parolayı müşteriye ilet; ilk girişte değiştirmesi için");
  console.log("`npm run tenant -- parola <eposta>` komutunu kullanabilirsin.\n");
}

async function liste() {
  const rows = await sql<
    {
      name: string;
      slug: string;
      status: string;
      users: number;
      vehicles: number;
      lastLogin: Date | null;
    }[]
  >`
    select t.name, t.slug, t.status,
      (select count(*) from users u where u.tenant_id = t.id)::int          as users,
      (select count(*) from stock_vehicles s where s.tenant_id = t.id)::int as vehicles,
      (select max(u.last_login_at) from users u where u.tenant_id = t.id)   as "lastLogin"
    from tenants t order by t.created_at`;

  if (!rows.length) {
    console.log("Kayıtlı galeri yok. Eklemek için: npm run tenant -- ekle ...");
    return;
  }

  console.log("\nGaleri".padEnd(28) + "Slug".padEnd(20) + "Durum".padEnd(10) + "Kul.  Araç  Son giriş");
  console.log("-".repeat(85));
  for (const r of rows) {
    console.log(
      r.name.slice(0, 26).padEnd(28) +
        r.slug.padEnd(20) +
        r.status.padEnd(10) +
        String(r.users).padEnd(6) +
        String(r.vehicles).padEnd(6) +
        (r.lastLogin ? new Date(r.lastLogin).toLocaleDateString("tr-TR") : "hiç"),
    );
  }
  console.log();
}

async function parola(args: string[]) {
  const email = args[0]?.trim().toLowerCase();
  if (!email) {
    console.error("Kullanım: npm run tenant -- parola eposta@ornek.com");
    process.exit(1);
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    console.error(`Kullanıcı bulunamadı: ${email}`);
    process.exit(1);
  }

  const password = generatePassword();
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(password) })
    .where(eq(users.id, user.id));

  // Parola değişince açık oturumlar da düşmeli
  await db.delete(sessions).where(eq(sessions.userId, user.id));

  console.log(`\n${email} için yeni parola: ${password}`);
  console.log("Açık tüm oturumlar kapatıldı.\n");
}

async function durum(args: string[], status: "aktif" | "askida") {
  const slug = args[0];
  if (!slug) {
    console.error(`Kullanım: npm run tenant -- ${status === "aktif" ? "aktif" : "askiya"} <slug>`);
    process.exit(1);
  }

  const result = await db
    .update(tenants)
    .set({ status })
    .where(eq(tenants.slug, slug))
    .returning({ name: tenants.name });

  if (!result.length) {
    console.error(`Galeri bulunamadı: ${slug}`);
    process.exit(1);
  }
  console.log(
    `${result[0].name} → ${status}` +
      (status === "askida" ? " (girişleri kapandı, verisi duruyor)" : ""),
  );
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case "ekle":
      await ekle(args);
      break;
    case "liste":
      await liste();
      break;
    case "parola":
      await parola(args);
      break;
    case "askiya":
      await durum(args, "askida");
      break;
    case "aktif":
      await durum(args, "aktif");
      break;
    default:
      console.log("Komutlar: ekle · liste · parola · askiya · aktif");
      console.log('Örnek: npm run tenant -- ekle "Kadıköy Oto" kadikoy ahmet@ornek.com "Ahmet Yılmaz"');
  }

  await sql.end();
}

main().catch(async (err) => {
  console.error(err);
  await sql.end().catch(() => {});
  process.exit(1);
});
