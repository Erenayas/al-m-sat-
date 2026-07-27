import { Card, Empty } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import { listContacts } from "@/lib/stock";

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
  const params = await searchParams;
  const q = Array.isArray(params.q) ? params.q[0] : params.q;
  const rows = await listContacts(q);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Cariler</h1>
        <p className="text-sm text-muted mt-1">
          Araç alırken ve satarken girdiğin kişiler burada birikiyor —
          kimden kaç araç aldın, kime kaç araç sattın.
        </p>
      </div>

      <form action="/cariler" className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="İsim ya da telefon ara"
          className="h-9 w-full sm:w-72 rounded-lg border border-border bg-surface-2 px-2.5 text-sm outline-none focus:border-accent"
        />
        <button className="h-9 rounded-lg border border-border px-3 text-sm hover:bg-surface-2">
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
                <tr className="text-xs text-muted text-left border-b border-border">
                  <th className="font-medium px-3 py-2">İsim</th>
                  <th className="font-medium px-3 py-2">Telefon</th>
                  <th className="font-medium px-3 py-2">Tip</th>
                  <th className="font-medium px-3 py-2 text-right">Alınan</th>
                  <th className="font-medium px-3 py-2 text-right">Satılan</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface-2">
                    <td className="px-3 py-2.5 font-medium">
                      {c.name}
                      {c.note && <span className="block text-xs text-muted">{c.note}</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      {c.phone ? (
                        <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="text-accent">
                          {c.phone}
                        </a>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-muted">{KIND_LABELS[c.kind] ?? c.kind}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {formatNumber(c.boughtCount)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {formatNumber(c.soldCount)}
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
