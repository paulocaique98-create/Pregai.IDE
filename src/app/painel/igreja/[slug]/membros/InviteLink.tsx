"use client";

import { useState } from "react";
import { Sym } from "@/components/ui/primitives";

export function InviteLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(url).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="flex w-full min-w-0 max-w-full items-center gap-2 rounded-[var(--radius)] border border-border bg-card px-3 py-1.5 text-left text-xs"
    >
      <Sym name={copied ? "check" : "link"} className="text-[14px] shrink-0" />
      <span className="min-w-0 flex-1 truncate font-mono">{url}</span>
      <span className="shrink-0 text-muted-foreground">{copied ? "copiado" : "copiar"}</span>
    </button>
  );
}
