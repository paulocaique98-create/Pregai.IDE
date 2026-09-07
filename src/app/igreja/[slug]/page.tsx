import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedSite } from "@/lib/site/queries";
import {
  DEFAULT_VISIBILITY,
  resolveTitle,
  toYoutubeEmbed,
  type SectionKey,
} from "@/lib/site/schema";
import QRCode from "qrcode";
import { pixPayload } from "@/lib/site/pix";
import { PrayerForm } from "./PrayerForm";
import { SiteNav } from "./SiteNav";
import { PWARegister } from "./PWARegister";
import { PixBox } from "./PixBox";
import { Sym } from "@/components/ui/primitives";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: PageProps<"/igreja/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublishedSite(slug);
  if (!data) return { title: "Site não encontrado" };
  const { org, site } = data;
  const title = site.seo?.title ?? org.name;
  const description = site.seo?.description ?? site.hero?.subtitle;
  const themeColor =
    site.theme_config?.defaultMode === "light" ? "#ffffff" : "#0a0a0a";
  return {
    title,
    description,
    manifest: `/igreja/${slug}/manifest.webmanifest`,
    appleWebApp: { capable: true, title: org.name, statusBarStyle: "default" },
    other: { "theme-color": themeColor },
    alternates: { canonical: `/igreja/${slug}` },
    openGraph: {
      title,
      description,
      url: `/igreja/${slug}`,
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

  const pixCode = site.giving?.pixKey
    ? pixPayload({
        key: site.giving.pixKey,
        name: site.giving.pixName || site.branding?.name || org.name,
        city: site.giving.pixCity || "",
      })
    : "";
  const pixQr = pixCode
    ? await QRCode.toDataURL(pixCode, { margin: 1, width: 240 })
    : undefined;

  const hasVideo = show("media") && !!toYoutubeEmbed(site.media?.youtubeEmbedUrl);

  const navLinks = [
    hasVideo && { label: "Última live", href: "#midia" },
    show("firstTime") && { label: "Primeira vez", href: "#primeira-vez" },
    show("schedule") && { label: "Horários", href: "#horarios" },
    show("about") && { label: "Quem somos", href: "#quem-somos" },
    show("ministries") && { label: "Ministérios", href: "#ministerios" },
    show("events") && { label: "Agenda", href: "#eventos" },
    show("prayer") && { label: "Oração", href: "#oracao" },
    show("contact") && { label: "Contato", href: "#contato" },
    show("giving") && { label: "Contribuir", href: "#contribuir" },
  ].filter(Boolean) as { label: string; href: string }[];

  const navActions = [
    hasVideo && { icon: "play_circle", label: "Assistir", href: "#midia" },
    show("schedule") && { icon: "schedule", label: "Horários", href: "#horarios" },
    show("prayer") && { icon: "volunteer_activism", label: "Pedir oração", href: "#oracao" },
    site.contact?.mapsUrl
      ? { icon: "map", label: "Como chegar", href: site.contact.mapsUrl }
      : show("contact") && { icon: "place", label: "Contato", href: "#contato" },
    { icon: "how_to_reg", label: "Fazer parte", href: `/igreja/${slug}/entrar` },
  ].filter(Boolean) as { icon: string; label: string; href: string }[];

  const navBottom = [
    { icon: "home", label: "Início", href: "#top" },
    show("schedule") && { icon: "schedule", label: "Horários", href: "#horarios" },
    show("prayer") && { icon: "volunteer_activism", label: "Oração", href: "#oracao" },
    show("giving") && { icon: "pix", label: "Contribuir", href: "#contribuir" },
    { icon: "person", label: "Membro", href: `/igreja/${slug}/entrar` },
  ].filter(Boolean) as { icon: string; label: string; href: string }[];

  return (
    <main className="flex-1 pb-14 md:pb-0">
      <span id="top" />
      <PWARegister />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <SiteNav
        slug={slug}
        orgName={site.branding?.name || org.name}
        logoUrl={site.branding?.logoUrl}
        links={navLinks}
        actions={navActions}
        bottom={navBottom}
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

      {show("firstTime") &&
        (() => {
          const ft = site.first_time ?? {};
          const expect = [
            { icon: "schedule", label: "Duração do culto", value: ft.duration },
            { icon: "checkroom", label: "Como se vestir", value: ft.dressCode },
            { icon: "child_care", label: "Ministério infantil", value: ft.kids },
            { icon: "local_parking", label: "Estacionamento", value: ft.parking },
            { icon: "menu_book", label: "O que levar", value: ft.whatToBring },
            { icon: "login", label: "Quando chegar", value: ft.arrival },
          ].filter((e) => e.value?.trim());
          return (
            <Section
              id="primeira-vez"
              title={t("firstTime").title}
              subtitle={ft.intro?.trim() || t("firstTime").subtitle}
            >
              {expect.length > 0 && (
                <div className="grid gap-4 text-left sm:grid-cols-2">
                  {expect.map((e) => (
                    <div key={e.label} className="rounded-[var(--radius)] border border-border p-4">
                      <Sym name={e.icon} className="text-[22px]" />
                      <p className="mt-2 text-sm font-medium">{e.label}</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {e.value}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          );
        })()}

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
          {site.giving?.description && (
            <p className="mb-6">{site.giving.description}</p>
          )}
          {site.giving?.pixKey && (
            <PixBox
              pixKey={site.giving.pixKey}
              payload={pixCode}
              qrDataUrl={pixQr}
            />
          )}
        </Section>
      )}

      <footer className="space-y-2 px-6 py-10 text-center text-sm text-muted-foreground">
        <p>
          {org.name}
          {site.contact?.address ? ` · ${site.contact.address}` : ""}
          {site.contact?.whatsapp ? ` · ${site.contact.whatsapp}` : ""}
        </p>
        <p className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          <a href={`/igreja/${slug}/entrar`} className="underline">
            Área do membro
          </a>
          <a href={`/igreja/${slug}/instalar`} className="underline">
            Instalar app
          </a>
          <a href="/privacidade" className="underline">
            Privacidade
          </a>
          <a href="/termos" className="underline">
            Termos
          </a>
        </p>
      </footer>
    </main>
  );
}
