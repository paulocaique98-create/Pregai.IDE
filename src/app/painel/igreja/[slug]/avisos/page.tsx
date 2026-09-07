import { notFound } from "next/navigation";
import { getOrgForMember } from "@/lib/site/queries";
import { PageHeader, EmptyState, Sym } from "@/components/ui/primitives";
import {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "./actions";

export default async function AvisosPage({
  params,
}: PageProps<"/painel/igreja/[slug]/avisos">) {
  const { slug } = await params;
  const ctx = await getOrgForMember(slug);
  if (!ctx) notFound();

  const { data } = await ctx.supabase
    .from("announcements")
    .select("id, title, body, is_pinned, is_published, created_at")
    .eq("org_id", ctx.org.id)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });
  const list = data ?? [];

  return (
    <>
      <PageHeader
        kicker="Mural"
        title="Avisos"
        description="Recados da igreja para os membros. Aparecem no portal do membro, os fixados primeiro."
      />

      {list.length === 0 && (
        <div className="mb-6">
          <EmptyState icon="campaign">Nenhum aviso publicado ainda.</EmptyState>
        </div>
      )}

      <div className="space-y-4">
        {list.map((a) => (
          <form key={a.id} action={updateAnnouncement} className="card space-y-3 p-4">
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="id" value={a.id} />
            <input name="title" defaultValue={a.title} className="field-input" />
            <textarea
              name="body"
              defaultValue={a.body}
              rows={3}
              placeholder="Detalhes do aviso (opcional)"
              className="field-input"
            />
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="is_pinned" defaultChecked={a.is_pinned} className="h-4 w-4 accent-[hsl(var(--primary))]" />
                Fixar no topo
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="is_published" defaultChecked={a.is_published} className="h-4 w-4 accent-[hsl(var(--primary))]" />
                Publicado
              </label>
            </div>
            <div className="flex gap-2 border-t border-border pt-3">
              <button className="btn btn-primary">Salvar</button>
              <button formAction={deleteAnnouncement} className="btn btn-ghost text-danger">
                <Sym name="delete" className="text-[16px]" /> Excluir
              </button>
            </div>
          </form>
        ))}
      </div>

      <form
        action={createAnnouncement}
        className="mt-6 space-y-3 rounded-[var(--radius-lg)] border border-dashed border-border p-4"
      >
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Sym name="add_circle" className="text-[18px]" /> Novo aviso
        </p>
        <input type="hidden" name="slug" value={slug} />
        <input name="title" placeholder="Título do aviso" required className="field-input" />
        <textarea name="body" rows={2} placeholder="Detalhes (opcional)" className="field-input" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_pinned" className="h-4 w-4 accent-[hsl(var(--primary))]" />
          Fixar no topo
        </label>
        <button className="btn btn-primary">Publicar</button>
      </form>
    </>
  );
}
