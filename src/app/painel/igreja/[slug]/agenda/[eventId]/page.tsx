import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrgForMember } from "@/lib/site/queries";
import { formatEventDate } from "@/lib/site/schema";
import { EmptyState, Sym, Avatar } from "@/components/ui/primitives";

export default async function InscritosPage({
  params,
}: PageProps<"/painel/igreja/[slug]/agenda/[eventId]">) {
  const { slug, eventId } = await params;
  const ctx = await getOrgForMember(slug);
  if (!ctx) notFound();

  const [{ data: ev }, { data: regs }] = await Promise.all([
    ctx.supabase
      .from("site_events")
      .select("title, event_date, event_time, capacity")
      .eq("id", eventId)
      .eq("org_id", ctx.org.id)
      .maybeSingle(),
    ctx.supabase
      .from("event_registrations")
      .select("id, name, phone, party_size, created_at")
      .eq("event_id", eventId)
      .order("created_at"),
  ]);
  if (!ev) notFound();

  const list = regs ?? [];
  const total = list.reduce((s, r) => s + (r.party_size || 1), 0);

  return (
    <>
      <Link
        href={`/painel/igreja/${slug}/agenda`}
        className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <Sym name="chevron_left" className="text-[16px]" /> Agenda
      </Link>
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
        {ev.title}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {[formatEventDate(ev.event_date), ev.event_time].filter(Boolean).join(" · ")} ·{" "}
        <b>{total}</b> pessoa{total === 1 ? "" : "s"} inscrita{total === 1 ? "" : "s"}
        {ev.capacity != null && ` de ${ev.capacity} vagas`}
      </p>

      <div className="mt-6">
        {list.length === 0 ? (
          <EmptyState icon="how_to_reg">Ninguém inscrito ainda.</EmptyState>
        ) : (
          <ul className="card divide-y divide-border">
            {list.map((r) => (
              <li key={r.id} className="flex items-center gap-3 p-3">
                <Avatar name={r.name} />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {r.name}
                    {r.party_size > 1 && (
                      <span className="text-muted-foreground"> · {r.party_size} pessoas</span>
                    )}
                  </p>
                  {r.phone && (
                    <a
                      href={`https://wa.me/${r.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      {r.phone}
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
