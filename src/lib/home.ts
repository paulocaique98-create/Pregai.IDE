import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/platform";

const STAFF = ["owner", "pastor", "secretaria", "lider"];

/** Decide para onde mandar o usuário logado, conforme suas permissões. */
export async function resolveHome(): Promise<string> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return "/entrar";
  const platformAdmin = isPlatformAdmin(user.email);

  const [{ data: memberships }, { data: profile }] = await Promise.all([
    supabase
      .from("organization_members")
      .select("role, status, org_id, organizations(slug)")
      .eq("user_id", user.id),
    supabase
      .from("profiles")
      .select("primary_org_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const rows = (memberships ?? []) as unknown as {
    role: string;
    status: string;
    org_id: string;
    organizations: { slug: string } | null;
  }[];
  const slugFor = (orgId?: string) =>
    rows.find((r) => r.org_id === orgId)?.organizations?.slug;
  const dest = (r: { role: string; organizations: { slug: string } | null }) =>
    STAFF.includes(r.role)
      ? `/painel/igreja/${r.organizations!.slug}`
      : `/igreja/${r.organizations!.slug}/membro`;

  // Igreja principal, se ativa
  const primarySlug = profile?.primary_org_id ? slugFor(profile.primary_org_id) : null;
  const primaryRow = rows.find(
    (r) => r.org_id === profile?.primary_org_id && r.status === "active" && r.organizations,
  );
  if (primarySlug && primaryRow) return dest(primaryRow);

  const staff = rows.filter((r) => r.status === "active" && STAFF.includes(r.role) && r.organizations);

  // Super-admin da plataforma: só cai em /admin se não estiver rodando uma única igreja.
  if (platformAdmin && staff.length !== 1) return "/admin";

  if (staff.length === 1) return `/painel/igreja/${staff[0].organizations!.slug}`;
  if (staff.length > 1) return "/painel";

  // líder de departamento
  const { data: leads } = await supabase
    .from("department_members")
    .select("organizations:org_id(slug)")
    .eq("user_id", user.id)
    .eq("role", "leader")
    .eq("status", "active")
    .limit(1);
  const leadSlug = (leads?.[0] as { organizations?: { slug: string } } | undefined)?.organizations
    ?.slug;
  if (leadSlug) return `/painel/igreja/${leadSlug}/departamentos`;

  const activeMembers = rows.filter(
    (r) => r.role === "membro" && r.status === "active" && r.organizations,
  );
  if (activeMembers.length === 1)
    return `/igreja/${activeMembers[0].organizations!.slug}/membro`;
  if (activeMembers.length > 1) return "/painel"; // deixa a pessoa escolher

  const pending = rows.find((r) => r.role === "membro" && r.organizations);
  if (pending?.organizations) return `/igreja/${pending.organizations.slug}/membro`;

  return "/painel";
}
