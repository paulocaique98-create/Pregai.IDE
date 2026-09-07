import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublishedSite } from "@/lib/site/queries";
import { isPlatformAdmin } from "@/lib/platform";
import { signOut } from "@/app/entrar/actions";
import { Badge, Sym } from "@/components/ui/primitives";
import { joinDepartment, leaveDepartment } from "./actions";

const STAFF = ["owner", "pastor", "secretaria", "lider"];

export default async function MembroPage({
  params,
}: PageProps<"/igreja/[slug]/membro">) {
  const { slug } = await params;
  const data = await getPublishedSite(slug);
  if (!data) notFound();

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/igreja/${slug}/entrar`);
  const uid = auth.user.id;

  // Equipe / super-admin não fica na área do membro
  if (isPlatformAdmin(auth.user.email)) redirect("/admin");
  const { data: myRole } = await supabase
    .from("organization_members")
    .select("role, status")
    .eq("org_id", data.org.id)
    .eq("user_id", uid)
    .maybeSingle();
  if (myRole?.status === "active" && STAFF.includes(myRole.role)) {
    redirect(`/painel/igreja/${slug}`);
  }
  const { count: leadCount } = await supabase
    .from("department_members")
    .select("department_id", { count: "exact", head: true })
    .eq("org_id", data.org.id)
    .eq("user_id", uid)
    .eq("role", "leader")
    .eq("status", "active");
  if ((leadCount ?? 0) > 0) redirect(`/painel/igreja/${slug}/departamentos`);

  const { data: status } = await supabase.rpc("join_organization", { p_slug: slug });

  let departments: { id: string; name: string; description: string | null }[] = [];
  let mine: Record<string, { role: string; status: string }> = {};
  let leadsAny = false;

  if (status === "active") {
    const [{ data: depts }, { data: dm }] = await Promise.all([
      supabase
        .from("departments")
        .select("id, name, description")
        .eq("org_id", data.org.id)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("department_members")
        .select("department_id, role, status")
        .eq("org_id", data.org.id)
        .eq("user_id", uid),
    ]);
    departments = depts ?? [];
    mine = Object.fromEntries(
      (dm ?? []).map((m) => [m.department_id, { role: m.role, status: m.status }]),
    );
    leadsAny = (dm ?? []).some((m) => m.role === "leader" && m.status === "active");
  }

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-tight">
          {data.org.name}
        </h1>
        <form action={signOut}>
          <button className="btn btn-ghost text-xs">Sair</button>
        </form>
      </div>

      {status === "pending" && (
        <div className="card mt-8 p-6">
          <p className="font-medium">Cadastro recebido!</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Sua solicitação para ser membro está aguardando aprovação da equipe da
            igreja. Você será avisado quando for liberada.
          </p>
        </div>
      )}

      {status === "blocked" && (
        <p className="mt-8 text-sm text-danger">Seu acesso está bloqueado.</p>
      )}

      {status === "active" && (
        <div className="mt-8 space-y-6">
          <p className="text-sm text-muted-foreground">Bem-vindo(a) à área do membro.</p>

          {leadsAny && (
            <Link
              href={`/painel/igreja/${slug}/departamentos`}
              className="card flex items-center gap-3 p-4 transition-colors hover:border-border-strong"
            >
              <Sym name="workspaces" className="text-[22px]" />
              <div className="flex-1">
                <p className="text-sm font-medium">Gerenciar meu departamento</p>
                <p className="text-xs text-muted-foreground">
                  Você é líder de um departamento
                </p>
              </div>
              <Sym name="chevron_right" className="text-muted-foreground" />
            </Link>
          )}

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-semibold">
              Departamentos
            </h2>
            {departments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                A igreja ainda não cadastrou departamentos.
              </p>
            ) : (
              <ul className="space-y-2">
                {departments.map((d) => {
                  const m = mine[d.id];
                  return (
                    <li key={d.id} className="card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{d.name}</p>
                          {d.description && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {d.description}
                            </p>
                          )}
                        </div>
                        {m?.role === "leader" && m.status === "active" && (
                          <Badge tone="solid">líder</Badge>
                        )}
                      </div>
                      <div className="mt-3">
                        {!m && (
                          <form action={joinDepartment.bind(null, slug)}>
                            <input type="hidden" name="dept_id" value={d.id} />
                            <button className="btn btn-outline !px-3 !py-1.5 text-xs">
                              Participar
                            </button>
                          </form>
                        )}
                        {m?.status === "pending" && (
                          <span className="text-xs text-muted-foreground">
                            Solicitação enviada — aguardando o líder aprovar
                          </span>
                        )}
                        {m?.status === "active" && (
                          <form action={leaveDepartment.bind(null, slug)}>
                            <input type="hidden" name="dept_id" value={d.id} />
                            <span className="mr-2 text-xs text-muted-foreground">
                              Você participa deste departamento.
                            </span>
                            <button className="btn btn-ghost !px-2 !py-1 text-xs text-danger">
                              Sair
                            </button>
                          </form>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}

      <p className="mt-10 text-sm">
        <Link href={`/igreja/${slug}`} className="text-muted-foreground underline">
          ← Voltar ao site da igreja
        </Link>
      </p>
    </main>
  );
}
