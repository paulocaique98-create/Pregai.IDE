import { notFound } from "next/navigation";
import { getOrgForPanel, getSiteConfig } from "@/lib/site/queries";
import { signOut } from "@/app/entrar/actions";
import { canEditOrgSettings, type OrgRole } from "@/lib/org/settings";
import { Shell } from "./Shell";

export default async function IgrejaPainelLayout({
  children,
  params,
}: LayoutProps<"/painel/igreja/[slug]">) {
  const { slug } = await params;
  const ctx = await getOrgForPanel(slug);
  if (!ctx) notFound();
  const site = ctx.isStaff ? await getSiteConfig(ctx.org.id) : null;

  return (
    <Shell
      slug={slug}
      orgName={ctx.org.name}
      userEmail={ctx.user.email ?? ""}
      published={!!site?.is_published}
      isStaff={ctx.isStaff}
      canConfig={canEditOrgSettings(ctx.role as OrgRole)}
      signOut={signOut}
    >
      {children}
    </Shell>
  );
}
