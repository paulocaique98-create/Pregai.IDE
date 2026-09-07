import { notFound } from "next/navigation";
import { getOrgForMember } from "@/lib/site/queries";
import { PageHeader, EmptyState, Sym } from "@/components/ui/primitives";
import { createMinistry, updateMinistry, deleteMinistry } from "./actions";

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
    <>
      <PageHeader
        kicker="Vida da igreja"
        title="Ministérios do site"
        description="Lista de vitrine do site público (“Há um lugar para você aqui”). Para equipes que a pessoa participa e o líder gerencia, use Departamentos."
      />

      {list.length === 0 && (
        <div className="mb-6">
          <EmptyState icon="diversity_3">
            Nenhum ministério cadastrado. Adicione o primeiro abaixo.
          </EmptyState>
        </div>
      )}

      <div className="space-y-4">
        {list.map((m) => (
          <form
            key={m.id}
            action={updateMinistry}
            className="card space-y-3 p-4"
          >
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="id" value={m.id} />
            <div>
              <label className="field-label">Nome</label>
              <input name="title" defaultValue={m.title} className="field-input" />
            </div>
            <div>
              <label className="field-label">Descrição</label>
              <textarea
                name="description"
                defaultValue={(m.description ?? []).join("\n")}
                rows={3}
                placeholder="Uma linha por parágrafo"
                className="field-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Ícone</label>
                <input name="icon" defaultValue={m.icon} className="field-input" />
              </div>
              <div>
                <label className="field-label">Ordem</label>
                <input
                  name="sort_order"
                  type="number"
                  defaultValue={m.sort_order}
                  className="field-input"
                />
              </div>
            </div>
            <div className="flex gap-2 border-t border-border pt-3">
              <button className="btn btn-primary">Salvar</button>
              <button formAction={deleteMinistry} className="btn btn-ghost text-danger">
                <Sym name="delete" className="text-[16px]" /> Excluir
              </button>
            </div>
          </form>
        ))}
      </div>

      <form
        action={createMinistry}
        className="mt-6 space-y-3 rounded-[var(--radius-lg)] border border-dashed border-border p-4"
      >
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Sym name="add_circle" className="text-[18px]" /> Novo ministério
        </p>
        <input type="hidden" name="slug" value={slug} />
        <input name="title" placeholder="Nome do ministério" required className="field-input" />
        <textarea
          name="description"
          rows={2}
          placeholder="Descrição (uma linha por parágrafo)"
          className="field-input"
        />
        <div className="grid grid-cols-2 gap-3">
          <input name="icon" defaultValue="Heart" className="field-input" />
          <input name="sort_order" type="number" defaultValue={list.length} className="field-input" />
        </div>
        <button className="btn btn-primary">Adicionar</button>
      </form>
    </>
  );
}
