import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrgForPanel } from "@/lib/site/queries";
import {
  PageHeader,
  SectionHeading,
  Avatar,
  Badge,
  EmptyState,
  Sym,
} from "@/components/ui/primitives";
import { updateDepartment, deleteDepartment, setDeptMember } from "../actions";

type M = {
  user_id: string;
  role: string;
  status: string;
  name: string;
};

function Op({
  slug,
  deptId,
  userId,
  op,
  label,
  primary,
}: {
  slug: string;
  deptId: string;
  userId: string;
  op: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <form action={setDeptMember} className="inline">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="dept_id" value={deptId} />
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="op" value={op} />
      <button className={`btn ${primary ? "btn-primary" : "btn-outline"} !px-3 !py-1.5 text-xs`}>
        {label}
      </button>
    </form>
  );
}

export default async function DepartamentoPage({
  params,
}: PageProps<"/painel/igreja/[slug]/departamentos/[deptId]">) {
  const { slug, deptId } = await params;
  const ctx = await getOrgForPanel(slug);
  if (!ctx) notFound();

  const { data: dept } = await ctx.supabase
    .from("departments")
    .select("id, name, description, allow_join_requests, org_id")
    .eq("id", deptId)
    .eq("org_id", ctx.org.id)
    .maybeSingle();
  if (!dept) notFound();

  const { data: rawMembers } = await ctx.supabase
    .from("department_members")
    .select("user_id, role, status")
    .eq("department_id", deptId);

  const iLead =
    (rawMembers ?? []).some(
      (m) => m.user_id === ctx.user.id && m.role === "leader" && m.status === "active",
    ) || ctx.isStaff;
  if (!iLead) notFound();

  // nomes de todos os membros da igreja (para exibir + para o "adicionar")
  const { data: orgMembers } = await ctx.supabase
    .from("organization_members")
    .select("user_id, role")
    .eq("org_id", ctx.org.id)
    .eq("status", "active");
  const orgIds = (orgMembers ?? []).map((o) => o.user_id);
  const { data: profs } = orgIds.length
    ? await ctx.supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", orgIds)
    : { data: [] };
  const nameOf = (id: string) =>
    (profs ?? []).find((p) => p.user_id === id)?.full_name || "Sem nome";

  const members: M[] = (rawMembers ?? []).map((m) => ({
    ...m,
    name: nameOf(m.user_id),
  }));
  const pending = members.filter((m) => m.status === "pending");
  const active = members.filter((m) => m.status === "active");
  const inDept = new Set(members.map((m) => m.user_id));
  const addable = (orgMembers ?? []).filter((o) => !inDept.has(o.user_id));

  return (
    <>
      <Link
        href={`/painel/igreja/${slug}/departamentos`}
        className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <Sym name="chevron_left" className="text-[16px]" /> Departamentos
      </Link>
      <PageHeader
        kicker="Departamento"
        title={dept.name}
        description={dept.description ?? undefined}
      />

      {/* Config */}
      <form action={updateDepartment} className="card mb-8 space-y-3 p-5">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="dept_id" value={deptId} />
        <div>
          <label className="field-label">Nome</label>
          <input name="name" defaultValue={dept.name} className="field-input" />
        </div>
        <div>
          <label className="field-label">Descrição</label>
          <textarea
            name="description"
            defaultValue={dept.description ?? ""}
            rows={2}
            className="field-input"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="allow_join_requests"
            defaultChecked={dept.allow_join_requests}
            className="h-4 w-4 accent-[hsl(var(--primary))]"
          />
          Aceitar pedidos de participação pelo portal do membro
        </label>
        <div className="flex gap-2 border-t border-border pt-3">
          <button className="btn btn-primary">Salvar</button>
          {ctx.isStaff && (
            <button formAction={deleteDepartment} className="btn btn-ghost text-danger">
              <Sym name="delete" className="text-[16px]" /> Excluir departamento
            </button>
          )}
        </div>
      </form>

      {/* Pendentes */}
      <section className="mb-10">
        <SectionHeading kicker="Fila" title={`Aguardando aprovação (${pending.length})`} />
        {pending.length === 0 ? (
          <EmptyState icon="inbox">Ninguém aguardando.</EmptyState>
        ) : (
          <ul className="space-y-2">
            {pending.map((m) => (
              <li key={m.user_id} className="card flex flex-wrap items-center gap-3 p-3">
                <Avatar name={m.name} />
                <span className="flex-1 text-sm font-medium">{m.name}</span>
                <Op slug={slug} deptId={deptId} userId={m.user_id} op="approve" label="Aprovar" primary />
                <Op slug={slug} deptId={deptId} userId={m.user_id} op="remove" label="Recusar" />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Equipe */}
      <section className="mb-10">
        <SectionHeading kicker="Equipe" title={`Membros ativos (${active.length})`} />
        <div className="card divide-y divide-border">
          {active.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">Nenhum membro ativo.</p>
          )}
          {active.map((m) => (
            <div key={m.user_id} className="flex flex-wrap items-center gap-3 p-3">
              <Avatar name={m.name} />
              <span className="flex-1 text-sm font-medium">{m.name}</span>
              {m.role === "leader" && <Badge tone="solid">líder</Badge>}
              {m.role === "leader" ? (
                <Op slug={slug} deptId={deptId} userId={m.user_id} op="demote" label="Tirar liderança" />
              ) : (
                <Op slug={slug} deptId={deptId} userId={m.user_id} op="promote" label="Tornar líder" />
              )}
              <Op slug={slug} deptId={deptId} userId={m.user_id} op="remove" label="Remover" />
            </div>
          ))}
        </div>
      </section>

      {/* Adicionar */}
      {addable.length > 0 && (
        <section>
          <SectionHeading kicker="Adicionar" title="Incluir membro da igreja" />
          <div className="card divide-y divide-border">
            {addable.map((o) => (
              <div key={o.user_id} className="flex items-center gap-3 p-3">
                <Avatar name={nameOf(o.user_id)} />
                <span className="flex-1 text-sm">{nameOf(o.user_id)}</span>
                <Op slug={slug} deptId={deptId} userId={o.user_id} op="add" label="Adicionar" />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
