import { NextResponse, type NextRequest } from "next/server";

/**
 * İyimser oturum kontrolü.
 *
 * Yalnızca çerezin varlığına bakıyor — bilinçli olarak veritabanına gitmiyor.
 * Next.js dokümanı proxy katmanını tam yetkilendirme için kullanmamayı açıkça
 * söylüyor; gerçek kontrol `requireSession()` ile her sayfa ve her server
 * action içinde, veriye en yakın noktada yapılıyor.
 *
 * Buranın işi sadece giriş yapmamış kullanıcıyı boş panele düşürmek yerine
 * doğrudan giriş ekranına almak.
 */
const PUBLIC_PATHS = ["/giris"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const hasCookie = request.cookies.has("op_session");
  if (hasCookie) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/giris";
  url.search = "";
  // Giriş sonrası kullanıcıyı gitmek istediği sayfaya geri gönderebilmek için
  if (pathname !== "/") url.searchParams.set("devam", `${pathname}${search}`);
  return NextResponse.redirect(url);
}

export const config = {
  // Statik dosyalar ve Next.js iç yolları hariç her şey
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
