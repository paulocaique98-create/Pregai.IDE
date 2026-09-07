import { cache } from "react";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/platform";
import { getPublishedSite } from "./queries";

const STAFF = ["owner", "pastor", "secretaria", "lider"];
export const JOIN_INTENT_COOKIE = "pregai_join_intent";

type OtherOrg = { slug: string; name: string; status: string };

/** Contexto do portal do membro. Roteia quem não é membro comum. */
export const getMemberContext = cache(async (slug: string) => {
  const data = await getPublishedSite(slug);
  if (!data) notFound();

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/igreja/${slug}/entrar`);
  const user = auth.user;

  if (isPlatformAdmin(user.email)) redirect("/admin");

  const [{ data: memberships }, { count: leadCount }, { data: profile }] =
    await Promise.all([
      supabase
        .from("organization_members")
        .select("role, status, org_id, organizations(slug, name)")
        .eq("user_id", user.id),
      supabase
        .from("department_members")
        .select("department_id", { count: "exact", head: true })
        .eq("org_id", data.org.id)
        .eq("user_id", user.id)
        .eq("role", "leader")
        .eq("status", "active"),
      supabase
        .from("profiles")
        .select("full_name, phone, primary_org_id")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  const rows = (memberships ?? []) as unknown as {
    role: string;
    status: string;
    org_id: string;
    organizations: { slug: string; name: string } | null;
  }[];
  const myRow = rows.find((r) => r.org_id === data.org.id) ?? null;
  const otherOrgs: OtherOrg[] = rows
    .filter((r) => r.org_id !== data.org.id && r.organizations)
    .map((r) => ({
      slug: r.organizations!.slug,
      name: r.organizations!.name,
      status: r.status,
    }));
  let status: string | null = myRow?.status ?? null;

  // Vínculo deliberado: só entra automaticamente se veio do login desta igreja,
  // ou se a pessoa ainda não participa de nenhuma outra.
  if (!myRow) {
    const jar = await cookies();
    const intent = jar.get(JOIN_INTENT_COOKIE)?.value;
    const establishedElsewhere = rows.some(
      (r) => r.status === "active" || r.status === "pending",
    );
    if (intent === slug || !establishedElsewhere) {
      const { data: joined } = await supabase.rpc("join_organization", { p_slug: slug });
      status = (joined as string) ?? "pending";
      if (status === "pending") {
        const { orgStaffEmails, sendEmail, tmpl } = await import("@/lib/email");
        const to = await orgStaffEmails(data.org.id);
        if (to.length) {
          const who = user.user_metadata?.full_name || user.email || "Alguém";
          await sendEmail({ to, ...tmpl.newPendingMember(data.org.name, slug, who) });
        }
      }
    } else {
      return {
        supabase,
        user,
        org: data.org,
        site: data.site,
        status: "needs_confirm" as const,
        profile: null,
        otherOrgs,
        activeMemberships: rows.filter((r) => r.status === "active").length,
      };
    }
  }

  if (status === "active" && STAFF.includes(myRow?.role ?? ""))
    redirect(`/painel/igreja/${slug}`);
  if ((leadCount ?? 0) > 0) redirect(`/painel/igreja/${slug}/departamentos`);

  return {
    supabase,
    user,
    org: data.org,
    site: data.site,
    status: (status as string) ?? "pending",
    profile:
      (profile as {
        full_name: string | null;
        phone: string | null;
        primary_org_id: string | null;
      } | null) ?? null,
    otherOrgs,
    activeMemberships: rows.filter((r) => r.status === "active").length,
  };
});
