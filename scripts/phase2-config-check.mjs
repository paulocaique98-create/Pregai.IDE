// FASE 2 · Tela 1 — verificação de segurança de "Configurações da Igreja".
//   node scripts/phase2-config-check.mjs

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

const tag = "p2cfg_" + Date.now();
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
  return (await r.json()).access_token;
}
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
    ]),
  });

  // --- update_org_settings ------------------------------------------------
  r = await rpc(secA.tok, "update_org_settings", { p_org: orgA, p_name: "Hack", p_member_mode: "open" });
  check("secretaria NÃO altera configurações da igreja", r.status >= 400, `status ${r.status}`);
  r = await rpc(liderA.tok, "update_org_settings", { p_org: orgA, p_name: "Hack", p_member_mode: "open" });
  check("lider NÃO altera configurações da igreja", r.status >= 400, `status ${r.status}`);
  r = await rpc(ownerA.tok, "update_org_settings", { p_org: orgB, p_name: "X", p_member_mode: "approval" });
  check("cross-tenant: owner A não altera config da Org B", r.status >= 400, `status ${r.status}`);
  r = await rpc(ownerA.tok, "update_org_settings", { p_org: orgA, p_name: "", p_member_mode: "approval" });
  check("nome vazio é rejeitado", r.status >= 400, `status ${r.status}`);
  r = await rpc(ownerA.tok, "update_org_settings", { p_org: orgA, p_name: "Ok", p_member_mode: "auto" });
  check("member_mode inválido é rejeitado", r.status >= 400, `status ${r.status}`);
  r = await rpc(pastorA.tok, "update_org_settings", { p_org: orgA, p_name: "Igreja Renomeada", p_member_mode: "open" });
  check("pastor altera nome + member_mode", r.status < 300, `status ${r.status}`);
  r = await admin(`/rest/v1/organizations?id=eq.${orgA}&select=name,member_mode`);
  check(
    "config persistida",
    r.body?.[0]?.name === "Igreja Renomeada" && r.body?.[0]?.member_mode === "open",
    JSON.stringify(r.body?.[0]),
  );
  r = await admin(`/rest/v1/audit_logs?org_id=eq.${orgA}&action=eq.org.settings_change&select=id`);
  check("auditoria de org.settings_change gravada", Array.isArray(r.body) && r.body.length >= 1);

  // --- trigger de invariantes de organizations --------------------------
  r = await asUser(pastorA.tok, `/rest/v1/organizations?id=eq.${orgA}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ slug: "novo-slug-" + tag }),
  });
  check("PATCH slug via REST é rejeitado", r.status >= 400 || (Array.isArray(r.body) && r.body.length === 0), `status ${r.status}`);
  r = await asUser(pastorA.tok, `/rest/v1/organizations?id=eq.${orgA}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ subscription_status: "active", plan: "pro" }),
  });
  check("PATCH billing via REST é rejeitado", r.status >= 400 || (Array.isArray(r.body) && r.body.length === 0), `status ${r.status}`);

  // --- site: lider fora ------------------------------------------------
  r = await asUser(liderA.tok, `/rest/v1/site_configs?org_id=eq.${orgA}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ is_published: true }),
  });
  check("lider NÃO escreve em site_configs (RLS)", Array.isArray(r.body) && r.body.length === 0, `status ${r.status} rows ${Array.isArray(r.body) ? r.body.length : "?"}`);
  r = await rpc(liderA.tok, "set_site_published", { p_org: orgA, p_published: true });
  check("lider NÃO publica o site (RPC)", r.status >= 400, `status ${r.status}`);
  r = await rpc(secA.tok, "set_site_published", { p_org: orgA, p_published: true });
  check("secretaria publica o site", r.status < 300, `status ${r.status}`);
  r = await admin(`/rest/v1/audit_logs?org_id=eq.${orgA}&action=eq.site.publish&select=id`);
  check("auditoria de site.publish gravada", Array.isArray(r.body) && r.body.length >= 1);

  // pastor ainda edita o site (regressão)
  r = await asUser(pastorA.tok, `/rest/v1/site_configs?org_id=eq.${orgA}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ about: { description: "ok" } }),
  });
  check("pastor continua editando site_configs", Array.isArray(r.body) && r.body.length === 1, `rows ${Array.isArray(r.body) ? r.body.length : "?"}`);
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
