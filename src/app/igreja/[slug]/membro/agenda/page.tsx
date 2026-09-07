import { getMemberContext } from "@/lib/site/member";
import { formatEventDate } from "@/lib/site/schema";
import { EmptyState, Sym } from "@/components/ui/primitives";

export default async function MembroAgenda({
  params,
}: PageProps<"/igreja/[slug]/membro/agenda">) {
  const { slug } = await params;
  const ctx = await getMemberContext(slug);

  const { data: events } = await ctx.supabase
    .from("site_events")
    .select("id, title, event_date, event_time, tag")
    .eq("org_id", ctx.org.id)
    .order("event_date", { ascending: true, nullsFirst: false })
    .order("sort_order");

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
        <Sym name="calendar_month" className="text-[22px]" /> Agenda
      </h1>

      {(events ?? []).length === 0 ? (
        <EmptyState icon="event_busy">Nenhum evento agendado.</EmptyState>
      ) : (
        <ul className="card divide-y divide-border">
          {(events ?? []).map((e) => (
            <li key={e.id} className="flex items-center gap-3 p-4">
              <div className="flex-1">
                <p className="text-sm font-medium">{e.title}</p>
                <p className="text-xs text-muted-foreground">
                  {[formatEventDate(e.event_date), e.event_time].filter(Boolean).join(" · ") ||
                    "Data a confirmar"}
                </p>
              </div>
              {e.tag && (
                <span className="rounded-[var(--radius)] bg-muted px-2 py-0.5 text-[0.65rem] uppercase text-muted-foreground">
                  {e.tag}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
