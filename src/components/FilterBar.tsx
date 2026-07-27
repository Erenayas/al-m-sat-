"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useTransition } from "react";
import { SORT_LABELS, type FilterOptions } from "@/lib/listings";

/**
 * Filtre çubuğu.
 *
 * Durum URL'de tutuluyor: galeri bir aramayı meslektaşına linkleyebilsin,
 * geri tuşu çalışsın ve sayfa sunucuda filtrelenmiş halde render edilsin diye.
 */
export function FilterBar({ options }: { options: FilterOptions }) {
  const params = useSearchParams();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const current = useMemo(
    () => Object.fromEntries(params.entries()) as Record<string, string>,
    [params],
  );

  function update(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === "") next.delete(key);
      else next.set(key, value);
    }
    // Marka değişince eski model filtresi geçersiz kalıyor
    if ("make" in patch) next.delete("model");
    startTransition(() => router.replace(`/pazar/ilanlar?${next.toString()}`, { scroll: false }));
  }

  const models = current.make ? (options.modelsByMake[current.make] ?? []) : [];
  const hasFilters = [
    "make", "model", "city", "source", "yearMin", "yearMax",
    "priceMin", "priceMax", "kmMax", "minDealScore", "clean",
  ].some((k) => current[k]);

  return (
    <div
      className={`rounded-xl border border-border bg-surface p-3 transition-opacity ${
        pending ? "opacity-60" : ""
      }`}
    >
      <div className="flex flex-wrap items-end gap-3">
        <Select
          label="Marka"
          value={current.make ?? ""}
          onChange={(v) => update({ make: v })}
          options={options.makes}
          allLabel="Tüm markalar"
        />
        <Select
          label="Model"
          value={current.model ?? ""}
          onChange={(v) => update({ model: v })}
          options={models}
          allLabel={current.make ? "Tüm modeller" : "Önce marka seç"}
          disabled={!current.make}
        />
        <Select
          label="İl"
          value={current.city ?? ""}
          onChange={(v) => update({ city: v })}
          options={options.cities}
          allLabel="Tüm iller"
        />
        <Select
          label="Galeri"
          value={current.source ?? ""}
          onChange={(v) => update({ source: v })}
          options={options.sources.map((s) => s.code)}
          labels={Object.fromEntries(options.sources.map((s) => [s.code, s.name]))}
          allLabel="Tüm galeriler"
        />

        <Num label="Yıl min" value={current.yearMin} onChange={(v) => update({ yearMin: v })} placeholder="2018" />
        <Num label="Yıl maks" value={current.yearMax} onChange={(v) => update({ yearMax: v })} placeholder="2025" />
        <Num label="Fiyat maks" value={current.priceMax} onChange={(v) => update({ priceMax: v })} placeholder="1500000" wide />
        <Num label="KM maks" value={current.kmMax} onChange={(v) => update({ kmMax: v })} placeholder="150000" wide />

        <Select
          label="Fırsat skoru"
          value={current.minDealScore ?? ""}
          onChange={(v) => update({ minDealScore: v })}
          options={["0", "5", "10", "15"]}
          labels={{ "0": "Piyasa ve altı", "5": "%5+ ucuz", "10": "%10+ ucuz", "15": "%15+ ucuz" }}
          allLabel="Fark etmez"
        />

        <Select
          label="Sıralama"
          value={current.sort ?? "deal"}
          onChange={(v) => update({ sort: v })}
          options={Object.keys(SORT_LABELS)}
          labels={SORT_LABELS as Record<string, string>}
        />

        <label className="flex items-center gap-2 text-sm h-9 px-1">
          <input
            type="checkbox"
            checked={current.clean === "1"}
            onChange={(e) => update({ clean: e.target.checked ? "1" : undefined })}
            className="size-4 accent-[var(--accent)]"
          />
          Hasarsız
        </label>

        {hasFilters && (
          <button
            onClick={() => startTransition(() => router.replace("/pazar/ilanlar", { scroll: false }))}
            className="btn btn-ghost"
          >
            Filtreleri temizle
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}

const CONTROL =
  "h-9 rounded-lg border border-border bg-surface-2 px-2 text-sm text-text outline-none focus:border-brand";

function Select({
  label,
  value,
  onChange,
  options,
  labels,
  allLabel,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  labels?: Record<string, string>;
  allLabel?: string;
  disabled?: boolean;
}) {
  return (
    <Field label={label}>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="select min-w-36"
      >
        {allLabel && <option value="">{allLabel}</option>}
        {options.map((o) => (
          <option key={o} value={o}>
            {labels?.[o] ?? o}
          </option>
        ))}
      </select>
    </Field>
  );
}

function Num({
  label,
  value,
  onChange,
  placeholder,
  wide,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  wide?: boolean;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        defaultValue={value ?? ""}
        placeholder={placeholder}
        // Her tuşta yeniden sorgu atmamak için değişiklik alandan çıkınca uygulanıyor
        onBlur={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onChange((e.target as HTMLInputElement).value)}
        className={`input ${wide ? "!w-32" : "!w-24"}`}
      />
    </Field>
  );
}
