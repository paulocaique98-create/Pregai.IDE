"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function registerForEvent(
  slug: string,
  eventId: string,
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string } | null> {
  const supabase = await createClient();

  const { data: ev } = await supabase
    .from("site_events")
    .select("id, title, capacity, registration_open")
    .eq("id", eventId)
    .maybeSingle();
  if (!ev || !ev.registration_open) return { error: "Inscrições encerradas." };

  const party = Math.max(1, Number(formData.get("party_size")) || 1);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Informe seu nome." };

  if (ev.capacity != null) {
    const { data: regs } = await supabase
      .from("event_registrations")
      .select("party_size")
      .eq("event_id", eventId);
    const taken = (regs ?? []).reduce((s, r) => s + (r.party_size || 1), 0);
    if (taken + party > ev.capacity) return { error: "Vagas esgotadas." };
  }

  const { error } = await supabase.from("event_registrations").insert({
    event_id: eventId,
    name,
    phone: String(formData.get("phone") ?? "").trim() || null,
    party_size: party,
  });
  if (error) return { error: "Não foi possível inscrever. Tente de novo." };
  revalidatePath(`/igreja/${slug}`);
  return { ok: true };
}
