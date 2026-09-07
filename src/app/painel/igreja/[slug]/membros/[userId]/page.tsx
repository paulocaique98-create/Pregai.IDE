import Link from "next/link";
import { notFound } from "next/navigation";
import { Sym, Avatar, Badge, SectionHeading } from "@/components/ui/primitives";
import { getMemberDetail } from "@/lib/members/queries";
import { ROLE_LABEL, STATUS_LABEL, type OrgRole } from "@/lib/members/policy";
import { MemberRowActions } from "../MemberRowActions";

const AUDIT_LABEL: Record<string, string> = {
  "member.approve": "Aprovado",
  "member.block": "Bloqueado",
  "member.unblock": "Reativado",
  "member.role_change": "Papel alterado",
  "invite.accept": "Entrou por convite",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{children || "—"}</dd>
    </div>
  );
}

export default async function MemberDetailPage({
  params,
}: PageProps<"/painel/igreja/[slug]/membros/[userId]">) {
  const { slug, userId } = await params;
  const data = await getMemberDetail(slug, userId);
  if (!data) notFound();
  const { ctx, member, audit } = data;
  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : "";

  return (
    <>
      <Link
        href={`/painel/igreja/${slug}/membros`}
        className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <Sym name="chevron_left" className="text-[16px]" /> Membros
      </Link>

      <div className="flex items-start gap-4">
        <Avatar name={member.full_name || member.email || "?"} />
        <div className="min-w-0 flex-1">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
            {member.full_name || "Sem nome"}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge tone={member.role === "owner" ? "solid" : "outline"}>
              {ROLE_LABEL[member.role]}
            </Badge>
            <Badge>{STATUS_LABEL[member.status]}</Badge>
          </div>
        </div>
      </div>

      {member.can_manage && member.role !== "owner" && (
        <div className="mt-4">
          <MemberRowActions
            slug={slug}
            actorRole={ctx.role as OrgRole}
            userId={member.user_id}
            role={member.role}
            status={member.status}
            self={member.user_id === ctx.user.id}
            compact
          />
        </div>
      )}

      <dl className="mt-8 grid gap-4 sm:grid-cols-2">
        <Field label="E-mail">{member.email}</Field>
        <Field label="Telefone">{member.phone}</Field>
        <Field label="Entrou em">{fmt(member.created_at)}</Field>
        <Field label="Aprovado em">{fmt(member.approved_at)}</Field>
        {member.status === "blocked" && (
          <>
            <Field label="Bloqueado em">{fmt(member.blocked_at)}</Field>
            <Field label="Motivo do bloqueio">{member.blocked_reason}</Field>
          </>
        )}
      </dl>

      <section className="mt-10">
        <SectionHeading kicker="Vínculo" title="Departamentos" />
        {member.departments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Não participa de nenhum departamento.</p>
        ) : (
          <ul className="space-y-1.5">
            {member.departments.map((d) => (
              <li key={d.name} className="flex items-center gap-2 text-sm">
                <Sym name="workspaces" className="text-[16px] text-muted-foreground" />
                {d.name}
                {d.role === "leader" && <Badge tone="solid">líder</Badge>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {member.can_manage && (
        <section className="mt-10">
          <SectionHeading kicker="Auditoria" title="Histórico" />
          {audit.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma ação registrada.</p>
          ) : (
            <ul className="space-y-2">
              {audit.map((a) => (
                <li key={a.id} className="flex items-baseline justify-between gap-3 text-sm">
                  <span>
                    {AUDIT_LABEL[a.action] ?? a.action}
                    {a.action === "member.role_change" && a.metadata?.to
                      ? ` → ${ROLE_LABEL[a.metadata.to as keyof typeof ROLE_LABEL] ?? a.metadata.to}`
                      : ""}
                    {a.action === "member.block" && a.metadata?.reason
                      ? ` · ${a.metadata.reason}`
                      : ""}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
