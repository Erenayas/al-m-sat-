import Link from "next/link";
import { Card, Empty, PageHeader } from "@/components/ui";
import { formatDate, formatNumber } from "@/lib/format";
import { listContacts } from "@/lib/stock";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const KIND_LABELS: Record<string, string> = {
  musteri: "Müşteri",
  tedarikci: "Tedarikçi",
  her_ikisi: "Her ikisi",
};

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { tenantId } = await requireSession();
  const params = await searchParams;
  const q = Array.isArray(params.q) ? params.q[0] : params.q;
  const rows = await listContacts(tenantId, q);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cariler"
        description="Araç alırken ve satarken girdiğin kişiler burada birikiyor. Satıra basınca o kişiyle olan tüm araç geçmişi açılıyor."
      />

      <form action="/cariler" className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="İsim ya da telefon ara"
          className="input sm:!w-72"
        />
        <button className="btn btn-ghost">
          Ara
        </button>
      </form>

      <Card>
        {rows.length === 0 ? (
          <Empty>
            {q
              ? "Aramaya uyan cari yok."
              : "Henüz cari yok. Araç eklerken \"kimden alındı\", satarken \"kime satıldı\" yazdıkça otomatik oluşur."}
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="th">İsim</th>
                  <th className="th">Araçlar</th>
                  <th className="th">Telefon</th>
                  <th className="th text-right">Alınan</th>
                  <th className="th text-right">Satılan</th>
                  <th className="th text-right">Son işlem</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="row-hover last:[&>td]:border-0">
                    <td className="td">
                      <Link href={`/cariler/${c.id}`} className="block">
                        <span className="font-medium">{c.name}</span>
                        <span className="block text-xs text-muted">
                          {[KIND_LABELS[c.kind] ?? c.kind, c.city].filter(Boolean).join(" · ")}
                        </span>
                      </Link>
                    </td>
                    <td className="td max-w-[24rem]">
                      <Link href={`/cariler/${c.id}`} className="block">
                        {c.recentVehicles ? (
                          <span className="block truncate">{c.recentVehicles}</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </Link>
                    </td>
                    <td className="td">
                      {c.phone ? (
                        <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="text-brand">
                          {c.phone}
                        </a>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="td text-right tabular-nums">
                      {formatNumber(c.boughtCount)}
                    </td>
                    <td className="td text-right tabular-nums">
                      {formatNumber(c.soldCount)}
                    </td>
                    <td className="td text-right text-xs text-muted whitespace-nowrap">
                      {c.lastActivity ? formatDate(c.lastActivity) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
