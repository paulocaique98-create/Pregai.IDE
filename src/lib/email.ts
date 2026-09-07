import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/site/urls";

const KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM || "Pregai <no-reply@pregai.app>";

/** Envia um e-mail via Resend. No-op se RESEND_API_KEY não estiver configurada. */
export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<void> {
  if (!KEY) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, ...opts }),
    });
  } catch {
    // e-mail não deve derrubar a operação principal
  }
}

/** E-mails da equipe pastoral (owner/pastor/secretaria) de uma igreja. */
export async function orgStaffEmails(orgId: string): Promise<string[]> {
  if (!KEY) return [];
  try {
    const db = createAdminClient();
    const { data } = await db
      .from("organization_members")
      .select("user_id")
      .eq("org_id", orgId)
      .eq("status", "active")
      .in("role", ["owner", "pastor", "secretaria"]);
    const ids = (data ?? []).map((r) => r.user_id);
    const emails: string[] = [];
    for (const id of ids) {
      const { data: u } = await db.auth.admin.getUserById(id);
      if (u.user?.email) emails.push(u.user.email);
    }
    return emails;
  } catch {
    return [];
  }
}

export async function userEmail(userId: string): Promise<string | null> {
  if (!KEY) return null;
  try {
    const { data } = await createAdminClient().auth.admin.getUserById(userId);
    return data.user?.email ?? null;
  } catch {
    return null;
  }
}

const shell = (title: string, body: string) => `
<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;color:#1b1a16">
  <h2 style="font-size:18px;margin:0 0 12px">${title}</h2>
  <div style="font-size:14px;line-height:1.6;color:#4b473e">${body}</div>
  <hr style="border:none;border-top:1px solid #e4e0d6;margin:24px 0" />
  <p style="font-size:12px;color:#857f72">Enviado pelo Pregai · ${appUrl()}</p>
</div>`;

export const tmpl = {
  memberApproved: (orgName: string, slug: string) => ({
    subject: `Seu cadastro na ${orgName} foi aprovado`,
    html: shell(
      `Bem-vindo(a) à ${orgName}`,
      `Seu cadastro de membro foi aprovado pela equipe da igreja.
       <br><br><a href="${appUrl()}/igreja/${slug}/membro" style="color:#8f6e38">Abrir a área do membro</a>`,
    ),
  }),
  newPendingMember: (orgName: string, slug: string, who: string) => ({
    subject: `Novo cadastro de membro na ${orgName}`,
    html: shell(
      `${who} pediu para ser membro`,
      `Uma pessoa se cadastrou pelo site e está aguardando aprovação.
       <br><br><a href="${appUrl()}/painel/igreja/${slug}/membros" style="color:#8f6e38">Ver na fila de aprovação</a>`,
    ),
  }),
  newPrayer: (orgName: string, slug: string, who: string, text: string) => ({
    subject: `Novo pedido de oração — ${orgName}`,
    html: shell(
      `Pedido de oração de ${who}`,
      `${text.slice(0, 400).replace(/\n/g, "<br>")}
       <br><br><a href="${appUrl()}/painel/igreja/${slug}/oracoes" style="color:#8f6e38">Abrir a fila de oração</a>`,
    ),
  }),
  newVisitor: (orgName: string, slug: string, who: string) => ({
    subject: `Visitante avisou que vai à ${orgName}`,
    html: shell(
      `${who} pretende visitar`,
      `Um visitante preencheu o formulário "planeje sua visita" no site.
       <br><br><a href="${appUrl()}/painel/igreja/${slug}/visitantes" style="color:#8f6e38">Ver os visitantes</a>`,
    ),
  }),
};
