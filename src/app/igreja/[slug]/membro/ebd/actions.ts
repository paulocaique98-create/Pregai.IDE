"use server";

import { getMemberContext } from "@/lib/site/member";

export async function saveNote(
  slug: string,
  lessonKey: string,
  _prev: unknown,
  formData: FormData,
): Promise<{ savedAt: string } | { error: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lessonKey)) return { error: "Lição inválida." };
  const ctx = await getMemberContext(slug);
  const content = String(formData.get("content") ?? "").slice(0, 20000);

  const { error } = await ctx.supabase.from("lesson_notes").upsert(
    {
      org_id: ctx.org.id,
      user_id: ctx.user.id,
      lesson_key: lessonKey,
      content,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id,user_id,lesson_key" },
  );
  if (error) return { error: "Não foi possível salvar." };
  return { savedAt: new Date().toISOString() };
}
