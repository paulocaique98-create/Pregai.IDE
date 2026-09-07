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

  if (f.is_published) {
    const { data: members } = await ctx.supabase
      .from("organization_members")
      .select("user_id")
      .eq("org_id", ctx.org.id)
      .eq("status", "active");
    const { notifyMany } = await import("@/lib/notify");
    await notifyMany(
      (members ?? []).map((m) => m.user_id).filter((id) => id !== ctx.user.id),
      {
        org_id: ctx.org.id,
        kind: "announcement",
        title: f.title,
        body: f.body ? f.body.slice(0, 140) : "Novo aviso da igreja",
        url: `/igreja/${slug}/membro/avisos`,
      },
    );
  }

  revalidatePath(`/painel/igreja/${slug}/avisos`);
  revalidatePath(`/igreja/${slug}/membro`);
  revalidatePath(`/igreja/${slug}/membro/avisos`);
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
  revalidatePath(`/igreja/${slug}/membro/avisos`);
}

export async function deleteAnnouncement(fd: FormData) {
  const slug = String(fd.get("slug"));
  const id = String(fd.get("id"));
  const ctx = await ctxFor(slug);

  const { data: row } = await ctx.supabase
    .from("announcements")
    .select("title")
    .eq("id", id)
    .eq("org_id", ctx.org.id)
    .maybeSingle();

  await ctx.supabase.from("announcements").delete().eq("id", id).eq("org_id", ctx.org.id);

  // Remove tambem as notificacoes que esse aviso gerou.
  if (row?.title) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    await createAdminClient()
      .from("notifications")
      .delete()
      .eq("org_id", ctx.org.id)
      .eq("kind", "announcement")
      .eq("title", row.title);
  }

  revalidatePath(`/painel/igreja/${slug}/avisos`);
  revalidatePath(`/igreja/${slug}/membro`);
  revalidatePath(`/igreja/${slug}/membro/avisos`);
  revalidatePath(`/igreja/${slug}/membro/notificacoes`);
}
