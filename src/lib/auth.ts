import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/entrar");
  return { user: data.user, supabase };
}

export async function getMyOrgs() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("organization_members")
    .select("role, organizations(id, name, slug, plan, subscription_status)")
    .eq("user_id", user.id);
  return data ?? [];
}
