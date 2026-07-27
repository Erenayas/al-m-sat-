"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { BrandBadge } from "./BrandBadge";
import { fold, searchOptions, type SearchOption } from "@/lib/search";

/**
 * Aranabilir seçim kutusu.
 *
 * Galerici marka/model yazarken hata yapıyor ("vosvogen", "corola") ve serbest
 * metin girişi kohortları böldüğü için fiyat istatistiğini de bozuyor. Bu bileşen
 * yazdıkça filtreliyor, yazım hatalarını tolere ediyor ve seçimi kanonik ada
 * sabitliyor.
 *
 * Kutuda görünen metin ile seçili değer TEK bir duruma bağlı. Ayrı tutulduğunda,
 * seçim sonrası odak kutuya döndüğü için liste yeniden açılıyor ve kutu boş
 * görünüyordu; değer ancak dışarı tıklanınca ortaya çıkıyordu.
 *
 * Listede olmayan değer de kabul ediliyor (`allowFree`): taksonomi hiçbir zaman
 * tam olmayacak ve galericiyi aracını kaydedemez hâle düşürmek en kötüsü.
 */

export type ComboboxOption = SearchOption;

export function Combobox({
  name,
  options,
  value,
  onChange,
  placeholder,
  disabled,
  showBrandBadge,
  allowFree = true,
  required,
  id,
}: {
  name: string;
  options: ComboboxOption[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Seçeneklerin ve kutunun başında marka logosu göster */
  showBrandBadge?: boolean;
  allowFree?: boolean;
  required?: boolean;
  id?: string;
}) {
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoId = useId();
  const inputId = id ?? autoId;

  // Değer dışarıdan değişebiliyor (ör. marka değişince model sıfırlanıyor)
  useEffect(() => setText(value), [value]);

  const results = useMemo(
    // Kutuda seçili değer yazılıyken listeyi ona göre daraltmak yanlış olurdu:
    // kullanıcı seçimi değiştirmek için açıyor, tüm seçenekleri görmeli.
    () => searchOptions(text === value ? "" : text, options),
    [options, text, value],
  );

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Klavyeyle gezerken seçili satır görünürde kalsın
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function commit(v: string) {
    onChange(v);
    setText(v);
    setOpen(false);
    setActive(0);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setActive((i) =>
        Math.max(0, Math.min(results.length - 1, e.key === "ArrowDown" ? i + 1 : i - 1)),
      );
      return;
    }
    if (e.key === "Enter" && open) {
      e.preventDefault();
      if (results[active]) commit(results[active].value);
      else if (allowFree && text.trim()) commit(text.trim());
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      setText(value);
    }
  }

  const typed = text.trim();
  const exactExists = results.some((r) => fold(r.value) === fold(typed));

  return (
    <div ref={wrapRef} className="relative">
      {/* Form gönderiminde giden gerçek değer */}
      <input type="hidden" name={name} value={value} />

      <div className="relative">
        {showBrandBadge && value && (
          <span className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
            <BrandBadge make={value} size={20} />
          </span>
        )}
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${inputId}-list`}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          required={required && !value}
          value={text}
          placeholder={placeholder}
          onFocus={(e) => {
            setOpen(true);
            // Yazmaya başlayınca mevcut değerin üzerine yazılsın
            e.currentTarget.select();
          }}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            setActive(0);
            if (allowFree) onChange(e.target.value);
          }}
          onKeyDown={onKeyDown}
          className={`h-9 w-full rounded-lg border border-border bg-surface-2 pr-8 text-sm text-text outline-none focus:border-accent disabled:opacity-50 ${
            showBrandBadge && value ? "pl-9" : "pl-2.5"
          }`}
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted text-xs">
          ▾
        </span>
      </div>

      {open && !disabled && (
        <ul
          ref={listRef}
          id={`${inputId}-list`}
          role="listbox"
          className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-border bg-surface shadow-lg py-1"
        >
          {results.length === 0 && !typed && (
            <li className="px-3 py-2 text-sm text-muted">Seçenek yok</li>
          )}

          {results.map((o, i) => (
            <li key={o.value} data-idx={i}>
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                onMouseEnter={() => setActive(i)}
                // Tıklamada odak kaybı yaşanmasın diye mousedown'da engelleniyor
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(o.value)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                  i === active ? "bg-surface-2" : ""
                } ${o.value === value ? "font-medium" : ""}`}
              >
                {showBrandBadge && <BrandBadge make={o.value} size={22} />}
                <span className="truncate">{o.value}</span>
                {o.value === value && <span className="ml-auto text-accent text-xs">✓</span>}
              </button>
            </li>
          ))}

          {allowFree && typed && !exactExists && (
            <li>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(typed)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-muted hover:bg-surface-2"
              >
                <span className="truncate">&quot;{typed}&quot; olarak ekle</span>
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
