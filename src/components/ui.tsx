import type { ReactNode } from "react";
import { dealLabel } from "@/domain/pricing";
import { formatPct } from "@/lib/format";

export function Card({
  title,
  hint,
  action,
  children,
  className = "",
}: {
  title?: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-border bg-surface overflow-hidden ${className}`}
    >
      {title && (
        <header className="flex items-baseline justify-between gap-4 px-4 py-3 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            {hint && <p className="text-xs text-muted mt-0.5">{hint}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "good" | "warn";
}) {
  const toneClass =
    tone === "good" ? "text-hot" : tone === "warn" ? "text-high" : "text-text";
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${toneClass}`}>{value}</div>
      {sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}
    </div>
  );
}

const TONE_CLASS = {
  hot: "bg-hot-bg text-hot",
  good: "bg-good-bg text-good",
  fair: "bg-fair-bg text-fair",
  high: "bg-high-bg text-high",
  unknown: "bg-fair-bg text-fair",
} as const;

/**
 * Fırsat rozeti. Skorun yanında güveni de taşıyor: düşük güvenli bir
 * "%20 ucuz" iddiası, galeriyi yanlış araca koşturduğu için zararlı.
 */
export function DealBadge({
  score,
  confidence,
  showScore = true,
}: {
  score: number | null;
  confidence: number | null;
  showScore?: boolean;
}) {
  const conf = confidence ?? 0;
  const { label, tone } = dealLabel(score, conf);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASS[tone]}`}
      title={`Skor: ${score == null ? "—" : formatPct(score)} · Güven: ${Math.round(conf * 100)}%`}
    >
      {label}
      {showScore && score != null && tone !== "unknown" && (
        <span className="font-semibold">{formatPct(score)}</span>
      )}
    </span>
  );
}

/** 0-100 satıcı baskısı — yüksekse pazarlık payı var demek */
export function PressureBar({ value }: { value: number }) {
  const tone = value >= 60 ? "bg-hot" : value >= 30 ? "bg-fair" : "bg-border";
  return (
    <div className="flex items-center gap-2" title={`Satıcı baskısı: ${value}/100`}>
      <div className="h-1.5 w-12 rounded-full bg-surface-2 overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-muted tabular-nums">{value}</span>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="px-4 py-10 text-center text-sm text-muted">{children}</div>;
}
