import Link from "next/link";
import { getMemberships } from "@/lib/auth";
import { signOut } from "@/app/entrar/actions";
import { Kicker, Badge, Sym } from "@/components/ui/primitives";

export default async function PainelPage() {
  const { admin, memberOf } = await getMemberships();

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <span className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
            <Sym name="church" className="text-[22px]" /> Pregai
          </span>
          <form action={signOut}>
            <button className="btn btn-ghost">Sair</button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10">
        {admin.length === 0 && memberOf.length === 0 && (
          <div className="card p-8 text-center">
            <Sym name="add_home_work" className="text-[32px] text-muted-foreground" />
            <p className="mt-2 font-medium">Você ainda não administra nenhuma igreja.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Se você é membro, acesse pelo site da sua igreja. Se você lidera
              uma, cadastre-a aqui.
            </p>
            <Link href="/onboarding" className="btn btn-primary mt-5">
              Cadastrar minha igreja
            </Link>
          </div>
        )}

        {admin.length > 0 && (
          <section>
            <Kicker>Administração</Kicker>
            <h1 className="mb-4 mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
              Suas igrejas
            </h1>
            <div className="grid gap-3 sm:grid-cols-2">
              {admin.map((m) => (
                <Link
                  key={m.organizations.id}
                  href={`/painel/igreja/${m.organizations.slug}`}
                  className="card group p-5 transition-colors hover:border-border-strong"
                >
                  <div className="flex items-start justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius)] bg-primary text-primary-foreground">
                      <Sym name="church" className="text-[20px]" />
                    </span>
                    <Sym
                      name="arrow_outward"
                      className="text-[18px] text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    />
                  </div>
                  <p className="mt-3 font-medium">{m.organizations.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    /igreja/{m.organizations.slug}
                  </p>
                  <div className="mt-3">
                    <Badge tone="outline">{m.role}</Badge>{" "}
                    <Badge>{m.organizations.subscription_status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {memberOf.length > 0 && (
          <section className="mt-10">
            <Kicker>Sou membro</Kicker>
            <h2 className="mb-4 mt-1 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
              Igrejas que participo
            </h2>
            <ul className="space-y-2">
              {memberOf.map((m) => (
                <li key={m.organizations.id} className="card flex items-center gap-3 p-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                    <Sym name="person" className="text-[18px]" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{m.organizations.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.status === "active"
                        ? "membro ativo"
                        : m.status === "pending"
                          ? "aguardando aprovação"
                          : "acesso bloqueado"}
                    </p>
                  </div>
                  <Link
                    href={`/igreja/${m.organizations.slug}/membro`}
                    className="btn btn-outline !px-3 !py-1.5 text-xs"
                  >
                    Abrir
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
