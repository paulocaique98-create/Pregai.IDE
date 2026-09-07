import { getOrgForPanel } from "@/lib/site/queries";
import type { MemberStatus, OrgRole } from "./policy";

export const PAGE_SIZE = 25;

export type MemberRow = {
  user_id: string;
  role: OrgRole;
  status: MemberStatus;
  created_at: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  departments: string[];
};

export type MembersPage = {
  rows: MemberRow[];
  total: number;
  limit: number;
  offset: number;
  actor_role: OrgRole | null;
  can_manage: boolean;
  can_role: boolean;
  scoped: boolean;
};

export type MemberFilters = {
  search?: string;
  status?: MemberStatus | "";
  role?: OrgRole | "";
  dept?: string;
  sort?: "recent" | "name" | "oldest";
  page?: number;
};

export async function listMembers(slug: string, f: MemberFilters) {
  const ctx = await getOrgForPanel(slug);
  if (!ctx) return null;
  const page = Math.max(1, f.page ?? 1);
  const { data, error } = await ctx.supabase.rpc("list_members", {
    p_org: ctx.org.id,
    p_search: f.search || null,
    p_status: f.status || null,
    p_role: f.role || null,
    p_dept: f.dept || null,
    p_sort: f.sort || "recent",
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  if (error) throw new Error(error.message);
  return { ctx, result: data as MembersPage, page };
}

export type MemberDetail = {
  user_id: string;
  role: OrgRole;
  status: MemberStatus;
  created_at: string;
  approved_at: string | null;
  blocked_at: string | null;
  blocked_reason: string | null;
  role_updated_at: string | null;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  departments: { name: string; role: string }[];
  can_manage: boolean;
  can_role: boolean;
};

export async function getMemberDetail(slug: string, userId: string) {
  const ctx = await getOrgForPanel(slug);
  if (!ctx) return null;
  const [{ data, error }, audit] = await Promise.all([
    ctx.supabase.rpc("get_member", { p_org: ctx.org.id, p_user: userId }),
    ctx.supabase.rpc("member_audit", { p_org: ctx.org.id, p_user: userId }),
  ]);
  if (error) throw new Error(error.message);
  return {
    ctx,
    member: data as MemberDetail,
    audit: (audit.data as AuditEntry[] | null) ?? [],
  };
}

export type AuditEntry = {
  id: string;
  action: string;
  actor_user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};
