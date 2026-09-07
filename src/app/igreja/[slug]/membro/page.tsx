import { Suspense } from "react";
import Link from "next/link";
import { getMemberContext } from "@/lib/site/member";
import { toYoutubeEmbed, formatEventDate } from "@/lib/site/schema";
import { Sym, EmptyState } from "@/components/ui/primitives";
import { DailyVerse, DailyVerseSkeleton } from "./DailyVerse";

export default async function MembroInicio({
  params,
}: PageProps<"/igreja/[slug]/membro">) {
  const { slug } = await params;
  const ctx = await getMemberContext(slug);

  const [{ data: events }, { data: myDepts }] = await Promise.all([
    ctx.supabase
      .from("site_events")
      .select("id, title, event_date, event_time, tag")
      .eq("org_id", ctx.org.id)
      .or(`event_date.gte.${new Date().toISOString().slice(0, 10)},event_date.is.null`)
      .order("event_date", { ascending: true, nullsFirst: false })
      .order("event_time", { ascending: true, nullsFirst: false })
      .limit(3),
    ctx.supabase
      .from("department_members")
      .select("status")
      .eq("org_id", ctx.org.id)
      .eq("user_id", ctx.user.id),
  ]);

  const firstName = (ctx.profile?.full_name || "").split(" ")[0];
  const video = toYoutubeEmbed(ctx.site.media?.youtubeEmbedUrl);
  const active = (myDepts ?? []).filter((d) => d.status === "active").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
          Olá{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acompanhe a vida da igreja durante a semana.
        </p>
      </div>

      {/* 1º — Palavra do dia */}
      <Suspense fallback={<DailyVerseSkeleton />}>
        <DailyVerse />
      </Suspense>

      {/* 2º — Última mensagem */}
      {video && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-semibold">
            <Sym name="play_circle" className="text-[20px]" /> Última live
          </h2>
          {ctx.site.media?.lastLiveLabel && (
            <p className="mb-2 text-sm font-medium">{ctx.site.media.lastLiveLabel}</p>
          )}
          <div className="aspect-video w-full overflow-hidden rounded-[var(--radius-lg)] border border-border">
            <iframe src={video} className="h-full w-full" allowFullScreen title="Mensagem" />
          </div>
        </section>
      )}

      {/* 3º — Próximos eventos */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-semibold">
            <Sym name="calendar_month" className="text-[20px]" /> Próximos eventos
          </h2>
          <Link href={`/igreja/${slug}/membro/agenda`} className="text-xs text-muted-foreground underline">
            ver tudo
          </Link>
        </div>
        {(events ?? []).length === 0 ? (
          <EmptyState icon="event_busy">Nenhum evento agendado.</EmptyState>
        ) : (
          <ul className="card divide-y divide-border">
            {(events ?? []).map((e) => (
              <li key={e.id} className="flex items-center gap-3 p-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {[formatEventDate(e.event_date), e.event_time].filter(Boolean).join(" · ") ||
                      "Data a confirmar"}
                  </p>
                </div>
                {e.tag && (
                  <span className="rounded-[var(--radius)] bg-muted px-2 py-0.5 text-[0.65rem] uppercase text-muted-foreground">
                    {e.tag}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Onde você serve */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-semibold">
          <Sym name="workspaces" className="text-[20px]" /> Onde você serve
        </h2>
        <Link
          href={`/igreja/${slug}/membro/departamentos`}
          className="card flex items-center gap-3 p-4 transition-colors hover:border-border-strong"
        >
          <div className="flex-1">
            <p className="text-sm font-medium">
              {active > 0
                ? `Você participa de ${active} departamento${active > 1 ? "s" : ""}`
                : "Encontre um lugar para servir"}
            </p>
            <p className="text-xs text-muted-foreground">Ver departamentos da igreja</p>
          </div>
          <Sym name="chevron_right" className="text-muted-foreground" />
        </Link>
      </section>
    </div>
  );
}
