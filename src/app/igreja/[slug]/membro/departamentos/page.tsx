import { getMemberContext } from "@/lib/site/member";
import { Badge, Sym, EmptyState } from "@/components/ui/primitives";
import { joinDepartment, leaveDepartment } from "../actions";

export default async function MembroDepartamentos({
  params,
}: PageProps<"/igreja/[slug]/membro/departamentos">) {
  const { slug } = await params;
  const ctx = await getMemberContext(slug);

  const [{ data: depts }, { data: dm }] = await Promise.all([
    ctx.supabase
      .from("departments")
      .select("id, name, description")
      .eq("org_id", ctx.org.id)
      .eq("is_active", true)
      .order("name"),
    ctx.supabase
      .from("department_members")
      .select("department_id, role, status")
      .eq("org_id", ctx.org.id)
      .eq("user_id", ctx.user.id),
  ]);

  const mine = Object.fromEntries(
    (dm ?? []).map((m) => [m.department_id, { role: m.role, status: m.status }]),
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
          <Sym name="workspaces" className="text-[22px]" /> Servir
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Departamentos da igreja. Peça para participar de um deles.
        </p>
      </div>

      {(depts ?? []).length === 0 ? (
        <EmptyState icon="workspaces">
          A igreja ainda não cadastrou departamentos.
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {(depts ?? []).map((d) => {
            const m = mine[d.id];
            return (
              <li key={d.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{d.name}</p>
                    {d.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{d.description}</p>
                    )}
                  </div>
                  {m?.role === "leader" && m.status === "active" && (
                    <Badge tone="solid">líder</Badge>
                  )}
                </div>
                <div className="mt-3">
                  {!m && (
                    <form action={joinDepartment.bind(null, slug)}>
                      <input type="hidden" name="dept_id" value={d.id} />
                      <button className="btn btn-outline !px-3 !py-1.5 text-xs">Participar</button>
                    </form>
                  )}
                  {m?.status === "pending" && (
                    <span className="text-xs text-muted-foreground">
                      Solicitação enviada — aguardando o líder aprovar
                    </span>
                  )}
                  {m?.status === "active" && (
                    <form action={leaveDepartment.bind(null, slug)} className="flex items-center gap-2">
                      <input type="hidden" name="dept_id" value={d.id} />
                      <span className="text-xs text-muted-foreground">Você participa.</span>
                      <button className="btn btn-ghost !px-2 !py-1 text-xs text-danger">Sair</button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
