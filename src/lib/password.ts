import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Parola özetleme.
 *
 * `auth.ts`'ten ayrı duruyor çünkü orası `next/headers` ve `next/navigation`
 * kullanıyor; galeri açma komutu (`npm run tenant`) Next çalışma ortamı dışında
 * çalıştığı için bu modüle ihtiyaç duyuyor.
 */

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

// N=16384 masaüstü/sunucu için makul bir maliyet dengesi
const SCRYPT_N = 16384;
const KEY_LEN = 64;

/** Her parola kendi rastgele tuzunu taşıyor */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, KEY_LEN);
  return `scrypt$${SCRYPT_N}$${salt.toString("base64")}$${key.toString("base64")}`;
}

/**
 * Sabit zamanlı doğrulama — normal karşılaştırma, yanıt süresi farkından
 * parolanın kaç karakterinin tuttuğunu sızdırıyor.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "scrypt") return false;

  const salt = Buffer.from(parts[2], "base64");
  const expected = Buffer.from(parts[3], "base64");
  const actual = await scryptAsync(password, salt, expected.length);

  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

/** Okunabilir ama tahmin edilemez ilk parola */
export function generatePassword(): string {
  return randomBytes(9).toString("base64url").replace(/[-_]/g, "x");
}
