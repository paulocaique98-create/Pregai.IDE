"use client";

import { useState, useTransition } from "react";
import { Sym } from "@/components/ui/primitives";
import { MEMBER_MODE_HINT, type MemberMode } from "@/lib/org/settings";
import { saveOrgSettings, type SettingsResult } from "./actions";

export function SettingsForm({
  slug,
  initialName,
  initialMode,
}: {
  slug: string;
  initialName: string;
  initialMode: MemberMode;
}) {
  const [name, setName] = useState(initialName);
  const [mode, setMode] = useState<MemberMode>(initialMode);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<SettingsResult | null>(null);

  const dirty = name.trim() !== initialName || mode !== initialMode;
  const goingOpen = mode === "open" && initialMode !== "open";

  function submit() {
    if (goingOpen && !confirmOpen) {
      setConfirmOpen(true);
      return;
    }
    start(async () => {
      const r = await saveOrgSettings(slug, { name, memberMode: mode });
      setMsg(r);
      setConfirmOpen(false);
    });
  }

  return (
    <div className="space-y-8">
      <section className="card p-4 sm:p-5">
        <h2 className="font-[family-name:var(--font-display)] text-base font-semibold tracking-tight">
          Identidade
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Nome exibido no painel, no site e nas comunicações.
        </p>
        <label className="mt-4 block">
          <span className="field-label">Nome da igreja</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            className="field-input"
          />
        </label>
      </section>

      <section className="card p-4 sm:p-5">
        <h2 className="font-[family-name:var(--font-display)] text-base font-semibold tracking-tight">
          Entrada de novos membros
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          O que acontece quando alguém se cadastra pelo site da igreja.
        </p>
        <div className="mt-4 space-y-2">
          {(["approval", "open"] as MemberMode[]).map((m) => (
            <label
              key={m}
              className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius)] border p-3 text-sm ${
                mode === m ? "border-primary" : "border-border"
              }`}
            >
              <input
                type="radio"
                name="member_mode"
                checked={mode === m}
                onChange={() => setMode(m)}
                className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
              />
              <span>
                <span className="font-medium">
                  {m === "approval" ? "Aprovação manual" : "Entrada automática"}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {MEMBER_MODE_HINT[m]}
                </span>
              </span>
            </label>
          ))}
        </div>
      </section>

      {confirmOpen && (
        <div className="card border-danger/40 p-4 text-sm">
          <p className="flex items-start gap-2">
            <Sym name="warning" className="shrink-0 text-[18px] text-danger" />
            <span>
              Com <b>entrada automática</b>, qualquer pessoa que se cadastrar pelo
              site vira membro ativo <b>sem aprovação</b>. Tem certeza?
            </span>
          </p>
          <div className="mt-3 flex gap-2">
            <button disabled={pending} onClick={submit} className="btn btn-primary !py-1.5 text-xs">
              {pending ? "…" : "Sim, ativar entrada automática"}
            </button>
            <button
              onClick={() => setConfirmOpen(false)}
              className="btn btn-ghost !py-1.5 text-xs"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          disabled={!dirty || pending || confirmOpen}
          onClick={submit}
          className="btn btn-primary"
        >
          {pending ? "Salvando…" : "Salvar configurações"}
        </button>
        {msg && (
          <span
            className={`flex items-center gap-1 text-xs ${msg.ok ? "text-muted-foreground" : "text-danger"}`}
          >
            <Sym name={msg.ok ? "check_circle" : "error"} className="text-[13px]" />
            {msg.ok ? msg.message : msg.error}
          </span>
        )}
      </div>
    </div>
  );
}
