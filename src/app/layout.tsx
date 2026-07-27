import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { CompareProvider } from "@/components/CompareContext";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Oto Alım-Satım Paneli",
  description:
    "Galeriler için ilan akışı, fiyat konumlandırma ve stok analizi paneli.",
};

const NAV = [
  { href: "/", label: "Fırsatlar" },
  { href: "/ilanlar", label: "İlanlar" },
  { href: "/stok", label: "Stok Analizi" },
  { href: "/kaynaklar", label: "Kaynaklar" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <header className="border-b border-border bg-surface sticky top-0 z-40">
          <div className="mx-auto max-w-[110rem] px-4 h-14 flex items-center gap-6">
            <Link href="/" className="font-semibold tracking-tight whitespace-nowrap">
              Oto Panel
            </Link>
            <nav className="flex items-center gap-1 overflow-x-auto">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-1.5 text-sm text-muted hover:text-text hover:bg-surface-2 whitespace-nowrap"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <CompareProvider>
          <main className="mx-auto w-full max-w-[110rem] flex-1 px-4 py-6 pb-24">
            {children}
          </main>
        </CompareProvider>
      </body>
    </html>
  );
}
