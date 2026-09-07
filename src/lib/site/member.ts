import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/platform";
import { getPublishedSite } from "./queries";

const STAFF = ["owner", "pastor", "secretaria", "lider"];

/** Contexto do portal do membro. Roteia quem não é membro comum. */
export const getMemberContext = cache(async (slug: string) => {
  const data = await getPublishedSite(slug);
  if (!data) notFound();

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/igreja/${slug}/entrar`);
  const user = auth.user;

  if (isPlatformAdmin(user.email)) redirect("/admin");

  const { data: status } = await supabase.rpc("join_organization", { p_slug: slug });

  const [{ data: myRole }, { count: leadCount }, { data: profile }] = await Promise.all([
    supabase
      .from("organization_members")
      .select("role, status")
      .eq("org_id", data.org.id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("department_members")
      .select("department_id", { count: "exact", head: true })
      .eq("org_id", data.org.id)
      .eq("user_id", user.id)
      .eq("role", "leader")
      .eq("status", "active"),
    supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (myRole?.status === "active" && STAFF.includes(myRole.role))
    redirect(`/painel/igreja/${slug}`);
  if ((leadCount ?? 0) > 0) redirect(`/painel/igreja/${slug}/departamentos`);

  return {
    supabase,
    user,
    org: data.org,
    site: data.site,
    status: (status as string) ?? "pending",
    profile: (profile as { full_name: string | null; phone: string | null } | null) ?? null,
  };
});
