import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublishedSite } from "@/lib/site/queries";
import { signOut } from "@/app/entrar/actions";

export default async function MembroPage({
  params,
}: PageProps<"/igreja/[slug]/membro">) {
  const { slug } = await params;
  const data = await getPublishedSite(slug);
  if (!data) notFound();

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/igreja/${slug}/entrar`);

  const { data: status } = await supabase.rpc("join_organization", { p_slug: slug });

  return (
    <main className="mx-auto w-full max-w-lg flex-1 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-2xl">
          {data.org.name}
        </h1>
        <form action={signOut}>
          <button className="text-sm text-muted-foreground underline">Sair</button>
        </form>
      </div>

      {status === "pending" && (
        <div className="mt-8 rounded-[var(--radius)] border border-border bg-card p-6">
          <p className="font-medium">Cadastro recebido!</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Sua solicitação para ser membro está aguardando aprovação da equipe da
            igreja. Você será avisado quando for liberada.
          </p>
        </div>
      )}

      {status === "active" && (
        <div className="mt-8 space-y-3">
          <p className="text-sm text-muted-foreground">Bem-vindo(a) à área do membro.</p>
          <div className="rounded-[var(--radius)] border border-border bg-card p-4 text-sm text-muted-foreground">
            Em breve: sua escala, conteúdos salvos, avisos e grupos.
          </div>
        </div>
      )}

      {status === "blocked" && (
        <p className="mt-8 text-sm text-red-600">Seu acesso está bloqueado.</p>
      )}

      <p className="mt-8 text-sm">
        <Link href={`/igreja/${slug}`} className="underline">
          ← Voltar ao site da igreja
        </Link>
      </p>
    </main>
  );
}
