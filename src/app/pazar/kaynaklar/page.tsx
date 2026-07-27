import { FeedImportForm } from "@/components/FeedImportForm";
import { Card, Empty } from "@/components/ui";
import { formatNumber, timeAgo } from "@/lib/format";
import { getSourceStatus } from "@/lib/queries";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  await requireSession();
  const sources = await getSourceStatus();
  const demoCount = sources.filter((s) => s.isDemo).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Kaynaklar</h1>
        <p className="text-sm text-muted mt-1">
          Galeri stok feed&apos;lerini bağla. Panelin gördüğü tüm veri buradan geliyor.
        </p>
      </div>

      {demoCount > 0 && (
        <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm">
          Şu an bağlı <strong>{demoCount}</strong> kaynak demo verisi — gerçek galeri
          değil, panel boş görünmesin diye üretilmiş örnek envanter. Gerçek bir feed
          bağladığında bunları{" "}
          <code className="text-xs bg-surface-2 px-1 py-0.5 rounded">npm run seed</code>{" "}
          çalıştırmayarak temizleyebilirsin.
        </p>
      )}

      <Card
        title="Yeni feed bağla"
        hint="Galerinin stok programı bir XML adresi veriyor; yoksa dosyayı yapıştır"
      >
        <FeedImportForm />
      </Card>

      <Card title="Bağlı kaynaklar">
        {sources.length === 0 ? (
          <Empty>Henüz bağlı kaynak yok.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted text-left border-b border-border">
                  <th className="font-medium px-3 py-2">Kaynak</th>
                  <th className="font-medium px-3 py-2">Adres</th>
                  <th className="font-medium px-3 py-2 text-right">Aktif ilan</th>
                  <th className="font-medium px-3 py-2 text-right">Eşleşmeyen</th>
                  <th className="font-medium px-3 py-2 text-right">Son tarama</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.code} className="border-b border-border last:border-0">
                    <td className="px-3 py-2.5">
                      <span className="font-medium">{s.name}</span>
                      <span className="block text-xs text-muted">
                        {s.city ?? "—"} · {s.code}
                        {s.isDemo && (
                          <span className="ml-1.5 rounded bg-fair-bg text-fair px-1.5 py-0.5">
                            demo
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 max-w-[22rem]">
                      <span className="block truncate text-xs text-muted">{s.url ?? "—"}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {formatNumber(s.activeCount)}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right tabular-nums ${
                        s.unmatchedCount > 0 ? "text-high" : ""
                      }`}
                    >
                      {formatNumber(s.unmatchedCount)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs text-muted whitespace-nowrap">
                      {timeAgo(s.lastRunAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Gerçek feed nasıl alınır">
        <div className="p-4 text-sm space-y-3 text-muted">
          <p>
            Galeriler stoklarını zaten XML olarak dışa veriyor — sahibinden ve arabam&apos;a
            ilan basmak için kullandıkları şey bu. Stok programlarında (Otoplus, Oto Yazılım
            ve benzerleri) genelde &quot;XML ilan aktarımı&quot; ya da &quot;entegrasyon&quot;
            başlığı altında duruyor.
          </p>
          <p>
            Galeriye sorulacak tek cümle:{" "}
            <span className="text-text">
              &quot;Stok programınızın verdiği XML aktarım adresini alabilir miyim?&quot;
            </span>{" "}
            Galeri bundan bir şey kaybetmiyor, aksine daha fazla görünürlük kazanıyor —
            genelde itiraz etmiyor.
          </p>
          <p>
            Adresi aldıktan sonra yukarıdaki forma yapıştır, önce <strong>Çözümle</strong>&apos;ye
            bas. Kaç ilanın eşleştiğini görürsün. Sonra <strong>İçe aktar</strong>. Periyodik
            taramayı da <code className="text-xs bg-surface-2 px-1 py-0.5 rounded">npm run ingest</code>{" "}
            komutunu cron&apos;a koyarak kurabilirsin.
          </p>
        </div>
      </Card>
    </div>
  );
}
