"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Sym } from "@/components/ui/primitives";

const STATUS = [
  { v: "", l: "Todos" },
  { v: "pending", l: "Aguardando" },
  { v: "active", l: "Ativos" },
  { v: "blocked", l: "Bloqueados" },
];
const ROLES = [
  { v: "", l: "Qualquer papel" },
  { v: "owner", l: "Proprietário" },
  { v: "pastor", l: "Pastor" },
  { v: "secretaria", l: "Secretaria" },
  { v: "lider", l: "Líder" },
  { v: "membro", l: "Membro" },
];
const SORTS = [
  { v: "recent", l: "Mais recentes" },
  { v: "oldest", l: "Mais antigos" },
  { v: "name", l: "Nome (A–Z)" },
];

export function MembersToolbar({ canFilterRole }: { canFilterRole: boolean }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [search, setSearch] = useState(sp.get("q") ?? "");
  const first = useRef(true);

  const push = (patch: Record<string, string>) => {
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    start(() => router.replace(`${path}?${next.toString()}`, { scroll: false }));
  };

  // debounce da busca
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => push({ q: search.trim() }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const status = sp.get("status") ?? "";
  const role = sp.get("role") ?? "";
  const sort = sp.get("sort") ?? "recent";

  return (
    <div className="mb-6 space-y-3">
      <div className="relative">
        <Sym
          name={pending ? "hourglass_empty" : "search"}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-muted-foreground"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, e-mail ou telefone"
          className="field-input pl-9"
          aria-label="Buscar membros"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STATUS.map((s) => (
          <button
            key={s.v}
            onClick={() => push({ status: s.v })}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              status === s.v
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-surface"
            }`}
          >
            {s.l}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {canFilterRole && (
          <select
            value={role}
            onChange={(e) => push({ role: e.target.value })}
            aria-label="Filtrar por papel"
            className="rounded-[var(--radius)] border border-border bg-card px-2 py-1.5 text-xs"
          >
            {ROLES.map((r) => (
              <option key={r.v} value={r.v}>
                {r.l}
              </option>
            ))}
          </select>
        )}
        <select
          value={sort}
          onChange={(e) => push({ sort: e.target.value })}
          aria-label="Ordenar"
          className="rounded-[var(--radius)] border border-border bg-card px-2 py-1.5 text-xs"
        >
          {SORTS.map((s) => (
            <option key={s.v} value={s.v}>
              {s.l}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
