"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JOIN_INTENT_COOKIE } from "@/lib/site/member";

export async function confirmJoinChurch(slug: string) {
  const jar = await cookies();
  jar.set(JOIN_INTENT_COOKIE, slug, { path: "/", maxAge: 600 });
  const supabase = await createClient();
  await supabase.rpc("join_organization", { p_slug: slug });
  revalidatePath(`/igreja/${slug}/membro`);
  redirect(`/igreja/${slug}/membro`);
}

export async function joinDepartment(slug: string, formData: FormData) {
  const deptId = String(formData.get("dept_id"));
  const supabase = await createClient();
  await supabase.rpc("request_join_department", { p_dept: deptId });
  revalidatePath(`/igreja/${slug}/membro`);
}

export async function leaveDepartment(slug: string, formData: FormData) {
  const deptId = String(formData.get("dept_id"));
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (auth.user) {
    await supabase
      .from("department_members")
      .delete()
      .eq("department_id", deptId)
      .eq("user_id", auth.user.id);
  }
  revalidatePath(`/igreja/${slug}/membro`);
}

export async function updateProfile(slug: string, formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase
    .from("profiles")
    .update({
      full_name: String(formData.get("full_name") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
    })
    .eq("user_id", auth.user.id);
  revalidatePath(`/igreja/${slug}/membro/perfil`);
  revalidatePath(`/igreja/${slug}/membro`);
}
