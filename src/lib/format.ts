const tl = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0,
});
const plain = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });

export const formatTL = (v: number | null | undefined) => (v == null ? "—" : tl.format(v));

/** Tabloda yer kazanmak için: 1.250.000 ₺ -> 1,25 mn ₺ */
export function formatTLShort(v: number | null | undefined): string {
  if (v == null) return "—";
  if (Math.abs(v) >= 1_000_000) {
    return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(v / 1_000_000)} mn ₺`;
  }
  if (Math.abs(v) >= 1_000) return `${plain.format(Math.round(v / 1000))} bin ₺`;
  return tl.format(v);
}

export const formatKm = (v: number | null | undefined) =>
  v == null ? "—" : `${plain.format(v)} km`;

export const formatNumber = (v: number | null | undefined) =>
  v == null ? "—" : plain.format(v);

export function formatPct(v: number | null | undefined, withSign = true): string {
  if (v == null) return "—";
  const sign = withSign && v > 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(v)}%`;
}

export const formatDate = (d: Date | string | null | undefined) => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
};

/** "3 gün önce" — ilan akışında mutlak tarihten daha okunur */
export function timeAgo(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const mins = Math.round((Date.now() - date.getTime()) / 60_000);
  if (mins < 1) return "az önce";
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} gün önce`;
  return formatDate(date);
}

export const formatDays = (v: number | null | undefined) =>
  v == null ? "—" : `${plain.format(Math.round(v))} gün`;
