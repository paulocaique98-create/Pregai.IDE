import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrgForPanel } from "@/lib/site/queries";
import { Sym, Badge, Avatar, EmptyState } from "@/components/ui/primitives";
import { addAssignment, updateAssignment } from "../actions";
import { AssignSelect } from "./AssignSelect";

const STBADGE: Record<string, { label: string; tone: "muted" | "solid" | "outline" }> = {
  pending: { label: "aguardando", tone: "muted" },
  confirmed: { label: "confirmado", tone: "solid" },
  declined: { label: "não pode", tone: "outline" },
};

export default async function ScheduleDetail({
  params,
}: PageProps<"/painel/igreja/[slug]/departamentos/[deptId]/escalas/[scheduleId]">) {
  const { slug, deptId, scheduleId } = await params;
  const ctx = await getOrgForPanel(slug);
  if (!ctx) notFound();

  const { data: sched } = await ctx.supabase
    .from("serving_schedules")
    .select("id, title, service_date, notes, department_id, departments(name)")
    .eq("id", scheduleId)
    .eq("org_id", ctx.org.id)
    .maybeSingle();
  if (!sched) notFound();

  const [{ data: assigns }, { data: deptMembers }, { data: conflicts }] = await Promise.all([
    ctx.supabase
      .from("serving_assignments")
      .select("id, role, user_id, status")
      .eq("schedule_id", scheduleId)
      .order("created_at"),
    ctx.supabase
      .from("department_members")
      .select("user_id")
      .eq("department_id", deptId)
      .eq("status", "active"),
    // outras escalações da igreja na mesma data (para avisar conflito)
    ctx.supabase
      .from("serving_assignments")
      .select("user_id, role, serving_schedules(title)")
      .eq("org_id", ctx.org.id)
      .eq("service_date", sched.service_date)
      .neq("schedule_id", scheduleId),
  ]);

  const memberIds = (deptMembers ?? []).map((m) => m.user_id);
  const { data: profs } = memberIds.length
    ? await ctx.supabase.from("profiles").select("user_id, full_name").in("user_id", memberIds)
    : { data: [] };
  const nameOf = (id?: string | null) =>
    id ? (profs ?? []).find((p) => p.user_id === id)?.full_name || "Sem nome" : "";
  const people = memberIds
    .map((id) => ({ user_id: id, name: nameOf(id) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const conflictFor = (userId?: string | null) =>
    userId
      ? (conflicts ?? []).filter((c) => c.user_id === userId)
      : [];

  const fmt = new Date(sched.service_date + "T12:00").toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <>
      <Link
        href={`/painel/igreja/${slug}/departamentos/${deptId}/escalas`}
        className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <Sym name="chevron_left" className="text-[16px]" /> Escalas
      </Link>
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
        {sched.title}
      </h1>
      <p className="mt-1 text-sm capitalize text-muted-foreground">{fmt}</p>

      <div className="mt-6 space-y-2">
        {(assigns ?? []).length === 0 && (
          <EmptyState icon="group_add">Adicione as funções e escale os voluntários abaixo.</EmptyState>
        )}
        {(assigns ?? []).map((a) => {
          const conf = conflictFor(a.user_id);
          return (
            <div key={a.id} className="card p-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-[var(--radius)] bg-muted px-2 py-0.5 text-xs font-medium">
                  {a.role}
                </span>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {a.user_id ? (
                    <>
                      <Avatar name={nameOf(a.user_id)} />
                      <span className="truncate text-sm">{nameOf(a.user_id)}</span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">— vaga aberta</span>
                  )}
                </div>
                {a.user_id && <Badge tone={STBADGE[a.status].tone}>{STBADGE[a.status].label}</Badge>}
                <div className="flex gap-1">
                  <form action={updateAssignment}>
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="dept_id" value={deptId} />
                    <input type="hidden" name="schedule_id" value={scheduleId} />
                    <input type="hidden" name="id" value={a.id} />
                    <button
                      name="op"
                      value="remove"
                      className="btn btn-ghost !px-2 !py-1 text-xs text-danger"
                    >
                      remover
                    </button>
                  </form>
                </div>
              </div>
              <div className="mt-2">
                <AssignSelect
                  slug={slug}
                  deptId={deptId}
                  scheduleId={scheduleId}
                  assignmentId={a.id}
                  current={a.user_id ?? ""}
                  people={people}
                />
              </div>
              {conf.length > 0 && a.user_id && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-danger">
                  <Sym name="warning" className="text-[14px]" />
                  Já escalado neste dia:{" "}
                  {conf
                    .map(
                      (c) =>
                        `${(c as { serving_schedules?: { title?: string } }).serving_schedules?.title ?? "outra escala"} (${c.role})`,
                    )
                    .join(", ")}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <form
        action={addAssignment}
        className="mt-4 space-y-3 rounded-[var(--radius-lg)] border border-dashed border-border p-4"
      >
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="dept_id" value={deptId} />
        <input type="hidden" name="schedule_id" value={scheduleId} />
        <label className="block text-xs text-muted-foreground">
          Função
          <input
            name="role"
            required
            placeholder="Ex: Vocal, Mesa de som, Recepção"
            className="field-input mt-1 w-full"
          />
        </label>
        <label className="block text-xs text-muted-foreground">
          Voluntário (opcional)
          <select name="user_id" className="field-input mt-1 w-full">
            <option value="">— deixar vaga aberta</option>
            {people.map((p) => (
              <option key={p.user_id} value={p.user_id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn-primary w-full sm:w-auto">Adicionar função</button>
      </form>
    </>
  );
}
