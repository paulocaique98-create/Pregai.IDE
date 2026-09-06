"use client";

import { useActionState } from "react";
import { submitPrayer } from "./prayer-action";

const input =
  "w-full rounded-[var(--radius)] border border-border bg-card px-3 py-2 text-sm";

export function PrayerForm({ slug }: { slug: string }) {
  const action = submitPrayer.bind(null, slug);
  const [state, formAction, pending] = useActionState(
    action,
    null as { error?: string; ok?: boolean } | null,
  );

  if (state?.ok) {
    return (
      <p className="text-sm text-muted-foreground">
        Recebemos seu pedido. Nossa equipe vai orar por você. 🙏
      </p>
    );
  }

  return (
    <form action={formAction} className="mx-auto max-w-md space-y-3 text-left">
      <input name="name" placeholder="Seu nome (opcional)" className={input} />
      <input name="phone" placeholder="WhatsApp (opcional)" className={input} />
      <textarea name="request" placeholder="Como podemos orar por você?" required rows={4} className={input} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="confidential" /> Manter confidencial
      </label>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-[var(--radius)] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Enviar pedido"}
      </button>
    </form>
  );
}
