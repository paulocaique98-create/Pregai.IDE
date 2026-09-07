"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getOrgForMember } from "@/lib/site/queries";

const ASSIGNABLE = ["pastor", "secretaria", "lider", "membro"];

export async function createInvite(formData: FormData) {
  const slug = String(formData.get("slug"));
  const ctx = await getOrgForMember(slug);
  if (!ctx || !["owner", "pastor", "secretaria"].includes(ctx.role)) return;

  await ctx.supabase.from("organization_invites").insert({
    org_id: ctx.org.id,
    token: randomBytes(9).toString("base64url"),
    label: String(formData.get("label") ?? "").trim() || null,
    auto_approve: formData.get("auto_approve") === "on",
    created_by: ctx.user.id,
  });
  revalidatePath(`/painel/igreja/${slug}/membros`);
}

export async function deleteInvite(formData: FormData) {
  const slug = String(formData.get("slug"));
  const id = String(formData.get("id"));
  const ctx = await getOrgForMember(slug);
  if (!ctx || !["owner", "pastor", "secretaria"].includes(ctx.role)) return;
  await ctx.supabase
    .from("organization_invites")
    .delete()
    .eq("id", id)
    .eq("org_id", ctx.org.id);
  revalidatePath(`/painel/igreja/${slug}/membros`);
}

export async function setMemberRole(formData: FormData) {
  const slug = String(formData.get("slug"));
  const userId = String(formData.get("user_id"));
  const role = String(formData.get("role"));
  if (!ASSIGNABLE.includes(role)) return;

  const ctx = await getOrgForMember(slug);
  if (!ctx || !["owner", "pastor"].includes(ctx.role)) return;

  await ctx.supabase
    .from("organization_members")
    .update({ role })
    .eq("org_id", ctx.org.id)
    .eq("user_id", userId)
    .neq("role", "owner"); // nunca mexe no owner

  revalidatePath(`/painel/igreja/${slug}/membros`);
}

export async function setMemberStatus(formData: FormData) {
  const slug = String(formData.get("slug"));
  const userId = String(formData.get("user_id"));
  const status = String(formData.get("status"));
  if (!["pending", "active", "blocked"].includes(status)) return;

  const ctx = await getOrgForMember(slug);
  if (!ctx || !["owner", "pastor", "secretaria"].includes(ctx.role)) return;

  const { data: before } = await ctx.supabase
    .from("organization_members")
    .select("status")
    .eq("org_id", ctx.org.id)
    .eq("user_id", userId)
    .maybeSingle();

  await ctx.supabase
    .from("organization_members")
    .update({ status })
    .eq("org_id", ctx.org.id)
    .eq("user_id", userId);

  if (status === "active" && before?.status !== "active") {
    const { userEmail, sendEmail, tmpl } = await import("@/lib/email");
    const to = await userEmail(userId);
    if (to) await sendEmail({ to, ...tmpl.memberApproved(ctx.org.name, slug) });
  }

  revalidatePath(`/painel/igreja/${slug}/membros`);
}
