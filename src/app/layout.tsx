import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { logout } from "@/app/giris/actions";
import { CompareProvider } from "@/components/CompareContext";
import { getSession } from "@/lib/auth";
import { hasMarketData } from "@/lib/queries";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Oto Galeri Paneli",
  description:
    "Galeriler için stok, maliyet ve kâr takibi. Araç başına gerçek maliyet, " +
    "sermaye devir hızı ve ölü stok kontrolü.",
};

/**
 * Ana ürün galerinin kendi stoğu; piyasa analizi feed bağlandığında
 * anlam kazanan ikinci katman, o yüzden /pazar altında ayrı duruyor.
 */
const NAV = [
  { href: "/", label: "Panel" },
  { href: "/araclar", label: "Araçlar" },
  { href: "/cariler", label: "Cariler" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Burada `requireSession` kullanılmıyor: giriş sayfası da bu düzeni kullanıyor
  // ve yönlendirme döngüsüne girerdi. Yetkilendirme her sayfanın kendi içinde.
  const session = await getSession();

  // Piyasa sekmesi ancak bağlı kaynak varken görünüyor; boş bir sekme
  // ürünü eksik gösteriyor ve müşteriye gösterirken en son istenen şey bu.
  const nav = session && (await hasMarketData()) ? [...NAV, { href: "/pazar", label: "Pazar" }] : NAV;

  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        {session && (
          <header className="border-b border-border bg-surface sticky top-0 z-40">
            <div className="mx-auto max-w-[110rem] px-4 h-14 flex items-center gap-6">
              <Link href="/" className="font-semibold tracking-tight whitespace-nowrap">
                Oto Panel
              </Link>
              <nav className="flex items-center gap-1 overflow-x-auto">
                {nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-lg px-3 py-1.5 text-sm text-muted hover:text-text hover:bg-surface-2 whitespace-nowrap"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="ml-auto flex items-center gap-3">
                <span className="text-sm text-right hidden sm:block">
                  <span className="block leading-tight">{session.tenantName}</span>
                  <span className="block text-xs text-muted leading-tight">{session.name}</span>
                </span>
                <form action={logout}>
                  <button className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:text-text whitespace-nowrap">
                    Çıkış
                  </button>
                </form>
              </div>
            </div>
          </header>
        )}

        <CompareProvider>
          <main className="mx-auto w-full max-w-[110rem] flex-1 px-4 py-6 pb-24">
            {children}
          </main>
        </CompareProvider>
      </body>
    </html>
  );
}
