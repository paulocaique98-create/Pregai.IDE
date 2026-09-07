"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JOIN_INTENT_COOKIE } from "@/lib/site/member";

async function markIntent(slug: string) {
  const jar = await cookies();
  jar.set(JOIN_INTENT_COOKIE, slug, { path: "/", maxAge: 600 });
}

function safeNext(slug: string, next?: string | null) {
  return next && next.startsWith(`/igreja/${slug}/`)
    ? next
    : `/igreja/${slug}/membro`;
}

export async function memberSignIn(
  slug: string,
  next: string | null,
  _prev: unknown,
  formData: FormData,
) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  if (error) return { error: "E-mail ou senha inválidos." };
  await markIntent(slug);
  redirect(safeNext(slug, next));
}

export async function memberSignUp(
  slug: string,
  next: string | null,
  _prev: unknown,
  formData: FormData,
) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
    options: { data: { full_name: String(formData.get("full_name")) } },
  });
  if (error) return { error: error.message };
  await markIntent(slug);
  redirect(safeNext(slug, next));
}
