"use client";

import { useState, useTransition } from "react";
import { Sym, Badge } from "@/components/ui/primitives";
import { TITLE_MAX, BODY_MAX } from "@/lib/announcements/policy";
import {
  createAnnouncement,
  updateAnnouncement,
  setAnnouncementPublished,
  deleteAnnouncement,
  type AvisoResult,
} from "./actions";

export type Aviso = {
  id: string;
  title: string;
  body: string;
  is_pinned: boolean;
  is_published: boolean;
  created_at: string;
};

function Feedback({ msg }: { msg: AvisoResult | null }) {
  if (!msg) return null;
  return (
    <p className={`flex items-center gap-1 text-xs ${msg.ok ? "text-muted-foreground" : "text-danger"}`}>
      <Sym name={msg.ok ? "check_circle" : "error"} className="text-[13px]" />
      {msg.ok ? msg.message : msg.error}
    </p>
  );
}

export function AnnouncementsManager({ slug, rows }: { slug: string; rows: Aviso[] }) {
  return (
    <div className="space-y-8">
      <CreateForm slug={slug} count={rows.length} />
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum aviso ainda. Crie o primeiro acima.</p>
      ) : (
        <div className="space-y-4">
          {rows.map((a) => (
            <Row key={a.id} slug={slug} aviso={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function CreateForm({ slug, count }: { slug: string; count: number }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [publish, setPublish] = useState(true);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<AvisoResult | null>(null);

  return (
    <form
      className="space-y-3 rounded-[var(--radius-lg)] border border-dashed border-border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await createAnnouncement(slug, { title, body, isPinned: pinned, publish });
          setMsg(r);
          if (r.ok) {
            setTitle("");
            setBody("");
            setPinned(false);
            setPublish(true);
          }
        });
      }}
    >
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <Sym name="add_circle" className="text-[18px]" /> Novo aviso
        {count > 0 && <span className="text-xs font-normal text-muted-foreground">· {count} nesta página</span>}
      </p>
      <label className="block">
        <span className="field-label">Título</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={TITLE_MAX}
          required
          className="field-input"
        />
      </label>
      <label className="block">
        <span className="field-label">Detalhes (opcional)</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={BODY_MAX}
          rows={3}
          className="field-input"
        />
      </label>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
          Fixar no topo
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
          Publicar agora (notifica os membros)
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button disabled={pending || !title.trim()} className="btn btn-primary">
          {pending ? "…" : publish ? "Publicar aviso" : "Salvar rascunho"}
        </button>
        <Feedback msg={msg} />
      </div>
    </form>
  );
}

function Row({ slug, aviso }: { slug: string; aviso: Aviso }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(aviso.title);
  const [body, setBody] = useState(aviso.body);
  const [pinned, setPinned] = useState(aviso.is_pinned);
  const [confirmDel, setConfirmDel] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<AvisoResult | null>(null);

  const run = (p: Promise<AvisoResult>, after?: () => void) =>
    start(async () => {
      const r = await p;
      setMsg(r);
      if (r.ok) after?.();
    });

  return (
    <div className="card space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        {aviso.is_pinned && <Badge tone="outline">fixado</Badge>}
        <Badge tone={aviso.is_published ? "solid" : "muted"}>
          {aviso.is_published ? "publicado" : "rascunho"}
        </Badge>
        <span className="ml-auto text-xs text-muted-foreground">
          {new Date(aviso.created_at).toLocaleDateString("pt-BR")}
        </span>
      </div>

      {editing ? (
        <>
          <label className="block">
            <span className="field-label">Título</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={TITLE_MAX} className="field-input" />
          </label>
          <label className="block">
            <span className="field-label">Detalhes</span>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={BODY_MAX} rows={3} className="field-input" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
            Fixar no topo
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              disabled={pending}
              onClick={() =>
                run(updateAnnouncement(slug, aviso.id, { title, body, isPinned: pinned }), () => setEditing(false))
              }
              className="btn btn-primary !py-1.5 text-xs"
            >
              {pending ? "…" : "Salvar"}
            </button>
            <button
              disabled={pending}
              onClick={() => {
                setTitle(aviso.title);
                setBody(aviso.body);
                setPinned(aviso.is_pinned);
                setEditing(false);
              }}
              className="btn btn-ghost !py-1.5 text-xs"
            >
              Cancelar
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold">{aviso.title}</p>
          {aviso.body && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{aviso.body}</p>
          )}
          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            <button onClick={() => setEditing(true)} className="btn btn-outline !py-1.5 text-xs">
              <Sym name="edit" className="text-[14px]" /> Editar
            </button>
            <button
              disabled={pending}
              onClick={() => run(setAnnouncementPublished(slug, aviso.id, !aviso.is_published))}
              className="btn btn-outline !py-1.5 text-xs"
            >
              {pending ? "…" : aviso.is_published ? "Despublicar" : "Publicar"}
            </button>
            {!confirmDel ? (
              <button onClick={() => setConfirmDel(true)} className="btn btn-ghost !py-1.5 text-xs text-danger">
                <Sym name="delete" className="text-[14px]" /> Excluir
              </button>
            ) : (
              <span className="flex items-center gap-2 text-xs">
                Excluir este aviso?
                <button
                  disabled={pending}
                  onClick={() => run(deleteAnnouncement(slug, aviso.id))}
                  className="btn btn-primary !py-1 text-xs"
                >
                  {pending ? "…" : "Sim, excluir"}
                </button>
                <button onClick={() => setConfirmDel(false)} className="btn btn-ghost !py-1 text-xs">
                  Não
                </button>
              </span>
            )}
          </div>
        </>
      )}

      <Feedback msg={msg} />
    </div>
  );
}
