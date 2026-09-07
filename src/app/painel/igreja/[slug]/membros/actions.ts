"use server";

import { revalidatePath } from "next/cache";
import { getOrgForMember } from "@/lib/site/queries";

const ASSIGNABLE = ["pastor", "secretaria", "lider", "membro"];

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

  await ctx.supabase
    .from("organization_members")
    .update({ status })
    .eq("org_id", ctx.org.id)
    .eq("user_id", userId);

  revalidatePath(`/painel/igreja/${slug}/membros`);
}
