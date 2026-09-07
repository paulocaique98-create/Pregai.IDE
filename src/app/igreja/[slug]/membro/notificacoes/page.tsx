import Link from "next/link";
import { getMemberContext } from "@/lib/site/member";
import { EmptyState, Sym } from "@/components/ui/primitives";
import { PushToggle } from "../PushToggle";
import { markNotificationsRead } from "../push-actions";

export default async function NotificacoesPage({
  params,
}: PageProps<"/igreja/[slug]/membro/notificacoes">) {
  const { slug } = await params;
  const ctx = await getMemberContext(slug);

  const { data } = await ctx.supabase
    .from("notifications")
    .select("id, kind, title, body, url, read_at, created_at")
    .eq("user_id", ctx.user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const list = data ?? [];

  // marca como lidas ao abrir
  if (list.some((n) => !n.read_at)) await markNotificationsRead(slug);

  return (
    <div className="space-y-5">
      <h1 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
        <Sym name="notifications" className="text-[22px]" /> Notificações
      </h1>

      <PushToggle />

      {list.length === 0 ? (
        <EmptyState icon="notifications_off">Nenhuma notificação ainda.</EmptyState>
      ) : (
        <ul className="card divide-y divide-border">
          {list.map((n) => {
            const inner = (
              <div className="flex items-start gap-3 p-3">
                {!n.read_at && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                )}
                <div className={n.read_at ? "flex-1 pl-5" : "flex-1"}>
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body && (
                    <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(n.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
            return (
              <li key={n.id}>
                {n.url ? (
                  <Link href={n.url} className="block hover:bg-card-hover">
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
