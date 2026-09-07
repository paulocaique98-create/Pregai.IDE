"use client";

import { useState, useTransition } from "react";
import { Sym } from "@/components/ui/primitives";
import { createInvite, revokeInvite, type ActionResult } from "./actions";
import { ROLE_LABEL, type OrgRole } from "@/lib/members/policy";

export type InviteView = {
  id: string;
  token: string;
  label: string | null;
  role: OrgRole;
  auto_approve: boolean;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
};

function state(inv: InviteView): { label: string; tone: string } {
  if (inv.revoked_at) return { label: "revogado", tone: "text-muted-foreground" };
  if (inv.used_at) return { label: "utilizado", tone: "text-muted-foreground" };
  if (new Date(inv.expires_at) < new Date()) return { label: "expirado", tone: "text-danger" };
  return { label: "válido", tone: "text-accent" };
}

export function InvitePanel({
  slug,
  appUrl,
  invites,
  canInviteStaff,
  canAutoApprove,
}: {
  slug: string;
  appUrl: string;
  invites: InviteView[];
  canInviteStaff: boolean;
  canAutoApprove: boolean;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<ActionResult | null>(null);
  const [label, setLabel] = useState("");
  const [role, setRole] = useState<OrgRole>("membro");
  const [auto, setAuto] = useState(false);

  const create = () =>
    start(async () => {
      const r = await createInvite(slug, { label, role, autoApprove: auto });
      setMsg(r);
      if (r.ok) {
        setLabel("");
        setRole("membro");
        setAuto(false);
      }
    });

  return (
    <div className="space-y-3">
      {invites.length > 0 && (
        <ul className="space-y-2">
          {invites.map((inv) => {
            const st = state(inv);
            const active = !inv.used_at && !inv.revoked_at && new Date(inv.expires_at) > new Date();
            return (
              <li key={inv.id} className="card min-w-0 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm font-medium">
                    <span className="truncate">{inv.label || "Convite"}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      · {ROLE_LABEL[inv.role]}
                    </span>
                    {inv.auto_approve && (
                      <span className="text-xs font-normal text-muted-foreground">
                        · aprova na hora
                      </span>
                    )}
                  </p>
                  <span className={`shrink-0 text-xs ${st.tone}`}>{st.label}</span>
                </div>
                {active && (
                  <div className="mt-2">
                    <CopyLink url={`${appUrl}/c/${inv.token}`} />
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    expira {new Date(inv.expires_at).toLocaleDateString("pt-BR")}
                  </span>
                  {active && (
                    <button
                      disabled={pending}
                      onClick={() =>
                        start(async () => setMsg(await revokeInvite(slug, inv.id)))
                      }
                      className="btn btn-ghost !px-2 !py-1 text-xs text-danger"
                    >
                      Revogar
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="space-y-3 rounded-[var(--radius-lg)] border border-dashed border-border p-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Sym name="add_circle" className="text-[18px]" /> Novo convite
        </p>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Nome do convite (ex: Grupo dos novos)"
          className="field-input"
        />
        {canInviteStaff && (
          <label className="block text-xs text-muted-foreground">
            Papel concedido
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as OrgRole)}
              className="field-input mt-1"
            >
              <option value="membro">Membro</option>
              <option value="lider">Líder</option>
              <option value="secretaria">Secretaria</option>
            </select>
          </label>
        )}
        {canAutoApprove && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={auto}
              onChange={(e) => setAuto(e.target.checked)}
              className="h-4 w-4 accent-[hsl(var(--primary))]"
            />
            Aprovar automaticamente quem entrar
          </label>
        )}
        <p className="text-xs text-muted-foreground">Expira em 7 dias · uso único.</p>
        <button disabled={pending} onClick={create} className="btn btn-primary">
          {pending ? "…" : "Gerar link"}
        </button>
      </div>

      {msg && (
        <p className={`flex items-center gap-1 text-xs ${msg.ok ? "text-muted-foreground" : "text-danger"}`}>
          <Sym name={msg.ok ? "check_circle" : "error"} className="text-[13px]" />
          {msg.ok ? msg.message : msg.error}
        </p>
      )}
    </div>
  );
}

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
          window.prompt("Copie o link do convite:", url);
        }
      }}
      className="flex w-full min-w-0 max-w-full items-center gap-2 rounded-[var(--radius)] border border-border bg-card px-3 py-1.5 text-left text-xs"
    >
      <Sym name={copied ? "check" : "link"} className="shrink-0 text-[14px]" />
      <span className="min-w-0 flex-1 truncate font-mono">{url}</span>
      <span className="shrink-0 text-muted-foreground">{copied ? "copiado" : "copiar"}</span>
    </button>
  );
}
