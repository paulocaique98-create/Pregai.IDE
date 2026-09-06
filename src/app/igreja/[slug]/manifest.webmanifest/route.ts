import { getPublishedSite } from "@/lib/site/queries";

export const revalidate = 300;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const data = await getPublishedSite(slug);
  if (!data) return new Response("Not found", { status: 404 });

  const { org, site } = data;
  const name = site.branding?.name || org.name;
  const theme = site.theme_config?.defaultMode === "light" ? "#ffffff" : "#0a0a0a";

  const manifest = {
    name,
    short_name: name.slice(0, 20),
    description: site.seo?.description ?? site.hero?.subtitle ?? `Site da ${name}`,
    start_url: `/igreja/${slug}`,
    scope: `/igreja/${slug}`,
    display: "standalone",
    orientation: "portrait",
    lang: "pt-BR",
    background_color: theme,
    theme_color: theme,
    icons: [
      {
        src: site.branding?.logoUrl || "/icon.svg",
        sizes: "any",
        type: site.branding?.logoUrl ? "image/png" : "image/svg+xml",
        purpose: "any",
      },
    ],
  };

  return Response.json(manifest, {
    headers: { "Cache-Control": "public, max-age=300, s-maxage=300" },
  });
}
