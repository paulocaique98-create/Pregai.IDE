"use server";

import { revalidatePath } from "next/cache";
import { getOrgForMember } from "@/lib/site/queries";
import { validateAnnouncement } from "@/lib/announcements/policy";

export type AvisoResult = { ok: true; message?: string } | { ok: false; error: string };

function pgError(e: unknown): string {
  const msg = (e as { message?: string } | null)?.message ?? "Não foi possível salvar o aviso.";
  return msg.replace(/^.*?:\s*/, "").trim() || "Operação recusada.";
}

async function ctxFor(slug: string) {
  const ctx = await getOrgForMember(slug);
  if (!ctx) throw new Error("Sem acesso a esta igreja.");
  return ctx;
}

function revalidate(slug: string) {
  revalidatePath(`/painel/igreja/${slug}/avisos`);
  revalidatePath(`/igreja/${slug}/membro`);
  revalidatePath(`/igreja/${slug}/membro/avisos`);
  revalidatePath(`/igreja/${slug}/membro/notificacoes`);
}

async function pushToMembers(
  ctx: Awaited<ReturnType<typeof ctxFor>>,
  slug: string,
  id: string,
  title: string,
  body: string,
) {
  try {
    const { data: members } = await ctx.supabase
      .from("organization_members")
      .select("user_id")
      .eq("org_id", ctx.org.id)
      .eq("status", "active");
    const { notifyMany } = await import("@/lib/notify");
    await notifyMany(
      (members ?? []).map((m) => m.user_id).filter((mId) => mId !== ctx.user.id),
      {
        org_id: ctx.org.id,
        kind: "announcement",
        entity_type: "announcement",
        entity_id: id,
        title,
        body: body ? body.slice(0, 140) : "Novo aviso da igreja",
        url: `/igreja/${slug}/membro/avisos`,
      },
    );
  } catch {
    /* notificação é melhor-esforço */
  }
}

export async function createAnnouncement(
  slug: string,
  data: { title: string; body: string; isPinned: boolean; publish: boolean },
): Promise<AvisoResult> {
  const v = validateAnnouncement(data);
  if (!v.ok) return v;
  try {
    const ctx = await ctxFor(slug);
    const { data: id, error } = await ctx.supabase.rpc("create_announcement", {
      p_org: ctx.org.id,
      p_title: v.title,
      p_body: v.body,
      p_is_pinned: data.isPinned,
      p_publish: data.publish,
    });
    if (error) return { ok: false, error: pgError(error) };
    if (data.publish && typeof id === "string") {
      await pushToMembers(ctx, slug, id, v.title, v.body);
    }
    revalidate(slug);
    return { ok: true, message: "Aviso criado." };
  } catch (e) {
    return { ok: false, error: pgError(e) };
  }
}

export async function updateAnnouncement(
  slug: string,
  id: string,
  data: { title: string; body: string; isPinned: boolean },
): Promise<AvisoResult> {
  const v = validateAnnouncement(data);
  if (!v.ok) return v;
  try {
    const ctx = await ctxFor(slug);
    const { error } = await ctx.supabase.rpc("update_announcement", {
      p_id: id,
      p_title: v.title,
      p_body: v.body,
      p_is_pinned: data.isPinned,
    });
    if (error) return { ok: false, error: pgError(error) };
    revalidate(slug);
    return { ok: true, message: "Aviso salvo." };
  } catch (e) {
    return { ok: false, error: pgError(e) };
  }
}

export async function setAnnouncementPublished(
  slug: string,
  id: string,
  published: boolean,
): Promise<AvisoResult> {
  try {
    const ctx = await ctxFor(slug);
    const { error } = await ctx.supabase.rpc("set_announcement_published", {
      p_id: id,
      p_published: published,
    });
    if (error) return { ok: false, error: pgError(error) };
    if (published) {
      const { data: row } = await ctx.supabase
        .from("announcements")
        .select("title, body")
        .eq("id", id)
        .maybeSingle();
      if (row) await pushToMembers(ctx, slug, id, row.title, row.body ?? "");
    }
    revalidate(slug);
    return { ok: true, message: published ? "Aviso publicado." : "Aviso despublicado." };
  } catch (e) {
    return { ok: false, error: pgError(e) };
  }
}

export async function deleteAnnouncement(slug: string, id: string): Promise<AvisoResult> {
  try {
    const ctx = await ctxFor(slug);
    const { error } = await ctx.supabase.rpc("delete_announcement", { p_id: id });
    if (error) return { ok: false, error: pgError(error) };
    revalidate(slug);
    return { ok: true, message: "Aviso excluído." };
  } catch (e) {
    return { ok: false, error: pgError(e) };
  }
}
