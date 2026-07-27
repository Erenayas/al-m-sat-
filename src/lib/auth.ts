import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, sql } from "@/db";
import { sessions, users } from "@/db/auth";
import { hashPassword, verifyPassword } from "./password";

export { hashPassword, verifyPassword };

export const SESSION_COOKIE = "op_session";
const SESSION_DAYS = 30;

/** Çerezdeki ham jeton veritabanında değil, özeti tutuluyor */
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: number, userAgent?: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);

  await db.insert(sessions).values({
    tokenHash: hashToken(token),
    userId,
    expiresAt,
    userAgent: userAgent?.slice(0, 300) ?? null,
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export interface SessionUser {
  userId: number;
  tenantId: number;
  email: string;
  name: string;
  role: string;
  tenantName: string;
  tenantStatus: string;
}

/**
 * Geçerli oturumu döner, yoksa null.
 * Süresi geçmiş, kullanıcısı pasif ya da galerisi askıya alınmış oturumlar geçersiz.
 */
export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const [row] = await sql<
    {
      userId: number;
      tenantId: number;
      email: string;
      name: string;
      role: string;
      tenantName: string;
      tenantStatus: string;
    }[]
  >`
    select u.id as "userId", u.tenant_id as "tenantId", u.email, u.name, u.role,
           t.name as "tenantName", t.status as "tenantStatus"
    from sessions s
    join users u on u.id = s.user_id
    join tenants t on t.id = u.tenant_id
    where s.token_hash = ${hashToken(token)}
      and s.expires_at > now()
      and u.is_active
      and t.status <> 'askida'
    limit 1`;

  return row ?? null;
}

/**
 * Oturum zorunlu. Her sayfa ve her server action bunu çağırmalı.
 *
 * `proxy.ts` yalnızca çerez var mı diye bakıyor (iyimser kontrol);
 * gerçek yetkilendirme burada, veriye en yakın noktada yapılıyor.
 */
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/giris");
  return session;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  jar.delete(SESSION_COOKIE);
}

/** Parola değişince tüm cihazlardaki oturumlar düşer */
export async function destroyAllSessions(userId: number): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function findUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1);
  return user ?? null;
}

export async function touchLogin(userId: number): Promise<void> {
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
}

/** Süresi dolmuş oturumları temizler; girişte fırsat buldukça çağrılıyor */
export async function pruneExpiredSessions(): Promise<void> {
  await sql`delete from sessions where expires_at < now()`;
}
