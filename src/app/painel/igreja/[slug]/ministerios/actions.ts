"use server";

import { revalidatePath } from "next/cache";
import { getOrgForMember } from "@/lib/site/queries";

function lines(v: FormDataEntryValue | null): string[] {
  return String(v ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function createMinistry(formData: FormData) {
  const slug = String(formData.get("slug"));
  const ctx = await getOrgForMember(slug);
  if (!ctx) return;
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  await ctx.supabase.from("site_ministries").insert({
    org_id: ctx.org.id,
    title,
    description: lines(formData.get("description")),
    icon: String(formData.get("icon") ?? "Heart").trim() || "Heart",
    sort_order: Number(formData.get("sort_order") ?? 0) || 0,
  });
  revalidatePath(`/painel/igreja/${slug}/ministerios`);
  revalidatePath(`/igreja/${slug}`);
}

export async function updateMinistry(formData: FormData) {
  const slug = String(formData.get("slug"));
  const id = String(formData.get("id"));
  const ctx = await getOrgForMember(slug);
  if (!ctx) return;

  await ctx.supabase
    .from("site_ministries")
    .update({
      title: String(formData.get("title") ?? "").trim(),
      description: lines(formData.get("description")),
      icon: String(formData.get("icon") ?? "Heart").trim() || "Heart",
      sort_order: Number(formData.get("sort_order") ?? 0) || 0,
    })
    .eq("id", id)
    .eq("org_id", ctx.org.id);
  revalidatePath(`/painel/igreja/${slug}/ministerios`);
  revalidatePath(`/igreja/${slug}`);
}

export async function deleteMinistry(formData: FormData) {
  const slug = String(formData.get("slug"));
  const id = String(formData.get("id"));
  const ctx = await getOrgForMember(slug);
  if (!ctx) return;
  await ctx.supabase.from("site_ministries").delete().eq("id", id).eq("org_id", ctx.org.id);
  revalidatePath(`/painel/igreja/${slug}/ministerios`);
  revalidatePath(`/igreja/${slug}`);
}
