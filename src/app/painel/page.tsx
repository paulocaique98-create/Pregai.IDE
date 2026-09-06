import Link from "next/link";
import { getMemberships } from "@/lib/auth";
import { signOut } from "@/app/entrar/actions";

export default async function PainelPage() {
  const { admin, memberOf } = await getMemberships();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-2xl">Painel</h1>
        <form action={signOut}>
          <button className="text-sm text-muted-foreground underline">Sair</button>
        </form>
      </div>

      {admin.length === 0 && memberOf.length === 0 && (
        <div className="mt-8 rounded-[var(--radius)] border border-border bg-card p-6">
          <p className="font-medium">Você ainda não administra nenhuma igreja.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Se você é membro, acesse pelo site da sua igreja. Se você lidera uma
            igreja, cadastre-a aqui.
          </p>
          <Link
            href="/onboarding"
            className="mt-4 inline-block rounded-[var(--radius)] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Cadastrar minha igreja
          </Link>
        </div>
      )}

      {admin.length > 0 && (
        <>
          <h2 className="mt-8 text-sm font-medium text-muted-foreground">
            Igrejas que você administra
          </h2>
          <ul className="mt-2 space-y-2">
            {admin.map((m) => (
              <li key={m.organizations.id}>
                <Link
                  href={`/painel/igreja/${m.organizations.slug}`}
                  className="block rounded-[var(--radius)] border border-border bg-card p-4 hover:border-foreground"
                >
                  <p className="font-medium">{m.organizations.name}</p>
                  <p className="text-sm text-muted-foreground">
                    /igreja/{m.organizations.slug} · {m.role} ·{" "}
                    {m.organizations.subscription_status}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {memberOf.length > 0 && (
        <>
          <h2 className="mt-8 text-sm font-medium text-muted-foreground">
            Você é membro de
          </h2>
          <ul className="mt-2 space-y-2">
            {memberOf.map((m) => (
              <li
                key={m.organizations.id}
                className="rounded-[var(--radius)] border border-border bg-card p-4"
              >
                <p className="font-medium">{m.organizations.name}</p>
                <p className="text-sm text-muted-foreground">
                  {m.status === "active"
                    ? "membro ativo"
                    : m.status === "pending"
                      ? "cadastro aguardando aprovação"
                      : "acesso bloqueado"}
                  {" · "}
                  <Link href={`/igreja/${m.organizations.slug}/membro`} className="underline">
                    abrir área do membro
                  </Link>
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
