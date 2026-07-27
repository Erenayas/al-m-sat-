"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Karşılaştırma seçimi.
 *
 * Seçim URL'de değil bellekte tutuluyor: her kutucuk işaretlemede sayfa
 * yeniden yüklenmesin diye. Sekme ömrü boyunca kalıcı olsun diye
 * sessionStorage'a yansıtılıyor — galeri ilanlar ile karşılaştırma arasında
 * gidip gelirken seçimini kaybetmemeli.
 */

const MAX_COMPARE = 6;
const STORAGE_KEY = "karsilastirma-secimi";

interface CompareState {
  ids: number[];
  toggle: (id: number) => void;
  clear: () => void;
  has: (id: number) => boolean;
  isFull: boolean;
}

const Ctx = createContext<CompareState | null>(null);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<number[]>([]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setIds(JSON.parse(raw) as number[]);
    } catch {
      // bozuk/erişilemez storage seçimi sıfırlar, akışı bozmaz
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // yoksay
    }
  }, [ids]);

  const toggle = useCallback((id: number) => {
    setIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= MAX_COMPARE
          ? prev
          : [...prev, id],
    );
  }, []);

  const clear = useCallback(() => setIds([]), []);

  const value = useMemo<CompareState>(
    () => ({
      ids,
      toggle,
      clear,
      has: (id) => ids.includes(id),
      isFull: ids.length >= MAX_COMPARE,
    }),
    [ids, toggle, clear],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <CompareTray />
    </Ctx.Provider>
  );
}

export function useCompare(): CompareState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCompare, CompareProvider içinde kullanılmalı");
  return ctx;
}

/** Seçilen ilanlar için sabit alt bar */
function CompareTray() {
  const { ids, clear } = useCompare();
  if (!ids.length) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-border bg-surface px-4 py-2.5 shadow-lg">
        <span className="text-sm">
          <strong>{ids.length}</strong> araç seçildi
        </span>
        <Link
          href={`/pazar/karsilastir?ids=${ids.join(",")}`}
          className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white"
        >
          Karşılaştır
        </Link>
        <button
          onClick={clear}
          className="text-sm text-muted hover:text-text px-1"
          aria-label="Seçimi temizle"
        >
          Temizle
        </button>
      </div>
    </div>
  );
}

/** Tablo satırındaki seçim kutusu */
export function CompareToggle({ id }: { id: number }) {
  const { has, toggle, isFull } = useCompare();
  const checked = has(id);
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={!checked && isFull}
      onChange={() => toggle(id)}
      className="size-4 accent-[var(--accent)] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
      aria-label="Karşılaştırmaya ekle"
    />
  );
}
