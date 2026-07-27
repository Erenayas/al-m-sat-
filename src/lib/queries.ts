import "server-only";
import { sql } from "@/db";
import { computePressure } from "@/domain/pricing";
import type {
  FilterOptions,
  Kpis,
  ListingFilters,
  ListingRow,
  ListingRowBase,
  PriceHistoryRow,
  StockSummary,
} from "./listings";

export type {
  FilterOptions,
  Kpis,
  ListingFilters,
  ListingRow,
  PriceHistoryRow,
  SortKey,
  StockSummary,
} from "./listings";

/**
 * Panelin okuduğu tüm sorgular.
 *
 * Skorlar ingest sırasında materyalize edildiği için burada ağır hesap yok.
 * Fiyat baskısı SQL'de tekrar edilmiyor; ham girdiler (ilk fiyat, indirim sayısı,
 * ilanda geçen gün) çekilip `computePressure` ile domain katmanında hesaplanıyor —
 * formül tek yerde kalsın diye.
 */

type RawListingRow = ListingRowBase;

function withPressure(rows: RawListingRow[]): ListingRow[] {
  return rows.map((r) => {
    const totalChangePct =
      r.firstPrice && r.firstPrice > 0
        ? Math.round(((r.price - r.firstPrice) / r.firstPrice) * 1000) / 10
        : null;
    return { ...r, totalChangePct, pressure: computePressure(totalChangePct, r.daysOnMarket) };
  });
}

/** Ortak SELECT gövdesi; her liste sorgusu bunun üzerine WHERE/ORDER ekliyor. */
const listingSelect = sql`
  select
    l.id,
    l.title,
    v.make, v.model, v.trim, v.year, v.engine, v.fuel, v.transmission, v.body,
    l.km,
    l.price,
    l.expected_price   as "expectedPrice",
    l.deal_score       as "dealScore",
    l.score_confidence as "scoreConfidence",
    l.damage_record    as "damageRecord",
    l.painted_parts    as "paintedParts",
    l.changed_parts    as "changedParts",
    l.city, l.district,
    l.seller_name      as "sellerName",
    s.code             as "sourceCode",
    l.url,
    l.first_seen_at    as "firstSeenAt",
    greatest(0, extract(day from (now() - l.first_seen_at)))::int as "daysOnMarket",
    coalesce(pe.drop_count, 0)::int as "dropCount",
    pe.first_price     as "firstPrice",
    ms.median          as "cohortMedian",
    ms.sample_size     as "cohortSample"
  from listings l
  left join vehicles v      on v.id = l.vehicle_id
  left join sources s       on s.id = l.source_id
  left join market_stats ms on ms.vehicle_id = l.vehicle_id
  left join lateral (
    select
      count(*) filter (where e.delta < 0)                as drop_count,
      (array_agg(e.price order by e.observed_at))[1]     as first_price
    from price_events e
    where e.listing_id = l.id
  ) pe on true
`;

/** İlk fiyattan bugüne değişim oranı — SQL tarafında sıralama için */
const changeRatio = sql`((l.price - pe.first_price)::numeric / nullif(pe.first_price, 0))`;

export async function getKpis(): Promise<Kpis> {
  const [row] = await sql<
    Record<"active" | "new24" | "deals" | "turnover" | "dropped7" | "galleries", string | null>[]
  >`
    select
      (select count(*) from listings where status = 'active')::text as active,
      (select count(*) from listings
        where status = 'active' and first_seen_at >= now() - interval '24 hours')::text as new24,
      (select count(*) from listings
        where status = 'active' and deal_score >= 10 and score_confidence >= 0.4)::text as deals,
      (select round(percentile_cont(0.5) within group (
                order by extract(day from (removed_at - first_seen_at))
              )::numeric, 1)::text
         from listings where status = 'removed' and removed_at is not null) as turnover,
      (select count(distinct e.listing_id) from price_events e
        where e.delta < 0 and e.observed_at >= now() - interval '7 days')::text as dropped7,
      (select count(*) from sources where is_active)::text as galleries
  `;

  return {
    activeListings: Number(row.active),
    newLast24h: Number(row.new24),
    deals: Number(row.deals),
    medianTurnoverDays: row.turnover == null ? null : Number(row.turnover),
    droppedLast7d: Number(row.dropped7),
    trackedGalleries: Number(row.galleries),
  };
}

/** Fırsat listesi — skoru yüksek ve güveni yeterli aktif ilanlar */
export async function getTopDeals(limit = 10): Promise<ListingRow[]> {
  return withPressure(
    await sql<RawListingRow[]>`
      ${listingSelect}
      where l.status = 'active'
        and l.deal_score is not null
        and l.score_confidence >= 0.4
      order by l.deal_score desc
      limit ${limit}
    `,
  );
}

/** Anlık akış: son 24 saatte feed'e düşen ilanlar */
export async function getFreshListings(limit = 10): Promise<ListingRow[]> {
  return withPressure(
    await sql<RawListingRow[]>`
      ${listingSelect}
      where l.status = 'active'
        and l.first_seen_at >= now() - interval '24 hours'
      order by coalesce(l.deal_score, -999) desc, l.first_seen_at desc
      limit ${limit}
    `,
  );
}

/** Son 7 günde fiyat kıranlar — pazarlık payının en net sinyali */
export async function getRecentPriceDrops(limit = 10): Promise<ListingRow[]> {
  return withPressure(
    await sql<RawListingRow[]>`
      ${listingSelect}
      where l.status = 'active'
        and exists (
          select 1 from price_events e
          where e.listing_id = l.id and e.delta < 0
            and e.observed_at >= now() - interval '7 days'
        )
      order by ${changeRatio} asc nulls last
      limit ${limit}
    `,
  );
}

/** Uzun süredir dönmeyen stok — satıcı en sıkışık burada */
export async function getStaleListings(limit = 10): Promise<ListingRow[]> {
  return withPressure(
    await sql<RawListingRow[]>`
      ${listingSelect}
      where l.status = 'active'
        and l.first_seen_at <= now() - interval '45 days'
      order by l.first_seen_at asc
      limit ${limit}
    `,
  );
}

export async function searchListings(f: ListingFilters): Promise<ListingRow[]> {
  const limit = Math.min(f.limit ?? 120, 300);
  const order =
    f.sort === "price_asc" ? sql`l.price asc`
    : f.sort === "price_desc" ? sql`l.price desc`
    : f.sort === "newest" ? sql`l.first_seen_at desc`
    : f.sort === "km_asc" ? sql`l.km asc nulls last`
    : f.sort === "pressure" ? sql`${changeRatio} asc nulls last`
    : sql`l.deal_score desc nulls last`;

  return withPressure(
    await sql<RawListingRow[]>`
      ${listingSelect}
      where l.status = 'active'
        ${f.make ? sql`and v.make = ${f.make}` : sql``}
        ${f.model ? sql`and v.model = ${f.model}` : sql``}
        ${f.city ? sql`and l.city = ${f.city}` : sql``}
        ${f.source ? sql`and s.code = ${f.source}` : sql``}
        ${f.yearMin ? sql`and v.year >= ${f.yearMin}` : sql``}
        ${f.yearMax ? sql`and v.year <= ${f.yearMax}` : sql``}
        ${f.priceMin ? sql`and l.price >= ${f.priceMin}` : sql``}
        ${f.priceMax ? sql`and l.price <= ${f.priceMax}` : sql``}
        ${f.kmMax ? sql`and l.km <= ${f.kmMax}` : sql``}
        ${f.minDealScore != null ? sql`and l.deal_score >= ${f.minDealScore}` : sql``}
        ${f.cleanOnly ? sql`and coalesce(l.damage_record, 0) = 0` : sql``}
      order by ${order}
      limit ${limit}
    `,
  );
}

export async function getListingsByIds(ids: number[]): Promise<ListingRow[]> {
  if (!ids.length) return [];
  return withPressure(
    await sql<RawListingRow[]>`
      ${listingSelect}
      where l.id in ${sql(ids)}
      order by l.price asc
    `,
  );
}

export async function getFilterOptions(): Promise<FilterOptions> {
  const [makes, cities, sourceRows, models] = await Promise.all([
    sql<{ make: string }[]>`
      select distinct v.make from listings l join vehicles v on v.id = l.vehicle_id
      where l.status = 'active' order by v.make`,
    sql<{ city: string }[]>`
      select distinct city from listings where status = 'active' and city is not null order by city`,
    sql<{ code: string; name: string }[]>`
      select code, name from sources where is_active order by name`,
    sql<{ make: string; model: string }[]>`
      select distinct v.make, v.model from listings l join vehicles v on v.id = l.vehicle_id
      where l.status = 'active' order by v.make, v.model`,
  ]);

  const modelsByMake: Record<string, string[]> = {};
  for (const { make, model } of models) (modelsByMake[make] ??= []).push(model);

  return {
    makes: makes.map((m) => m.make),
    cities: cities.map((c) => c.city),
    sources: sourceRows,
    modelsByMake,
  };
}

/** Galeri bazlı stok sağlığı — panelin galeriye kendi aynasını tuttuğu ekran */
export async function getStockSummaries(): Promise<StockSummary[]> {
  return sql<StockSummary[]>`
    select
      s.code, s.name, s.city,
      count(*)::int                                   as "activeCount",
      coalesce(sum(l.price), 0)::bigint               as "totalValue",
      count(*) filter (where l.deal_score <= -7)::int as "overpriced",
      count(*) filter (where l.first_seen_at <= now() - interval '60 days')::int as "deadStock",
      round(percentile_cont(0.5) within group (order by l.deal_score)::numeric, 1)::float8 as "medianDealScore",
      round(percentile_cont(0.5) within group (
        order by extract(day from (now() - l.first_seen_at))
      )::numeric, 1)::float8 as "medianDaysOnMarket"
    from listings l
    join sources s on s.id = l.source_id
    where l.status = 'active'
    group by s.code, s.name, s.city
    order by count(*) desc
  `;
}

export async function getPriceHistory(listingId: number): Promise<PriceHistoryRow[]> {
  return sql<PriceHistoryRow[]>`
    select price, observed_at as "observedAt"
    from price_events where listing_id = ${listingId}
    order by observed_at asc
  `;
}

/** Aynı kohorttaki rakip ilanlar — "bu fiyat nereden çıktı" sorusunun cevabı */
export async function getCohortPeers(listingId: number, limit = 8): Promise<ListingRow[]> {
  return withPressure(
    await sql<RawListingRow[]>`
      ${listingSelect}
      where l.status = 'active'
        and l.id <> ${listingId}
        and l.vehicle_id = (select vehicle_id from listings where id = ${listingId})
      order by l.price asc
      limit ${limit}
    `,
  );
}

export async function getListing(id: number): Promise<ListingRow | null> {
  const rows = withPressure(
    await sql<RawListingRow[]>`${listingSelect} where l.id = ${id} limit 1`,
  );
  return rows[0] ?? null;
}
