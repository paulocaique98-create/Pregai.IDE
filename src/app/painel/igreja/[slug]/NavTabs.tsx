"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavTabs({ slug }: { slug: string }) {
  const path = usePathname();
  const base = `/painel/igreja/${slug}`;
  const tabs = [
    { href: base, label: "Site" },
    { href: `${base}/oracoes`, label: "Oração" },
    { href: `${base}/membros`, label: "Membros" },
  ];

  return (
    <nav className="mt-4 flex gap-1 border-b border-border">
      {tabs.map((t) => {
        const active = t.href === base ? path === base : path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              active
                ? "border-foreground font-medium"
                : "border-transparent text-muted-foreground"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
