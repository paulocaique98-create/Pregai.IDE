import Link from "next/link";
import { getMemberContext } from "@/lib/site/member";
import { signOut } from "@/app/entrar/actions";
import { Sym } from "@/components/ui/primitives";
import { MemberNav } from "./MemberNav";

export default async function MembroLayout({
  children,
  params,
}: LayoutProps<"/igreja/[slug]/membro">) {
  const { slug } = await params;
  const ctx = await getMemberContext(slug);
  const name = ctx.site.branding?.name || ctx.org.name;

  if (ctx.status === "pending") {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-16">
        <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-tight">
          {name}
        </h1>
        <div className="card mt-6 p-6">
          <Sym name="hourglass_top" className="text-[26px]" />
          <p className="mt-2 font-medium">Cadastro recebido</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Sua solicitação para ser membro está aguardando aprovação da equipe da
            igreja. Você será avisado quando for liberada.
          </p>
        </div>
        <form action={signOut} className="mt-4">
          <button className="btn btn-outline w-full">Sair</button>
        </form>
        <p className="mt-6 text-sm">
          <Link href={`/igreja/${slug}`} className="text-muted-foreground underline">
            ← Voltar ao site da igreja
          </Link>
        </p>
      </main>
    );
  }

  if (ctx.status === "blocked") {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-16 text-center">
        <p className="text-sm text-danger">Seu acesso está bloqueado.</p>
        <form action={signOut} className="mt-4">
          <button className="btn btn-outline">Sair</button>
        </form>
      </main>
    );
  }

  return (
    <div className="min-h-full pb-20">
      <header className="sticky top-0 z-30 flex h-14 items-center border-b border-border bg-background/95 px-4 backdrop-blur">
        <Link
          href={`/igreja/${slug}/membro`}
          className="flex items-center gap-2 font-[family-name:var(--font-display)] text-base font-semibold tracking-tight"
        >
          <Sym name="church" className="text-[20px]" />
          <span className="max-w-[14rem] truncate">{name}</span>
        </Link>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6">{children}</div>

      <MemberNav slug={slug} />
    </div>
  );
}
