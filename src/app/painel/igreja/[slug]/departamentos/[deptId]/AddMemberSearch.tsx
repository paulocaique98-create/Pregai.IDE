"use client";

import { useMemo, useState } from "react";
import { Avatar, Sym } from "@/components/ui/primitives";
import { setDeptMember } from "../actions";

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function AddMemberSearch({
  slug,
  deptId,
  people,
}: {
  slug: string;
  deptId: string;
  people: { user_id: string; name: string }[];
}) {
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const nq = norm(q.trim());
    const base = nq
      ? people.filter((p) => norm(p.name).includes(nq))
      : people;
    return base.slice(0, 8);
  }, [q, people]);

  if (people.length === 0) return null;

  return (
    <section>
      <h2 className="mb-1 font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
        Incluir membro
      </h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Busque pelo nome um membro da igreja para adicionar ao departamento.
      </p>

      <div className="relative">
        <Sym
          name="search"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-muted-foreground"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Digite o nome…"
          className="field-input !pl-10"
          autoComplete="off"
        />
      </div>

      {results.length > 0 ? (
        <ul className="card mt-2 divide-y divide-border">
          {results.map((p) => (
            <li key={p.user_id} className="flex items-center gap-3 p-2.5">
              <Avatar name={p.name} />
              <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
              <form action={setDeptMember}>
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="dept_id" value={deptId} />
                <input type="hidden" name="user_id" value={p.user_id} />
                <input type="hidden" name="op" value="add" />
                <button className="btn btn-primary !px-3 !py-1.5 text-xs">
                  Adicionar
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          Nenhum membro encontrado para “{q}”.
        </p>
      )}
    </section>
  );
}
