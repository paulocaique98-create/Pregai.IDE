import { notFound } from "next/navigation";
import { getOrgForMember, getSiteConfig } from "@/lib/site/queries";
import { requireUser } from "@/lib/auth";
import { signOut } from "@/app/entrar/actions";
import { Shell } from "./Shell";

export default async function IgrejaPainelLayout({
  children,
  params,
}: LayoutProps<"/painel/igreja/[slug]">) {
  const { slug } = await params;
  const ctx = await getOrgForMember(slug);
  if (!ctx) notFound();
  const [site, { user }] = await Promise.all([
    getSiteConfig(ctx.org.id),
    requireUser(),
  ]);

  return (
    <Shell
      slug={slug}
      orgName={ctx.org.name}
      userEmail={user.email ?? ""}
      published={!!site?.is_published}
      signOut={signOut}
    >
      {children}
    </Shell>
  );
}
