import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import type { SiteConfig } from "./schema";

export async function getOrgForMember(slug: string) {
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
}

export async function getSiteConfig(orgId: string) {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("site_configs")
    .select("*")
    .eq("org_id", orgId)
    .maybeSingle();
  return data as (SiteConfig & { org_id: string }) | null;
}

export async function getPublishedSite(slug: string) {
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
      .order("sort_order"),
  ]);

  return { org, site: site as SiteConfig, ministries: ministries ?? [], events: events ?? [] };
}
