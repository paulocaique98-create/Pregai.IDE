import { getMemberContext } from "@/lib/site/member";
import { EmptyState, Sym } from "@/components/ui/primitives";
import { EscalaActions } from "../EscalaCard";

const fmt = (d: string) =>
  new Date(d + "T12:00").toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

export default async function MembroEscala({
  params,
}: PageProps<"/igreja/[slug]/membro/escala">) {
  const { slug } = await params;
  const ctx = await getMemberContext(slug);
  const today = new Date().toISOString().slice(0, 10);

  const { data } = await ctx.supabase
    .from("serving_assignments")
    .select("id, role, status, token, service_date, serving_schedules(title), departments(name)")
    .eq("user_id", ctx.user.id)
    .order("service_date", { ascending: true });

  const rows = data ?? [];
  const upcoming = rows.filter((r) => r.service_date >= today);
  const past = rows.filter((r) => r.service_date < today);

  return (
    <div className="space-y-5">
      <h1 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
        <Sym name="event_note" className="text-[22px]" /> Minha escala
      </h1>

      {upcoming.length === 0 ? (
        <EmptyState icon="event_available">Você não está escalado para nada no momento.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {upcoming.map((a) => (
            <li key={a.id} className="card p-4">
              <p className="text-sm font-semibold">
                {(a as { serving_schedules?: { title?: string } }).serving_schedules?.title}
              </p>
              <p className="mt-0.5 text-sm capitalize text-muted-foreground">
                {fmt(a.service_date)} · {a.role}
                {" · "}
                {(a as { departments?: { name?: string } }).departments?.name}
              </p>
              <div className="mt-3">
                <EscalaActions slug={slug} token={a.token} status={a.status} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {past.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm text-muted-foreground">
            Histórico ({past.length})
          </summary>
          <ul className="mt-2 space-y-2">
            {past.map((a) => (
              <li key={a.id} className="card p-3 text-sm text-muted-foreground">
                {(a as { serving_schedules?: { title?: string } }).serving_schedules?.title} ·{" "}
                {fmt(a.service_date)} · {a.role}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
