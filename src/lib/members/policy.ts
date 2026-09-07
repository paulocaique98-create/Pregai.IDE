// Espelho, no cliente, das regras que o banco impõe (migrations 0020–0023).
// Serve para (a) esconder controles que o papel não pode usar e (b) testes unitários.
// A AUTORIZAÇÃO REAL é do banco — isto é só UX.

export type OrgRole = "owner" | "pastor" | "secretaria" | "lider" | "membro";
export type MemberStatus = "pending" | "active" | "blocked";
export type MemberAction =
  | "approve"
  | "block"
  | "reactivate"
  | "set_role"
  | "create_invite"
  | "invite_staff";

export const STATUS_TRANSITIONS: Record<MemberStatus, MemberStatus[]> = {
  pending: ["active"],
  active: ["blocked"],
  blocked: ["active"],
};

export function isValidTransition(from: MemberStatus, to: MemberStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

const MANAGE_ROLES: OrgRole[] = ["owner", "pastor", "secretaria"];
const ROLE_ROLES: OrgRole[] = ["owner", "pastor"];

/**
 * `actor` age sobre `target` (papel do alvo) executando `action`.
 * `self` = ator e alvo são a mesma pessoa.
 */
export function canManage(
  actor: OrgRole | null,
  action: MemberAction,
  target?: { role?: OrgRole; self?: boolean },
): boolean {
  if (!actor) return false;
  const targetRole = target?.role;
  const self = target?.self ?? false;

  switch (action) {
    case "approve":
      return MANAGE_ROLES.includes(actor);

    case "block":
    case "reactivate": {
      if (!MANAGE_ROLES.includes(actor)) return false;
      if (self) return false;
      if (targetRole === "owner") return false;
      if (targetRole === "pastor" && actor !== "owner") return false;
      return true;
    }

    case "set_role": {
      if (!ROLE_ROLES.includes(actor)) return false;
      if (self) return false;
      if (targetRole === "owner") return false;
      if (targetRole === "pastor" && actor !== "owner") return false;
      return true;
    }

    case "create_invite":
      return MANAGE_ROLES.includes(actor);

    case "invite_staff":
      return actor === "owner" || actor === "pastor";
  }
}

/** Papéis que `actor` pode atribuir a um membro comum. */
export function assignableRoles(actor: OrgRole | null): OrgRole[] {
  if (actor === "owner") return ["pastor", "secretaria", "lider", "membro"];
  if (actor === "pastor") return ["secretaria", "lider", "membro"];
  return [];
}

export const ROLE_LABEL: Record<OrgRole, string> = {
  owner: "Proprietário",
  pastor: "Pastor",
  secretaria: "Secretaria",
  lider: "Líder",
  membro: "Membro",
};

export const STATUS_LABEL: Record<MemberStatus, string> = {
  pending: "Aguardando",
  active: "Ativo",
  blocked: "Bloqueado",
};
