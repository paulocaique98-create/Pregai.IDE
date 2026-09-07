// FASE 1 — verificação de segurança do módulo Membros.
// Cria 2 orgs + usuários descartáveis, exercita as RPCs com JWT de cada papel,
// afirma os cenários P0 e limpa tudo ao final.
//
//   node scripts/phase1-security-check.mjs
//
// Requer .env.local com NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
// SUPABASE_SERVICE_ROLE_KEY.

import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SVC = env.SUPABASE_SERVICE_ROLE_KEY;

const tag = "p1sec_" + Date.now();
let pass = 0,
  fail = 0;
const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

async function admin(path, opts = {}) {
  const r = await fetch(`${URL_}${path}`, {
    ...opts,
    headers: {
      apikey: SVC,
      Authorization: `Bearer ${SVC}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  const txt = await r.text();
  let body;
  try {
    body = txt ? JSON.parse(txt) : null;
  } catch {
    body = txt;
  }
  return { status: r.status, body };
}

async function createUser(email) {
  const { body } = await admin("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({ email, password: "Test123456!", email_confirm: true }),
  });
  return body.id;
}

async function token(email) {
  const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "Test123456!" }),
  });
  const b = await r.json();
  return b.access_token;
}

// chamada autenticada como usuário comum
async function asUser(tok, path, opts = {}) {
  const r = await fetch(`${URL_}${path}`, {
    ...opts,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${tok}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  const txt = await r.text();
  let body;
  try {
    body = txt ? JSON.parse(txt) : null;
  } catch {
    body = txt;
  }
  return { status: r.status, body };
}
const rpc = (tok, fn, args) =>
  asUser(tok, `/rest/v1/rpc/${fn}`, { method: "POST", body: JSON.stringify(args) });

const users = [];
const orgs = [];

async function main() {
  // ---- seed ---------------------------------------------------------------
  const mk = async (label) => {
    const email = `${tag}_${label}@example.com`;
    const id = await createUser(email);
    users.push({ id, email, label });
    return { id, email, tok: await token(email) };
  };

  const ownerA = await mk("ownerA");
  const pastorA = await mk("pastorA");
  const secA = await mk("secA");
  const memberA = await mk("memberA");
  const pastor2A = await mk("pastor2A");
  const ownerB = await mk("ownerB");
  const memberB = await mk("memberB");

  // orgs via RPC create_organization (como o próprio owner)
  let r = await rpc(ownerA.tok, "create_organization", {
    p_name: `Org A ${tag}`,
    p_slug: `orga-${tag}`,
  });
  const orgA = r.body.id;
  orgs.push(orgA);
  r = await rpc(ownerB.tok, "create_organization", {
    p_name: `Org B ${tag}`,
    p_slug: `orgb-${tag}`,
  });
  const orgB = r.body.id;
  orgs.push(orgB);

  // vincula os demais à Org A diretamente no banco (service role)
  await admin("/rest/v1/organization_members", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify([
      { org_id: orgA, user_id: pastorA.id, role: "pastor", status: "active" },
      { org_id: orgA, user_id: secA.id, role: "secretaria", status: "active" },
      { org_id: orgA, user_id: memberA.id, role: "membro", status: "pending" },
      { org_id: orgA, user_id: pastor2A.id, role: "pastor", status: "active" },
      { org_id: orgB, user_id: memberB.id, role: "membro", status: "active" },
    ]),
  });

  // ---- P0-1: secretaria não promove a owner (REST direto) ---------------
  r = await asUser(secA.tok, `/rest/v1/organization_members?org_id=eq.${orgA}&user_id=eq.${memberA.id}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ role: "owner" }),
  });
  check(
    "P0-1 secretaria PATCH role=owner via REST é rejeitado",
    r.status >= 400 || (Array.isArray(r.body) && r.body.length === 0),
    `status ${r.status}`,
  );

  // secretaria não altera papel nem via RPC
  r = await rpc(secA.tok, "set_member_role", { p_org: orgA, p_user: memberA.id, p_role: "lider" });
  check("P0-4 secretaria set_member_role é rejeitado", r.status >= 400, `status ${r.status}`);

  // ---- P0-2: bloquear owner ---------------------------------------------
  r = await rpc(pastorA.tok, "block_member", { p_org: orgA, p_user: ownerA.id, p_reason: "x" });
  check("P0-2 pastor não bloqueia owner", r.status >= 400, `status ${r.status}`);
  r = await rpc(secA.tok, "block_member", { p_org: orgA, p_user: ownerA.id, p_reason: "x" });
  check("P0-2 secretaria não bloqueia owner", r.status >= 400, `status ${r.status}`);

  // pastor não bloqueia pastor
  r = await rpc(pastorA.tok, "block_member", { p_org: orgA, p_user: pastor2A.id });
  check("pastor não bloqueia outro pastor", r.status >= 400, `status ${r.status}`);

  // ---- P0-3: máquina de estados ---------------------------------------
  // aprovar memberA (pending->active) OK
  r = await rpc(secA.tok, "approve_member", { p_org: orgA, p_user: memberA.id });
  check("P0-3 secretaria aprova membro pendente (pending->active)", r.status < 300, `status ${r.status}`);
  // tentar aprovar de novo (não está pending)
  r = await rpc(secA.tok, "approve_member", { p_org: orgA, p_user: memberA.id });
  check("P0-3 aprovar quem já é ativo é rejeitado", r.status >= 400, `status ${r.status}`);
  // active -> pending via REST direto (trigger deve barrar)
  r = await asUser(secA.tok, `/rest/v1/organization_members?org_id=eq.${orgA}&user_id=eq.${memberA.id}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ status: "pending" }),
  });
  check("P0-3 active->pending via REST é rejeitado", r.status >= 400 || (Array.isArray(r.body) && r.body.length === 0), `status ${r.status} rows ${Array.isArray(r.body) ? r.body.length : "?"}`);
  // block OK, depois reactivate OK
  r = await rpc(pastorA.tok, "block_member", { p_org: orgA, p_user: memberA.id, p_reason: "teste" });
  check("bloquear membro ativo (active->blocked)", r.status < 300, `status ${r.status}`);
  r = await rpc(pastorA.tok, "reactivate_member", { p_org: orgA, p_user: memberA.id });
  check("reativar membro bloqueado (blocked->active)", r.status < 300, `status ${r.status}`);

  // ---- multi-tenant --------------------------------------------------
  r = await rpc(ownerA.tok, "approve_member", { p_org: orgB, p_user: memberB.id });
  check("cross-tenant: owner A não age em membro da Org B", r.status >= 400, `status ${r.status}`);
  r = await asUser(ownerA.tok, `/rest/v1/organization_members?org_id=eq.${orgB}&select=user_id`, {});
  check(
    "cross-tenant: owner A não lê membros da Org B",
    Array.isArray(r.body) && r.body.length === 0,
    `linhas ${Array.isArray(r.body) ? r.body.length : "?"}`,
  );

  // ---- líder de departamento (org-role) não administra ---------------
  // memberA vira 'lider' (owner faz)
  r = await rpc(ownerA.tok, "set_member_role", { p_org: orgA, p_user: memberA.id, p_role: "lider" });
  check("owner altera papel para lider", r.status < 300, `status ${r.status}`);
  r = await rpc(memberA.tok, "block_member", { p_org: orgA, p_user: pastorA.id });
  check("lider não bloqueia ninguém", r.status >= 400, `status ${r.status}`);
  r = await rpc(memberA.tok, "list_members", { p_org: orgA });
  check("lider sem departamento liderado não lista diretório", r.status >= 400, `status ${r.status}`);

  // ---- convites ----------------------------------------------------
  const tk = "invtok_" + tag + "_abcdefabcdef";
  r = await rpc(secA.tok, "create_invite", { p_org: orgA, p_token: tk, p_role: "membro" });
  check("secretaria cria convite de membro", r.status < 300, `status ${r.status}`);
  r = await rpc(secA.tok, "create_invite", { p_org: orgA, p_token: tk + "2", p_role: "pastor" });
  check("secretaria não convida pastor", r.status >= 400, `status ${r.status}`);
  r = await rpc(secA.tok, "create_invite", { p_org: orgA, p_token: tk + "3", p_role: "owner" });
  check("ninguém convida owner", r.status >= 400, `status ${r.status}`);
  r = await rpc(secA.tok, "create_invite", { p_org: orgA, p_token: tk + "4", p_auto_approve: true });
  check("secretaria não cria convite auto-approve", r.status >= 400, `status ${r.status}`);

  // aceitar (memberB entra na Org A por convite) e reusar
  r = await rpc(memberB.tok, "accept_invite", { p_token: tk });
  check("convite aceito uma vez", r.body?.result === "pending", `result ${r.body?.result}`);
  r = await rpc(memberA.tok, "accept_invite", { p_token: tk });
  check("convite não pode ser reutilizado (uso único)", r.body?.result === "used", `result ${r.body?.result}`);

  // convite expirado
  const tkExp = "invexp_" + tag + "_abcdefabcdef";
  await admin("/rest/v1/organization_invites", {
    method: "POST",
    body: JSON.stringify({
      org_id: orgA,
      token: tkExp,
      role: "membro",
      expires_at: new Date(Date.now() - 3600_000).toISOString(),
    }),
  });
  r = await rpc(memberA.tok, "accept_invite", { p_token: tkExp });
  check("convite expirado é rejeitado", r.body?.result === "expired", `result ${r.body?.result}`);

  // ---- happy path leitura ---------------------------------------------
  r = await rpc(ownerA.tok, "list_members", { p_org: orgA, p_limit: 50 });
  check(
    "owner lista diretório com e-mail e total",
    r.status < 300 && typeof r.body?.total === "number" && Array.isArray(r.body?.rows),
    `total ${r.body?.total}`,
  );
}

async function cleanup() {
  for (const o of orgs) await admin(`/rest/v1/organizations?id=eq.${o}`, { method: "DELETE" });
  for (const u of users) await admin(`/auth/v1/admin/users/${u.id}`, { method: "DELETE" });
}

main()
  .catch((e) => {
    console.error("ERRO", e);
    fail++;
  })
  .finally(async () => {
    await cleanup();
    console.log(`\n${pass} PASS · ${fail} FAIL`);
    process.exit(fail ? 1 : 0);
  });
