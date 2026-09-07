import { notFound } from "next/navigation";
import { getOrgForMember } from "@/lib/site/queries";
import {
  PageHeader,
  StatTile,
  Avatar,
  EmptyState,
  Sym,
} from "@/components/ui/primitives";
import { formatEventDate } from "@/lib/site/schema";
import { setVisitorStatus } from "./actions";

const FLOW = [
  { key: "novo", label: "Novo" },
  { key: "contatado", label: "Contatado" },
  { key: "compareceu", label: "Compareceu" },
];

export default async function VisitantesPage({
  params,
}: PageProps<"/painel/igreja/[slug]/visitantes">) {
  const { slug } = await params;
  const ctx = await getOrgForMember(slug);
  if (!ctx) notFound();

  const { data } = await ctx.supabase
    .from("visitor_checkins")
    .select("id, name, phone, planned_date, party_size, kids_ages, status, created_at")
    .eq("org_id", ctx.org.id)
    .order("created_at", { ascending: false });
  const list = (data ?? []).filter((v) => v.status !== "arquivado");
  const count = (s: string) => list.filter((v) => v.status === s).length;

  return (
    <>
      <PageHeader
        kicker="Acolhimento"
        title="Visitantes"
        description="Quem avisou pelo site que pretende visitar. Fale com cada um pelo WhatsApp."
      />

      <div className="mb-8 grid grid-cols-3 gap-3">
        <StatTile label="Novos" value={count("novo")} icon="fiber_new" />
        <StatTile label="Contatados" value={count("contatado")} icon="chat" />
        <StatTile label="Compareceram" value={count("compareceu")} icon="task_alt" />
      </div>

      {list.length === 0 ? (
        <EmptyState icon="waving_hand">Nenhum visitante avisou ainda.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {list.map((v) => (
            <li key={v.id} className="card p-4">
              <div className="flex items-start gap-3">
                <Avatar name={v.name} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{v.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[
                      v.planned_date && `pretende vir ${formatEventDate(v.planned_date)}`,
                      v.party_size && `${v.party_size} pessoa${v.party_size > 1 ? "s" : ""}`,
                      v.kids_ages && `crianças: ${v.kids_ages}`,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "sem detalhes"}
                  </p>
                  {v.phone && (
                    <a
                      href={`https://wa.me/${v.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Sym name="chat" className="text-[14px]" /> {v.phone}
                    </a>
                  )}
                  <form
                    action={setVisitorStatus}
                    className="mt-3 inline-flex overflow-hidden rounded-[var(--radius)] border border-border"
                  >
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="id" value={v.id} />
                    {FLOW.map((s) => (
                      <button
                        key={s.key}
                        name="status"
                        value={s.key}
                        className={`px-3 py-1.5 text-xs font-medium ${
                          v.status === s.key
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-surface"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                    <button
                      name="status"
                      value="arquivado"
                      className="px-3 py-1.5 text-xs text-muted-foreground hover:bg-surface"
                    >
                      Arquivar
                    </button>
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
