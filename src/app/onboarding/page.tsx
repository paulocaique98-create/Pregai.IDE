"use client";

import { useActionState } from "react";
import { createOrg } from "./actions";

export default function OnboardingPage() {
  const [state, formAction, pending] = useActionState(
    createOrg,
    null as { error?: string } | null,
  );

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="font-[family-name:var(--font-display)] text-2xl">
          Cadastre sua igreja
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Isso cria o painel e o endereço público do site.
        </p>

        <form action={formAction} className="mt-6 space-y-3">
          <input
            name="name"
            placeholder="Ex: Assembleia de Deus Nações para Cristo"
            required
            className="w-full rounded-[var(--radius)] border border-border bg-card px-3 py-2 text-sm"
          />
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-[var(--radius)] bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {pending ? "Criando..." : "Criar igreja"}
          </button>
        </form>
      </div>
    </main>
  );
}
