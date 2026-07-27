"use client";

import { useActionState, useState } from "react";
import { analyzeFeed, importFeed, type FeedState, type SampleRow } from "@/app/pazar/kaynaklar/actions";
import { formatNumber, formatTL } from "@/lib/format";

const EMPTY: FeedState = { status: "idle" };

const CONTROL =
  "h-9 w-full rounded-lg border border-border bg-surface-2 px-2.5 text-sm text-text outline-none focus:border-accent";

/**
 * Feed bağlama formu.
 *
 * İki aşamalı: "Çözümle" hiçbir şey yazmadan feed'in ne getirdiğini gösteriyor,
 * "İçe aktar" kaydediyor. Gerçek galeri feed'i ilk seferde temiz gelmediği için
 * arada bir kontrol adımı olması şart.
 */
export function FeedImportForm() {
  const [analysis, runAnalyze, analyzing] = useActionState(analyzeFeed, EMPTY);
  const [result, runImport, importing] = useActionState(importFeed, EMPTY);
  const [mode, setMode] = useState<"url" | "paste">("url");

  const state = result.status !== "idle" ? result : analysis;
  const v = state.values;

  return (
    <div className="p-4 space-y-4">
      <form className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Kaynak kodu" hint="benzersiz, ör. kadikoy-oto">
            <input
              name="code"
              defaultValue={v?.code}
              placeholder="kadikoy-oto"
              className={CONTROL}
              required
            />
          </Field>
          <Field label="Galeri adı">
            <input
              name="name"
              defaultValue={v?.name}
              placeholder="Kadıköy Oto Galeri"
              className={CONTROL}
              required
            />
          </Field>
          <Field label="İl">
            <input name="city" defaultValue={v?.city} placeholder="İstanbul" className={CONTROL} />
          </Field>
          <Field label="Kaynak tipi">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as "url" | "paste")}
              className={CONTROL}
            >
              <option value="url">Feed adresi (periyodik taranır)</option>
              <option value="paste">XML yapıştır (tek seferlik)</option>
            </select>
          </Field>
        </div>

        {mode === "url" ? (
          <Field label="Feed adresi" hint="Galerinin stok programının verdiği XML adresi">
            <input
              name="url"
              type="url"
              defaultValue={v?.url}
              placeholder="https://galeri-ornek.com/stok.xml"
              className={CONTROL}
            />
          </Field>
        ) : (
          <Field label="XML içeriği" hint="Galeriden aldığın dosyanın içeriğini buraya yapıştır">
            <textarea
              name="xml"
              rows={8}
              placeholder="<ilanlar><ilan>...</ilan></ilanlar>"
              className={`${CONTROL} h-auto py-2 font-mono text-xs`}
            />
          </Field>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            formAction={runAnalyze}
            disabled={analyzing || importing}
            className="h-9 rounded-lg border border-border px-4 text-sm font-medium hover:bg-surface-2 disabled:opacity-50"
          >
            {analyzing ? "Çözümleniyor…" : "1. Çözümle"}
          </button>
          <button
            formAction={runImport}
            disabled={analyzing || importing}
            className="h-9 rounded-lg bg-accent px-4 text-sm font-medium text-white disabled:opacity-50"
          >
            {importing ? "İçe aktarılıyor…" : "2. İçe aktar"}
          </button>
          <span className="text-xs text-muted">
            Çözümleme hiçbir şey kaydetmez — önce feed&apos;in ne getirdiğini gör.
          </span>
        </div>
      </form>

      {state.status === "error" && (
        <p className="rounded-lg bg-high-bg text-high px-3 py-2 text-sm">{state.message}</p>
      )}

      {result.imported && (
        <div className="rounded-lg bg-hot-bg text-hot px-3 py-2 text-sm">
          <strong>{result.imported.source}</strong> bağlandı — {result.imported.inserted} yeni ilan,{" "}
          {result.imported.updated} güncellendi, {result.imported.priceChanges} fiyat değişimi,{" "}
          {result.imported.removed} düştü. {result.imported.cohorts} kohort üzerinden{" "}
          {result.imported.scored} ilan skorlandı.
        </div>
      )}

      {analysis.report && !result.imported && <Report report={analysis.report} />}
    </div>
  );
}

function Report({ report }: { report: NonNullable<FeedState["report"]> }) {
  const rate = report.total ? Math.round((report.matched / report.total) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4 text-sm">
        <Metric label="Feed'deki ilan" value={formatNumber(report.total)} />
        <Metric label="Eşleşen" value={`${formatNumber(report.matched)} (%${rate})`} tone="good" />
        <Metric
          label="Eşleşmeyen"
          value={formatNumber(report.unmatched)}
          tone={report.unmatched > 0 ? "warn" : "default"}
        />
      </div>

      {report.samples.length > 0 && <SampleTable title="Eşleşen örnekler" rows={report.samples} />}

      {report.unmatchedSamples.length > 0 && (
        <>
          <SampleTable title="Eşleşmeyenler" rows={report.unmatchedSamples} />
          <p className="text-xs text-muted">
            Eşleşmeyen ilanlar veritabanına yine de yazılır ama fiyat istatistiğine
            girmez. Genelde sebep taksonomide olmayan bir model — listeyi paylaş,
            marka/model sözlüğüne ekleyeyim.
          </p>
        </>
      )}
    </div>
  );
}

function SampleTable({ title, rows }: { title: string; rows: SampleRow[] }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="px-3 py-2 text-xs font-medium text-muted border-b border-border bg-surface-2">
        {title}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="px-3 py-2 max-w-[24rem]">
                  <span className="block truncate">{r.title}</span>
                  <span className="block text-xs text-muted truncate">{r.reason}</span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {r.vehicle ? (
                    <span className="text-hot">{r.vehicle}</span>
                  ) : (
                    <span className="text-high">eşleşmedi</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                  {formatTL(r.price)}
                </td>
                <td className="px-3 py-2 text-right text-xs text-muted tabular-nums whitespace-nowrap">
                  {r.confidence == null ? "—" : `güven %${Math.round(r.confidence * 100)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "good" | "warn";
}) {
  const cls = tone === "good" ? "text-hot" : tone === "warn" ? "text-high" : "text-text";
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className={`font-semibold ${cls}`}>{value}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs text-muted mb-1">
        {label}
        {hint && <span className="text-muted/70"> · {hint}</span>}
      </span>
      {children}
    </label>
  );
}
