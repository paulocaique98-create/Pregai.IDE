"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Sym } from "@/components/ui/primitives";

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heif",
  tif: "image/tiff",
  tiff: "image/tiff",
  ico: "image/x-icon",
};

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
    if (file.size > 10 * 1024 * 1024) {
      setErr("Imagem muito grande (máx. 10 MB).");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setErr("Sessão expirada. Recarregue a página e tente de novo.");
        return;
      }

      const ext = (file.name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const contentType =
        file.type || MIME_BY_EXT[ext] || "application/octet-stream";
      const safeExt = ext || (contentType.split("/")[1] ?? "bin");
      const path = `${orgId}/${kind}-${Date.now()}.${safeExt}`;

      const { error } = await supabase.storage
        .from("site-assets")
        .upload(path, file, { upsert: true, cacheControl: "3600", contentType });
      if (error) {
        console.error("upload error", error);
        setErr(error.message || "Falha no envio.");
        return;
      }
      const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (e) {
      console.error(e);
      setErr(e instanceof Error ? e.message : "Não foi possível enviar a imagem.");
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
