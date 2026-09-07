"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function respondAssignment(
  slug: string,
  token: string,
  response: "confirmed" | "declined",
): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("respond_assignment", {
    p_token: token,
    p_response: response,
  });

  // avisa o líder do departamento
  try {
    const { data: a } = await supabase
      .from("serving_assignments")
      .select("department_id, org_id, role, service_date, user_id, serving_schedules(title)")
      .eq("token", token)
      .maybeSingle();
    if (a) {
      const admin = (await import("@/lib/supabase/admin")).createAdminClient();
      const { data: leaders } = await admin
        .from("department_members")
        .select("user_id")
        .eq("department_id", a.department_id)
        .eq("role", "leader")
        .eq("status", "active");
      const { data: prof } = await admin
        .from("profiles")
        .select("full_name")
        .eq("user_id", a.user_id)
        .maybeSingle();
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
          url: `/painel/igreja/${slug}/departamentos/${a.department_id}/escalas`,
        },
      );
    }
  } catch {
    /* notificação não deve derrubar a resposta */
  }

  revalidatePath(`/igreja/${slug}/membro/escala`);
  revalidatePath(`/igreja/${slug}/membro`);
}
