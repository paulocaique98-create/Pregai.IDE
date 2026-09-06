import Link from "next/link";

export default function LegalLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <Link href="/" className="text-sm text-muted-foreground underline">
        ← Pregai
      </Link>
      <article className="prose-legal mt-6 space-y-4 text-sm leading-relaxed [&_h1]:font-[family-name:var(--font-display)] [&_h1]:text-3xl [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-medium">
        {children}
      </article>
    </main>
  );
}
