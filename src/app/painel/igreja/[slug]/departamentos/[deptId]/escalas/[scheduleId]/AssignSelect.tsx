"use client";

import { updateAssignment } from "../actions";

export function AssignSelect({
  slug,
  deptId,
  scheduleId,
  assignmentId,
  current,
  people,
}: {
  slug: string;
  deptId: string;
  scheduleId: string;
  assignmentId: string;
  current: string;
  people: { user_id: string; name: string }[];
}) {
  return (
    <form action={updateAssignment}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="dept_id" value={deptId} />
      <input type="hidden" name="schedule_id" value={scheduleId} />
      <input type="hidden" name="id" value={assignmentId} />
      <input type="hidden" name="op" value="assign" />
      <select
        name="user_id"
        defaultValue={current}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="w-full rounded-[var(--radius)] border border-border bg-card px-2 py-1 text-xs"
      >
        <option value="">— vaga aberta —</option>
        {people.map((p) => (
          <option key={p.user_id} value={p.user_id}>
            {p.name}
          </option>
        ))}
      </select>
    </form>
  );
}
