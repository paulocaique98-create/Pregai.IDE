"use server";

import { revalidatePath } from "next/cache";
import { getOrgForMember } from "@/lib/site/queries";
import type { SiteConfig } from "@/lib/site/schema";

export async function saveSite(slug: string, patch: Partial<SiteConfig>) {
  const ctx = await getOrgForMember(slug);
  if (!ctx) return { error: "Sem permissão." };

  const { error } = await ctx.supabase
    .from("site_configs")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("org_id", ctx.org.id);
  if (error) return { error: error.message };

  revalidatePath(`/igreja/${slug}`);
  revalidatePath(`/painel/igreja/${slug}`);
  return { ok: true };
}

export async function setPublished(slug: string, is_published: boolean) {
  return saveSite(slug, { is_published });
}
