import { getMemberContext } from "@/lib/site/member";
import { EmptyState, Sym } from "@/components/ui/primitives";

export default async function MembroAvisos({
  params,
}: PageProps<"/igreja/[slug]/membro/avisos">) {
  const { slug } = await params;
  const ctx = await getMemberContext(slug);

  const { data } = await ctx.supabase
    .from("announcements")
    .select("id, title, body, is_pinned, created_at")
    .eq("org_id", ctx.org.id)
    .eq("is_published", true)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });
  const list = data ?? [];

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
        <Sym name="campaign" className="text-[22px]" /> Avisos
      </h1>

      {list.length === 0 ? (
        <EmptyState icon="notifications">Nenhum aviso no momento.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {list.map((a) => (
            <li key={a.id} className="card p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  {a.is_pinned && <Sym name="push_pin" className="text-[14px]" />}
                  {a.title}
                </p>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(a.created_at).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
              </div>
              {a.body && (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {a.body}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
