// Regras de "Configurações da Igreja" — espelho do que a RPC update_org_settings
// impõe no banco. Só UX + testes; a autorização real é do banco.

export type MemberMode = "approval" | "open";
export type OrgRole = "owner" | "pastor" | "secretaria" | "lider" | "membro";

export const MEMBER_MODE_LABEL: Record<MemberMode, string> = {
  approval: "Aprovação manual",
  open: "Entrada automática",
};

export const MEMBER_MODE_HINT: Record<MemberMode, string> = {
  approval:
    "Quem se cadastra fica “aguardando” até um responsável aprovar. Recomendado.",
  open: "Qualquer pessoa que se cadastrar já entra como membro ativo, sem aprovação.",
};

/** Quem pode abrir/alterar a tela de configurações. */
export function canEditOrgSettings(role: OrgRole | null): boolean {
  return role === "owner" || role === "pastor";
}

export type SettingsInput = { name?: string; memberMode?: string };

export function validateOrgSettings(
  input: SettingsInput,
): { ok: true; name: string; memberMode: MemberMode } | { ok: false; error: string } {
  const name = (input.name ?? "").trim();
  if (!name) return { ok: false, error: "O nome da igreja é obrigatório." };
  if (name.length > 120) return { ok: false, error: "Nome muito longo (máx. 120 caracteres)." };
  if (input.memberMode !== "approval" && input.memberMode !== "open") {
    return { ok: false, error: "Modo de entrada inválido." };
  }
  return { ok: true, name, memberMode: input.memberMode };
}
