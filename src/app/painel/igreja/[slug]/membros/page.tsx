import { notFound } from "next/navigation";
import { getOrgForMember } from "@/lib/site/queries";
import {
  PageHeader,
  SectionHeading,
  StatTile,
  Avatar,
  Badge,
  EmptyState,
} from "@/components/ui/primitives";
import { setMemberStatus } from "./actions";

type Row = {
  user_id: string;
  role: string;
  status: string;
  created_at: string;
  profile?: { full_name: string | null; phone: string | null };
};

function Action({
  slug,
  userId,
  status,
  label,
  primary,
}: {
  slug: string;
  userId: string;
  status: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <form action={setMemberStatus} className="inline">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="user_id" value={userId} />
      <button
        name="status"
        value={status}
        className={`btn ${primary ? "btn-primary" : "btn-outline"} !px-3 !py-1.5 text-xs`}
      >
        {label}
      </button>
    </form>
  );
}

export default async function MembrosPage({
  params,
}: PageProps<"/painel/igreja/[slug]/membros">) {
  const { slug } = await params;
  const ctx = await getOrgForMember(slug);
  if (!ctx) notFound();

  const { data } = await ctx.supabase
    .from("organization_members")
    .select("user_id, role, status, created_at")
    .eq("org_id", ctx.org.id)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as Row[];
  const ids = rows.map((r) => r.user_id);
  if (ids.length) {
    const { data: profs } = await ctx.supabase
      .from("profiles")
      .select("user_id, full_name, phone")
      .in("user_id", ids);
    const byId = new Map((profs ?? []).map((p) => [p.user_id, p]));
    for (const r of rows) r.profile = byId.get(r.user_id);
  }

  const pending = rows.filter((r) => r.status === "pending");
  const active = rows.filter((r) => r.status === "active");
  const blocked = rows.filter((r) => r.status === "blocked");

  return (
    <>
      <PageHeader
        kicker="Comunidade"
        title="Membros e equipe"
        description="Aprove quem se cadastrou pelo site e gerencie o acesso da equipe."
      />

      <div className="mb-8 grid grid-cols-3 gap-3">
        <StatTile label="Aguardando" value={pending.length} icon="hourglass_top" />
        <StatTile label="Ativos" value={active.length} icon="verified" />
        <StatTile label="Bloqueados" value={blocked.length} icon="block" />
      </div>

      <section className="mb-10">
        <SectionHeading kicker="Fila de aprovação" title="Aguardando aprovação" />
        {pending.length === 0 ? (
          <EmptyState icon="inbox">Nada pendente no momento.</EmptyState>
        ) : (
          <ul className="space-y-2">
            {pending.map((r) => (
              <li
                key={r.user_id}
                className="card flex flex-wrap items-center gap-3 p-3"
              >
                <Avatar name={r.profile?.full_name || "?"} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {r.profile?.full_name || "Sem nome"}
                  </p>
                  {r.profile?.phone && (
                    <p className="text-xs text-muted-foreground">{r.profile.phone}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Action slug={slug} userId={r.user_id} status="active" label="Aprovar" primary />
                  <Action slug={slug} userId={r.user_id} status="blocked" label="Recusar" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionHeading
          kicker="Diretório"
          title="Membros e equipe"
          aside={`${active.length + blocked.length} pessoas`}
        />
        <div className="card divide-y divide-border">
          {[...active, ...blocked].map((r) => (
            <div key={r.user_id} className="flex flex-wrap items-center gap-3 p-3">
              <Avatar name={r.profile?.full_name || "?"} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {r.profile?.full_name || "Sem nome"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.profile?.phone || "—"}
                </p>
              </div>
              <Badge tone={r.role === "owner" ? "solid" : "outline"}>{r.role}</Badge>
              {r.status === "blocked" && <Badge>bloqueado</Badge>}
              <div className="flex gap-2">
                {r.status === "active" && r.role !== "owner" && (
                  <Action slug={slug} userId={r.user_id} status="blocked" label="Bloquear" />
                )}
                {r.status === "blocked" && (
                  <Action slug={slug} userId={r.user_id} status="active" label="Reativar" primary />
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
