import Link from "next/link";
import { notFound } from "next/navigation";
import { StockTable } from "@/components/stock/StockTable";
import { Card, Empty, Stat } from "@/components/ui";
import { formatDate, formatNumber, formatTL } from "@/lib/format";
import { requireSession } from "@/lib/auth";
import { getContact, getContactVehicles } from "@/lib/stock";

export const dynamic = "force-dynamic";

const KIND_LABELS: Record<string, string> = {
  musteri: "Müşteri",
  tedarikci: "Tedarikçi",
  her_ikisi: "Her ikisi",
};

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { tenantId } = await requireSession();
  const { id: rawId } = await params;
  const id = Number.parseInt(rawId, 10);
  if (!Number.isFinite(id)) notFound();

  const contact = await getContact(tenantId, id);
  if (!contact) notFound();

  const { bought, sold } = await getContactVehicles(tenantId, id);

  const boughtTotal = bought.reduce((s, r) => s + r.purchasePrice, 0);
  const soldTotal = sold.reduce((s, r) => s + (r.salePrice ?? 0), 0);
  // Bu cariye satılan araçlardan elde edilen net kâr
  const profitFromContact = sold.reduce((s, r) => s + (r.profit.profit ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/cariler" className="text-xs text-brand">
          ← cariler
        </Link>
        <h1 className="text-xl font-semibold mt-1">{contact.name}</h1>
        <p className="text-sm text-muted mt-1">
          {[
            KIND_LABELS[contact.kind] ?? contact.kind,
            contact.city,
            `${formatDate(contact.createdAt)} tarihinde eklendi`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {contact.phone && (
          <a
            href={`tel:${contact.phone.replace(/\s/g, "")}`}
            className="inline-block mt-2 rounded-lg border border-border px-3 py-1.5 text-sm text-brand"
          >
            {contact.phone} · ara
          </a>
        )}
        {contact.note && <p className="text-sm mt-2 whitespace-pre-wrap">{contact.note}</p>}
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Ondan alınan"
          value={formatNumber(bought.length)}
          sub={bought.length ? formatTL(boughtTotal) : undefined}
        />
        <Stat
          label="Ona satılan"
          value={formatNumber(sold.length)}
          sub={sold.length ? formatTL(soldTotal) : undefined}
        />
        <Stat
          label="Bu cariden kâr"
          value={sold.length ? formatTL(profitFromContact) : "—"}
          sub="ona satılan araçlardan"
          tone={profitFromContact >= 0 ? "good" : "warn"}
        />
        <Stat
          label="Toplam işlem"
          value={formatNumber(bought.length + sold.length)}
          sub="araç"
        />
      </div>

      <Card
        title="Bu kişiden alınan araçlar"
        hint="Aracı görünce kişiyi hatırlaman için"
      >
        {bought.length === 0 ? (
          <Empty>Bu kişiden alınmış araç yok.</Empty>
        ) : (
          <StockTable rows={bought} />
        )}
      </Card>

      <Card title="Bu kişiye satılan araçlar">
        {sold.length === 0 ? (
          <Empty>Bu kişiye satılmış araç yok.</Empty>
        ) : (
          <StockTable rows={sold} />
        )}
      </Card>
    </div>
  );
}
