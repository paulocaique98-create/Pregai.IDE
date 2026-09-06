"use server";

import { revalidatePath } from "next/cache";
import { getOrgForMember } from "@/lib/site/queries";

export async function setPrayerStatus(formData: FormData) {
  const slug = String(formData.get("slug"));
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (!["novo", "orando", "atendido"].includes(status)) return;

  const ctx = await getOrgForMember(slug);
  if (!ctx) return;

  await ctx.supabase
    .from("prayer_requests")
    .update({ status })
    .eq("id", id)
    .eq("org_id", ctx.org.id);

  revalidatePath(`/painel/igreja/${slug}/oracoes`);
}
