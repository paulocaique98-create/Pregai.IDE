"use server";

import { createClient } from "@/lib/supabase/server";

export async function submitVisit(
  slug: string,
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string } | null> {
  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();
  if (!org) return { error: "Igreja não encontrada." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Informe seu nome." };

  const { error } = await supabase.from("visitor_checkins").insert({
    org_id: org.id,
    name,
    phone: String(formData.get("phone") ?? "").trim() || null,
    planned_date: String(formData.get("planned_date") ?? "") || null,
    party_size: Number(formData.get("party_size")) || null,
    kids_ages: String(formData.get("kids_ages") ?? "").trim() || null,
  });
  if (error) return { error: "Não foi possível enviar. Tente novamente." };

  const { orgStaffEmails, sendEmail, tmpl } = await import("@/lib/email");
  const to = await orgStaffEmails(org.id);
  if (to.length) await sendEmail({ to, ...tmpl.newVisitor(org.name, slug, name) });

  return { ok: true };
}
