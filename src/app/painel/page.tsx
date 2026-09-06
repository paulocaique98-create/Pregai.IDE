import { redirect } from "next/navigation";
import { getMyOrgs } from "@/lib/auth";
import { signOut } from "@/app/entrar/actions";

export default async function PainelPage() {
  const orgs = await getMyOrgs();
  if (orgs.length === 0) redirect("/onboarding");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-2xl">Painel</h1>
        <form action={signOut}>
          <button className="text-sm text-muted-foreground underline">Sair</button>
        </form>
      </div>

      <ul className="mt-6 space-y-2">
        {orgs.map((m) => {
          const org = m.organizations as unknown as {
            id: string;
            name: string;
            slug: string;
            plan: string;
            subscription_status: string;
          };
          return (
            <li
              key={org.id}
              className="rounded-[var(--radius)] border border-border bg-card p-4"
            >
              <p className="font-medium">{org.name}</p>
              <p className="text-sm text-muted-foreground">
                /igreja/{org.slug} · {m.role} · {org.subscription_status}
              </p>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
