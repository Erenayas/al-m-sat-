"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type IconName = "panel" | "arac" | "cari" | "pazar";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

/**
 * Menü ikonları.
 *
 * Bilinçli olarak elle `d="..."` yolu yazılmıyor: ilk denemede yollar
 * bozuktu, `Z` sonrası göreli hareketler şekilleri viewBox dışına taşırdı ve
 * ikonlar farklı boyutlarda görünüyordu. Bunun yerine hepsi `rect`, `circle`
 * ve düz çizgi gibi koordinatı doğrulanabilir temel şekillerden kuruluyor;
 * tüm koordinatlar 2-22 aralığında, yani hiçbiri taşamaz.
 */
function Icon({ name }: { name: IconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      preserveAspectRatio="xMidYMid meet"
      className="shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {name === "panel" && (
        <>
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
        </>
      )}

      {name === "arac" && (
        <>
          {/* gövde */}
          <rect x="2.5" y="11" width="19" height="6" rx="2" />
          {/* tavan */}
          <path d="M6 11 7.6 7.4A1.6 1.6 0 0 1 9 6.5h6a1.6 1.6 0 0 1 1.4.9L18 11" />
          {/* tekerlekler */}
          <circle cx="7.5" cy="17" r="1.7" />
          <circle cx="16.5" cy="17" r="1.7" />
        </>
      )}

      {name === "cari" && (
        <>
          {/* öndeki kişi */}
          <circle cx="9.5" cy="8" r="3.2" />
          <path d="M3.5 19.5a6 6 0 0 1 12 0" />
          {/* arkadaki kişi */}
          <path d="M16.4 5.6a3.2 3.2 0 0 1 0 4.8" />
          <path d="M17.8 13.8a5 5 0 0 1 2.7 4.4" />
        </>
      )}

      {name === "pazar" && (
        <>
          <path d="M4 20.5V11" />
          <path d="M9.3 20.5V5.5" />
          <path d="M14.7 20.5v-6" />
          <path d="M20 20.5V8.5" />
        </>
      )}
    </svg>
  );
}

/** Aktif bağlantı; alt sayfalar da üst bağlantıyı aktif gösteriyor */
function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="nav-link"
          data-active={isActive(pathname, item.href)}
        >
          <Icon name={item.icon} />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

/** Dar ekranda üstte yatay gezinme */
export function TopNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-0.5">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="nav-link nav-link-compact"
          data-active={isActive(pathname, item.href)}
        >
          <Icon name={item.icon} />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
