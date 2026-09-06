"use server";

import { revalidatePath } from "next/cache";
import { getOrgForMember } from "@/lib/site/queries";

function fields(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    event_date: String(formData.get("event_date") ?? "") || null,
    event_time: String(formData.get("event_time") ?? "").trim() || null,
    tag: String(formData.get("tag") ?? "").trim() || null,
    sort_order: Number(formData.get("sort_order") ?? 0) || 0,
  };
}

export async function createEvent(formData: FormData) {
  const slug = String(formData.get("slug"));
  const ctx = await getOrgForMember(slug);
  if (!ctx) return;
  const f = fields(formData);
  if (!f.title) return;
  await ctx.supabase.from("site_events").insert({ org_id: ctx.org.id, ...f });
  revalidatePath(`/painel/igreja/${slug}/agenda`);
  revalidatePath(`/igreja/${slug}`);
}

export async function updateEvent(formData: FormData) {
  const slug = String(formData.get("slug"));
  const id = String(formData.get("id"));
  const ctx = await getOrgForMember(slug);
  if (!ctx) return;
  await ctx.supabase
    .from("site_events")
    .update(fields(formData))
    .eq("id", id)
    .eq("org_id", ctx.org.id);
  revalidatePath(`/painel/igreja/${slug}/agenda`);
  revalidatePath(`/igreja/${slug}`);
}

export async function deleteEvent(formData: FormData) {
  const slug = String(formData.get("slug"));
  const id = String(formData.get("id"));
  const ctx = await getOrgForMember(slug);
  if (!ctx) return;
  await ctx.supabase.from("site_events").delete().eq("id", id).eq("org_id", ctx.org.id);
  revalidatePath(`/painel/igreja/${slug}/agenda`);
  revalidatePath(`/igreja/${slug}`);
}
