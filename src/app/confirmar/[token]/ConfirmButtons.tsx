"use client";

import { useState, useTransition } from "react";
import { Sym } from "@/components/ui/primitives";
import { respondByToken } from "./actions";

export function ConfirmButtons({ token, status }: { token: string; status: string }) {
  const [state, setState] = useState(status);
  const [pending, start] = useTransition();

  function go(r: "confirmed" | "declined") {
    setState(r);
    start(() => respondByToken(token, r));
  }

  if (state === "confirmed")
    return (
      <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Sym name="check_circle" className="text-[18px]" /> Presença confirmada. Obrigado!
      </p>
    );
  if (state === "declined")
    return (
      <div className="text-sm text-muted-foreground">
        Registrado que você não pode desta vez.
        <button onClick={() => go("confirmed")} className="ml-2 underline">
          mudei de ideia, confirmar
        </button>
      </div>
    );

  return (
    <div className="flex gap-3">
      <button
        onClick={() => go("confirmed")}
        disabled={pending}
        className="btn btn-primary flex-1 !py-2.5"
      >
        Confirmar presença
      </button>
      <button
        onClick={() => go("declined")}
        disabled={pending}
        className="btn btn-outline flex-1 !py-2.5"
      >
        Não posso
      </button>
    </div>
  );
}
