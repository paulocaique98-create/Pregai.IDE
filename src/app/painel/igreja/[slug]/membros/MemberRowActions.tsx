"use client";

import { useState, useTransition } from "react";
import { Sym } from "@/components/ui/primitives";
import {
  approveMember,
  blockMember,
  reactivateMember,
  changeMemberRole,
  type ActionResult,
} from "./actions";
import {
  assignableRoles,
  canManage,
  ROLE_LABEL,
  type MemberStatus,
  type OrgRole,
} from "@/lib/members/policy";

export function MemberRowActions({
  slug,
  actorRole,
  userId,
  role,
  status,
  self,
  compact,
}: {
  slug: string;
  actorRole: OrgRole | null;
  userId: string;
  role: OrgRole;
  status: MemberStatus;
  self: boolean;
  compact?: boolean;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<ActionResult | null>(null);
  const [confirming, setConfirming] = useState<null | "block">(null);
  const [reason, setReason] = useState("");

  const target = { role, self };
  const showApprove = status === "pending" && canManage(actorRole, "approve");
  const showBlock = status === "active" && canManage(actorRole, "block", target);
  const showReactivate = status === "blocked" && canManage(actorRole, "reactivate", target);
  const roleOptions = canManage(actorRole, "set_role", target) ? assignableRoles(actorRole) : [];

  function apply(p: Promise<ActionResult>) {
    start(async () => {
      const r = await p;
      setMsg(r);
      setConfirming(null);
    });
  }

  if (!showApprove && !showBlock && !showReactivate && roleOptions.length === 0) {
    return msg && !msg.ok ? <p className="text-xs text-danger">{msg.error}</p> : null;
  }

  return (
    <div className={compact ? "flex flex-col gap-2" : "flex flex-wrap items-center gap-2"}>
      {roleOptions.length > 0 && role !== "owner" && (
        <RoleSelect
          value={role}
          options={roleOptions}
          pending={pending}
          onChange={(next) => apply(changeMemberRole(slug, userId, next))}
        />
      )}

      {showApprove && (
        <button
          disabled={pending}
          onClick={() => apply(approveMember(slug, userId))}
          className="btn btn-primary !px-3 !py-1.5 text-xs"
        >
          {pending ? "…" : "Aprovar"}
        </button>
      )}

      {showReactivate && (
        <button
          disabled={pending}
          onClick={() => apply(reactivateMember(slug, userId))}
          className="btn btn-primary !px-3 !py-1.5 text-xs"
        >
          {pending ? "…" : "Reativar"}
        </button>
      )}

      {showBlock && confirming !== "block" && (
        <button
          disabled={pending}
          onClick={() => setConfirming("block")}
          className="btn btn-outline !px-3 !py-1.5 text-xs text-danger"
        >
          Bloquear
        </button>
      )}

      {showBlock && confirming === "block" && (
        <div className="w-full rounded-[var(--radius)] border border-border p-3">
          <p className="text-xs text-muted-foreground">
            Bloquear este membro? Ele perde o acesso à organização; os dados
            históricos são preservados.
          </p>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo (opcional)"
            className="field-input mt-2 text-xs"
          />
          <div className="mt-2 flex gap-2">
            <button
              disabled={pending}
              onClick={() => apply(blockMember(slug, userId, reason))}
              className="btn btn-primary !px-3 !py-1.5 text-xs"
            >
              {pending ? "…" : "Confirmar bloqueio"}
            </button>
            <button
              disabled={pending}
              onClick={() => setConfirming(null)}
              className="btn btn-ghost !px-3 !py-1.5 text-xs"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {msg && (
        <p className={`flex items-center gap-1 text-xs ${msg.ok ? "text-muted-foreground" : "text-danger"}`}>
          <Sym name={msg.ok ? "check_circle" : "error"} className="text-[13px]" />
          {msg.ok ? msg.message : msg.error}
        </p>
      )}
    </div>
  );
}

function RoleSelect({
  value,
  options,
  pending,
  onChange,
}: {
  value: OrgRole;
  options: OrgRole[];
  pending: boolean;
  onChange: (r: OrgRole) => void;
}) {
  const [draft, setDraft] = useState<OrgRole | "">("");
  return (
    <span className="inline-flex items-center gap-1">
      <select
        aria-label="Papel do membro"
        value={draft || value}
        disabled={pending}
        onChange={(e) => setDraft(e.target.value as OrgRole)}
        className="rounded-[var(--radius)] border border-border bg-card px-2 py-1 text-xs"
      >
        {[value, ...options.filter((o) => o !== value)].map((r) => (
          <option key={r} value={r}>
            {ROLE_LABEL[r]}
          </option>
        ))}
      </select>
      {draft && draft !== value && (
        <>
          <button
            disabled={pending}
            onClick={() => {
              onChange(draft);
              setDraft("");
            }}
            className="btn btn-primary !px-2 !py-1 text-[0.7rem]"
          >
            {pending ? "…" : "Aplicar"}
          </button>
          <button
            onClick={() => setDraft("")}
            className="btn btn-ghost !px-2 !py-1 text-[0.7rem]"
          >
            ✕
          </button>
        </>
      )}
    </span>
  );
}
