import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedSite } from "@/lib/site/queries";

export async function generateMetadata({
  params,
}: PageProps<"/igreja/[slug]/instalar">): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublishedSite(slug);
  return { title: data ? `Instalar o app · ${data.org.name}` : "Instalar" };
}

export default async function InstalarPage({
  params,
}: PageProps<"/igreja/[slug]/instalar">) {
  const { slug } = await params;
  const data = await getPublishedSite(slug);
  if (!data) notFound();
  const name = data.site.branding?.name || data.org.name;

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-6 py-16">
      <Link href={`/igreja/${slug}`} className="text-sm text-muted-foreground underline">
        ← Voltar
      </Link>
      <h1 className="mt-6 font-[family-name:var(--font-display)] text-3xl">
        Instale o app da {name}
      </h1>
      <p className="mt-2 text-muted-foreground">
        Adicione o ícone da igreja à tela inicial do celular e abra como um
        aplicativo — sem baixar nada da loja.
      </p>

      <section className="mt-8 space-y-2">
        <h2 className="font-medium">No iPhone (Safari)</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Toque no botão Compartilhar (quadrado com seta para cima).</li>
          <li>Escolha “Adicionar à Tela de Início”.</li>
          <li>Confirme em “Adicionar”.</li>
        </ol>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="font-medium">No Android (Chrome)</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Toque no menu (três pontos) no canto superior direito.</li>
          <li>Escolha “Instalar aplicativo” ou “Adicionar à tela inicial”.</li>
          <li>Confirme.</li>
        </ol>
      </section>
    </main>
  );
}
