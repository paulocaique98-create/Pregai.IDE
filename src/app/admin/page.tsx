import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  PageHeader,
  StatTile,
  Badge,
  EmptyState,
  Sym,
} from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const db = createAdminClient();

  const [{ data: orgs }, { data: members }, { data: sites }] = await Promise.all([
    db
      .from("organizations")
      .select("id, name, slug, plan, subscription_status, trial_ends_at, created_at")
      .order("created_at", { ascending: false }),
    db.from("organization_members").select("org_id, status"),
    db.from("site_configs").select("org_id, is_published"),
  ]);

  const list = orgs ?? [];
  const memberCount = (id: string) =>
    (members ?? []).filter((m) => m.org_id === id && m.status === "active").length;
  const published = new Set(
    (sites ?? []).filter((s) => s.is_published).map((s) => s.org_id),
  );

  const trialing = list.filter((o) => o.subscription_status === "trialing").length;
  const active = list.filter((o) => o.subscription_status === "active").length;

  return (
    <>
      <PageHeader
        kicker="Operação da plataforma"
        title="Igrejas"
        description="Todas as igrejas cadastradas no Pregai."
      />

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total" value={list.length} icon="church" />
        <StatTile label="Em trial" value={trialing} icon="hourglass_top" />
        <StatTile label="Assinantes" value={active} icon="paid" />
        <StatTile label="Sites no ar" value={published.size} icon="public" />
      </div>

      {list.length === 0 ? (
        <EmptyState icon="church">Nenhuma igreja cadastrada ainda.</EmptyState>
      ) : (
        <div className="card divide-y divide-border">
          {list.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{o.name}</p>
                <p className="text-xs text-muted-foreground">
                  /igreja/{o.slug} · {memberCount(o.id)} membros · desde{" "}
                  {new Date(o.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <Badge tone={o.subscription_status === "active" ? "solid" : "muted"}>
                {o.subscription_status}
              </Badge>
              {published.has(o.id) ? (
                <Badge tone="outline">no ar</Badge>
              ) : (
                <Badge>rascunho</Badge>
              )}
              <Link
                href={`/igreja/${o.slug}`}
                target="_blank"
                className="btn btn-outline !px-3 !py-1.5 text-xs"
              >
                <Sym name="open_in_new" className="text-[14px]" /> Site
              </Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
