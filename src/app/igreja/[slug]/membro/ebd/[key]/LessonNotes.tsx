"use client";

import { useActionState, useState } from "react";
import { Sym } from "@/components/ui/primitives";
import { saveNote } from "../actions";

export function LessonNotes({
  slug,
  lessonKey,
  initial,
}: {
  slug: string;
  lessonKey: string;
  initial: string;
}) {
  const action = saveNote.bind(null, slug, lessonKey);
  const [state, formAction, pending] = useActionState(action, null);
  const [dirty, setDirty] = useState(false);

  return (
    <form
      action={(fd) => {
        setDirty(false);
        formAction(fd);
      }}
      className="card p-4"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium">
          <Sym name="edit_note" className="text-[18px]" /> Minhas anotações
        </span>
        <span className="text-xs text-muted-foreground">
          {pending
            ? "salvando…"
            : dirty
              ? "não salvo"
              : state && "savedAt" in state
                ? "salvo ✓"
                : ""}
        </span>
      </div>
      <textarea
        name="content"
        defaultValue={initial}
        onChange={() => setDirty(true)}
        rows={8}
        placeholder="Escreva aqui suas observações, dúvidas e aplicações desta lição…"
        className="field-input"
      />
      {state && "error" in state && (
        <p className="mt-2 text-sm text-danger">{state.error}</p>
      )}
      <button className="btn btn-primary mt-3" disabled={pending}>
        {pending ? "Salvando…" : "Salvar anotações"}
      </button>
    </form>
  );
}
