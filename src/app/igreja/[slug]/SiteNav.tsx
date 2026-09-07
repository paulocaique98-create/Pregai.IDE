"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sym } from "@/components/ui/primitives";

type Item = { label: string; href: string; icon?: string };

export function SiteNav({
  slug,
  orgName,
  logoUrl,
  links,
  actions,
  bottom,
}: {
  slug: string;
  orgName: string;
  logoUrl?: string;
  links: Item[];
  actions: Item[];
  bottom: Item[];
}) {
  const [scrolled, setScrolled] = useState(false);
  const memberHref = `/igreja/${slug}/entrar`;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 280);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
          <Link
            href="#top"
            className="flex shrink-0 items-center gap-2 font-[family-name:var(--font-display)] text-base font-semibold tracking-tight"
          >
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-6 w-6 object-contain" />
            )}
            <span className="max-w-[9rem] truncate sm:max-w-none">{orgName}</span>
          </Link>

          {/* Estado topo: menu de seções */}
          {!scrolled && (
            <>
              <nav className="hidden flex-1 items-center gap-4 overflow-x-auto md:flex">
                {links.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    className="whitespace-nowrap text-sm text-muted-foreground hover:text-foreground"
                  >
                    {l.label}
                  </a>
                ))}
              </nav>
              <Link
                href={memberHref}
                className="ml-auto shrink-0 rounded-[var(--radius)] border border-border px-3 py-1.5 text-sm"
              >
                Sou membro
              </Link>
            </>
          )}

          {/* Estado rolado: botões de ação */}
          {scrolled && (
            <nav className="flex flex-1 items-center gap-2 overflow-x-auto">
              {actions.map((a) => (
                <a
                  key={a.label}
                  href={a.href}
                  className="flex shrink-0 items-center gap-1.5 rounded-[var(--radius)] border border-border bg-card px-2.5 py-1.5 text-xs font-medium hover:border-foreground"
                >
                  {a.icon && <Sym name={a.icon} className="text-[16px]" />}
                  {a.label}
                </a>
              ))}
            </nav>
          )}
        </div>
      </header>

      {/* bottom nav (mobile) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid border-t border-border bg-background/95 backdrop-blur md:hidden"
        style={{
          gridTemplateColumns: `repeat(${bottom.length}, minmax(0, 1fr))`,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {bottom.map((b) => (
          <a
            key={b.label}
            href={b.href}
            className="flex flex-col items-center gap-0.5 py-2 text-[0.65rem] text-muted-foreground"
          >
            {b.icon && <Sym name={b.icon} className="text-[20px]" />}
            {b.label}
          </a>
        ))}
      </nav>
    </>
  );
}
