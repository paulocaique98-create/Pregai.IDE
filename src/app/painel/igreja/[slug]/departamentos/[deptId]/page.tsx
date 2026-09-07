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
import { AddMemberSearch } from "./AddMemberSearch";

type M = { user_id: string; role: string; status: string; name: string };

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
    <form action={setDeptMember} className="flex-1 sm:flex-none">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="dept_id" value={deptId} />
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="op" value={op} />
      <button
        className={`btn ${primary ? "btn-primary" : "btn-outline"} w-full !px-3 !py-2 text-xs sm:w-auto sm:!py-1.5`}
      >
        {label}
      </button>
    </form>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 p-3 sm:flex-row sm:items-center">
      {children}
    </div>
  );
}

export default async function DepartamentoPage({
  params,
}: PageProps<"/painel/igreja/[slug]/departamentos/[deptId]">) {
  const { slug, deptId } = await params;
  const ctx = await getOrgForPanel(slug);
  if (!ctx) notFound();

  const [{ data: dept }, { data: rawMembers }, { data: orgMembers }] =
    await Promise.all([
      ctx.supabase
        .from("departments")
        .select("id, name, description, allow_join_requests, org_id")
        .eq("id", deptId)
        .eq("org_id", ctx.org.id)
        .maybeSingle(),
      ctx.supabase
        .from("department_members")
        .select("user_id, role, status")
        .eq("department_id", deptId),
      ctx.supabase
        .from("organization_members")
        .select("user_id, role")
        .eq("org_id", ctx.org.id)
        .eq("status", "active"),
    ]);
  if (!dept) notFound();

  const iLead =
    ctx.isStaff ||
    (rawMembers ?? []).some(
      (m) => m.user_id === ctx.user.id && m.role === "leader" && m.status === "active",
    );
  if (!iLead) notFound();

  const orgIds = (orgMembers ?? []).map((o) => o.user_id);
  const { data: profs } = orgIds.length
    ? await ctx.supabase.from("profiles").select("user_id, full_name").in("user_id", orgIds)
    : { data: [] };
  const nameOf = (id: string) =>
    (profs ?? []).find((p) => p.user_id === id)?.full_name || "Sem nome";

  const members: M[] = (rawMembers ?? []).map((m) => ({ ...m, name: nameOf(m.user_id) }));
  const pending = members.filter((m) => m.status === "pending");
  const active = members.filter((m) => m.status === "active");
  const inDept = new Set(members.map((m) => m.user_id));
  const addable = (orgMembers ?? [])
    .filter((o) => !inDept.has(o.user_id))
    .map((o) => ({ user_id: o.user_id, name: nameOf(o.user_id) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <Link
        href={`/painel/igreja/${slug}/departamentos`}
        className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <Sym name="chevron_left" className="text-[16px]" /> Departamentos
      </Link>
      <PageHeader kicker="Departamento" title={dept.name} description={dept.description ?? undefined} />

      <Link
        href={`/painel/igreja/${slug}/departamentos/${deptId}/escalas`}
        className="card mb-6 flex items-center gap-3 p-4 transition-colors hover:border-border-strong"
      >
        <Sym name="event_note" className="text-[22px]" />
        <div className="flex-1">
          <p className="text-sm font-medium">Escalas ministeriais</p>
          <p className="text-xs text-muted-foreground">Montar escala, escalar voluntários, ver confirmações</p>
        </div>
        <Sym name="chevron_right" className="text-muted-foreground" />
      </Link>

      <form action={updateDepartment} className="card mb-8 space-y-3 p-4 sm:p-5">
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
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="allow_join_requests"
            defaultChecked={dept.allow_join_requests}
            className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
          />
          Aceitar pedidos de participação pelo portal do membro
        </label>
        <div className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row">
          <button className="btn btn-primary">Salvar alterações</button>
          {ctx.isStaff && (
            <button formAction={deleteDepartment} className="btn btn-ghost text-danger">
              <Sym name="delete" className="text-[16px]" /> Excluir departamento
            </button>
          )}
        </div>
      </form>

      <section className="mb-10">
        <SectionHeading kicker="Fila" title={`Aguardando aprovação (${pending.length})`} />
        {pending.length === 0 ? (
          <EmptyState icon="inbox">Ninguém aguardando.</EmptyState>
        ) : (
          <div className="card divide-y divide-border">
            {pending.map((m) => (
              <Row key={m.user_id}>
                <div className="flex items-center gap-3 sm:flex-1">
                  <Avatar name={m.name} />
                  <span className="text-sm font-medium">{m.name}</span>
                </div>
                <div className="flex gap-2">
                  <Op slug={slug} deptId={deptId} userId={m.user_id} op="approve" label="Aprovar" primary />
                  <Op slug={slug} deptId={deptId} userId={m.user_id} op="remove" label="Recusar" />
                </div>
              </Row>
            ))}
          </div>
        )}
      </section>

      <section className="mb-10">
        <SectionHeading kicker="Equipe" title={`Membros ativos (${active.length})`} />
        <div className="card divide-y divide-border">
          {active.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">Nenhum membro ativo.</p>
          )}
          {active.map((m) => (
            <Row key={m.user_id}>
              <div className="flex items-center gap-3 sm:flex-1">
                <Avatar name={m.name} />
                <span className="text-sm font-medium">{m.name}</span>
                {m.role === "leader" && <Badge tone="solid">líder</Badge>}
              </div>
              <div className="flex gap-2">
                {m.role === "leader" ? (
                  <Op slug={slug} deptId={deptId} userId={m.user_id} op="demote" label="Tirar liderança" />
                ) : (
                  <Op slug={slug} deptId={deptId} userId={m.user_id} op="promote" label="Tornar líder" />
                )}
                <Op slug={slug} deptId={deptId} userId={m.user_id} op="remove" label="Remover" />
              </div>
            </Row>
          ))}
        </div>
      </section>

      <AddMemberSearch slug={slug} deptId={deptId} people={addable} />
    </>
  );
}
