"use client";

import { useActionState, useState } from "react";
import { registerForEvent } from "./event-action";

const input =
  "w-full rounded-[var(--radius)] border border-border bg-card px-3 py-2 text-sm";

export function EventRegister({
  slug,
  eventId,
  spotsLeft,
}: {
  slug: string;
  eventId: string;
  spotsLeft: number | null;
}) {
  const [open, setOpen] = useState(false);
  const action = registerForEvent.bind(null, slug, eventId);
  const [state, formAction, pending] = useActionState(action, null);

  if (spotsLeft !== null && spotsLeft <= 0) {
    return <span className="text-xs font-medium text-muted-foreground">Esgotado</span>;
  }
  if (state?.ok) {
    return <span className="text-xs font-medium text-muted-foreground">Inscrição confirmada ✓</span>;
  }
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-[var(--radius)] bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
      >
        Inscrever-se{spotsLeft !== null ? ` · ${spotsLeft} vagas` : ""}
      </button>
    );
  }
  return (
    <form action={formAction} className="mt-2 w-full space-y-2 text-left">
      <input name="name" placeholder="Seu nome" required className={input} />
      <div className="grid grid-cols-2 gap-2">
        <input name="phone" placeholder="WhatsApp" className={input} />
        <input name="party_size" type="number" min="1" defaultValue="1" placeholder="Pessoas" className={input} />
      </div>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <button
          disabled={pending}
          className="rounded-[var(--radius)] bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
        >
          {pending ? "..." : "Confirmar"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 text-xs text-muted-foreground">
          Cancelar
        </button>
      </div>
    </form>
  );
}
