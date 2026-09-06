import { notFound } from "next/navigation";
import { getOrgForMember, getSiteConfig } from "@/lib/site/queries";
import { SiteEditor } from "./SiteEditor";

export default async function SitePainelPage({
  params,
}: PageProps<"/painel/igreja/[slug]">) {
  const { slug } = await params;
  const ctx = await getOrgForMember(slug);
  if (!ctx) notFound();

  const site = await getSiteConfig(ctx.org.id);
  if (!site) notFound();

  return <SiteEditor slug={slug} orgName={ctx.org.name} initial={site} />;
}
