import Link from "next/link";
import type { SectionKey } from "@/lib/site/schema";

const NAV: Partial<Record<SectionKey, { label: string; anchor: string }>> = {
  media: { label: "Última live", anchor: "#midia" },
  firstTime: { label: "Primeira vez", anchor: "#primeira-vez" },
  schedule: { label: "Horários", anchor: "#horarios" },
  about: { label: "Quem somos", anchor: "#quem-somos" },
  ministries: { label: "Ministérios", anchor: "#ministerios" },
  events: { label: "Agenda", anchor: "#eventos" },
  prayer: { label: "Oração", anchor: "#oracao" },
  contact: { label: "Contato", anchor: "#contato" },
  giving: { label: "Contribuir", anchor: "#contribuir" },
};

const BOTTOM: { key: SectionKey | "top" | "member"; label: string; href: string }[] = [
  { key: "top", label: "Início", href: "#top" },
  { key: "schedule", label: "Horários", href: "#horarios" },
  { key: "prayer", label: "Oração", href: "#oracao" },
  { key: "giving", label: "Contribuir", href: "#contribuir" },
  { key: "member", label: "Membro", href: "MEMBER" },
];

export function SiteNav({
  slug,
  orgName,
  logoUrl,
  visible,
}: {
  slug: string;
  orgName: string;
  logoUrl?: string;
  visible: (k: SectionKey) => boolean;
}) {
  const links = (Object.entries(NAV) as [SectionKey, { label: string; anchor: string }][])
    .filter(([k]) => visible(k))
    .map(([, v]) => v);

  const memberHref = `/igreja/${slug}/entrar`;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <Link href="#top" className="flex shrink-0 items-center gap-2 font-[family-name:var(--font-display)] text-lg">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-7 w-7 object-contain" />
            )}
            <span className="truncate">{orgName}</span>
          </Link>

          <nav className="hidden flex-1 items-center gap-4 overflow-x-auto md:flex">
            {links.map((l) => (
              <a
                key={l.anchor}
                href={l.anchor}
                className="whitespace-nowrap text-sm text-muted-foreground hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <Link
            href={memberHref}
            className="ml-auto shrink-0 rounded-[var(--radius)] border border-border px-3 py-1.5 text-sm md:ml-0"
          >
            Sou membro
          </Link>
        </div>
      </header>

      {/* bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background md:hidden">
        {BOTTOM.map((b) => {
          if (b.key === "member") {
            return (
              <Link key="member" href={memberHref} className="py-2 text-center text-xs">
                {b.label}
              </Link>
            );
          }
          if (b.key !== "top" && !visible(b.key as SectionKey)) {
            return <span key={b.label} />;
          }
          return (
            <a key={b.label} href={b.href} className="py-2 text-center text-xs text-muted-foreground">
              {b.label}
            </a>
          );
        })}
      </nav>
    </>
  );
}
