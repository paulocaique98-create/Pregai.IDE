import { getMemberContext } from "@/lib/site/member";
import { getDailyVerse } from "@/lib/verse";
import { Sym } from "@/components/ui/primitives";

export const revalidate = 3600;

export default async function MembroPalavra({
  params,
}: PageProps<"/igreja/[slug]/membro/palavra">) {
  const { slug } = await params;
  await getMemberContext(slug);
  const verse = await getDailyVerse();

  return (
    <div className="space-y-5">
      <h1 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
        <Sym name="auto_stories" className="text-[22px]" /> Palavra do dia
      </h1>

      {verse ? (
        <article className="card p-6">
          {verse.date && (
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {verse.date}
            </p>
          )}
          <blockquote className="mt-4 font-[family-name:var(--font-display)] text-xl leading-relaxed">
            “{verse.text}”
          </blockquote>
          {verse.reference && (
            <p className="mt-4 text-sm font-medium">{verse.reference}</p>
          )}
          <a
            href={verse.url}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground underline"
          >
            Ler no contexto
            <Sym name="open_in_new" className="text-[14px]" />
          </a>
        </article>
      ) : (
        <div className="card p-6 text-sm text-muted-foreground">
          Não foi possível carregar o versículo agora. Tente novamente mais tarde.
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Versículo do dia por{" "}
        <a href="https://www.bibliaon.com/versiculo_do_dia/" target="_blank" rel="noreferrer" className="underline">
          BíbliaOn
        </a>
      </p>
    </div>
  );
}
