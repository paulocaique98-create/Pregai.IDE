"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sym } from "@/components/ui/primitives";

const NAV = [
  { seg: "", label: "Site", icon: "home", exact: true },
  { seg: "ministerios", label: "Ministérios", icon: "diversity_3" },
  { seg: "agenda", label: "Agenda", icon: "calendar_month" },
  { seg: "oracoes", label: "Oração", icon: "volunteer_activism" },
  { seg: "membros", label: "Membros", icon: "group" },
];

export function Shell({
  slug,
  orgName,
  userEmail,
  published,
  children,
  signOut,
}: {
  slug: string;
  orgName: string;
  userEmail: string;
  published: boolean;
  children: React.ReactNode;
  signOut: () => void;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const base = `/painel/igreja/${slug}`;
  const active = (n: (typeof NAV)[number]) => {
    const href = n.seg ? `${base}/${n.seg}` : base;
    return n.exact ? path === href : path.startsWith(href);
  };

  const nav = (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((n) => {
        const href = n.seg ? `${base}/${n.seg}` : base;
        return (
          <Link
            key={n.label}
            href={href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-sm transition-colors ${
              active(n)
                ? "bg-primary font-medium text-primary-foreground"
                : "text-muted-foreground hover:bg-surface hover:text-foreground"
            }`}
          >
            <Sym name={n.icon} className="text-[20px]" />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-full md:pl-60">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col justify-between border-r border-border bg-background md:flex">
        <div>
          <div className="flex h-14 items-center gap-2 border-b border-border px-4">
            <Sym name="church" className="text-[22px]" />
            <span className="font-[family-name:var(--font-display)] text-base font-semibold tracking-tight">
              Pregai
            </span>
          </div>
          <div className="px-3 py-4">
            <Link
              href="/painel"
              className="mb-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Sym name="chevron_left" className="text-[16px]" /> Todas as igrejas
            </Link>
            <p className="px-3 text-sm font-medium leading-tight">{orgName}</p>
            <div className="mt-1 flex items-center gap-1.5 px-3 text-xs text-muted-foreground">
              <span
                className={`h-1.5 w-1.5 rounded-full ${published ? "bg-accent" : "bg-muted-foreground/50"}`}
              />
              {published ? "publicado" : "rascunho"}
            </div>
            <div className="mt-4">{nav}</div>
          </div>
        </div>
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2 rounded-[var(--radius)] bg-surface p-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {userEmail[0]?.toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {userEmail}
            </span>
            <form action={signOut}>
              <button title="Sair" className="text-muted-foreground hover:text-foreground">
                <Sym name="logout" className="text-[18px]" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Topbar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur md:px-8">
        <button
          onClick={() => setOpen(true)}
          className="md:hidden"
          aria-label="Menu"
        >
          <Sym name="menu" className="text-[24px]" />
        </button>
        <Link
          href={`/igreja/${slug}`}
          target="_blank"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <Sym name="open_in_new" className="text-[16px]" />
          <span className="hidden sm:inline">Ver site público</span>
        </Link>
        <div className="flex-1" />
        <span className="hidden text-xs text-muted-foreground sm:block">{orgName}</span>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute inset-y-0 left-0 w-72 bg-background p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="font-[family-name:var(--font-display)] font-semibold">
                {orgName}
              </span>
              <button onClick={() => setOpen(false)}>
                <Sym name="close" className="text-[22px]" />
              </button>
            </div>
            <Link
              href="/painel"
              onClick={() => setOpen(false)}
              className="mb-3 flex items-center gap-1 text-xs text-muted-foreground"
            >
              <Sym name="chevron_left" className="text-[16px]" /> Todas as igrejas
            </Link>
            {nav}
            <form action={signOut} className="mt-6">
              <button className="btn btn-outline w-full">Sair</button>
            </form>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">{children}</div>
    </div>
  );
}
