import { notFound } from "next/navigation";
import { getOrgForMember } from "@/lib/site/queries";
import { PageHeader, EmptyState, Sym } from "@/components/ui/primitives";
import { createEvent, updateEvent, deleteEvent } from "./actions";

export default async function AgendaPage({
  params,
}: PageProps<"/painel/igreja/[slug]/agenda">) {
  const { slug } = await params;
  const ctx = await getOrgForMember(slug);
  if (!ctx) notFound();

  const { data } = await ctx.supabase
    .from("site_events")
    .select("id, title, event_date, event_time, tag, sort_order, capacity, registration_open")
    .eq("org_id", ctx.org.id)
    .order("event_date", { ascending: true, nullsFirst: false })
    .order("event_time", { ascending: true, nullsFirst: false })
    .order("sort_order");
  const list = data ?? [];

  const { data: taken } = await ctx.supabase.rpc("event_taken_counts", {
    p_org: ctx.org.id,
  });
  const takenBy = new Map(
    ((taken as { event_id: string; taken: number }[]) ?? []).map((t) => [
      t.event_id,
      Number(t.taken),
    ]),
  );

  return (
    <>
      <PageHeader
        kicker="Programação"
        title="Agenda de eventos"
        description="Próximos cultos e eventos especiais. Aparecem na seção “Próximos encontros” do site."
      />

      {list.length === 0 && (
        <div className="mb-6">
          <EmptyState icon="calendar_month">
            Nenhum evento cadastrado. Adicione o primeiro abaixo.
          </EmptyState>
        </div>
      )}

      <div className="space-y-4">
        {list.map((e) => (
          <form key={e.id} action={updateEvent} className="card space-y-3 p-4">
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="id" value={e.id} />
            <div>
              <label className="field-label">Título</label>
              <input name="title" defaultValue={e.title} className="field-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Data</label>
                <input
                  name="event_date"
                  type="date"
                  defaultValue={e.event_date ?? ""}
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label">Horário</label>
                <input
                  name="event_time"
                  defaultValue={e.event_time ?? ""}
                  placeholder="19h"
                  className="field-input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Tag</label>
                <input
                  name="tag"
                  defaultValue={e.tag ?? ""}
                  placeholder="Ex: Especial"
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label">Ordem</label>
                <input
                  name="sort_order"
                  type="number"
                  defaultValue={e.sort_order}
                  className="field-input"
                />
              </div>
            </div>
            <div className="border-t border-border pt-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="registration_open"
                  defaultChecked={(e as { registration_open?: boolean }).registration_open}
                  className="h-4 w-4 accent-[hsl(var(--primary))]"
                />
                Aceitar inscrições
                <span className="text-xs text-muted-foreground">
                  ({takenBy.get(e.id) ?? 0} inscrito{(takenBy.get(e.id) ?? 0) === 1 ? "" : "s"})
                </span>
              </label>
              <input
                name="capacity"
                type="number"
                min="1"
                defaultValue={(e as { capacity?: number | null }).capacity ?? ""}
                placeholder="Limite de vagas (opcional)"
                className="field-input mt-2"
              />
            </div>
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <button className="btn btn-primary">Salvar</button>
              {(takenBy.get(e.id) ?? 0) > 0 && (
                <a
                  href={`/painel/igreja/${slug}/agenda/${e.id}`}
                  className="btn btn-outline"
                >
                  Ver inscritos
                </a>
              )}
              <button formAction={deleteEvent} className="btn btn-ghost text-danger">
                <Sym name="delete" className="text-[16px]" /> Excluir
              </button>
            </div>
          </form>
        ))}
      </div>

      <form
        action={createEvent}
        className="mt-6 space-y-3 rounded-[var(--radius-lg)] border border-dashed border-border p-4"
      >
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Sym name="add_circle" className="text-[18px]" /> Novo evento
        </p>
        <input type="hidden" name="slug" value={slug} />
        <input name="title" placeholder="Nome do evento" required className="field-input" />
        <div className="grid grid-cols-2 gap-3">
          <input name="event_date" type="date" className="field-input" />
          <input name="event_time" placeholder="19h" className="field-input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input name="tag" placeholder="Tag" className="field-input" />
          <input name="sort_order" type="number" defaultValue={list.length} className="field-input" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="registration_open" className="h-4 w-4 accent-[hsl(var(--primary))]" />
          Aceitar inscrições
        </label>
        <input name="capacity" type="number" min="1" placeholder="Limite de vagas (opcional)" className="field-input" />
        <button className="btn btn-primary">Adicionar</button>
      </form>
    </>
  );
}
