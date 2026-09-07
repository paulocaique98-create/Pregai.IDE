import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/platform";

/** Decide para onde mandar o usuário logado, conforme suas permissões. */
export async function resolveHome(): Promise<string> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return "/entrar";

  if (isPlatformAdmin(user.email)) return "/admin";

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("role, status, organizations(slug)")
    .eq("user_id", user.id);

  const rows = (memberships ?? []) as unknown as {
    role: string;
    status: string;
    organizations: { slug: string } | null;
  }[];

  const staff = rows.filter(
    (r) =>
      r.status === "active" &&
      ["owner", "pastor", "secretaria", "lider"].includes(r.role),
  );
  if (staff.length === 1 && staff[0].organizations)
    return `/painel/igreja/${staff[0].organizations.slug}`;
  if (staff.length > 1) return "/painel";

  // líder de departamento?
  const { data: leads } = await supabase
    .from("department_members")
    .select("organizations:org_id(slug)")
    .eq("user_id", user.id)
    .eq("role", "leader")
    .eq("status", "active")
    .limit(1);
  const leadSlug = (leads?.[0] as { organizations?: { slug: string } } | undefined)
    ?.organizations?.slug;
  if (leadSlug) return `/painel/igreja/${leadSlug}/departamentos`;

  const activeMember = rows.find(
    (r) => r.role === "membro" && r.status === "active" && r.organizations,
  );
  if (activeMember?.organizations)
    return `/igreja/${activeMember.organizations.slug}/membro`;

  const pendingMember = rows.find(
    (r) => r.role === "membro" && r.organizations,
  );
  if (pendingMember?.organizations)
    return `/igreja/${pendingMember.organizations.slug}/membro`;

  return "/painel";
}
