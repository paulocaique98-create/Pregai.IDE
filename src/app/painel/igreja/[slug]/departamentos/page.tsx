import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrgForPanel } from "@/lib/site/queries";
import { PageHeader, EmptyState, Sym, Badge } from "@/components/ui/primitives";
import { createDepartment } from "./actions";

export default async function DepartamentosPage({
  params,
}: PageProps<"/painel/igreja/[slug]/departamentos">) {
  const { slug } = await params;
  const ctx = await getOrgForPanel(slug);
  if (!ctx) notFound();

  // RLS entrega: staff vê todos; líder vê os da org mas só gerencia os seus.
  const { data: depts } = await ctx.supabase
    .from("departments")
    .select("id, name, description, is_active, allow_join_requests")
    .eq("org_id", ctx.org.id)
    .order("name");

  const { data: myLead } = await ctx.supabase
    .from("department_members")
    .select("department_id, role, status")
    .eq("org_id", ctx.org.id)
    .eq("user_id", ctx.user.id);
  const leadSet = new Set(
    (myLead ?? [])
      .filter((m) => m.role === "leader" && m.status === "active")
      .map((m) => m.department_id),
  );

  // contagem de membros por departamento
  const { data: counts } = await ctx.supabase
    .from("department_members")
    .select("department_id, status")
    .eq("org_id", ctx.org.id);
  const countFor = (id: string, status?: string) =>
    (counts ?? []).filter(
      (c) => c.department_id === id && (!status || c.status === status),
    ).length;

  const list = (depts ?? []).filter((d) => ctx.isStaff || leadSet.has(d.id));

  return (
    <>
      <PageHeader
        kicker="Estrutura ministerial"
        title={ctx.isStaff ? "Departamentos" : "Meus departamentos"}
        description={
          ctx.isStaff
            ? "Crie os departamentos da igreja e defina líderes. Cada líder gerencia os membros do seu departamento."
            : "Departamentos que você lidera. Aprove entradas e organize a equipe."
        }
      />

      {list.length === 0 ? (
        <div className="mb-6">
          <EmptyState icon="workspaces">
            {ctx.isStaff
              ? "Nenhum departamento ainda. Crie o primeiro abaixo."
              : "Você ainda não lidera nenhum departamento."}
          </EmptyState>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((d) => (
            <Link
              key={d.id}
              href={`/painel/igreja/${slug}/departamentos/${d.id}`}
              className="card group p-5 transition-colors hover:border-border-strong"
            >
              <div className="flex items-start justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius)] bg-muted">
                  <Sym name="workspaces" className="text-[20px]" />
                </span>
                <Sym
                  name="arrow_outward"
                  className="text-[18px] text-muted-foreground group-hover:translate-x-0.5"
                />
              </div>
              <p className="mt-3 font-medium">{d.name}</p>
              {d.description && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {d.description}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone="outline">{countFor(d.id, "active")} ativos</Badge>
                {countFor(d.id, "pending") > 0 && (
                  <Badge>{countFor(d.id, "pending")} pendentes</Badge>
                )}
                {leadSet.has(d.id) && <Badge tone="solid">você lidera</Badge>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {ctx.isStaff && (
        <form
          action={createDepartment}
          className="mt-6 space-y-3 rounded-[var(--radius-lg)] border border-dashed border-border p-4"
        >
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Sym name="add_circle" className="text-[18px]" /> Novo departamento
          </p>
          <input type="hidden" name="slug" value={slug} />
          <input
            name="name"
            placeholder="Ex: Louvor, Jovens, Diaconia, Kids"
            required
            className="field-input"
          />
          <textarea
            name="description"
            rows={2}
            placeholder="O que esse departamento faz (opcional)"
            className="field-input"
          />
          <button className="btn btn-primary">Criar departamento</button>
        </form>
      )}
    </>
  );
}
