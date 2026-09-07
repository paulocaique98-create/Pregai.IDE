"use server";

import { revalidatePath } from "next/cache";
import { getOrgForMember } from "@/lib/site/queries";

function fields(fd: FormData) {
  return {
    title: String(fd.get("title") ?? "").trim(),
    body: String(fd.get("body") ?? "").trim(),
    is_pinned: fd.get("is_pinned") === "on",
    is_published: fd.get("is_published") !== "off",
  };
}

async function ctxFor(slug: string) {
  const ctx = await getOrgForMember(slug);
  if (!ctx) throw new Error("sem acesso");
  return ctx;
}

export async function createAnnouncement(fd: FormData) {
  const slug = String(fd.get("slug"));
  const ctx = await ctxFor(slug);
  const f = fields(fd);
  if (!f.title) return;
  await ctx.supabase
    .from("announcements")
    .insert({ org_id: ctx.org.id, ...f, created_by: ctx.user.id });
  revalidatePath(`/painel/igreja/${slug}/avisos`);
  revalidatePath(`/igreja/${slug}/membro`);
}

export async function updateAnnouncement(fd: FormData) {
  const slug = String(fd.get("slug"));
  const id = String(fd.get("id"));
  const ctx = await ctxFor(slug);
  await ctx.supabase
    .from("announcements")
    .update({ ...fields(fd), updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("org_id", ctx.org.id);
  revalidatePath(`/painel/igreja/${slug}/avisos`);
  revalidatePath(`/igreja/${slug}/membro`);
}

export async function deleteAnnouncement(fd: FormData) {
  const slug = String(fd.get("slug"));
  const id = String(fd.get("id"));
  const ctx = await ctxFor(slug);
  await ctx.supabase.from("announcements").delete().eq("id", id).eq("org_id", ctx.org.id);
  revalidatePath(`/painel/igreja/${slug}/avisos`);
  revalidatePath(`/igreja/${slug}/membro`);
}
