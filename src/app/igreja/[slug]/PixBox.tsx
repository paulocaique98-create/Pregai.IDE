"use client";

import { useState } from "react";

export function PixBox({
  pixKey,
  payload,
  qrDataUrl,
}: {
  pixKey: string;
  payload: string;
  qrDataUrl?: string;
}) {
  const [copied, setCopied] = useState<"" | "key" | "code">("");

  function copy(text: string, which: "key" | "code") {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(""), 2000);
    });
  }

  return (
    <div className="mx-auto max-w-sm space-y-4">
      {qrDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qrDataUrl}
          alt="QR Code PIX"
          className="mx-auto h-48 w-48 rounded-[var(--radius)] border border-border"
        />
      )}
      <div className="rounded-[var(--radius)] border border-border p-3 text-left">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Chave PIX</p>
        <p className="mt-1 break-all font-mono text-sm">{pixKey}</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => copy(pixKey, "key")}
          className="flex-1 rounded-[var(--radius)] border border-border px-3 py-2 text-sm"
        >
          {copied === "key" ? "Copiado!" : "Copiar chave"}
        </button>
        {payload && (
          <button
            onClick={() => copy(payload, "code")}
            className="flex-1 rounded-[var(--radius)] bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            {copied === "code" ? "Copiado!" : "Copiar código PIX"}
          </button>
        )}
      </div>
    </div>
  );
}
