"use client";

import { useRef, useState } from "react";
import { Sym } from "@/components/ui/primitives";
import { uploadSiteAsset } from "./actions";

export function ImageUpload({
  slug,
  value,
  onChange,
  kind,
  aspect = "square",
}: {
  slug: string;
  value?: string;
  onChange: (url: string) => void;
  kind: string;
  aspect?: "square" | "wide";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function upload(file: File) {
    setErr("");
    if (file.size > 10 * 1024 * 1024) {
      setErr("Imagem muito grande (máx. 10 MB).");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await uploadSiteAsset(slug, kind, fd);
      if ("error" in res) setErr(res.error);
      else onChange(res.url);
    } catch {
      setErr("Não foi possível enviar a imagem.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div
        className={`flex items-center justify-center overflow-hidden rounded-[var(--radius)] border border-dashed border-border bg-surface ${
          aspect === "wide" ? "aspect-[16/6]" : "h-24 w-24"
        }`}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-full w-full object-contain" />
        ) : (
          <Sym name="image" className="text-[24px] text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="btn btn-outline !px-3 !py-1.5 text-xs"
        >
          <Sym name="upload" className="text-[15px]" />
          {busy ? "Enviando…" : value ? "Trocar imagem" : "Enviar imagem"}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="btn btn-ghost !px-2 !py-1 text-xs text-muted-foreground"
          >
            Remover
          </button>
        )}
      </div>
      {err && <p className="text-xs text-danger">{err}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
