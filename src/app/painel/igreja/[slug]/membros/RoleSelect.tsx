"use client";

import { setMemberRole } from "./actions";

const ROLES = [
  { v: "pastor", l: "Pastor" },
  { v: "secretaria", l: "Secretaria" },
  { v: "lider", l: "Líder" },
  { v: "membro", l: "Membro" },
];

export function RoleSelect({
  slug,
  userId,
  role,
}: {
  slug: string;
  userId: string;
  role: string;
}) {
  return (
    <form action={setMemberRole}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="user_id" value={userId} />
      <select
        name="role"
        defaultValue={ROLES.some((r) => r.v === role) ? role : "membro"}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-[var(--radius)] border border-border bg-card px-2 py-1 text-xs"
      >
        {ROLES.map((r) => (
          <option key={r.v} value={r.v}>
            {r.l}
          </option>
        ))}
      </select>
    </form>
  );
}
