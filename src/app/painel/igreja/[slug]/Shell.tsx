"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sym } from "@/components/ui/primitives";

const STAFF_NAV = [
  { seg: "", label: "Site", icon: "home", exact: true },
  { seg: "avisos", label: "Avisos", icon: "campaign" },
  { seg: "agenda", label: "Agenda", icon: "calendar_month" },
  { seg: "departamentos", label: "Deptos", icon: "workspaces" },
  { seg: "oracoes", label: "Oração", icon: "volunteer_activism" },
  { seg: "membros", label: "Membros", icon: "group" },
];
const STAFF_MORE = [
  { seg: "ministerios", label: "Ministérios do site", icon: "diversity_3" },
  { seg: "visitantes", label: "Visitantes", icon: "waving_hand" },
];
const LEADER_NAV = [
  { seg: "departamentos", label: "Meus departamentos", icon: "workspaces" },
];

export function Shell({
  slug,
  orgName,
  userEmail,
  published,
  isStaff,
  children,
  signOut,
}: {
  slug: string;
  orgName: string;
  userEmail: string;
  published: boolean;
  isStaff: boolean;
  children: React.ReactNode;
  signOut: () => void;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const base = `/painel/igreja/${slug}`;
  const primary = (isStaff ? STAFF_NAV : LEADER_NAV).slice(0, 5);
  const all = isStaff ? [...STAFF_NAV, ...STAFF_MORE] : LEADER_NAV;

  const href = (seg: string) => (seg ? `${base}/${seg}` : base);

  const linkRow = (
    seg: string,
    label: string,
    icon: string,
    exact: boolean | undefined,
    onClick?: () => void,
  ) => {
    const active = exact ? path === href(seg) : seg && path.startsWith(href(seg));
    return (
      <Link
        key={seg || "home"}
        href={href(seg)}
        onClick={onClick}
        className={`flex items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-sm transition-colors ${
          active
            ? "bg-primary font-medium text-primary-foreground"
            : "text-muted-foreground hover:bg-surface hover:text-foreground"
        }`}
      >
        <Sym name={icon} className="text-[20px]" />
        {label}
      </Link>
    );
  };

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
            {isStaff && (
              <div className="mt-1 flex items-center gap-1.5 px-3 text-xs text-muted-foreground">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${published ? "bg-accent" : "bg-muted-foreground/50"}`}
                />
                {published ? "publicado" : "rascunho"}
              </div>
            )}
            <div className="mt-4 flex flex-col gap-0.5">
              {all.map((n) => linkRow(n.seg, n.label, n.icon, (n as { exact?: boolean }).exact))}
            </div>
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
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur md:px-8">
        <button onClick={() => setOpen(true)} className="md:hidden" aria-label="Menu">
          <Sym name="menu" className="text-[24px]" />
        </button>
        <span className="truncate font-[family-name:var(--font-display)] text-base font-semibold tracking-tight md:hidden">
          {orgName}
        </span>
        <div className="flex-1" />
        <Link
          href={`/igreja/${slug}`}
          target="_blank"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <Sym name="open_in_new" className="text-[18px]" />
          <span className="hidden sm:inline">Ver site</span>
        </Link>
      </header>

      {/* Mobile drawer (secundário) */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute inset-y-0 left-0 flex w-72 flex-col bg-background p-4 shadow-xl"
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
            <div className="flex flex-col gap-0.5">
              {all.map((n) =>
                linkRow(n.seg, n.label, n.icon, (n as { exact?: boolean }).exact, () =>
                  setOpen(false),
                ),
              )}
            </div>
            <form action={signOut} className="mt-auto pt-6">
              <button className="btn btn-outline w-full">Sair</button>
            </form>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl px-3 pb-24 pt-6 sm:px-4 md:px-8 md:pb-10">
        {children}
      </div>

      {/* Bottom nav (mobile) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid border-t border-border bg-background/95 backdrop-blur md:hidden"
        style={{
          gridTemplateColumns: `repeat(${primary.length}, minmax(0, 1fr))`,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {primary.map((n) => {
          const active =
            (n as { exact?: boolean }).exact
              ? path === href(n.seg)
              : n.seg && path.startsWith(href(n.seg));
          return (
            <Link
              key={n.seg || "home"}
              href={href(n.seg)}
              className={`flex flex-col items-center gap-0.5 py-2 text-[0.65rem] ${
                active ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <Sym name={n.icon} className="text-[22px]" />
              {n.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
