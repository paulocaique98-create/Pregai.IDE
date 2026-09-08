import { notFound, redirect } from "next/navigation";
import { getOrgForMember, getSiteConfig } from "@/lib/site/queries";
import { SiteEditor } from "./SiteEditor";

const SITE_EDITORS = ["owner", "pastor", "secretaria"];

export default async function SitePainelPage({
  params,
}: PageProps<"/painel/igreja/[slug]">) {
  const { slug } = await params;
  const ctx = await getOrgForMember(slug);
  if (!ctx) notFound();
  // Líder de organização não edita o site público (Fase 2 · F2-A1).
  if (!SITE_EDITORS.includes(ctx.role)) redirect(`/painel/igreja/${slug}/membros`);

  const site = await getSiteConfig(ctx.org.id);
  if (!site) notFound();

  return <SiteEditor slug={slug} initial={site} />;
}
