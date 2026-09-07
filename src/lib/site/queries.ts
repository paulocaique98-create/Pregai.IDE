import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import type { SiteConfig } from "./schema";

export const getOrgForMember = cache(async (slug: string) => {
  const { supabase, user } = await requireUser();
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug, plan, subscription_status")
    .eq("slug", slug)
    .maybeSingle();
  if (!org) return null;

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("org_id", org.id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .in("role", ["owner", "pastor", "secretaria", "lider"])
    .maybeSingle();
  if (!membership) return null;

  return { org, role: membership.role as string, supabase };
});

const STAFF = ["owner", "pastor", "secretaria", "lider"];

/** Entrada no painel: staff da igreja OU líder de algum departamento. */
export const getOrgForPanel = cache(async (slug: string) => {
  const { supabase, user } = await requireUser();
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug, plan, subscription_status")
    .eq("slug", slug)
    .maybeSingle();
  if (!org) return null;

  const [{ data: membership }, { count }] = await Promise.all([
    supabase
      .from("organization_members")
      .select("role, status")
      .eq("org_id", org.id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("department_members")
      .select("department_id", { count: "exact", head: true })
      .eq("org_id", org.id)
      .eq("user_id", user.id)
      .eq("role", "leader")
      .eq("status", "active"),
  ]);

  const isStaff = membership?.status === "active" && STAFF.includes(membership.role);
  const leadsAny = (count ?? 0) > 0;
  if (!isStaff && !leadsAny) return null;

  return { org, supabase, user, role: membership?.role ?? "membro", isStaff, leadsAny };
});

export const getSiteConfig = cache(async (orgId: string) => {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("site_configs")
    .select("*")
    .eq("org_id", orgId)
    .maybeSingle();
  return data as (SiteConfig & { org_id: string }) | null;
});

export const getPublishedSite = cache(async (slug: string) => {
  // client anon; RLS libera leitura quando is_published = true
  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (!org) return null;

  const { data: site } = await supabase
    .from("site_configs")
    .select("*")
    .eq("org_id", org.id)
    .maybeSingle();
  if (!site || !site.is_published) return null;

  const [{ data: ministries }, { data: events }] = await Promise.all([
    supabase.from("site_ministries").select("*").eq("org_id", org.id).order("sort_order"),
    supabase
      .from("site_events")
      .select("*")
      .eq("org_id", org.id)
      .order("event_date", { ascending: true, nullsFirst: false })
      .order("sort_order"),
  ]);

  return { org, site: site as SiteConfig, ministries: ministries ?? [], events: events ?? [] };
});
