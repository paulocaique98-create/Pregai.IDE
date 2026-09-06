"use client";

import { useActionState, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { memberSignIn, memberSignUp } from "./actions";

const input =
  "w-full rounded-[var(--radius)] border border-border bg-card px-3 py-2 text-sm";

export function MemberAuthForm({ slug }: { slug: string }) {
  const [mode, setMode] = useState<"in" | "up">("up");
  const action = (mode === "in" ? memberSignIn : memberSignUp).bind(null, slug);
  const [state, formAction, pending] = useActionState(
    action,
    null as { error?: string } | null,
  );

  async function google() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/igreja/${slug}/membro`,
      },
    });
  }

  return (
    <div className="mt-6">
      <button
        onClick={google}
        type="button"
        className="w-full rounded-[var(--radius)] border border-border bg-card px-3 py-2 text-sm font-medium"
      >
        Continuar com Google
      </button>

      <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
      </div>

      <form action={formAction} className="space-y-3">
        {mode === "up" && (
          <input name="full_name" placeholder="Seu nome" required className={input} />
        )}
        <input name="email" type="email" placeholder="E-mail" required className={input} />
        <input
          name="password"
          type="password"
          placeholder="Senha"
          required
          minLength={6}
          className={input}
        />
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-[var(--radius)] bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {pending ? "..." : mode === "in" ? "Entrar" : "Criar cadastro de membro"}
        </button>
      </form>

      <button
        onClick={() => setMode(mode === "in" ? "up" : "in")}
        className="mt-4 text-sm text-muted-foreground underline"
      >
        {mode === "in" ? "Ainda não é cadastrado? Criar conta" : "Já tem conta? Entrar"}
      </button>
    </div>
  );
}
