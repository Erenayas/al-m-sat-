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
    <section className={`card ${className}`}>
      {title && (
        <header className="flex items-start justify-between gap-4 px-4 py-3.5 border-b border-border">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
            {hint && <p className="text-xs text-muted mt-1 leading-relaxed">{hint}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

/** Sayfa başlığı — her ekranda aynı ritim */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted mt-1.5 max-w-2xl">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

const STAT_TONE = {
  default: { value: "text-text", bar: "var(--border-strong)" },
  good: { value: "text-hot", bar: "var(--hot)" },
  warn: { value: "text-high", bar: "var(--high)" },
  brand: { value: "text-brand", bar: "var(--brand)" },
} as const;

/**
 * KPI kutusu.
 *
 * Üstteki ince renk şeridi kutunun ne anlattığını bir bakışta ayırıyor;
 * dört gri kutu yan yana durduğunda hangisinin iyi hangisinin kötü haber
 * olduğu okunmuyordu.
 */
export function Stat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: keyof typeof STAT_TONE;
}) {
  const t = STAT_TONE[tone];
  return (
    <div className="card card-hover relative px-4 py-3.5">
      <span
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: t.bar }}
        aria-hidden
      />
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className={`text-[1.7rem] leading-tight font-semibold mt-1.5 ${t.value}`}>{value}</div>
      {sub && <div className="text-xs text-faint mt-1">{sub}</div>}
    </div>
  );
}

const TONE_STYLE = {
  hot: { background: "var(--hot-bg)", color: "var(--hot)" },
  good: { background: "var(--good-bg)", color: "var(--good)" },
  fair: { background: "var(--fair-bg)", color: "var(--fair)" },
  high: { background: "var(--high-bg)", color: "var(--high)" },
  unknown: { background: "var(--fair-bg)", color: "var(--fair)" },
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
      className="badge"
      style={TONE_STYLE[tone]}
      title={`Skor: ${score == null ? "—" : formatPct(score)} · Güven: ${Math.round(conf * 100)}%`}
    >
      {label}
      {showScore && score != null && tone !== "unknown" && (
        <span className="font-semibold">{formatPct(score)}</span>
      )}
    </span>
  );
}

/** Genel amaçlı durum rozeti */
export function Badge({
  children,
  tone = "fair",
}: {
  children: ReactNode;
  tone?: keyof typeof TONE_STYLE;
}) {
  return (
    <span className="badge" style={TONE_STYLE[tone]}>
      {children}
    </span>
  );
}

/** 0-100 satıcı baskısı — yüksekse pazarlık payı var demek */
export function PressureBar({ value }: { value: number }) {
  const color = value >= 60 ? "var(--hot)" : value >= 30 ? "var(--warn)" : "var(--border-strong)";
  return (
    <div className="flex items-center gap-2" title={`Satıcı baskısı: ${value}/100`}>
      <div className="h-1.5 w-14 rounded-full bg-surface-3 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-xs text-muted tabular-nums w-6">{value}</span>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 py-12 text-center text-sm text-muted leading-relaxed">{children}</div>
  );
}
