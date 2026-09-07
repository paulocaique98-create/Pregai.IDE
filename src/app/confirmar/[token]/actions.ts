"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function respondByToken(
  token: string,
  response: "confirmed" | "declined",
) {
  const supabase = await createClient();
  await supabase.rpc("respond_assignment", { p_token: token, p_response: response });

  // notifica os líderes do departamento
  try {
    const admin = (await import("@/lib/supabase/admin")).createAdminClient();
    const { data: a } = await admin
      .from("serving_assignments")
      .select("department_id, org_id, role, user_id, serving_schedules(title)")
      .eq("token", token)
      .maybeSingle();
    if (a) {
      const [{ data: leaders }, { data: prof }] = await Promise.all([
        admin
          .from("department_members")
          .select("user_id")
          .eq("department_id", a.department_id)
          .eq("role", "leader")
          .eq("status", "active"),
        admin.from("profiles").select("full_name").eq("user_id", a.user_id).maybeSingle(),
      ]);
      const { notifyMany } = await import("@/lib/notify");
      const who = prof?.full_name || "Um voluntário";
      await notifyMany(
        (leaders ?? []).map((l) => l.user_id),
        {
          org_id: a.org_id,
          kind: "serving_response",
          title:
            response === "confirmed"
              ? `${who} confirmou a escala`
              : `${who} não pode na escala`,
          body: `${a.role} · ${(a as { serving_schedules?: { title?: string } }).serving_schedules?.title ?? ""}`,
        },
      );
    }
  } catch {
    /* silencioso */
  }

  revalidatePath(`/confirmar/${token}`);
}
