"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function memberSignIn(slug: string, _prev: unknown, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  if (error) return { error: "E-mail ou senha inválidos." };
  redirect(`/igreja/${slug}/membro`);
}

export async function memberSignUp(slug: string, _prev: unknown, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
    options: { data: { full_name: String(formData.get("full_name")) } },
  });
  if (error) return { error: error.message };
  redirect(`/igreja/${slug}/membro`);
}
