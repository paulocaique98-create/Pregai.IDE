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
  const [menu, setMenu] = useState(false);
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
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <Link
            href="#top"
            className="flex shrink-0 items-center gap-2 font-[family-name:var(--font-display)] text-base font-semibold tracking-tight"
          >
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-6 w-6 object-contain" />
            )}
            <span className="max-w-[10rem] truncate sm:max-w-none">{orgName}</span>
          </Link>

          {/* desktop: seções -> ações ao rolar */}
          <nav className="hidden flex-1 items-center gap-4 overflow-x-auto md:flex">
            {(scrolled ? actions : links).map((l) => (
              <a
                key={l.href}
                href={l.href}
                className={
                  scrolled
                    ? "flex shrink-0 items-center gap-1.5 rounded-[var(--radius)] border border-border bg-card px-2.5 py-1.5 text-xs font-medium hover:border-foreground"
                    : "whitespace-nowrap text-sm text-muted-foreground hover:text-foreground"
                }
              >
                {scrolled && l.icon && <Sym name={l.icon} className="text-[16px]" />}
                {l.label}
              </a>
            ))}
          </nav>

          <Link
            href={memberHref}
            className="ml-auto hidden shrink-0 rounded-[var(--radius)] border border-border px-3 py-1.5 text-sm md:block"
          >
            Sou membro
          </Link>

          {/* mobile: botão de menu */}
          <button
            onClick={() => setMenu(true)}
            className="ml-auto md:hidden"
            aria-label="Menu"
          >
            <Sym name="menu" className="text-[24px]" />
          </button>
        </div>
      </header>

      {/* mobile: sheet com todas as seções */}
      {menu && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMenu(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute inset-x-0 top-0 max-h-[80vh] overflow-y-auto rounded-b-[var(--radius-lg)] bg-background p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-[family-name:var(--font-display)] font-semibold">
                {orgName}
              </span>
              <button onClick={() => setMenu(false)} aria-label="Fechar">
                <Sym name="close" className="text-[22px]" />
              </button>
            </div>
            <nav className="flex flex-col">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenu(false)}
                  className="border-t border-border py-3 text-sm"
                >
                  {l.label}
                </a>
              ))}
              <Link
                href={memberHref}
                onClick={() => setMenu(false)}
                className="mt-3 rounded-[var(--radius)] bg-primary py-2.5 text-center text-sm font-medium text-primary-foreground"
              >
                Sou membro
              </Link>
            </nav>
          </div>
        </div>
      )}

      {/* mobile: bottom nav (único menu de navegação no celular) */}
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
            {b.icon && <Sym name={b.icon} className="text-[22px]" />}
            {b.label}
          </a>
        ))}
      </nav>
    </>
  );
}
