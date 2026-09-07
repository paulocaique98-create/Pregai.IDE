import Link from "next/link";
import { getMemberContext } from "@/lib/site/member";
import { brandStyle } from "@/lib/site/color";
import { signOut } from "@/app/entrar/actions";
import { Sym } from "@/components/ui/primitives";
import { MemberNav } from "./MemberNav";
import { confirmJoinChurch } from "./actions";

export default async function MembroLayout({
  children,
  params,
}: LayoutProps<"/igreja/[slug]/membro">) {
  const { slug } = await params;
  const ctx = await getMemberContext(slug);
  const name = ctx.site.branding?.name || ctx.org.name;

  if (ctx.status === "needs_confirm") {
    const other = ctx.otherOrgs?.find((o) => o.status === "active") ?? ctx.otherOrgs?.[0];
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-16">
        <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-tight">
          {name}
        </h1>
        <div className="card mt-6 p-6">
          <Sym name="help" className="text-[26px]" />
          <p className="mt-2 font-medium">Você chegou na área de membros da {name}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {other
              ? `Você já participa da ${other.name}. Deseja também se cadastrar como membro da ${name}?`
              : `Deseja se cadastrar como membro da ${name}?`}
          </p>
          <form action={confirmJoinChurch.bind(null, slug)} className="mt-4">
            <button className="btn btn-primary w-full">
              Sim, quero participar da {name}
            </button>
          </form>
          {other && (
            <Link
              href={`/igreja/${other.slug}/membro`}
              className="btn btn-outline mt-2 w-full"
            >
              Ir para a {other.name}
            </Link>
          )}
        </div>
        <form action={signOut} className="mt-4">
          <button className="btn btn-ghost w-full text-sm">Sair</button>
        </form>
      </main>
    );
  }

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
    <div className="min-h-full pb-20" style={brandStyle(ctx.site.branding?.primaryColor)}>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur">
        <Link
          href={`/igreja/${slug}/membro`}
          className="flex items-center gap-2 font-[family-name:var(--font-display)] text-base font-semibold tracking-tight"
        >
          <Sym name="church" className="text-[20px]" />
          <span className="max-w-[12rem] truncate">{name}</span>
        </Link>
        {(ctx.activeMemberships ?? 0) > 1 && (
          <Link href="/painel" className="text-xs text-muted-foreground underline">
            trocar igreja
          </Link>
        )}
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6">{children}</div>

      <MemberNav slug={slug} />
    </div>
  );
}
