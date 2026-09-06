import { notFound } from "next/navigation";
import { getOrgForMember } from "@/lib/site/queries";
import { setPrayerStatus } from "./actions";

const STATUSES = ["novo", "orando", "atendido"] as const;

export default async function OracoesPage({
  params,
}: PageProps<"/painel/igreja/[slug]/oracoes">) {
  const { slug } = await params;
  const ctx = await getOrgForMember(slug);
  if (!ctx) notFound();

  const { data: rows } = await ctx.supabase
    .from("prayer_requests")
    .select("id, name, phone, request, is_confidential, status, created_at")
    .eq("org_id", ctx.org.id)
    .order("created_at", { ascending: false });

  const list = rows ?? [];

  return (
    <div className="space-y-4">
      <h2 className="font-medium">Pedidos de oração ({list.length})</h2>
      {list.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum pedido ainda.</p>
      )}
      <ul className="space-y-3">
        {list.map((r) => (
          <li key={r.id} className="rounded-[var(--radius)] border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">
                  {r.name || "Anônimo"}
                  {r.is_confidential && (
                    <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      confidencial
                    </span>
                  )}
                </p>
                {r.phone && (
                  <p className="text-xs text-muted-foreground">{r.phone}</p>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(r.created_at).toLocaleDateString("pt-BR")}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm">{r.request}</p>
            <form action={setPrayerStatus} className="mt-3 flex gap-1">
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="id" value={r.id} />
              {STATUSES.map((s) => (
                <button
                  key={s}
                  name="status"
                  value={s}
                  className={`rounded-[var(--radius)] border px-2 py-1 text-xs ${
                    r.status === s
                      ? "border-foreground bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
