import Link from "next/link";

/**
 * Pazar modülü — galerinin kendi stoğu değil, piyasadaki ilanlar.
 * Ayrı bir alt gezinme veriliyor çünkü feed bağlanmadan bu ekranlar boş;
 * ana ürünün (stok/kâr takibi) yanında ikinci katman olarak duruyor.
 */
const SUB_NAV = [
  { href: "/pazar", label: "Fırsatlar" },
  { href: "/pazar/ilanlar", label: "İlanlar" },
  { href: "/pazar/galeriler", label: "Galeri karşılaştırma" },
  { href: "/pazar/kaynaklar", label: "Kaynaklar" },
];

export default function PazarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap gap-1 border-b border-border pb-3">
        {SUB_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg px-3 py-1.5 text-sm text-muted hover:text-text hover:bg-surface-2"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
