import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrgForMember } from "@/lib/site/queries";
import { PageHeader, EmptyState, Badge, Sym } from "@/components/ui/primitives";
import { canManageAnnouncements, type OrgRole } from "@/lib/announcements/policy";
import { AnnouncementsManager, type Aviso } from "./AnnouncementsManager";

const PAGE_SIZE = 20;

export default async function AvisosPage({
  params,
  searchParams,
}: PageProps<"/painel/igreja/[slug]/avisos">) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : "1") || 1);
  const from = (page - 1) * PAGE_SIZE;

  const ctx = await getOrgForMember(slug);
  if (!ctx) notFound();
  const canManage = canManageAnnouncements(ctx.role as OrgRole);

  const { data, count } = await ctx.supabase
    .from("announcements")
    .select("id, title, body, is_pinned, is_published, created_at", { count: "exact" })
    .eq("org_id", ctx.org.id)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const rows = (data ?? []).map((r) => ({ ...r, body: r.body ?? "" })) as Aviso[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <>
      <PageHeader
        kicker="Mural"
        title="Avisos"
        description={
          canManage
            ? "Recados da igreja para os membros. Aparecem no portal do membro, os fixados primeiro."
            : "Recados da igreja para os membros (somente leitura)."
        }
      />

      {!canManage && (
        <div className="card mb-6 flex gap-3 p-4 text-sm text-muted-foreground">
          <Sym name="info" className="shrink-0 text-[18px]" />
          <p>
            A criação e a edição de avisos são feitas pelo proprietário, pastor ou
            secretaria. Você pode acompanhar aqui o que foi publicado.
          </p>
        </div>
      )}

      {canManage ? (
        <AnnouncementsManager slug={slug} rows={rows} />
      ) : rows.length === 0 ? (
        <EmptyState icon="campaign">Nenhum aviso publicado ainda.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {rows.map((a) => (
            <li key={a.id} className="card p-4">
              <div className="flex flex-wrap items-center gap-2">
                {a.is_pinned && <Badge tone="outline">fixado</Badge>}
                {!a.is_published && <Badge>rascunho</Badge>}
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(a.created_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold">{a.title}</p>
              {a.body && (
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {a.body}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm">
          <Link
            href={page > 1 ? `?page=${page - 1}` : "?"}
            aria-disabled={page <= 1}
            className={`btn btn-outline !px-3 !py-1.5 text-xs ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}
          >
            <Sym name="chevron_left" className="text-[16px]" /> Anterior
          </Link>
          <span className="text-xs text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Link
            href={`?page=${page + 1}`}
            aria-disabled={page >= totalPages}
            className={`btn btn-outline !px-3 !py-1.5 text-xs ${page >= totalPages ? "pointer-events-none opacity-40" : ""}`}
          >
            Próxima <Sym name="chevron_right" className="text-[16px]" />
          </Link>
        </div>
      )}
    </>
  );
}
