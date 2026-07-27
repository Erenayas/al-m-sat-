"use client";

import { useState } from "react";
import { brandInitials, brandStyle } from "@/domain/brands";

/**
 * Marka rozeti.
 *
 * `public/logos/<slug>.svg` dosyası varsa gerçek logo basılıyor; yoksa
 * markanın kurumsal renginde harf rozeti gösteriliyor. Gerçek logolar tescilli
 * olduğu için depoya gömülmüyor — dosyayı klasöre atmak yeterli, kod değişmiyor.
 *
 * İstemci bileşeni çünkü logo dosyasının varlığı ancak yükleme hatasından
 * anlaşılıyor; `next/image` değil düz `<img>` çünkü çoğu markada dosya yok ve
 * sessizce geri düşmesi gerekiyor.
 */
/**
 * Denenen dosya uzantıları. `npm run logos` SVG üretiyor ama elle eklenen
 * logolar (`npm run logos:add`) PNG de olabiliyor; sırayla denenip ilk
 * bulunan kullanılıyor, hiçbiri yoksa harf rozetine düşülüyor.
 */
const EXTENSIONS = ["svg", "png", "webp", "jpg"] as const;

export function BrandBadge({
  make,
  size = 28,
  className = "",
}: {
  make: string | null | undefined;
  size?: number;
  className?: string;
}) {
  const [attempt, setAttempt] = useState(0);
  const style = brandStyle(make);
  const initials = brandInitials(make);
  const ext = EXTENSIONS[attempt];

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-md overflow-hidden ${className}`}
      style={{ width: size, height: size, background: style.color, color: style.ink ?? "#fff" }}
      title={make ?? undefined}
    >
      {ext ? (
        <img
          // Uzantı değişince tarayıcı yeni istek atsın diye key veriliyor
          key={ext}
          src={`/logos/${style.slug}.${ext}`}
          alt={make ?? ""}
          className="h-full w-full object-contain p-[14%]"
          loading="lazy"
          onError={() => setAttempt((i) => i + 1)}
        />
      ) : (
        <span
          className="font-semibold leading-none tracking-tight select-none"
          style={{ fontSize: Math.max(9, Math.round(size * (initials.length > 2 ? 0.3 : 0.38))) }}
        >
          {initials}
        </span>
      )}
    </span>
  );
}
