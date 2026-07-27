import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Dışarıdan verilen bir feed adresini güvenli şekilde çeker.
 *
 * Feed URL'sini kullanıcı giriyor ve isteği sunucu atıyor. Korumasız bırakılırsa
 * panel, iç ağı taramak için kullanılabilecek bir SSRF aracına dönüşüyor:
 * `http://169.254.169.254/...` (bulut metadata servisi) ya da `http://10.0.0.5:6379`
 * gibi adresler sunucunun ağından erişilebilir olurdu.
 *
 * Bu yüzden: yalnızca http/https, yalnızca standart portlar, ve DNS çözümlemesi
 * sonrası özel/döngü/link-local IP aralıkları reddediliyor.
 */

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const ALLOWED_PORTS = new Set(["", "80", "443", "8080", "8443"]);

/** İndirilecek azami gövde — kötü niyetli ya da hatalı bir feed belleği doldurmasın */
const MAX_BYTES = 25 * 1024 * 1024;
const TIMEOUT_MS = 20_000;

export class FeedFetchError extends Error {}

/** RFC 1918 / 4193 ve benzeri, internete açık olmayan aralıklar */
export function isPrivateAddress(ip: string): boolean {
  const version = isIP(ip);

  if (version === 4) {
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
      return true; // ayrıştıramadığımız adrese güvenmiyoruz
    }
    const [a, b] = parts;
    if (a === 0) return true; // "bu ağ"
    if (a === 10) return true; // özel
    if (a === 127) return true; // döngü
    if (a === 169 && b === 254) return true; // link-local (bulut metadata)
    if (a === 172 && b >= 16 && b <= 31) return true; // özel
    if (a === 192 && b === 168) return true; // özel
    if (a === 100 && b >= 64 && b <= 127) return true; // taşıyıcı NAT
    if (a === 192 && b === 0) return true; // IETF protokol tahsisleri
    if (a >= 224) return true; // multicast ve ayrılmış
    return false;
  }

  if (version === 6) {
    const v6 = ip.toLowerCase().replace(/^\[|\]$/g, "");
    if (v6 === "::" || v6 === "::1") return true;
    if (v6.startsWith("fe80") || v6.startsWith("fc") || v6.startsWith("fd")) return true;
    // IPv6'ya gömülü IPv4 (::ffff:10.0.0.1) aynı kurallara tabi
    const embedded = v6.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (embedded) return isPrivateAddress(embedded[1]);
    return false;
  }

  return true;
}

/** URL'yi doğrular ve çözümlenen adreslerin hepsinin herkese açık olduğunu garanti eder */
export async function assertSafeFeedUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new FeedFetchError("Geçerli bir adres değil.");
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new FeedFetchError("Yalnızca http ve https adresleri desteklenir.");
  }
  if (!ALLOWED_PORTS.has(url.port)) {
    throw new FeedFetchError(`${url.port} portuna istek atılmıyor.`);
  }

  const host = url.hostname.replace(/^\[|\]$/g, "");

  // Doğrudan IP verilmişse DNS'e hiç gitmeden kontrol et
  if (isIP(host)) {
    if (isPrivateAddress(host)) {
      throw new FeedFetchError("Özel ağ adreslerine istek atılmıyor.");
    }
    return url;
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    throw new FeedFetchError(`Alan adı çözümlenemedi: ${host}`);
  }

  if (!addresses.length) throw new FeedFetchError(`Alan adı çözümlenemedi: ${host}`);
  // Tek bir kayıt bile özel ağa işaret ediyorsa reddet (DNS rebinding'e karşı)
  for (const { address } of addresses) {
    if (isPrivateAddress(address)) {
      throw new FeedFetchError("Bu alan adı özel bir ağ adresine çözümleniyor.");
    }
  }

  return url;
}

/** Doğrulanmış bir feed adresinden gövdeyi indirir */
export async function fetchFeedBody(raw: string): Promise<string> {
  const url = await assertSafeFeedUrl(raw);

  const res = await fetch(url, {
    headers: {
      accept: "application/xml,text/xml,application/json;q=0.9,*/*;q=0.8",
      "user-agent": "OtoPanel-FeedReader/1.0",
    },
    // Yönlendirme özel ağa atlamanın kolay yolu; elle kontrol ediyoruz
    redirect: "manual",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get("location");
    if (!location) throw new FeedFetchError(`Feed ${res.status} döndü ama hedef adres yok.`);
    // Tek adım yönlendirmeye izin var, hedef yeniden doğrulanıyor
    const next = new URL(location, url).toString();
    await assertSafeFeedUrl(next);
    const second = await fetch(next, {
      headers: { accept: "application/xml,text/xml,*/*;q=0.8" },
      redirect: "error",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!second.ok) throw new FeedFetchError(`Feed ${second.status} döndü.`);
    return readCapped(second);
  }

  if (!res.ok) throw new FeedFetchError(`Feed ${res.status} döndü.`);
  return readCapped(res);
}

/** Gövdeyi boyut sınırına uyarak okur */
async function readCapped(res: Response): Promise<string> {
  const declared = Number(res.headers.get("content-length") ?? "0");
  if (declared > MAX_BYTES) {
    throw new FeedFetchError("Feed çok büyük (25 MB üstü).");
  }

  const reader = res.body?.getReader();
  if (!reader) return res.text();

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new FeedFetchError("Feed çok büyük (25 MB üstü).");
    }
    chunks.push(value);
  }

  return new TextDecoder("utf-8").decode(
    chunks.reduce<Uint8Array>((acc, c) => {
      const merged = new Uint8Array(acc.length + c.length);
      merged.set(acc);
      merged.set(c, acc.length);
      return merged;
    }, new Uint8Array()),
  );
}
