import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedSite } from "@/lib/site/queries";
import { DEFAULT_VISIBILITY, resolveTitle } from "@/lib/site/schema";
import { Sym } from "@/components/ui/primitives";

export const revalidate = 120;

export async function generateMetadata({
  params,
}: PageProps<"/igreja/[slug]/primeira-vez">): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublishedSite(slug);
  if (!data) return { title: "Primeira vez" };
  return {
    title: `Primeira vez · ${data.org.name}`,
    description: `O que esperar ao visitar a ${data.org.name} pela primeira vez.`,
    alternates: { canonical: `/igreja/${slug}/primeira-vez` },
  };
}

export default async function PrimeiraVezPage({
  params,
}: PageProps<"/igreja/[slug]/primeira-vez">) {
  const { slug } = await params;
  const data = await getPublishedSite(slug);
  if (!data) notFound();

  const { org, site } = data;
  const ft = site.first_time ?? {};
  const name = site.branding?.name || org.name;
  const t = resolveTitle(site, "firstTime");
  const vis = { ...DEFAULT_VISIBILITY, ...site.sections_visibility };

  const expect = [
    { icon: "schedule", label: "Duração do culto", value: ft.duration },
    { icon: "checkroom", label: "Como se vestir", value: ft.dressCode },
    { icon: "child_care", label: "Ministério infantil", value: ft.kids },
    { icon: "local_parking", label: "Estacionamento", value: ft.parking },
    { icon: "menu_book", label: "O que levar", value: ft.whatToBring },
    { icon: "login", label: "Quando chegar", value: ft.arrival },
  ].filter((e) => e.value?.trim());

  const steps = [
    vis.media && site.media?.youtubeEmbedUrl && {
      icon: "play_circle",
      title: "Assista a última transmissão",
      text: "Conheça a igreja antes mesmo de vir.",
      href: `/igreja/${slug}#midia`,
    },
    vis.prayer && {
      icon: "volunteer_activism",
      title: "Podemos orar por você?",
      text: "Envie seu pedido — nossa equipe vai interceder.",
      href: `/igreja/${slug}#oracao`,
    },
    vis.ministries && {
      icon: "diversity_3",
      title: "Conheça os ministérios",
      text: "Há um lugar para você servir e pertencer.",
      href: `/igreja/${slug}#ministerios`,
    },
    {
      icon: "how_to_reg",
      title: "Quero fazer parte",
      text: "Crie seu cadastro de membro.",
      href: `/igreja/${slug}/entrar`,
    },
  ].filter(Boolean) as {
    icon: string;
    title: string;
    text: string;
    href: string;
  }[];

  return (
    <main className="flex-1">
      <header className="flex h-14 items-center justify-between border-b border-border px-5">
        <Link
          href={`/igreja/${slug}`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <Sym name="chevron_left" className="text-[18px]" /> {name}
        </Link>
        <Link href={`/igreja/${slug}/entrar`} className="btn btn-outline !px-3 !py-1.5 text-sm">
          Sou membro
        </Link>
      </header>

      <div className="mx-auto max-w-2xl px-5 py-16">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Primeira vez
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight md:text-4xl">
          {t.title}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          {ft.intro?.trim() || t.subtitle}
        </p>

        {expect.length > 0 && (
          <section className="mt-12">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
              O que esperar
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {expect.map((e) => (
                <div key={e.label} className="card p-4">
                  <Sym name={e.icon} className="text-[22px]" />
                  <p className="mt-2 text-sm font-medium">{e.label}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {e.value}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-12">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
            Próximos passos
          </h2>
          <div className="mt-5 space-y-3">
            {steps.map((s) => (
              <Link
                key={s.title}
                href={s.href}
                className="card flex items-center gap-4 p-4 transition-colors hover:border-border-strong"
              >
                <Sym name={s.icon} className="text-[24px]" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="text-sm text-muted-foreground">{s.text}</p>
                </div>
                <Sym name="chevron_right" className="text-muted-foreground" />
              </Link>
            ))}
          </div>
        </section>

        {(site.contact?.address || site.contact?.mapsUrl) && (
          <section className="mt-12">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
              Onde estamos
            </h2>
            {site.contact?.address && (
              <p className="mt-3 text-sm text-muted-foreground">{site.contact.address}</p>
            )}
            {site.contact?.mapsUrl && (
              <a
                href={site.contact.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline mt-3 !px-4 !py-2 text-sm"
              >
                <Sym name="map" className="text-[16px]" /> Traçar rota
              </a>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
