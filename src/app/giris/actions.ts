"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createSession,
  destroySession,
  findUserByEmail,
  pruneExpiredSessions,
  touchLogin,
  verifyPassword,
} from "@/lib/auth";
import type { ActionState } from "@/lib/action-state";

const loginSchema = z.object({
  email: z.string().min(1, "E-posta gerekli").max(200),
  password: z.string().min(1, "Parola gerekli").max(200),
  devam: z.string().optional(),
});

/** Açık yönlendirmeyi engelle: yalnızca kendi sitemizdeki yollara dönülebilir */
function safeRedirect(target: string | undefined): string {
  if (!target) return "/";
  if (!target.startsWith("/") || target.startsWith("//")) return "/";
  return target;
}

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "E-posta ve parola gerekli." };
  }
  const { email, password, devam } = parsed.data;

  const user = await findUserByEmail(email);

  /*
   * Kullanıcı bulunamasa bile parola doğrulaması çalıştırılıyor ve mesaj aynı
   * kalıyor. Aksi halde hem yanıt süresi hem mesaj farkı, hangi e-postaların
   * kayıtlı olduğunu dışarıya sızdırıyor.
   */
  const DUMMY = "scrypt$16384$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY);

  if (!user || !ok || !user.isActive) {
    return { status: "error", message: "E-posta ya da parola hatalı." };
  }

  const ua = (await headers()).get("user-agent") ?? undefined;
  await createSession(user.id, ua);
  await touchLogin(user.id);
  // Girişler seyrek olduğu için biriken ölü oturumları temizlemek adına iyi bir an
  await pruneExpiredSessions();

  redirect(safeRedirect(devam));
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/giris");
}
