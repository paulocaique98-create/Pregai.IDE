import Link from "next/link";
import { getMemberContext } from "@/lib/site/member";
import { getEbdQuarter } from "@/lib/ebd";
import { EmptyState, Sym } from "@/components/ui/primitives";

export const revalidate = 86400;

export default async function MembroEbd({
  params,
}: PageProps<"/igreja/[slug]/membro/ebd">) {
  const { slug } = await params;
  const ctx = await getMemberContext(slug);
  const quarter = await getEbdQuarter();

  const noted = new Set<string>();
  if (quarter) {
    const { data } = await ctx.supabase
      .from("lesson_notes")
      .select("lesson_key")
      .eq("org_id", ctx.org.id)
      .eq("user_id", ctx.user.id)
      .neq("content", "");
    for (const r of data ?? []) noted.add(r.lesson_key);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
          <Sym name="school" className="text-[22px]" /> Escola Bíblica
        </h1>
        {quarter && (
          <p className="mt-1 text-sm text-muted-foreground">
            {quarter.quarterTitle} · {quarter.theme}
            {quarter.commentator && ` · ${quarter.commentator}`}
          </p>
        )}
      </div>

      {!quarter ? (
        <EmptyState icon="menu_book">
          Não foi possível carregar as lições agora. Tente novamente mais tarde.
        </EmptyState>
      ) : (
        <ul className="card divide-y divide-border">
          {quarter.lessons.map((l) => (
            <li key={l.key}>
              <Link
                href={`/igreja/${slug}/membro/ebd/${l.key}`}
                className="flex items-center gap-3 p-4 hover:bg-card-hover"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius)] bg-muted text-sm font-semibold tabular-nums">
                  {l.n}
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium">{l.title}</span>
                {noted.has(l.key) && (
                  <Sym name="edit_note" className="text-[18px] text-muted-foreground" />
                )}
                <Sym name="chevron_right" className="text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Lições CPAD · conteúdo de estudantesdabiblia.com.br
      </p>
    </div>
  );
}
