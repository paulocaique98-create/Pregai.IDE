import Link from "next/link";
import { notFound } from "next/navigation";
import {
  PageHeader,
  SectionHeading,
  StatTile,
  Avatar,
  Badge,
  EmptyState,
  Sym,
} from "@/components/ui/primitives";
import { appUrl } from "@/lib/site/urls";
import { listMembers, PAGE_SIZE } from "@/lib/members/queries";
import { ROLE_LABEL, STATUS_LABEL, type MemberStatus, type OrgRole } from "@/lib/members/policy";
import { MembersToolbar } from "./MembersToolbar";
import { MemberRowActions } from "./MemberRowActions";
import { InvitePanel, type InviteView } from "./InvitePanel";

export default async function MembrosPage({
  params,
  searchParams,
}: PageProps<"/painel/igreja/[slug]/membros">) {
  const { slug } = await params;
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");

  const page = Math.max(1, Number(get("page")) || 1);
  const data = await listMembers(slug, {
    search: get("q"),
    status: get("status") as MemberStatus | "",
    role: get("role") as OrgRole | "",
    sort: (get("sort") as "recent" | "name" | "oldest") || "recent",
    page,
  });
  if (!data) notFound();

  const { ctx, result } = data;
  const meId = ctx.user.id;
  const actorRole = result.actor_role;
  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  // contagens por status (baratas, head+count) — só para a equipe
  let counts: Record<MemberStatus, number> | null = null;
  let invites: InviteView[] = [];
  if (result.can_manage) {
    const [pend, act, blk, inv] = await Promise.all([
      ctx.supabase
        .from("organization_members")
        .select("user_id", { count: "exact", head: true })
        .eq("org_id", ctx.org.id)
        .eq("status", "pending"),
      ctx.supabase
        .from("organization_members")
        .select("user_id", { count: "exact", head: true })
        .eq("org_id", ctx.org.id)
        .eq("status", "active"),
      ctx.supabase
        .from("organization_members")
        .select("user_id", { count: "exact", head: true })
        .eq("org_id", ctx.org.id)
        .eq("status", "blocked"),
      ctx.supabase
        .from("organization_invites")
        .select("id, token, label, role, auto_approve, expires_at, used_at, revoked_at")
        .eq("org_id", ctx.org.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    counts = {
      pending: pend.count ?? 0,
      active: act.count ?? 0,
      blocked: blk.count ?? 0,
    };
    invites = (inv.data ?? []) as InviteView[];
  }

  const qsFor = (p: number) => {
    const next = new URLSearchParams();
    for (const k of ["q", "status", "role", "sort"]) if (get(k)) next.set(k, get(k));
    if (p > 1) next.set("page", String(p));
    const s = next.toString();
    return s ? `?${s}` : "";
  };

  return (
    <>
      <PageHeader
        kicker="Comunidade"
        title="Membros e equipe"
        description={
          result.scoped
            ? "Membros dos departamentos que você lidera (somente leitura)."
            : "Aprove quem se cadastrou pelo site, gerencie papéis e o acesso da equipe."
        }
      />

      {counts && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          <StatTile label="Aguardando" value={counts.pending} icon="hourglass_top" />
          <StatTile label="Ativos" value={counts.active} icon="verified" />
          <StatTile label="Bloqueados" value={counts.blocked} icon="block" />
        </div>
      )}

      {result.can_manage && (
        <section className="mb-10">
          <SectionHeading kicker="Convites" title="Links de convite" aside="Expiram em 7 dias · uso único" />
          <InvitePanel
            slug={slug}
            appUrl={appUrl()}
            invites={invites}
            canInviteStaff={result.can_role}
            canAutoApprove={result.can_role}
          />
        </section>
      )}

      <section>
        <SectionHeading
          kicker="Diretório"
          title="Membros"
          aside={`${result.total} ${result.total === 1 ? "pessoa" : "pessoas"}`}
        />

        <MembersToolbar canFilterRole={!result.scoped} />

        {result.rows.length === 0 ? (
          <EmptyState icon="group">
            {get("q") || get("status") || get("role")
              ? "Nenhum membro corresponde ao filtro."
              : "Nenhum membro ainda."}
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {result.rows.map((m) => (
              <li key={m.user_id} className="card p-4">
                <div className="flex items-start gap-3">
                  <Avatar name={m.full_name || m.email || "?"} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/painel/igreja/${slug}/membros/${m.user_id}`}
                        className="text-sm font-semibold hover:underline"
                      >
                        {m.full_name || "Sem nome"}
                      </Link>
                      {m.role !== "membro" && (
                        <Badge tone={m.role === "owner" ? "solid" : "outline"}>
                          {ROLE_LABEL[m.role]}
                        </Badge>
                      )}
                      {m.status !== "active" && (
                        <Badge>{STATUS_LABEL[m.status]}</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {[m.email, m.phone].filter(Boolean).join(" · ") || "sem contato"}
                    </p>
                    {m.departments.length > 0 && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {m.departments.join(", ")}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      entrou em {new Date(m.created_at).toLocaleDateString("pt-BR")}
                    </p>

                    {!result.scoped && (
                      <div className="mt-3">
                        <MemberRowActions
                          slug={slug}
                          actorRole={actorRole}
                          userId={m.user_id}
                          role={m.role}
                          status={m.status}
                          self={m.user_id === meId}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between text-sm">
            <Link
              href={qsFor(page - 1) || "?"}
              aria-disabled={page <= 1}
              className={`btn btn-outline !px-3 !py-1.5 text-xs ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}
            >
              <Sym name="chevron_left" className="text-[16px]" /> Anterior
            </Link>
            <span className="text-xs text-muted-foreground">
              Página {page} de {totalPages}
            </span>
            <Link
              href={qsFor(page + 1)}
              aria-disabled={page >= totalPages}
              className={`btn btn-outline !px-3 !py-1.5 text-xs ${page >= totalPages ? "pointer-events-none opacity-40" : ""}`}
            >
              Próxima <Sym name="chevron_right" className="text-[16px]" />
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
