import { notFound } from "next/navigation";
import { getOrgForMember } from "@/lib/site/queries";
import {
  PageHeader,
  StatTile,
  Badge,
  Avatar,
  EmptyState,
  Sym,
} from "@/components/ui/primitives";
import { setPrayerStatus } from "./actions";

const FLOW: { key: string; label: string }[] = [
  { key: "novo", label: "Novo" },
  { key: "orando", label: "Orando" },
  { key: "atendido", label: "Atendido" },
];

export default async function OracoesPage({
  params,
}: PageProps<"/painel/igreja/[slug]/oracoes">) {
  const { slug } = await params;
  const ctx = await getOrgForMember(slug);
  if (!ctx) notFound();

  const { data: rows } = await ctx.supabase
    .from("prayer_requests")
    .select("id, name, phone, request, is_confidential, status, created_at")
    .eq("org_id", ctx.org.id)
    .order("created_at", { ascending: false });

  const list = rows ?? [];
  const count = (s: string) => list.filter((r) => r.status === s).length;

  return (
    <>
      <PageHeader
        kicker="Cuidado Pastoral"
        title="Pedidos de oração"
        description="Cada pedido enviado pelo site aparece aqui. Marque o andamento para que ninguém fique sem retorno."
      />

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total" value={list.length} icon="inbox" />
        <StatTile label="Novos" value={count("novo")} icon="fiber_new" />
        <StatTile label="Orando" value={count("orando")} icon="favorite" />
        <StatTile label="Atendidos" value={count("atendido")} icon="task_alt" />
      </div>

      {list.length === 0 ? (
        <EmptyState icon="volunteer_activism">
          Nenhum pedido de oração ainda.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {list.map((r) => (
            <li key={r.id} className="card p-4">
              <div className="flex items-start gap-3">
                <Avatar name={r.name || "Anônimo"} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">
                      {r.name || "Anônimo"}
                    </span>
                    {r.is_confidential && <Badge>confidencial</Badge>}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>
                  </div>
                  {r.phone && (
                    <a
                      href={`https://wa.me/${r.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Sym name="chat" className="text-[14px]" />
                      {r.phone}
                    </a>
                  )}
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                    {r.request}
                  </p>
                  <form
                    action={setPrayerStatus}
                    className="mt-3 flex overflow-hidden rounded-[var(--radius)] border border-border"
                  >
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="id" value={r.id} />
                    {FLOW.map((s) => (
                      <button
                        key={s.key}
                        name="status"
                        value={s.key}
                        className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${
                          r.status === s.key
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-surface"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
