"use client";

import { useActionState } from "react";
import { login } from "@/app/giris/actions";
import { IDLE } from "@/lib/action-state";

const CONTROL =
  "h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm text-text outline-none focus:border-accent";

export function LoginForm({ devam }: { devam?: string }) {
  const [state, action, pending] = useActionState(login, IDLE);

  return (
    <form action={action} className="p-5 space-y-4">
      {devam && <input type="hidden" name="devam" value={devam} />}

      <label className="block">
        <span className="block text-xs text-muted mb-1">E-posta</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          autoFocus
          className={CONTROL}
        />
      </label>

      <label className="block">
        <span className="block text-xs text-muted mb-1">Parola</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={CONTROL}
        />
      </label>

      {state.status === "error" && state.message && (
        <p className="rounded-lg bg-high-bg text-high px-3 py-2 text-sm">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-10 w-full rounded-lg bg-accent text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Giriş yapılıyor…" : "Giriş yap"}
      </button>
    </form>
  );
}
