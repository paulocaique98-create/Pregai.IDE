"use client";

import { useState, useTransition } from "react";
import {
  SECTION_ORDER,
  SECTION_LABELS,
  DEFAULT_VISIBILITY,
  type SiteConfig,
} from "@/lib/site/schema";
import { Sym, Kicker } from "@/components/ui/primitives";
import { ImageUpload } from "./ImageUpload";
import { saveSite, setPublished } from "./actions";

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="font-[family-name:var(--font-display)] text-base font-semibold tracking-tight">
        {title}
      </h2>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

export function SiteEditor({
  slug,
  initial,
}: {
  slug: string;
  initial: SiteConfig;
}) {
  const [cfg, setCfg] = useState<SiteConfig>(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");

  const patch = (p: Partial<SiteConfig>) => setCfg((c) => ({ ...c, ...p }));

  function save() {
    start(async () => {
      const r = await saveSite(slug, {
        branding: cfg.branding,
        contact: cfg.contact,
        social_links: cfg.social_links,
        hero: cfg.hero,
        about: cfg.about,
        first_time: cfg.first_time ?? {},
        giving: cfg.giving,
        media: cfg.media,
        section_titles: cfg.section_titles,
        sections_visibility: cfg.sections_visibility,
      });
      setMsg(r.error ? `Erro: ${r.error}` : "Alterações salvas.");
    });
  }

  function togglePublish() {
    start(async () => {
      const r = await setPublished(slug, !cfg.is_published);
      if (!r.error) patch({ is_published: !cfg.is_published });
      setMsg(r.error ? `Erro: ${r.error}` : cfg.is_published ? "Site despublicado." : "Site publicado!");
    });
  }

  const vis = { ...DEFAULT_VISIBILITY, ...cfg.sections_visibility };

  return (
    <>
      <div className="mb-6">
        <Kicker>Presença digital</Kicker>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-[1.75rem] font-semibold tracking-tight md:text-[2rem]">
          Editor do site
        </h1>
      </div>

      <div className="sticky top-14 z-20 -mx-4 mb-6 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:top-14">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className={`h-1.5 w-1.5 rounded-full ${cfg.is_published ? "bg-accent" : "bg-muted-foreground/50"}`}
          />
          {cfg.is_published ? "Publicado" : "Rascunho"}
        </span>
        {msg && <span className="text-xs text-muted-foreground">· {msg}</span>}
        <div className="flex-1" />
        <button onClick={save} disabled={pending} className="btn btn-outline">
          {pending ? "..." : "Salvar"}
        </button>
        <button onClick={togglePublish} disabled={pending} className="btn btn-primary">
          {cfg.is_published ? "Despublicar" : "Publicar"}
        </button>
      </div>

      <div className="space-y-4">
        <Card title="Identidade">
          <Field label="Nome exibido">
            <input
              className="field-input"
              value={cfg.branding.name ?? ""}
              onChange={(e) => patch({ branding: { ...cfg.branding, name: e.target.value } })}
            />
          </Field>
          <Field label="Cor principal">
            <input
              type="color"
              className="h-10 w-16 rounded-[var(--radius)] border border-border bg-card"
              value={cfg.branding.primaryColor ?? "#111111"}
              onChange={(e) =>
                patch({ branding: { ...cfg.branding, primaryColor: e.target.value } })
              }
            />
          </Field>
          <div>
            <span className="field-label">Logo</span>
            <ImageUpload
              slug={slug}
              kind="logo"
              value={cfg.branding.logoUrl}
              onChange={(url) => patch({ branding: { ...cfg.branding, logoUrl: url } })}
            />
          </div>
        </Card>

        <Card title="Boas-vindas (Hero)">
          <Field label="Rótulo">
            <input
              className="field-input"
              value={cfg.hero.welcomeLabel ?? ""}
              onChange={(e) => patch({ hero: { ...cfg.hero, welcomeLabel: e.target.value } })}
            />
          </Field>
          <Field label="Título">
            <input
              className="field-input"
              value={cfg.hero.title ?? ""}
              onChange={(e) => patch({ hero: { ...cfg.hero, title: e.target.value } })}
            />
          </Field>
          <Field label="Subtítulo">
            <textarea
              className="field-input"
              rows={2}
              value={cfg.hero.subtitle ?? ""}
              onChange={(e) => patch({ hero: { ...cfg.hero, subtitle: e.target.value } })}
            />
          </Field>
          <div>
            <span className="field-label">Imagem de capa</span>
            <ImageUpload
              slug={slug}
              kind="cover"
              aspect="wide"
              value={cfg.hero.coverImageUrl}
              onChange={(url) => patch({ hero: { ...cfg.hero, coverImageUrl: url } })}
            />
          </div>
        </Card>

        <Card
          title="Última transmissão"
          hint="Vídeo fixado logo abaixo das boas-vindas para reassistir o culto mais recente."
        >
          <Field label="Link do YouTube da última live">
            <input
              className="field-input"
              placeholder="watch, youtu.be ou /live/..."
              value={cfg.media.youtubeEmbedUrl ?? ""}
              onChange={(e) => patch({ media: { ...cfg.media, youtubeEmbedUrl: e.target.value } })}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Rótulo">
              <input
                className="field-input"
                placeholder="Culto de Domingo — Série Efésios"
                value={cfg.media.lastLiveLabel ?? ""}
                onChange={(e) => patch({ media: { ...cfg.media, lastLiveLabel: e.target.value } })}
              />
            </Field>
            <Field label="Data">
              <input
                className="field-input"
                placeholder="01/09/2026"
                value={cfg.media.lastLiveDate ?? ""}
                onChange={(e) => patch({ media: { ...cfg.media, lastLiveDate: e.target.value } })}
              />
            </Field>
          </div>
        </Card>

        <Card title="Quem somos">
          <textarea
            className="field-input"
            rows={4}
            value={cfg.about.description ?? ""}
            onChange={(e) => patch({ about: { ...cfg.about, description: e.target.value } })}
          />
        </Card>

        <Card
          title="Primeira vez (página do visitante)"
          hint="Conteúdo de /primeira-vez. Deixe um campo em branco para ele não aparecer."
        >
          <Field label="Texto de acolhimento">
            <textarea
              className="field-input"
              rows={3}
              value={cfg.first_time?.intro ?? ""}
              onChange={(e) =>
                patch({ first_time: { ...cfg.first_time, intro: e.target.value } })
              }
            />
          </Field>
          {(
            [
              ["duration", "Duração do culto", "cerca de 1h30"],
              ["dressCode", "Como se vestir", "venha como se sentir confortável"],
              ["kids", "Ministério infantil", "há sala para crianças de 0 a 10 anos"],
              ["parking", "Estacionamento", "gratuito na lateral da igreja"],
              ["whatToBring", "O que levar", "só você; Bíblias disponíveis na entrada"],
              ["arrival", "Quando chegar", "10 a 15 minutos antes"],
            ] as const
          ).map(([key, label, ph]) => (
            <Field key={key} label={label}>
              <input
                className="field-input"
                placeholder={ph}
                value={cfg.first_time?.[key] ?? ""}
                onChange={(e) =>
                  patch({ first_time: { ...cfg.first_time, [key]: e.target.value } })
                }
              />
            </Field>
          ))}
        </Card>

        <Card title="Contato">
          {(["whatsapp", "email", "address", "mapsUrl"] as const).map((k) => (
            <Field key={k} label={k}>
              <input
                className="field-input"
                value={cfg.contact[k] ?? ""}
                onChange={(e) => patch({ contact: { ...cfg.contact, [k]: e.target.value } })}
              />
            </Field>
          ))}
        </Card>

        <Card title="Dízimos e ofertas" hint="Gera o QR Code e o código PIX copia-e-cola no site.">
          <Field label="Chave PIX">
            <input
              className="field-input"
              value={cfg.giving.pixKey ?? ""}
              onChange={(e) => patch({ giving: { ...cfg.giving, pixKey: e.target.value } })}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome do recebedor">
              <input
                className="field-input"
                placeholder={cfg.branding.name ?? "Nome da igreja"}
                value={cfg.giving.pixName ?? ""}
                onChange={(e) => patch({ giving: { ...cfg.giving, pixName: e.target.value } })}
              />
            </Field>
            <Field label="Cidade">
              <input
                className="field-input"
                placeholder="Ex: São Paulo"
                value={cfg.giving.pixCity ?? ""}
                onChange={(e) => patch({ giving: { ...cfg.giving, pixCity: e.target.value } })}
              />
            </Field>
          </div>
          <Field label="Descrição">
            <textarea
              className="field-input"
              rows={2}
              value={cfg.giving.description ?? ""}
              onChange={(e) => patch({ giving: { ...cfg.giving, description: e.target.value } })}
            />
          </Field>
        </Card>

        <Card title="Seções visíveis no site">
          <div className="grid gap-1 sm:grid-cols-2">
            {SECTION_ORDER.map((key) => (
              <label
                key={key}
                className="flex items-center gap-2.5 rounded-[var(--radius)] px-2 py-1.5 text-sm hover:bg-surface"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[hsl(var(--primary))]"
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
          </div>
        </Card>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button onClick={save} disabled={pending} className="btn btn-outline">
          {pending ? "..." : "Salvar"}
        </button>
        <button onClick={togglePublish} disabled={pending} className="btn btn-primary">
          {cfg.is_published ? "Despublicar" : "Publicar"}
        </button>
      </div>
    </>
  );
}
