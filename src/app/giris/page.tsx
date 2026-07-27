import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = { title: "Giriş — Oto Galeri Paneli" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ devam?: string | string[] }>;
}) {
  // Zaten girişliyse giriş ekranını göstermenin anlamı yok
  if (await getSession()) redirect("/");

  const params = await searchParams;
  const devam = Array.isArray(params.devam) ? params.devam[0] : params.devam;

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-semibold">Oto Galeri Paneli</h1>
          <p className="text-sm text-muted mt-1">Galerinize giriş yapın</p>
        </div>
        <div className="rounded-xl border border-border bg-surface">
          <LoginForm devam={devam} />
        </div>
      </div>
    </div>
  );
}
