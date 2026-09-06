import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedSite } from "@/lib/site/queries";
import {
  DEFAULT_VISIBILITY,
  resolveTitle,
  toYoutubeEmbed,
  type SectionKey,
} from "@/lib/site/schema";
import { PrayerForm } from "./PrayerForm";
import { SiteNav } from "./SiteNav";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: PageProps<"/igreja/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublishedSite(slug);
  if (!data) return { title: "Site não encontrado" };
  const { org, site } = data;
  return {
    title: site.seo?.title ?? org.name,
    description: site.seo?.description ?? site.hero?.subtitle,
    openGraph: {
      title: site.seo?.title ?? org.name,
      description: site.seo?.description ?? site.hero?.subtitle,
      images: site.seo?.ogImageUrl ?? site.hero?.coverImageUrl,
    },
  };
}

function Section({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 border-b border-border px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-[family-name:var(--font-display)] text-3xl">{title}</h2>
        {subtitle && <p className="mt-3 text-muted-foreground">{subtitle}</p>}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}

export default async function IgrejaPublicPage({
  params,
}: PageProps<"/igreja/[slug]">) {
  const { slug } = await params;
  const data = await getPublishedSite(slug);
  if (!data) notFound();

  const { org, site, ministries, events } = data;
  const vis = { ...DEFAULT_VISIBILITY, ...site.sections_visibility };
  const show = (k: SectionKey) => vis[k];
  const t = (k: SectionKey) => resolveTitle(site, k);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Church",
    name: org.name,
    url: `/igreja/${slug}`,
    address: site.contact?.address,
    telephone: site.contact?.whatsapp,
    email: site.contact?.email,
  };

  return (
    <main className="flex-1 pb-14 md:pb-0">
      <span id="top" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <SiteNav
        slug={slug}
        orgName={site.branding?.name || org.name}
        logoUrl={site.branding?.logoUrl}
        visible={show}
      />

      {show("hero") && (
        <section className="relative flex min-h-[70vh] items-center justify-center px-6 py-24 text-center">
          {site.hero?.coverImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={site.hero.coverImageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover grayscale"
            />
          )}
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative max-w-2xl text-white">
            {site.hero?.welcomeLabel && (
              <p className="text-xs uppercase tracking-[0.2em]">{site.hero.welcomeLabel}</p>
            )}
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl sm:text-5xl">
              {t("hero").title}
            </h1>
            <p className="mt-4 text-white/80">{t("hero").subtitle}</p>
          </div>
        </section>
      )}

      {show("media") && toYoutubeEmbed(site.media?.youtubeEmbedUrl) && (
        <Section id="midia" {...t("media")}>
          {(site.media?.lastLiveLabel || site.media?.lastLiveDate) && (
            <p className="mb-4 text-sm font-medium">
              {site.media?.lastLiveLabel}
              {site.media?.lastLiveDate && (
                <span className="text-muted-foreground">
                  {site.media?.lastLiveLabel ? " · " : ""}
                  {site.media.lastLiveDate}
                </span>
              )}
            </p>
          )}
          <div className="aspect-video w-full overflow-hidden rounded-[var(--radius)] border border-border">
            <iframe
              src={toYoutubeEmbed(site.media?.youtubeEmbedUrl)}
              className="h-full w-full"
              allowFullScreen
              title="Última transmissão"
            />
          </div>
        </Section>
      )}

      {show("firstTime") && <Section id="primeira-vez" {...t("firstTime")} />}

      {show("schedule") && (
        <Section id="horarios" {...t("schedule")}>
          <ul className="space-y-2">
            {(site.schedule ?? []).map((s, i) => (
              <li key={i} className="flex justify-between border-b border-border py-2">
                <span>{s.label}</span>
                <span className="text-muted-foreground">{s.time}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {show("about") && (
        <Section id="quem-somos" {...t("about")}>
          {site.about?.description && <p>{site.about.description}</p>}
        </Section>
      )}

      {show("ministries") && (
        <Section id="ministerios" {...t("ministries")}>
          <div className="grid gap-4 sm:grid-cols-2">
            {ministries.map((m) => (
              <div key={m.id} className="rounded-[var(--radius)] border border-border p-4 text-left">
                <p className="font-medium">{m.title}</p>
                {(m.description ?? []).map((d: string, i: number) => (
                  <p key={i} className="mt-1 text-sm text-muted-foreground">
                    {d}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </Section>
      )}

      {show("events") && (
        <Section id="eventos" {...t("events")}>
          <ul className="space-y-2 text-left">
            {events.map((e) => (
              <li key={e.id} className="flex justify-between border-b border-border py-2">
                <span>{e.title}</span>
                <span className="text-muted-foreground">
                  {e.event_date} {e.event_time}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {show("prayer") && (
        <Section id="oracao" {...t("prayer")}>
          <PrayerForm slug={slug} />
        </Section>
      )}

      {show("contact") && (
        <Section id="contato" {...t("contact")}>
          <div className="space-y-1 text-sm text-muted-foreground">
            {site.contact?.address && <p>{site.contact.address}</p>}
            {site.contact?.whatsapp && <p>WhatsApp: {site.contact.whatsapp}</p>}
            {site.contact?.email && <p>{site.contact.email}</p>}
            {site.contact?.mapsUrl && (
              <a href={site.contact.mapsUrl} className="underline" target="_blank" rel="noreferrer">
                Ver no mapa
              </a>
            )}
          </div>
        </Section>
      )}

      {show("giving") && (
        <Section id="contribuir" {...t("giving")}>
          {site.giving?.description && <p>{site.giving.description}</p>}
          {site.giving?.pixKey && (
            <p className="mt-4 rounded-[var(--radius)] border border-border p-3 font-mono text-sm">
              PIX: {site.giving.pixKey}
            </p>
          )}
        </Section>
      )}

      <footer className="space-y-2 px-6 py-10 text-center text-sm text-muted-foreground">
        <p>
          {org.name}
          {site.contact?.address ? ` · ${site.contact.address}` : ""}
          {site.contact?.whatsapp ? ` · ${site.contact.whatsapp}` : ""}
        </p>
        <p>
          <a href={`/igreja/${slug}/entrar`} className="underline">
            Área do membro
          </a>
        </p>
      </footer>
    </main>
  );
}
