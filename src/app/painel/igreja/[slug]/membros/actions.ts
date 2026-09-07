"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getOrgForPanel } from "@/lib/site/queries";
import type { OrgRole } from "@/lib/members/policy";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

function pgError(e: unknown): string {
  const msg =
    (e as { message?: string } | null)?.message ??
    (typeof e === "string" ? e : "Não foi possível concluir a operação.");
  // mensagens das RPCs já vêm em português; limpa prefixo do Postgres
  return msg.replace(/^.*?:\s*/, "").trim() || "Operação recusada.";
}

async function ctx(slug: string) {
  const c = await getOrgForPanel(slug);
  if (!c) throw new Error("Sem acesso a esta igreja.");
  return c;
}

async function run(
  slug: string,
  fn: string,
  args: Record<string, unknown>,
  okMsg: string,
): Promise<ActionResult> {
  try {
    const c = await ctx(slug);
    const { error } = await c.supabase.rpc(fn, args);
    if (error) return { ok: false, error: pgError(error) };
    revalidatePath(`/painel/igreja/${slug}/membros`);
    revalidatePath(`/painel/igreja/${slug}/membros`, "layout");
    return { ok: true, message: okMsg };
  } catch (e) {
    return { ok: false, error: pgError(e) };
  }
}

// --- membros --------------------------------------------------------------

export async function approveMember(slug: string, userId: string): Promise<ActionResult> {
  const c = await ctx(slug);
  const res = await run(slug, "approve_member", { p_org: c.org.id, p_user: userId }, "Membro aprovado.");
  if (res.ok) {
    try {
      const { notify } = await import("@/lib/notify");
      await notify(userId, {
        org_id: c.org.id,
        kind: "member_approved",
        title: `Bem-vindo(a) à ${c.org.name}`,
        body: "Seu cadastro de membro foi aprovado.",
        url: `/igreja/${slug}/membro`,
      });
      const { userEmail, sendEmail, tmpl } = await import("@/lib/email");
      const to = await userEmail(userId);
      if (to) await sendEmail({ to, ...tmpl.memberApproved(c.org.name, slug) });
    } catch {
      /* notificação é melhor-esforço */
    }
  }
  return res;
}

export async function blockMember(
  slug: string,
  userId: string,
  reason?: string,
): Promise<ActionResult> {
  const c = await ctx(slug);
  return run(
    slug,
    "block_member",
    { p_org: c.org.id, p_user: userId, p_reason: reason ?? null },
    "Membro bloqueado.",
  );
}

export async function reactivateMember(slug: string, userId: string): Promise<ActionResult> {
  const c = await ctx(slug);
  return run(slug, "reactivate_member", { p_org: c.org.id, p_user: userId }, "Membro reativado.");
}

export async function changeMemberRole(
  slug: string,
  userId: string,
  role: OrgRole,
): Promise<ActionResult> {
  const c = await ctx(slug);
  return run(
    slug,
    "set_member_role",
    { p_org: c.org.id, p_user: userId, p_role: role },
    "Papel atualizado.",
  );
}

// --- convites ------------------------------------------------------------

export async function createInvite(
  slug: string,
  data: { label?: string; role?: OrgRole; autoApprove?: boolean },
): Promise<ActionResult> {
  try {
    const c = await ctx(slug);
    const token = randomBytes(16).toString("hex");
    const { error } = await c.supabase.rpc("create_invite", {
      p_org: c.org.id,
      p_token: token,
      p_label: data.label ?? null,
      p_role: data.role ?? "membro",
      p_auto_approve: !!data.autoApprove,
    });
    if (error) return { ok: false, error: pgError(error) };
    revalidatePath(`/painel/igreja/${slug}/membros`);
    return { ok: true, message: "Convite criado." };
  } catch (e) {
    return { ok: false, error: pgError(e) };
  }
}

export async function revokeInvite(slug: string, id: string): Promise<ActionResult> {
  const c = await ctx(slug);
  return run(slug, "revoke_invite", { p_org: c.org.id, p_id: id }, "Convite revogado.");
}
