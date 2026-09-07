"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sym } from "@/components/ui/primitives";

const ITEMS = [
  { seg: "", label: "Início", icon: "home", exact: true },
  { seg: "palavra", label: "Palavra", icon: "auto_stories" },
  { seg: "agenda", label: "Agenda", icon: "calendar_month" },
  { seg: "departamentos", label: "Servir", icon: "workspaces" },
  { seg: "perfil", label: "Perfil", icon: "person" },
];

export function MemberNav({ slug }: { slug: string }) {
  const path = usePathname();
  const base = `/igreja/${slug}/membro`;
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {ITEMS.map((i) => {
        const href = i.seg ? `${base}/${i.seg}` : base;
        const active = i.exact ? path === href : path.startsWith(href);
        return (
          <Link
            key={i.label}
            href={href}
            className={`flex flex-col items-center gap-0.5 py-2 text-[0.65rem] ${
              active ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            <Sym name={i.icon} className="text-[22px]" />
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
