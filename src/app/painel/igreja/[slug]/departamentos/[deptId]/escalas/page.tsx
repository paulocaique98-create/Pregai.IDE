import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrgForPanel } from "@/lib/site/queries";
import { EmptyState, Sym, Badge } from "@/components/ui/primitives";
import { createSchedule, deleteSchedule } from "./actions";

const fmt = (d: string) =>
  new Date(d + "T12:00").toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

export default async function EscalasPage({
  params,
}: PageProps<"/painel/igreja/[slug]/departamentos/[deptId]/escalas">) {
  const { slug, deptId } = await params;
  const ctx = await getOrgForPanel(slug);
  if (!ctx) notFound();

  const [{ data: dept }, { data: schedules }, { data: assigns }] = await Promise.all([
    ctx.supabase
      .from("departments")
      .select("name")
      .eq("id", deptId)
      .eq("org_id", ctx.org.id)
      .maybeSingle(),
    ctx.supabase
      .from("serving_schedules")
      .select("id, title, service_date, notes")
      .eq("department_id", deptId)
      .order("service_date", { ascending: true }),
    ctx.supabase
      .from("serving_assignments")
      .select("schedule_id, status, user_id")
      .eq("department_id", deptId),
  ]);
  if (!dept) notFound();

  const stat = (sid: string) => {
    const rows = (assigns ?? []).filter((a) => a.schedule_id === sid);
    return {
      total: rows.length,
      confirmed: rows.filter((a) => a.status === "confirmed").length,
      declined: rows.filter((a) => a.status === "declined").length,
      open: rows.filter((a) => !a.user_id).length,
    };
  };

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (schedules ?? []).filter((s) => s.service_date >= today);
  const past = (schedules ?? []).filter((s) => s.service_date < today);

  return (
    <>
      <Link
        href={`/painel/igreja/${slug}/departamentos/${deptId}`}
        className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <Sym name="chevron_left" className="text-[16px]" /> {dept.name}
      </Link>
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
        Escalas — {dept.name}
      </h1>

      <form
        action={createSchedule}
        className="mt-5 flex flex-wrap items-end gap-3 rounded-[var(--radius-lg)] border border-dashed border-border p-4"
      >
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="dept_id" value={deptId} />
        <label className="text-xs text-muted-foreground">
          Data
          <input name="service_date" type="date" required className="field-input mt-1" />
        </label>
        <label className="flex-1 text-xs text-muted-foreground">
          Título
          <input name="title" placeholder="Culto de domingo — noite" className="field-input mt-1" />
        </label>
        <button className="btn btn-primary">Nova escala</button>
      </form>

      {upcoming.length === 0 && past.length === 0 && (
        <div className="mt-6">
          <EmptyState icon="event_note">Nenhuma escala criada ainda.</EmptyState>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {upcoming.map((s) => {
          const st = stat(s.id);
          return (
            <div key={s.id} className="card flex flex-wrap items-center gap-3 p-4">
              <Link
                href={`/painel/igreja/${slug}/departamentos/${deptId}/escalas/${s.id}`}
                className="min-w-0 flex-1"
              >
                <p className="text-sm font-medium">{s.title}</p>
                <p className="text-xs text-muted-foreground">{fmt(s.service_date)}</p>
              </Link>
              <div className="flex flex-wrap gap-1.5">
                <Badge tone="outline">{st.total} escalados</Badge>
                {st.confirmed > 0 && <Badge>{st.confirmed} confirmaram</Badge>}
                {st.declined > 0 && <Badge>{st.declined} recusaram</Badge>}
                {st.open > 0 && <Badge tone="solid">{st.open} vaga(s)</Badge>}
              </div>
              <form action={deleteSchedule}>
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="dept_id" value={deptId} />
                <input type="hidden" name="id" value={s.id} />
                <button className="btn btn-ghost !px-2 !py-1 text-xs text-danger">Excluir</button>
              </form>
            </div>
          );
        })}
      </div>

      {past.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-muted-foreground">
            Escalas passadas ({past.length})
          </summary>
          <div className="mt-2 space-y-2">
            {past.map((s) => (
              <Link
                key={s.id}
                href={`/painel/igreja/${slug}/departamentos/${deptId}/escalas/${s.id}`}
                className="card block p-3 text-sm text-muted-foreground"
              >
                {s.title} · {fmt(s.service_date)}
              </Link>
            ))}
          </div>
        </details>
      )}
    </>
  );
}
