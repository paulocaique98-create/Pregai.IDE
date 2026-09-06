"use client";

import { useActionState, useState } from "react";
import { signIn, signUp } from "./actions";

export default function EntrarPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const action = mode === "in" ? signIn : signUp;
  const [state, formAction, pending] = useActionState(action, null as { error?: string } | null);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Pregai</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "in" ? "Entre na sua conta" : "Crie sua conta"}
        </p>

        <form action={formAction} className="mt-6 space-y-3">
          {mode === "up" && (
            <input
              name="full_name"
              placeholder="Seu nome"
              required
              className="w-full rounded-[var(--radius)] border border-border bg-card px-3 py-2 text-sm"
            />
          )}
          <input
            name="email"
            type="email"
            placeholder="E-mail"
            required
            className="w-full rounded-[var(--radius)] border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            name="password"
            type="password"
            placeholder="Senha"
            required
            minLength={6}
            className="w-full rounded-[var(--radius)] border border-border bg-card px-3 py-2 text-sm"
          />

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-[var(--radius)] bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {pending ? "..." : mode === "in" ? "Entrar" : "Cadastrar"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "in" ? "up" : "in")}
          className="mt-4 text-sm text-muted-foreground underline"
        >
          {mode === "in" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
        </button>
      </div>
    </main>
  );
}
