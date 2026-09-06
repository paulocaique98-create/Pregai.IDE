import { notFound } from "next/navigation";
import { getOrgForMember } from "@/lib/site/queries";
import { createEvent, updateEvent, deleteEvent } from "./actions";

const input =
  "w-full rounded-[var(--radius)] border border-border bg-card px-3 py-2 text-sm";

export default async function AgendaPage({
  params,
}: PageProps<"/painel/igreja/[slug]/agenda">) {
  const { slug } = await params;
  const ctx = await getOrgForMember(slug);
  if (!ctx) notFound();

  const { data } = await ctx.supabase
    .from("site_events")
    .select("id, title, event_date, event_time, tag, sort_order")
    .eq("org_id", ctx.org.id)
    .order("sort_order");
  const list = data ?? [];

  return (
    <div className="space-y-6">
      <h2 className="font-medium">Agenda de eventos ({list.length})</h2>

      <ul className="space-y-4">
        {list.map((e) => (
          <li key={e.id} className="rounded-[var(--radius)] border border-border bg-card p-4">
            <form action={updateEvent} className="space-y-2">
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="id" value={e.id} />
              <input name="title" defaultValue={e.title} className={input} />
              <div className="flex gap-2">
                <input name="event_date" type="date" defaultValue={e.event_date ?? ""} className={input} />
                <input name="event_time" defaultValue={e.event_time ?? ""} placeholder="19h" className={input} />
              </div>
              <div className="flex gap-2">
                <input name="tag" defaultValue={e.tag ?? ""} placeholder="Tag (ex: Especial)" className={input} />
                <input name="sort_order" type="number" defaultValue={e.sort_order} className={input} />
              </div>
              <div className="flex gap-2">
                <button className="rounded-[var(--radius)] border border-border px-3 py-1.5 text-sm">
                  Salvar
                </button>
                <button
                  formAction={deleteEvent}
                  className="rounded-[var(--radius)] border border-border px-3 py-1.5 text-sm text-red-600"
                >
                  Excluir
                </button>
              </div>
            </form>
          </li>
        ))}
      </ul>

      <form
        action={createEvent}
        className="space-y-2 rounded-[var(--radius)] border border-dashed border-border p-4"
      >
        <p className="text-sm font-medium">Novo evento</p>
        <input type="hidden" name="slug" value={slug} />
        <input name="title" placeholder="Nome do evento" required className={input} />
        <div className="flex gap-2">
          <input name="event_date" type="date" className={input} />
          <input name="event_time" placeholder="19h" className={input} />
        </div>
        <div className="flex gap-2">
          <input name="tag" placeholder="Tag" className={input} />
          <input name="sort_order" type="number" defaultValue={list.length} className={input} />
        </div>
        <button className="rounded-[var(--radius)] bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
          Adicionar
        </button>
      </form>
    </div>
  );
}
