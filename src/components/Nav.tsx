"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
}

/**
 * Sade çizgi ikonlar. Harici ikon paketi yerine satır içi SVG:
 * dört ikon için bir bağımlılık taşımak gereksiz, ayrıca hepsi
 * `currentColor` kullandığı için tema değişiminde kendiliğinden uyuyor.
 */
const ICONS = {
  panel: "M3 12h7V3H3v9Zm0 9h7v-6H3v6Zm11 0h7v-9h-7v9Zm0-18v6h7V3h-7Z",
  arac: "M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Zm10 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM3 17h2m4 0h6m4 0h2v-4l-2-5H7L3 13v4Z",
  cari: "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm11 12v-1a4 4 0 0 0-3-3.9M15.5 7.1a3 3 0 0 1 0 5.8",
  pazar: "M4 19V9m5 10V5m5 14v-7m5 7V8",
} as const;

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-[18px] shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={ICONS[name]} />
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
    <nav className="flex flex-col gap-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="nav-link"
          data-active={isActive(pathname, item.href)}
        >
          <Icon name={item.icon} />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

/** Dar ekranda üstte yatay gezinme */
export function TopNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 overflow-x-auto">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="nav-link !py-1.5"
          data-active={isActive(pathname, item.href)}
        >
          <Icon name={item.icon} />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
