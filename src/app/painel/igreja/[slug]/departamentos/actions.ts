"use server";

import { revalidatePath } from "next/cache";
import { getOrgForPanel } from "@/lib/site/queries";

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 50);
}

async function ctxFor(slug: string) {
  const ctx = await getOrgForPanel(slug);
  if (!ctx) throw new Error("sem acesso");
  return ctx;
}

async function canManage(slug: string, deptId: string) {
  const ctx = await ctxFor(slug);
  if (ctx.isStaff) return ctx;
  const { data } = await ctx.supabase
    .from("department_members")
    .select("role, status")
    .eq("department_id", deptId)
    .eq("user_id", ctx.user.id)
    .maybeSingle();
  if (data?.role === "leader" && data.status === "active") return ctx;
  return null;
}

export async function createDepartment(formData: FormData) {
  const slug = String(formData.get("slug"));
  const ctx = await ctxFor(slug);
  if (!ctx.isStaff) return;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await ctx.supabase.from("departments").insert({
    org_id: ctx.org.id,
    name,
    slug: slugify(name) || `dep-${Date.now()}`,
    description: String(formData.get("description") ?? "").trim() || null,
  });
  revalidatePath(`/painel/igreja/${slug}/departamentos`);
}

export async function updateDepartment(formData: FormData) {
  const slug = String(formData.get("slug"));
  const deptId = String(formData.get("dept_id"));
  const ctx = await canManage(slug, deptId);
  if (!ctx) return;

  await ctx.supabase
    .from("departments")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim() || null,
      allow_join_requests: formData.get("allow_join_requests") === "on",
    })
    .eq("id", deptId)
    .eq("org_id", ctx.org.id);
  revalidatePath(`/painel/igreja/${slug}/departamentos/${deptId}`);
  revalidatePath(`/painel/igreja/${slug}/departamentos`);
}

export async function deleteDepartment(formData: FormData) {
  const slug = String(formData.get("slug"));
  const deptId = String(formData.get("dept_id"));
  const ctx = await ctxFor(slug);
  if (!ctx.isStaff) return;
  await ctx.supabase.from("departments").delete().eq("id", deptId).eq("org_id", ctx.org.id);
  revalidatePath(`/painel/igreja/${slug}/departamentos`);
}

export async function setDeptMember(formData: FormData) {
  const slug = String(formData.get("slug"));
  const deptId = String(formData.get("dept_id"));
  const userId = String(formData.get("user_id"));
  const op = String(formData.get("op"));
  const ctx = await canManage(slug, deptId);
  if (!ctx) return;

  const table = ctx.supabase.from("department_members");
  if (op === "approve") {
    await table.update({ status: "active" }).eq("department_id", deptId).eq("user_id", userId);
  } else if (op === "promote") {
    await table
      .update({ role: "leader", status: "active" })
      .eq("department_id", deptId)
      .eq("user_id", userId);
  } else if (op === "demote") {
    await table.update({ role: "member" }).eq("department_id", deptId).eq("user_id", userId);
  } else if (op === "remove") {
    await table.delete().eq("department_id", deptId).eq("user_id", userId);
  } else if (op === "add") {
    await table.insert({
      department_id: deptId,
      user_id: userId,
      role: "member",
      status: "active",
    });
  }
  revalidatePath(`/painel/igreja/${slug}/departamentos/${deptId}`);
}
