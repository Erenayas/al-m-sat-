import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { logout } from "@/app/giris/actions";
import { CompareProvider } from "@/components/CompareContext";
import { SidebarNav, TopNav, type NavItem } from "@/components/Nav";
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
const NAV: NavItem[] = [
  { href: "/", label: "Panel", icon: "panel" },
  { href: "/araclar", label: "Araçlar", icon: "arac" },
  { href: "/cariler", label: "Cariler", icon: "cari" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Burada `requireSession` kullanılmıyor: giriş sayfası da bu düzeni kullanıyor
  // ve yönlendirme döngüsüne girerdi. Yetkilendirme her sayfanın kendi içinde.
  const session = await getSession();

  // Piyasa sekmesi ancak bağlı kaynak varken görünüyor; boş bir sekme
  // ürünü eksik gösteriyor ve müşteriye gösterirken en son istenen şey bu.
  const nav: NavItem[] =
    session && (await hasMarketData())
      ? [...NAV, { href: "/pazar", label: "Pazar", icon: "pazar" }]
      : NAV;

  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        {!session ? (
          <main className="min-h-screen">{children}</main>
        ) : (
          <div className="flex min-h-screen">
            {/* Geniş ekranda sabit yan menü */}
            <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-border bg-surface">
              <div className="h-16 flex items-center px-5 border-b border-border">
                <Link href="/" className="flex items-center gap-2.5">
                  <span className="grid size-8 place-items-center rounded-lg bg-brand text-[13px] font-bold text-[var(--on-brand)]">
                    OP
                  </span>
                  <span className="font-semibold tracking-tight">Oto Panel</span>
                </Link>
              </div>

              <div className="flex-1 p-3">
                <SidebarNav items={nav} />
              </div>

              <div className="border-t border-border p-3">
                <div className="px-2 pb-2">
                  <p className="text-sm font-medium truncate">{session.tenantName}</p>
                  <p className="text-xs text-muted truncate">{session.name}</p>
                </div>
                <form action={logout}>
                  <button className="btn btn-ghost w-full">Çıkış</button>
                </form>
              </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
              {/* Dar ekranda üst çubuk */}
              <header className="lg:hidden sticky top-0 z-40 border-b border-border bg-surface">
                <div className="flex h-14 items-center gap-3 px-4">
                  <Link href="/" className="flex items-center gap-2 shrink-0">
                    <span className="grid size-7 place-items-center rounded-lg bg-brand text-[11px] font-bold text-[var(--on-brand)]">
                      OP
                    </span>
                  </Link>
                  <div className="min-w-0 flex-1 overflow-x-auto">
                    <TopNav items={nav} />
                  </div>
                  <form action={logout} className="shrink-0">
                    <button className="btn btn-ghost !h-8 !px-3">Çıkış</button>
                  </form>
                </div>
              </header>

              <CompareProvider>
                <main className="mx-auto w-full max-w-[100rem] flex-1 px-4 py-6 lg:px-8 lg:py-8 pb-24">
                  {children}
                </main>
              </CompareProvider>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}
