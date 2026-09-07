"use client";

import { useTransition, useState } from "react";
import { Sym } from "@/components/ui/primitives";
import { respondAssignment } from "./escala-actions";

export function EscalaActions({
  slug,
  token,
  status,
}: {
  slug: string;
  token: string;
  status: string;
}) {
  const [pending, start] = useTransition();
  const [local, setLocal] = useState(status);

  function respond(r: "confirmed" | "declined") {
    setLocal(r);
    start(() => respondAssignment(slug, token, r));
  }

  if (local === "confirmed")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <Sym name="check_circle" className="text-[16px]" /> Confirmado
      </span>
    );
  if (local === "declined")
    return (
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        Você marcou que não pode.
        <button onClick={() => respond("confirmed")} className="underline">
          confirmar
        </button>
      </span>
    );

  return (
    <div className="flex gap-2">
      <button
        onClick={() => respond("confirmed")}
        disabled={pending}
        className="btn btn-primary !px-3 !py-1.5 text-xs"
      >
        Confirmar
      </button>
      <button
        onClick={() => respond("declined")}
        disabled={pending}
        className="btn btn-outline !px-3 !py-1.5 text-xs"
      >
        Não posso
      </button>
    </div>
  );
}
