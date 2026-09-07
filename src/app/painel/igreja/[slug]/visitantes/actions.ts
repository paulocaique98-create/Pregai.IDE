"use server";

import { revalidatePath } from "next/cache";
import { getOrgForMember } from "@/lib/site/queries";

export async function setVisitorStatus(formData: FormData) {
  const slug = String(formData.get("slug"));
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (!["novo", "contatado", "compareceu", "arquivado"].includes(status)) return;
  const ctx = await getOrgForMember(slug);
  if (!ctx) return;
  await ctx.supabase
    .from("visitor_checkins")
    .update({ status })
    .eq("id", id)
    .eq("org_id", ctx.org.id);
  revalidatePath(`/painel/igreja/${slug}/visitantes`);
}
