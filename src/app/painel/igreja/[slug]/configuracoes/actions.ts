"use server";

import { revalidatePath } from "next/cache";
import { getOrgForMember } from "@/lib/site/queries";
import { validateOrgSettings } from "@/lib/org/settings";

export type SettingsResult = { ok: true; message: string } | { ok: false; error: string };

function pgError(e: unknown): string {
  const msg = (e as { message?: string } | null)?.message ?? "Não foi possível salvar.";
  return msg.replace(/^.*?:\s*/, "").trim() || "Operação recusada.";
}

export async function saveOrgSettings(
  slug: string,
  input: { name: string; memberMode: string },
): Promise<SettingsResult> {
  const v = validateOrgSettings(input);
  if (!v.ok) return v;

  try {
    const ctx = await getOrgForMember(slug);
    if (!ctx) return { ok: false, error: "Sem acesso a esta igreja." };
    const { error } = await ctx.supabase.rpc("update_org_settings", {
      p_org: ctx.org.id,
      p_name: v.name,
      p_member_mode: v.memberMode,
    });
    if (error) return { ok: false, error: pgError(error) };

    revalidatePath(`/painel/igreja/${slug}`, "layout");
    revalidatePath(`/painel/igreja/${slug}/configuracoes`);
    revalidatePath(`/igreja/${slug}`);
    return { ok: true, message: "Configurações salvas." };
  } catch (e) {
    return { ok: false, error: pgError(e) };
  }
}
