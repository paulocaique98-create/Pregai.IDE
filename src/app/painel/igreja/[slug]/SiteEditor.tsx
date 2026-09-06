"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  SECTION_ORDER,
  SECTION_LABELS,
  DEFAULT_VISIBILITY,
  type SiteConfig,
} from "@/lib/site/schema";
import { saveSite, setPublished } from "./actions";

const input =
  "w-full rounded-[var(--radius)] border border-border bg-card px-3 py-2 text-sm";
const field = "block space-y-1 text-sm";

export function SiteEditor({
  slug,
  orgName,
  initial,
}: {
  slug: string;
  orgName: string;
  initial: SiteConfig;
}) {
  const [cfg, setCfg] = useState<SiteConfig>(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string>("");

  function patch(p: Partial<SiteConfig>) {
    setCfg((c) => ({ ...c, ...p }));
  }

  function save() {
    start(async () => {
      const { branding, contact, social_links, hero, about, giving, media, section_titles } = cfg;
      const r = await saveSite(slug, {
        branding,
        contact,
        social_links,
        hero,
        about,
        giving,
        media,
        section_titles,
        sections_visibility: cfg.sections_visibility,
      });
      setMsg(r.error ? `Erro: ${r.error}` : "Salvo.");
    });
  }

  function togglePublish() {
    start(async () => {
      const r = await setPublished(slug, !cfg.is_published);
      if (!r.error) patch({ is_published: !cfg.is_published });
      setMsg(r.error ? `Erro: ${r.error}` : cfg.is_published ? "Despublicado." : "Publicado!");
    });
  }

  const vis = { ...DEFAULT_VISIBILITY, ...cfg.sections_visibility };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl">Editor do site</h1>
          <p className="text-sm text-muted-foreground">
            {orgName} ·{" "}
            <Link href={`/igreja/${slug}`} className="underline" target="_blank">
              /igreja/{slug}
            </Link>{" "}
            · {cfg.is_published ? "publicado" : "rascunho"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={pending}
            className="rounded-[var(--radius)] border border-border px-3 py-2 text-sm disabled:opacity-60"
          >
            {pending ? "..." : "Salvar"}
          </button>
          <button
            onClick={togglePublish}
            disabled={pending}
            className="rounded-[var(--radius)] bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {cfg.is_published ? "Despublicar" : "Publicar"}
          </button>
        </div>
      </header>

      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}

      <section className="space-y-3">
        <h2 className="font-medium">Identidade</h2>
        <label className={field}>
          <span>Nome exibido</span>
          <input
            className={input}
            value={cfg.branding.name ?? ""}
            onChange={(e) => patch({ branding: { ...cfg.branding, name: e.target.value } })}
          />
        </label>
        <label className={field}>
          <span>Cor principal</span>
          <input
            type="color"
            className="h-9 w-16 rounded border border-border bg-card"
            value={cfg.branding.primaryColor ?? "#111111"}
            onChange={(e) =>
              patch({ branding: { ...cfg.branding, primaryColor: e.target.value } })
            }
          />
        </label>
        <label className={field}>
          <span>URL do logo</span>
          <input
            className={input}
            value={cfg.branding.logoUrl ?? ""}
            onChange={(e) => patch({ branding: { ...cfg.branding, logoUrl: e.target.value } })}
          />
        </label>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Boas-vindas (Hero)</h2>
        <label className={field}>
          <span>Rótulo</span>
          <input
            className={input}
            value={cfg.hero.welcomeLabel ?? ""}
            onChange={(e) => patch({ hero: { ...cfg.hero, welcomeLabel: e.target.value } })}
          />
        </label>
        <label className={field}>
          <span>Título</span>
          <input
            className={input}
            value={cfg.hero.title ?? ""}
            onChange={(e) => patch({ hero: { ...cfg.hero, title: e.target.value } })}
          />
        </label>
        <label className={field}>
          <span>Subtítulo</span>
          <textarea
            className={input}
            rows={2}
            value={cfg.hero.subtitle ?? ""}
            onChange={(e) => patch({ hero: { ...cfg.hero, subtitle: e.target.value } })}
          />
        </label>
        <label className={field}>
          <span>Imagem de capa (URL)</span>
          <input
            className={input}
            value={cfg.hero.coverImageUrl ?? ""}
            onChange={(e) => patch({ hero: { ...cfg.hero, coverImageUrl: e.target.value } })}
          />
        </label>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Quem somos</h2>
        <textarea
          className={input}
          rows={4}
          value={cfg.about.description ?? ""}
          onChange={(e) => patch({ about: { ...cfg.about, description: e.target.value } })}
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Mídia</h2>
        <label className={field}>
          <span>URL de embed do YouTube</span>
          <input
            className={input}
            placeholder="https://www.youtube.com/embed/..."
            value={cfg.media.youtubeEmbedUrl ?? ""}
            onChange={(e) => patch({ media: { ...cfg.media, youtubeEmbedUrl: e.target.value } })}
          />
        </label>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Contato</h2>
        {(["whatsapp", "email", "address", "mapsUrl"] as const).map((k) => (
          <label key={k} className={field}>
            <span>{k}</span>
            <input
              className={input}
              value={cfg.contact[k] ?? ""}
              onChange={(e) => patch({ contact: { ...cfg.contact, [k]: e.target.value } })}
            />
          </label>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Dízimos e ofertas</h2>
        <label className={field}>
          <span>Chave PIX</span>
          <input
            className={input}
            value={cfg.giving.pixKey ?? ""}
            onChange={(e) => patch({ giving: { ...cfg.giving, pixKey: e.target.value } })}
          />
        </label>
        <label className={field}>
          <span>Descrição</span>
          <textarea
            className={input}
            rows={2}
            value={cfg.giving.description ?? ""}
            onChange={(e) => patch({ giving: { ...cfg.giving, description: e.target.value } })}
          />
        </label>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Seções visíveis no site</h2>
        {SECTION_ORDER.map((key) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={vis[key]}
              onChange={(e) =>
                patch({
                  sections_visibility: {
                    ...cfg.sections_visibility,
                    [key]: e.target.checked,
                  },
                })
              }
            />
            {SECTION_LABELS[key]}
          </label>
        ))}
      </section>
    </div>
  );
}
