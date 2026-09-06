import { notFound } from "next/navigation";
import { getOrgForMember } from "@/lib/site/queries";
import { createMinistry, updateMinistry, deleteMinistry } from "./actions";

const input =
  "w-full rounded-[var(--radius)] border border-border bg-card px-3 py-2 text-sm";

export default async function MinisteriosPage({
  params,
}: PageProps<"/painel/igreja/[slug]/ministerios">) {
  const { slug } = await params;
  const ctx = await getOrgForMember(slug);
  if (!ctx) notFound();

  const { data } = await ctx.supabase
    .from("site_ministries")
    .select("id, title, description, icon, sort_order")
    .eq("org_id", ctx.org.id)
    .order("sort_order");
  const list = data ?? [];

  return (
    <div className="space-y-6">
      <h2 className="font-medium">Ministérios ({list.length})</h2>

      <ul className="space-y-4">
        {list.map((m) => (
          <li key={m.id} className="rounded-[var(--radius)] border border-border bg-card p-4">
            <form action={updateMinistry} className="space-y-2">
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="id" value={m.id} />
              <input name="title" defaultValue={m.title} className={input} />
              <textarea
                name="description"
                defaultValue={(m.description ?? []).join("\n")}
                rows={3}
                placeholder="Uma linha por parágrafo"
                className={input}
              />
              <div className="flex gap-2">
                <input name="icon" defaultValue={m.icon} className={input} placeholder="Ícone" />
                <input
                  name="sort_order"
                  type="number"
                  defaultValue={m.sort_order}
                  className={input}
                  placeholder="Ordem"
                />
              </div>
              <div className="flex gap-2">
                <button className="rounded-[var(--radius)] border border-border px-3 py-1.5 text-sm">
                  Salvar
                </button>
                <button
                  formAction={deleteMinistry}
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
        action={createMinistry}
        className="space-y-2 rounded-[var(--radius)] border border-dashed border-border p-4"
      >
        <p className="text-sm font-medium">Novo ministério</p>
        <input type="hidden" name="slug" value={slug} />
        <input name="title" placeholder="Nome do ministério" required className={input} />
        <textarea name="description" rows={2} placeholder="Descrição (uma linha por parágrafo)" className={input} />
        <div className="flex gap-2">
          <input name="icon" defaultValue="Heart" className={input} />
          <input name="sort_order" type="number" defaultValue={list.length} className={input} />
        </div>
        <button className="rounded-[var(--radius)] bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
          Adicionar
        </button>
      </form>
    </div>
  );
}
