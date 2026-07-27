import Link from "next/link";
import { ListingTable } from "@/components/ListingTable";
import { Card, Stat } from "@/components/ui";
import { formatDays, formatNumber } from "@/lib/format";
import {
  getFreshListings,
  getKpis,
  getRecentPriceDrops,
  getStaleListings,
  getTopDeals,
} from "@/lib/queries";

// Panel canlı bir akış gösteriyor; her istekte taze veri okunmalı.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [kpis, fresh, deals, drops, stale] = await Promise.all([
    getKpis(),
    getFreshListings(10),
    getTopDeals(10),
    getRecentPriceDrops(10),
    getStaleListings(10),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Fırsatlar</h1>
        <p className="text-sm text-muted mt-1">
          Bağlı {kpis.trackedGalleries} galeri feed&apos;inden gelen ilanlar, kohort
          medyanına göre skorlanır.
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Stat label="Aktif ilan" value={formatNumber(kpis.activeListings)} />
        <Stat
          label="Son 24 saatte düşen"
          value={formatNumber(kpis.newLast24h)}
          sub="yeni ilan"
          tone="good"
        />
        <Stat
          label="Fırsat"
          value={formatNumber(kpis.deals)}
          sub="%10+ piyasa altı"
          tone="good"
        />
        <Stat
          label="Medyan devir"
          value={formatDays(kpis.medianTurnoverDays)}
          sub="ilandan satışa"
        />
        <Stat
          label="Fiyat kıran"
          value={formatNumber(kpis.droppedLast7d)}
          sub="son 7 gün"
        />
      </div>

      <Card
        title="Anlık akış — son 24 saat"
        hint="Feed'e yeni düşen ilanlar, fırsat skoruna göre sıralı"
        action={
          <Link href="/ilanlar?sort=newest" className="text-xs text-accent">
            tümü →
          </Link>
        }
      >
        <ListingTable
          rows={fresh}
          columns={["compare", "vehicle", "km", "price", "expected", "deal", "seller", "age", "link"]}
          emptyText="Son 24 saatte yeni ilan düşmedi."
        />
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card
          title="En iyi fırsatlar"
          hint="Kohort medyanının en altındaki, güveni yeterli ilanlar"
          action={
            <Link href="/ilanlar?minDealScore=10" className="text-xs text-accent">
              tümü →
            </Link>
          }
        >
          <ListingTable
            rows={deals}
            columns={["compare", "vehicle", "km", "price", "expected", "deal", "link"]}
          />
        </Card>

        <Card
          title="Fiyat kıranlar"
          hint="Son 7 günde indirim yapanlar — pazarlık payının en net sinyali"
          action={
            <Link href="/ilanlar?sort=pressure" className="text-xs text-accent">
              tümü →
            </Link>
          }
        >
          <ListingTable
            rows={drops}
            columns={["compare", "vehicle", "price", "change", "pressure", "deal", "link"]}
            emptyText="Son 7 günde fiyat kıran olmadı."
          />
        </Card>
      </div>

      <Card
        title="Uzun süredir dönmeyenler"
        hint="45 günü aşan ilanlar. Satıcı burada en sıkışık; teklif için en uygun grup."
      >
        <ListingTable
          rows={stale}
          columns={["compare", "vehicle", "km", "price", "change", "pressure", "seller", "age", "link"]}
          emptyText="45 günü aşan ilan yok."
        />
      </Card>
    </div>
  );
}
