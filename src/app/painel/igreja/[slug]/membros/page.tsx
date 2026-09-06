import { notFound } from "next/navigation";
import { getOrgForMember } from "@/lib/site/queries";
import { setMemberStatus } from "./actions";

type Row = {
  user_id: string;
  role: string;
  status: string;
  created_at: string;
  profile?: { full_name: string | null; phone: string | null };
};

function Action({
  slug,
  userId,
  status,
  label,
}: {
  slug: string;
  userId: string;
  status: string;
  label: string;
}) {
  return (
    <form action={setMemberStatus} className="inline">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="user_id" value={userId} />
      <button
        name="status"
        value={status}
        className="rounded-[var(--radius)] border border-border px-2 py-1 text-xs text-muted-foreground hover:border-foreground"
      >
        {label}
      </button>
    </form>
  );
}

export default async function MembrosPage({
  params,
}: PageProps<"/painel/igreja/[slug]/membros">) {
  const { slug } = await params;
  const ctx = await getOrgForMember(slug);
  if (!ctx) notFound();

  const { data } = await ctx.supabase
    .from("organization_members")
    .select("user_id, role, status, created_at")
    .eq("org_id", ctx.org.id)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as Row[];
  const ids = rows.map((r) => r.user_id);
  if (ids.length) {
    const { data: profs } = await ctx.supabase
      .from("profiles")
      .select("user_id, full_name, phone")
      .in("user_id", ids);
    const byId = new Map((profs ?? []).map((p) => [p.user_id, p]));
    for (const r of rows) r.profile = byId.get(r.user_id);
  }
  const pending = rows.filter((r) => r.status === "pending");
  const others = rows.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-medium">Aguardando aprovação ({pending.length})</h2>
        {pending.length === 0 && (
          <p className="mt-1 text-sm text-muted-foreground">Nada pendente.</p>
        )}
        <ul className="mt-2 space-y-2">
          {pending.map((r) => (
            <li
              key={r.user_id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius)] border border-border bg-card p-3"
            >
              <span className="text-sm">
                {r.profile?.full_name || "Sem nome"}
                {r.profile?.phone ? ` · ${r.profile.phone}` : ""}
              </span>
              <span className="flex gap-1">
                <Action slug={slug} userId={r.user_id} status="active" label="Aprovar" />
                <Action slug={slug} userId={r.user_id} status="blocked" label="Recusar" />
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-medium">Membros e equipe ({others.length})</h2>
        <ul className="mt-2 space-y-2">
          {others.map((r) => (
            <li
              key={r.user_id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius)] border border-border bg-card p-3"
            >
              <span className="text-sm">
                {r.profile?.full_name || "Sem nome"}
                <span className="text-muted-foreground">
                  {" · "}
                  {r.role}
                  {r.status === "blocked" ? " · bloqueado" : ""}
                </span>
              </span>
              <span className="flex gap-1">
                {r.status === "active" && r.role !== "owner" && (
                  <Action slug={slug} userId={r.user_id} status="blocked" label="Bloquear" />
                )}
                {r.status === "blocked" && (
                  <Action slug={slug} userId={r.user_id} status="active" label="Reativar" />
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
