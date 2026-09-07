"use client";

import { useEffect } from "react";
import { Sym } from "@/components/ui/primitives";

export default function PanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("painel/igreja:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <Sym name="error" className="text-[32px] text-muted-foreground" />
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-xl font-semibold">
        Algo não carregou
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Não foi possível carregar esta página. Tente novamente.
      </p>
      <button onClick={reset} className="btn btn-primary mt-5">
        Tentar de novo
      </button>
    </div>
  );
}
