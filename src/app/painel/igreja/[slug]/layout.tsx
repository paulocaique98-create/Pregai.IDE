import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrgForMember } from "@/lib/site/queries";
import { NavTabs } from "./NavTabs";

export default async function IgrejaPainelLayout({
  children,
  params,
}: LayoutProps<"/painel/igreja/[slug]">) {
  const { slug } = await params;
  const ctx = await getOrgForMember(slug);
  if (!ctx) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-[family-name:var(--font-display)] text-2xl">
          {ctx.org.name}
        </h1>
        <Link href="/painel" className="text-sm text-muted-foreground underline">
          ← Todas as igrejas
        </Link>
      </div>
      <NavTabs slug={slug} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
