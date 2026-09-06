import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/entrar");
  return { user: data.user, supabase };
}

export type Membership = {
  role: string;
  status: "pending" | "active" | "blocked";
  organizations: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    subscription_status: string;
  };
};

const STAFF_ROLES = ["owner", "pastor", "secretaria", "lider"];

export async function getMemberships() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("organization_members")
    .select(
      "role, status, organizations(id, name, slug, plan, subscription_status)",
    )
    .eq("user_id", user.id);
  const all = (data ?? []) as unknown as Membership[];
  return {
    all,
    admin: all.filter((m) => m.status === "active" && STAFF_ROLES.includes(m.role)),
    memberOf: all.filter((m) => m.role === "membro"),
  };
}
