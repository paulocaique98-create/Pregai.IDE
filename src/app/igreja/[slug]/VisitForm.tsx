"use client";

import { useActionState } from "react";
import { submitVisit } from "./visit-action";

const input =
  "w-full rounded-[var(--radius)] border border-border bg-card px-3 py-2 text-sm";

export function VisitForm({ slug }: { slug: string }) {
  const action = submitVisit.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, null);

  if (state?.ok) {
    return (
      <p className="mx-auto max-w-md text-sm text-muted-foreground">
        Recebemos! Nossa equipe de recepção vai falar com você. Seja muito
        bem-vindo. 🤍
      </p>
    );
  }

  return (
    <form action={formAction} className="mx-auto max-w-md space-y-3 text-left">
      <input name="name" placeholder="Seu nome" required className={input} />
      <input name="phone" placeholder="WhatsApp" className={input} />
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-muted-foreground">
          Quando pretende vir
          <input name="planned_date" type="date" className={`${input} mt-1`} />
        </label>
        <label className="text-xs text-muted-foreground">
          Quantas pessoas
          <input name="party_size" type="number" min="1" className={`${input} mt-1`} />
        </label>
      </div>
      <input name="kids_ages" placeholder="Idade das crianças (se vier com filhos)" className={input} />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-[var(--radius)] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Avisar que vou visitar"}
      </button>
    </form>
  );
}
