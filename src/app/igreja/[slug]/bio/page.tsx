import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedSite } from "@/lib/site/queries";
import { toYoutubeEmbed, formatEventDate } from "@/lib/site/schema";
import { brandStyle } from "@/lib/site/color";
import { Sym } from "@/components/ui/primitives";

export const revalidate = 120;

export async function generateMetadata({
  params,
}: PageProps<"/igreja/[slug]/bio">): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublishedSite(slug);
  return {
    title: data ? data.org.name : "Links",
    robots: { index: false },
  };
}

export default async function BioPage({ params }: PageProps<"/igreja/[slug]/bio">) {
  const { slug } = await params;
  const data = await getPublishedSite(slug);
  if (!data) notFound();
  const { org, site, events } = data;
  const name = site.branding?.name || org.name;
  const today = new Date().toISOString().slice(0, 10);
  const nextEvent = events.find((e) => !e.event_date || e.event_date >= today);

  const links = [
    toYoutubeEmbed(site.media?.youtubeEmbedUrl) && {
      icon: "play_circle",
      label: site.media?.lastLiveLabel || "Assistir a última transmissão",
      href: `/igreja/${slug}#midia`,
    },
    nextEvent && {
      icon: "calendar_month",
      label: `${nextEvent.title}${nextEvent.event_date ? ` · ${formatEventDate(nextEvent.event_date)}` : ""}`,
      href: `/igreja/${slug}#eventos`,
    },
    { icon: "volunteer_activism", label: "Enviar pedido de oração", href: `/igreja/${slug}#oracao` },
    site.giving?.pixKey && {
      icon: "favorite",
      label: "Dízimos e ofertas (PIX)",
      href: `/igreja/${slug}#contribuir`,
    },
    { icon: "schedule", label: "Horários dos cultos", href: `/igreja/${slug}#horarios` },
    { icon: "person", label: "Área do membro", href: `/igreja/${slug}/entrar` },
    { icon: "language", label: "Site completo", href: `/igreja/${slug}` },
  ].filter(Boolean) as { icon: string; label: string; href: string }[];

  const socials = [
    site.social_links?.instagram && { icon: "photo_camera", href: site.social_links.instagram },
    site.social_links?.youtube && { icon: "smart_display", href: site.social_links.youtube },
    site.social_links?.facebook && { icon: "thumb_up", href: site.social_links.facebook },
  ].filter(Boolean) as { icon: string; href: string }[];

  return (
    <main
      className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col items-center px-5 py-12"
      style={brandStyle(site.branding?.primaryColor)}
    >
      {site.branding?.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={site.branding.logoUrl} alt="" className="h-16 w-16 object-contain" />
      ) : (
        <Sym name="church" className="text-[40px]" />
      )}
      <h1 className="mt-3 text-center font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
        {name}
      </h1>

      <div className="mt-8 flex w-full flex-col gap-3">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-card px-4 py-3.5 text-sm font-medium transition-colors hover:border-foreground"
          >
            <Sym name={l.icon} className="text-[20px]" />
            <span className="flex-1">{l.label}</span>
            <Sym name="chevron_right" className="text-[18px] text-muted-foreground" />
          </a>
        ))}
      </div>

      {socials.length > 0 && (
        <div className="mt-8 flex gap-4">
          {socials.map((s) => (
            <a key={s.href} href={s.href} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
              <Sym name={s.icon} className="text-[24px]" />
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
