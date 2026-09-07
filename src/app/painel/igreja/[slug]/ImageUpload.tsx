"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Sym } from "@/components/ui/primitives";

export function ImageUpload({
  orgId,
  value,
  onChange,
  kind,
  aspect = "square",
}: {
  orgId: string;
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
    if (file.size > 5 * 1024 * 1024) {
      setErr("Imagem muito grande (máx. 5 MB).");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${orgId}/${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("site-assets")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (error) throw error;
      const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
      onChange(data.publicUrl);
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
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
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
