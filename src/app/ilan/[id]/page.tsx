import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingTable, SourceLink } from "@/components/ListingTable";
import { Card, DealBadge, Empty, PressureBar, Stat } from "@/components/ui";
import { analyzePricePressure } from "@/domain/pricing";
import { formatDate, formatKm, formatPct, formatTL, formatTLShort } from "@/lib/format";
import { getCohortPeers, getListing, getPriceHistory } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = Number.parseInt(rawId, 10);
  if (!Number.isFinite(id)) notFound();

  const listing = await getListing(id);
  if (!listing) notFound();

  const [history, peers] = await Promise.all([getPriceHistory(id), getCohortPeers(id, 8)]);
  const pressure = analyzePricePressure(history, listing.daysOnMarket, new Date());

  const gap = listing.expectedPrice != null ? listing.expectedPrice - listing.price : null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/ilanlar" className="text-xs text-accent">
          ← ilanlar
        </Link>
        <h1 className="text-xl font-semibold mt-1">
          {listing.make} {listing.model} {listing.trim ?? ""}
        </h1>
        <p className="text-sm text-muted mt-1">
          {[listing.year, listing.engine, listing.fuel, listing.transmission, listing.body]
            .filter(Boolean)
            .join(" · ")}{" "}
          · {listing.sellerName} · {[listing.city, listing.district].filter(Boolean).join(" / ")}
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Stat label="İlan fiyatı" value={formatTL(listing.price)} />
        <Stat
          label="Beklenen fiyat"
          value={formatTL(listing.expectedPrice)}
          sub={
            listing.cohortSample
              ? `${listing.cohortSample} benzer ilan`
              : "geniş kohorttan tahmin"
          }
        />
        <Stat
          label="Fark"
          value={gap == null ? "—" : formatTL(gap)}
          sub={gap == null ? undefined : gap > 0 ? "piyasanın altında" : "piyasanın üstünde"}
          tone={gap == null ? "default" : gap > 0 ? "good" : "warn"}
        />
        <Stat label="Kilometre" value={formatKm(listing.km)} />
        <Stat
          label="İlanda"
          value={`${listing.daysOnMarket} gün`}
          sub={`ilk görülme ${formatDate(listing.firstSeenAt)}`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card title="Fiyat geçmişi" hint="Feed'de görüldüğü her fiyat noktası">
          {history.length < 2 ? (
            <Empty>Bu ilan yayınlandığından beri fiyatını değiştirmemiş.</Empty>
          ) : (
            <div className="p-4">
              <PriceChart history={history} />
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
                <div>
                  <dt className="text-xs text-muted">İlk fiyat</dt>
                  <dd className="font-medium">{formatTL(history[0].price)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Toplam değişim</dt>
                  <dd
                    className={`font-medium ${
                      pressure.totalChangePct < 0 ? "text-hot" : "text-text"
                    }`}
                  >
                    {formatPct(pressure.totalChangePct)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">İndirim sayısı</dt>
                  <dd className="font-medium">{pressure.dropCount}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Son indirim</dt>
                  <dd className="font-medium">
                    {pressure.daysSinceLastDrop == null
                      ? "—"
                      : `${pressure.daysSinceLastDrop} gün önce`}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </Card>

        <Card title="Değerlendirme">
          <dl className="p-4 space-y-3 text-sm">
            <Row label="Fırsat">
              <DealBadge score={listing.dealScore} confidence={listing.scoreConfidence} />
            </Row>
            <Row label="Skor güveni">
              {listing.scoreConfidence == null
                ? "—"
                : `${Math.round(listing.scoreConfidence * 100)}%`}
            </Row>
            <Row label="Satıcı baskısı">
              <PressureBar value={pressure.pressure} />
            </Row>
            <Row label="Kohort medyanı">{formatTL(listing.cohortMedian)}</Row>
            <Row label="Hasar kaydı">
              {listing.damageRecord ? (
                <span className="text-high">{formatTLShort(listing.damageRecord)}</span>
              ) : (
                <span className="text-hot">Hasarsız</span>
              )}
            </Row>
            <Row label="Boyalı / değişen">
              {listing.paintedParts ?? 0} / {listing.changedParts ?? 0}
            </Row>
            <Row label="Kaynak">
              <SourceLink url={listing.url} />
            </Row>
          </dl>
        </Card>
      </div>

      <Card
        title="Aynı kohorttaki rakip ilanlar"
        hint="Beklenen fiyatın nereden çıktığını gösteren karşılaştırma kümesi"
      >
        <ListingTable
          rows={peers}
          columns={["compare", "vehicle", "km", "price", "deal", "seller", "age", "link"]}
          emptyText="Bu kohortta başka aktif ilan yok — skor daha geniş bir kümeden üretildi."
        />
      </Card>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

/**
 * Basit çizgi grafik. Harici kütüphane yok — tek bir seri için
 * satır içi SVG hem daha küçük hem tema değişkenleriyle uyumlu.
 */
function PriceChart({ history }: { history: { price: number; observedAt: Date }[] }) {
  const W = 640;
  const H = 160;
  const PAD = 8;

  const prices = history.map((h) => h.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;

  const t0 = new Date(history[0].observedAt).getTime();
  const t1 = new Date(history[history.length - 1].observedAt).getTime();
  const tSpan = t1 - t0 || 1;

  const points = history.map((h) => {
    const x = PAD + ((new Date(h.observedAt).getTime() - t0) / tSpan) * (W - PAD * 2);
    const y = H - PAD - ((h.price - min) / span) * (H - PAD * 2);
    return { x, y, ...h };
  });

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${path} L${points[points.length - 1].x.toFixed(1)},${H - PAD} L${points[0].x.toFixed(1)},${H - PAD} Z`;
  const falling = prices[prices.length - 1] < prices[0];
  const stroke = falling ? "var(--hot)" : "var(--accent)";

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full min-w-[20rem] h-40"
        role="img"
        aria-label={`Fiyat geçmişi: ${formatTL(prices[0])} → ${formatTL(prices[prices.length - 1])}`}
      >
        <path d={area} fill={stroke} opacity="0.12" />
        <path d={path} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill={stroke}>
            <title>{`${formatDate(p.observedAt)} · ${formatTL(p.price)}`}</title>
          </circle>
        ))}
      </svg>
      <div className="flex justify-between text-xs text-muted mt-1">
        <span>{formatDate(history[0].observedAt)}</span>
        <span>{formatDate(history[history.length - 1].observedAt)}</span>
      </div>
    </div>
  );
}
