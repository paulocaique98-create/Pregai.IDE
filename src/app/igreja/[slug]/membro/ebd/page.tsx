import { getMemberContext } from "@/lib/site/member";
import { EmptyState, Sym } from "@/components/ui/primitives";

export default async function MembroEbd({
  params,
}: PageProps<"/igreja/[slug]/membro/ebd">) {
  const { slug } = await params;
  await getMemberContext(slug);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
          <Sym name="school" className="text-[22px]" /> Escola Bíblica
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lições, materiais e classes da EBD.
        </p>
      </div>

      <EmptyState icon="menu_book">
        Os conteúdos da Escola Bíblica Dominical aparecerão aqui em breve.
      </EmptyState>
    </div>
  );
}
