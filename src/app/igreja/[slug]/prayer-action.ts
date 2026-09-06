"use server";

import { createClient } from "@/lib/supabase/server";

export async function submitPrayer(slug: string, _prev: unknown, formData: FormData) {
  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
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
  return { ok: true };
}
