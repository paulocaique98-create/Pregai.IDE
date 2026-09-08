// Regras de Avisos — espelho do que as RPCs impõem no banco (migration 0027).
// Só UX + testes; a autorização real é do banco.

export type OrgRole = "owner" | "pastor" | "secretaria" | "lider" | "membro";

const MANAGERS: OrgRole[] = ["owner", "pastor", "secretaria"];

/** Quem cria / edita / publica / exclui avisos. `lider` = somente leitura. */
export function canManageAnnouncements(role: OrgRole | null): boolean {
  return role != null && MANAGERS.includes(role);
}

export const TITLE_MAX = 200;
export const BODY_MAX = 5000;

export type AnnouncementInput = { title?: string; body?: string };

export function validateAnnouncement(
  input: AnnouncementInput,
): { ok: true; title: string; body: string } | { ok: false; error: string } {
  const title = (input.title ?? "").trim();
  const body = (input.body ?? "").trim();
  if (!title) return { ok: false, error: "O título do aviso é obrigatório." };
  if (title.length > TITLE_MAX)
    return { ok: false, error: `Título muito longo (máx. ${TITLE_MAX}).` };
  if (body.length > BODY_MAX)
    return { ok: false, error: `Texto muito longo (máx. ${BODY_MAX}).` };
  return { ok: true, title, body };
}
