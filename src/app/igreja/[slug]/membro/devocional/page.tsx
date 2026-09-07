import { getMemberContext } from "@/lib/site/member";
import { getDailyDevotional } from "@/lib/verse";
import { Sym } from "@/components/ui/primitives";

export const revalidate = 600;

export default async function MembroDevocional({
  params,
}: PageProps<"/igreja/[slug]/membro/devocional">) {
  const { slug } = await params;
  await getMemberContext(slug);
  const devo = await getDailyDevotional();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
          <Sym name="auto_stories" className="text-[22px]" /> Devocional diário
        </h1>
        {devo?.dateLabel && (
          <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
            {devo.dateLabel}
          </p>
        )}
      </div>

      {devo ? (
        <article className="card p-6">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
            {devo.title}
          </h2>
          <div
            className="devocional-body mt-4"
            dangerouslySetInnerHTML={{ __html: devo.bodyHtml }}
          />
          <a
            href={devo.url}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground underline"
          >
            Abrir no BíbliaOn
            <Sym name="open_in_new" className="text-[14px]" />
          </a>
        </article>
      ) : (
        <div className="card p-6 text-sm text-muted-foreground">
          Não foi possível carregar o devocional agora. Tente novamente mais tarde.
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Devocional diário por{" "}
        <a
          href="https://www.bibliaon.com/devocional_diario/"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          BíbliaOn
        </a>
      </p>
    </div>
  );
}
