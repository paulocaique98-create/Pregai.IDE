"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 50);
}

export async function createOrg(_prev: unknown, formData: FormData) {
  const { supabase } = await requireUser();
  const name = String(formData.get("name")).trim();
  if (!name) return { error: "Informe o nome da igreja." };

  let slug = slugify(name);
  if (!slug) return { error: "Nome inválido." };

  // resolve colisão de slug
  for (let i = 0; i < 5; i++) {
    const { data: exists } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!exists) break;
    slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const { error } = await supabase.rpc("create_organization", {
    p_name: name,
    p_slug: slug,
  });
  if (error) return { error: "Não foi possível criar. Tente outro nome." };

  redirect("/painel");
}
