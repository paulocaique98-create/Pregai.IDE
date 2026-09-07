"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getOrgForPanel } from "@/lib/site/queries";

async function canManage(slug: string, deptId: string) {
  const ctx = await getOrgForPanel(slug);
  if (!ctx) return null;
  if (ctx.isStaff) return ctx;
  const { data } = await ctx.supabase
    .from("department_members")
    .select("role, status")
    .eq("department_id", deptId)
    .eq("user_id", ctx.user.id)
    .maybeSingle();
  return data?.role === "leader" && data.status === "active" ? ctx : null;
}

const rev = (slug: string, deptId: string, scheduleId?: string) => {
  revalidatePath(`/painel/igreja/${slug}/departamentos/${deptId}/escalas`);
  if (scheduleId)
    revalidatePath(`/painel/igreja/${slug}/departamentos/${deptId}/escalas/${scheduleId}`);
};

export async function createSchedule(fd: FormData) {
  const slug = String(fd.get("slug"));
  const deptId = String(fd.get("dept_id"));
  const ctx = await canManage(slug, deptId);
  if (!ctx) return;
  const service_date = String(fd.get("service_date") ?? "");
  if (!service_date) return;
  await ctx.supabase.from("serving_schedules").insert({
    org_id: ctx.org.id,
    department_id: deptId,
    service_date,
    title: String(fd.get("title") ?? "").trim() || "Escala",
    notes: String(fd.get("notes") ?? "").trim() || null,
    created_by: ctx.user.id,
  });
  rev(slug, deptId);
}

export async function deleteSchedule(fd: FormData) {
  const slug = String(fd.get("slug"));
  const deptId = String(fd.get("dept_id"));
  const id = String(fd.get("id"));
  const ctx = await canManage(slug, deptId);
  if (!ctx) return;
  await ctx.supabase.from("serving_schedules").delete().eq("id", id).eq("org_id", ctx.org.id);
  rev(slug, deptId);
}

export async function addAssignment(fd: FormData) {
  const slug = String(fd.get("slug"));
  const deptId = String(fd.get("dept_id"));
  const scheduleId = String(fd.get("schedule_id"));
  const role = String(fd.get("role") ?? "").trim();
  const userId = String(fd.get("user_id") ?? "") || null;
  const ctx = await canManage(slug, deptId);
  if (!ctx || !role) return;

  const { data: sched } = await ctx.supabase
    .from("serving_schedules")
    .select("service_date, title")
    .eq("id", scheduleId)
    .maybeSingle();

  await ctx.supabase.from("serving_assignments").insert({
    schedule_id: scheduleId,
    role,
    user_id: userId,
    token: randomBytes(12).toString("base64url"),
  });

  if (userId && sched) {
    const { notify } = await import("@/lib/notify");
    await notify(userId, {
      org_id: ctx.org.id,
      kind: "serving_assignment",
      title: `Você foi escalado — ${sched.title}`,
      body: `${role} · ${new Date(sched.service_date + "T12:00").toLocaleDateString("pt-BR")}`,
      url: `/igreja/${slug}/membro/escala`,
    });
  }
  rev(slug, deptId, scheduleId);
}

export async function updateAssignment(fd: FormData) {
  const slug = String(fd.get("slug"));
  const deptId = String(fd.get("dept_id"));
  const scheduleId = String(fd.get("schedule_id"));
  const id = String(fd.get("id"));
  const op = String(fd.get("op"));
  const ctx = await canManage(slug, deptId);
  if (!ctx) return;

  if (op === "remove") {
    await ctx.supabase.from("serving_assignments").delete().eq("id", id).eq("org_id", ctx.org.id);
  } else if (["pending", "confirmed", "declined"].includes(op)) {
    await ctx.supabase
      .from("serving_assignments")
      .update({ status: op, responded_at: new Date().toISOString() })
      .eq("id", id)
      .eq("org_id", ctx.org.id);
  } else if (op === "assign") {
    const userId = String(fd.get("user_id") ?? "");
    const { data: sched } = await ctx.supabase
      .from("serving_schedules")
      .select("service_date, title")
      .eq("id", scheduleId)
      .maybeSingle();
    await ctx.supabase
      .from("serving_assignments")
      .update({ user_id: userId || null, status: "pending", responded_at: null })
      .eq("id", id)
      .eq("org_id", ctx.org.id);
    if (userId && sched) {
      const { notify } = await import("@/lib/notify");
      await notify(userId, {
        org_id: ctx.org.id,
        kind: "serving_assignment",
        title: `Você foi escalado — ${sched.title}`,
        body: `${new Date(sched.service_date + "T12:00").toLocaleDateString("pt-BR")}`,
        url: `/igreja/${slug}/membro/escala`,
      });
    }
  }
  rev(slug, deptId, scheduleId);
}
