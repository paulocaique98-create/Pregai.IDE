import { notFound } from "next/navigation";
import { getPublishedSite } from "@/lib/site/queries";
import { MemberAuthForm } from "./MemberAuthForm";

export default async function MemberEntrarPage({
  params,
  searchParams,
}: PageProps<"/igreja/[slug]/entrar">) {
  const { slug } = await params;
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const data = await getPublishedSite(slug);
  if (!data) notFound();

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="font-[family-name:var(--font-display)] text-2xl">
          {data.org.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Área do membro</p>
        <MemberAuthForm slug={slug} next={next} />
      </div>
    </main>
  );
}
