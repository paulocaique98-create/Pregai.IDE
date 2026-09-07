"use server";

import { createClient } from "@/lib/supabase/server";

export async function submitPrayer(slug: string, _prev: unknown, formData: FormData) {
  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();
  if (!org) return { error: "Igreja não encontrada." };

  const request = String(formData.get("request") ?? "").trim();
  if (!request) return { error: "Escreva seu pedido." };

  const { error } = await supabase.from("prayer_requests").insert({
    org_id: org.id,
    name: String(formData.get("name") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    request,
    is_confidential: formData.get("confidential") === "on",
  });
  if (error) return { error: "Não foi possível enviar. Tente novamente." };

  const { orgStaffEmails, sendEmail, tmpl } = await import("@/lib/email");
  const to = await orgStaffEmails(org.id);
  if (to.length) {
    const who = String(formData.get("name") ?? "").trim() || "Anônimo";
    await sendEmail({ to, ...tmpl.newPrayer(org.name, slug, who, request) });
  }

  return { ok: true };
}
