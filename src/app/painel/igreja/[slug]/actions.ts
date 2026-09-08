"use server";

import { revalidatePath } from "next/cache";
import { getOrgForMember } from "@/lib/site/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SiteConfig } from "@/lib/site/schema";

const SITE_EDITORS = ["owner", "pastor", "secretaria"];

export async function saveSite(slug: string, patch: Partial<SiteConfig>) {
  const ctx = await getOrgForMember(slug);
  if (!ctx || !SITE_EDITORS.includes(ctx.role)) return { error: "Sem permissão." };

  // publicação passa pela RPC auditada
  if ("is_published" in patch && Object.keys(patch).length === 1) {
    const { error } = await ctx.supabase.rpc("set_site_published", {
      p_org: ctx.org.id,
      p_published: !!patch.is_published,
    });
    if (error) return { error: "Não foi possível alterar a publicação do site." };
    revalidatePath(`/igreja/${slug}`);
    revalidatePath(`/painel/igreja/${slug}`);
    return { ok: true };
  }

  const { error } = await ctx.supabase
    .from("site_configs")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("org_id", ctx.org.id);
  if (error) return { error: "Não foi possível salvar as alterações do site." };

  revalidatePath(`/igreja/${slug}`);
  revalidatePath(`/painel/igreja/${slug}`);
  return { ok: true };
}

export async function setPublished(slug: string, is_published: boolean) {
  return saveSite(slug, { is_published });
}

export async function uploadSiteAsset(
  slug: string,
  kind: string,
  formData: FormData,
): Promise<{ url: string } | { error: string }> {
  const ctx = await getOrgForMember(slug);
  if (!ctx || !SITE_EDITORS.includes(ctx.role)) return { error: "Sem permissão." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Arquivo inválido." };
  if (file.size > 10 * 1024 * 1024) return { error: "Imagem muito grande (máx. 10 MB)." };

  const ext =
    (file.name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "") ||
    (file.type.split("/")[1] ?? "bin");
  const path = `${ctx.org.id}/${kind}-${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  // Permissão já validada acima (getOrgForMember). Grava com service-role.
  const admin = createAdminClient();
  const { error } = await admin.storage.from("site-assets").upload(path, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
    cacheControl: "3600",
  });
  if (error) return { error: error.message };

  const { data } = admin.storage.from("site-assets").getPublicUrl(path);
  return { url: data.publicUrl };
}
