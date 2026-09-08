// FASE 2 · Tela 2 — verificação de segurança de "Avisos".
//   node scripts/phase2-avisos-check.mjs

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

const tag = "p2avs_" + Date.now();
let pass = 0,
  fail = 0;
function check(name, ok, detail = "") {
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}
async function admin(path, opts = {}) {
  const r = await fetch(`${URL_}${path}`, {
    ...opts,
    headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  const t = await r.text();
  let b;
  try {
    b = t ? JSON.parse(t) : null;
  } catch {
    b = t;
  }
  return { status: r.status, body: b };
}
const createUser = async (email) =>
  (await admin("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({ email, password: "Test123456!", email_confirm: true }),
  })).body.id;
const token = async (email) =>
  (
    await (
      await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { apikey: ANON, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "Test123456!" }),
      })
    ).json()
  ).access_token;
async function asUser(tok, path, opts = {}) {
  const r = await fetch(`${URL_}${path}`, {
    ...opts,
    headers: { apikey: ANON, Authorization: `Bearer ${tok}`, "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  const t = await r.text();
  let b;
  try {
    b = t ? JSON.parse(t) : null;
  } catch {
    b = t;
  }
  return { status: r.status, body: b };
}
const rpc = (tok, fn, args) =>
  asUser(tok, `/rest/v1/rpc/${fn}`, { method: "POST", body: JSON.stringify(args) });

const users = [];
const orgs = [];

async function main() {
  const mk = async (label) => {
    const email = `${tag}_${label}@example.com`;
    const id = await createUser(email);
    users.push(id);
    return { id, email, tok: await token(email) };
  };
  const ownerA = await mk("ownerA");
  const pastorA = await mk("pastorA");
  const secA = await mk("secA");
  const liderA = await mk("liderA");
  const membroA = await mk("membroA");
  const ownerB = await mk("ownerB");

  let r = await rpc(ownerA.tok, "create_organization", { p_name: `A ${tag}`, p_slug: `a-${tag}` });
  const orgA = r.body.id;
  orgs.push(orgA);
  r = await rpc(ownerB.tok, "create_organization", { p_name: `B ${tag}`, p_slug: `b-${tag}` });
  const orgB = r.body.id;
  orgs.push(orgB);

  await admin("/rest/v1/organization_members", {
    method: "POST",
    body: JSON.stringify([
      { org_id: orgA, user_id: pastorA.id, role: "pastor", status: "active" },
      { org_id: orgA, user_id: secA.id, role: "secretaria", status: "active" },
      { org_id: orgA, user_id: liderA.id, role: "lider", status: "active" },
      { org_id: orgA, user_id: membroA.id, role: "membro", status: "active" },
    ]),
  });

  // aviso base da Org B (para cross-tenant)
  r = await admin("/rest/v1/announcements", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ org_id: orgB, title: "B", body: "", is_published: true }),
  });
  const avisoB = r.body[0].id;

  // --- managers criam/editam/publicam --------------------------------
  r = await rpc(ownerA.tok, "create_announcement", { p_org: orgA, p_title: "Culto especial", p_body: "domingo", p_is_pinned: true, p_publish: true });
  check("owner cria aviso", typeof r.body === "string", `id ${r.body}`);
  const av1 = r.body;
  r = await rpc(pastorA.tok, "create_announcement", { p_org: orgA, p_title: "Reunião", p_body: "", p_publish: false });
  check("pastor cria rascunho", typeof r.body === "string");
  const av2 = r.body;
  r = await rpc(secA.tok, "update_announcement", { p_id: av1, p_title: "Culto especial (editado)", p_body: "domingo 19h", p_is_pinned: false });
  check("secretaria edita aviso", r.status < 300, `status ${r.status}`);
  r = await rpc(secA.tok, "set_announcement_published", { p_id: av2, p_published: true });
  check("secretaria publica rascunho", r.status < 300, `status ${r.status}`);
  r = await rpc(pastorA.tok, "set_announcement_published", { p_id: av2, p_published: false });
  check("pastor despublica aviso", r.status < 300, `status ${r.status}`);

  // --- lider NÃO gerencia -------------------------------------------
  r = await rpc(liderA.tok, "create_announcement", { p_org: orgA, p_title: "Hack", p_body: "" });
  check("lider NÃO cria aviso (RPC)", r.status >= 400, `status ${r.status}`);
  r = await rpc(liderA.tok, "update_announcement", { p_id: av1, p_title: "x", p_body: "", p_is_pinned: false });
  check("lider NÃO edita aviso (RPC)", r.status >= 400, `status ${r.status}`);
  r = await rpc(liderA.tok, "set_announcement_published", { p_id: av1, p_published: false });
  check("lider NÃO despublica aviso (RPC)", r.status >= 400, `status ${r.status}`);
  r = await rpc(liderA.tok, "delete_announcement", { p_id: av1 });
  check("lider NÃO exclui aviso (RPC)", r.status >= 400, `status ${r.status}`);
  r = await asUser(liderA.tok, `/rest/v1/announcements`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ org_id: orgA, title: "direto", is_published: true }),
  });
  check("lider NÃO insere aviso (REST/RLS)", r.status >= 400 || (Array.isArray(r.body) && r.body.length === 0), `status ${r.status}`);
  r = await asUser(liderA.tok, `/rest/v1/announcements?id=eq.${av1}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ title: "hackeado" }),
  });
  check("lider NÃO edita aviso (REST/RLS)", Array.isArray(r.body) && r.body.length === 0, `rows ${Array.isArray(r.body) ? r.body.length : "?"}`);
  r = await asUser(liderA.tok, `/rest/v1/announcements?id=eq.${av1}`, { method: "DELETE", headers: { Prefer: "return=representation" } });
  check("lider NÃO exclui aviso (REST/RLS)", Array.isArray(r.body) && r.body.length === 0, `rows ${Array.isArray(r.body) ? r.body.length : "?"}`);

  // --- lider LÊ (read-only) ----------------------------------------
  r = await asUser(liderA.tok, `/rest/v1/announcements?org_id=eq.${orgA}&select=id`);
  check("lider LÊ avisos (somente leitura)", Array.isArray(r.body) && r.body.length >= 1, `rows ${Array.isArray(r.body) ? r.body.length : "?"}`);

  // --- membro comum não lê rascunho -------------------------------
  r = await asUser(membroA.tok, `/rest/v1/announcements?org_id=eq.${orgA}&is_published=eq.false&select=id`);
  check("membro comum não lê rascunhos", Array.isArray(r.body) && r.body.length === 0, `rows ${Array.isArray(r.body) ? r.body.length : "?"}`);

  // --- cross-tenant --------------------------------------------
  r = await rpc(ownerA.tok, "update_announcement", { p_id: avisoB, p_title: "x", p_body: "", p_is_pinned: false });
  check("cross-tenant: owner A não edita aviso da Org B", r.status >= 400, `status ${r.status}`);
  r = await rpc(ownerA.tok, "delete_announcement", { p_id: avisoB });
  check("cross-tenant: owner A não exclui aviso da Org B", r.status >= 400, `status ${r.status}`);
  r = await rpc(ownerA.tok, "set_announcement_published", { p_id: avisoB, p_published: false });
  check("cross-tenant: owner A não despublica aviso da Org B", r.status >= 400, `status ${r.status}`);

  // --- org_id imutável --------------------------------------
  r = await asUser(ownerA.tok, `/rest/v1/announcements?id=eq.${av1}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ org_id: orgB }),
  });
  check("org_id do aviso não muda via REST", Array.isArray(r.body) && r.body.length === 0, `status ${r.status}`);

  // --- validação -------------------------------------------
  r = await rpc(ownerA.tok, "create_announcement", { p_org: orgA, p_title: "   ", p_body: "" });
  check("título vazio é rejeitado", r.status >= 400, `status ${r.status}`);

  // --- auditoria + notificações ----------------------------
  r = await admin(`/rest/v1/audit_logs?org_id=eq.${orgA}&entity_type=eq.announcement&select=action,entity_id`);
  const actions = new Set((r.body ?? []).map((a) => a.action));
  check("auditoria: announcement.create/update/publish/unpublish registradas",
    actions.has("announcement.create") && actions.has("announcement.update") && actions.has("announcement.publish") && actions.has("announcement.unpublish"),
    [...actions].join(","));

  r = await rpc(ownerA.tok, "delete_announcement", { p_id: av1 });
  check("owner exclui aviso", r.status < 300, `status ${r.status}`);
  r = await admin(`/rest/v1/audit_logs?org_id=eq.${orgA}&action=eq.announcement.delete&select=entity_id`);
  check("auditoria: announcement.delete registrada com entity_id", (r.body ?? []).some((a) => a.entity_id === av1));
}

async function cleanup() {
  for (const o of orgs) await admin(`/rest/v1/organizations?id=eq.${o}`, { method: "DELETE" });
  for (const u of users) await admin(`/auth/v1/admin/users/${u}`, { method: "DELETE" });
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
