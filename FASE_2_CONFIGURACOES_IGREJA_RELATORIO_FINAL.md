# RELATÓRIO FINAL — FASE 2 · TELA 1 — CONFIGURAÇÕES DA IGREJA

Data: 2026-09-07 · Produção: https://pregai-ide.vercel.app · Mapa: `FASE_2_MAPA_TELAS_OWNER.md`

---

## 1. Objetivo

Entregar a primeira tela da área Owner: **Configurações da Igreja** (identidade +
política de entrada de membros), e no mesmo passo blindar a fronteira de autorização
da área de operação — o papel `lider` deixava de ser "limitado aos departamentos" e
controlava o site público inteiro.

## 2. Estado anterior

- **Não existia** tela de configurações. `organizations.name` só mudava indiretamente;
  `member_mode` ('approval'|'open') e `custom_domain` **sem nenhuma UI e sem nenhuma
  referência no código**.
- `/painel/igreja/[slug]` (o "Início") é o Editor do site, acessível e gravável por
  **owner, pastor, secretaria e lider**.
- `saveSite` / `setPublished` / `uploadSiteAsset`: guard só `if (!ctx)`. Sem auditoria.
- `organizations` UPDATE (RLS `owners update org`) = owner/pastor, **sem trigger** —
  um pastor podia via REST direto trocar `slug` (quebra todos os links) ou mexer em
  campos de billing.

## 3. Problemas encontrados (do mapa)

| # | Problema | Gravidade | Status |
|---|---|---|---|
| F2-A1 | `lider` (papel de organização) edita/publica o site público | **P0** | **Corrigido** (site) |
| F2-A2 | `saveSite`/`setPublished`/`uploadSiteAsset` sem checagem de papel; sem auditoria de publish | P1 | **Corrigido** |
| F2-A3 | `member_mode` sem UI; toggle para `open` é decisão de segurança | P1 | **Corrigido** (UI com confirmação + RPC) |
| F2-A4 | `slug` / billing de `organizations` alteráveis por REST direto | P1 | **Corrigido** (trigger) |
| F2-A5 | `lider` cria/exclui departamentos de toda a igreja | P2 | **Backlog** (tela Departamentos) |
| F2-A6 | Área Owner sem `audit_logs` | P2 | **Parcial** (config + publish auditados) |
| F2-A7 | `error.message` cru do Postgres na UI (`saveSite`) | P2 | **Corrigido** (mensagens genéricas) |

## 4. Regras de negócio (definidas / confirmadas)

- **Editar Configurações da Igreja**: apenas `owner` e `pastor`. (Consistente com a
  RLS `owners update org` já existente. `secretaria` fica de fora — registrado.)
- **`member_mode = 'open'`** (entrada automática): exige confirmação explícita na UI
  ("qualquer pessoa vira membro ativo sem aprovação").
- **`slug`**: somente-leitura nesta fase (CONFLITO F2-C2 — precisa de sistema de
  redirects). Não editável nem por owner.
- **Billing** (`plan`, `subscription_status`, `stripe_customer_id`, `trial_ends_at`):
  imutável por UPDATE normal (Stripe é Fase futura).
- **Site público**: editar/publicar = `owner` / `pastor` / `secretaria`. `lider` de
  organização **não** (CONFLITO F2-C1 — decisão adotada: alinhar à Fase 1).

## 5. Permissões (matriz da tela)

| Ação | Owner | Pastor | Secretaria | Líder | Membro |
|---|:-:|:-:|:-:|:-:|:-:|
| Ver aba Configurações | SIM | SIM | não | não | não |
| Alterar nome da igreja | SIM | SIM | não | não | não |
| Alterar modo de entrada | SIM | SIM | não | não | não |
| Alterar slug | não (fase futura) | não | não | não | não |
| Editar/publicar o site | SIM | SIM | SIM | **não (mudou)** | não |

## 6. Alterações de frontend

- **Nova**: `configuracoes/page.tsx` (server; guard `canEditOrgSettings` + `redirect` para `/membros`), `configuracoes/SettingsForm.tsx` (client; identidade, rádio de modo, confirmação para `open`, feedback), `configuracoes/actions.ts` (`saveOrgSettings` → RPC, `SettingsResult`).
- `[slug]/page.tsx` (Editor do site): `redirect` para `/membros` se o papel não for owner/pastor/secretaria.
- `[slug]/actions.ts`: `SITE_EDITORS` guard em `saveSite`/`uploadSiteAsset`; `setPublished` passa pela RPC `set_site_published`; mensagens de erro genéricas (sem vazar Postgres).
- `Shell.tsx` + `layout.tsx`: item de nav **Configurações** (`settings`) só quando `canConfig` (owner/pastor).

## 7. Alterações de backend / RPC

- `update_org_settings(p_org, p_name, p_member_mode)` — SECURITY DEFINER; ator owner/pastor; valida nome (1–120) e modo; grava `audit_logs` (`org.settings_change`, com valores anteriores).
- `set_site_published(p_org, p_published)` — SECURITY DEFINER; ator owner/pastor/secretaria; grava `audit_logs` (`site.publish` / `site.unpublish`).

## 8. Alterações de banco (migration `0026_org_settings.sql`)

- Função + trigger `enforce_org_invariants` (BEFORE UPDATE em `organizations`):
  `id`, `slug`, `created_at`, `plan`, `stripe_customer_id`, `subscription_status`,
  `trial_ends_at` imutáveis; `member_mode` restrito a `approval|open`.
- Nenhuma coluna nova (todas já existiam).

## 9. Alterações RLS

- `site_configs` · `team writes site`: **removido `lider`** → agora `owner|pastor|secretaria`.
- Demais policies inalteradas. `organizations` UPDATE continua `owner|pastor` (o trigger é a nova barreira de colunas).

## 10. Migrations criadas

`supabase/migrations/0026_org_settings.sql` — aplicada em produção via `npx supabase db push`. Nenhuma migration histórica editada.

## 11. Segurança — cenários verificados

`scripts/phase2-config-check.mjs` (cria 5 usuários + 2 orgs descartáveis, limpa ao final) — **15/15 PASS**:

| Cenário | Resultado |
|---|---|
| secretaria → `update_org_settings` | **rejeitado** |
| lider → `update_org_settings` | **rejeitado** |
| cross-tenant: owner A → config da Org B | **rejeitado** |
| nome vazio / `member_mode` inválido | **rejeitado** |
| pastor → altera nome + `member_mode` | **permitido**, persistido, auditado |
| PATCH `slug` via REST direto | **rejeitado** (trigger) |
| PATCH `subscription_status`/`plan` via REST | **rejeitado** (trigger) |
| lider → PATCH `site_configs` | **0 linhas** (RLS) |
| lider → `set_site_published` | **rejeitado** |
| secretaria → `set_site_published` | **permitido**, auditado |
| pastor → editar `site_configs` (regressão) | **permitido** |

## 12. Performance

- Tela lê 1 linha de `organizations` (colunas explícitas: `name, slug, member_mode, custom_domain`). Sem `select('*')`, sem N+1, sem paginação necessária (1 registro).
- `saveOrgSettings` = 1 RPC. `setPublished` = 1 RPC.

## 13. UX

- Loading (`useTransition` — "Salvando…"), estados de erro/sucesso inline, botão desabilitado sem alterações.
- **Confirmação** obrigatória ao ligar entrada automática, com aviso de impacto.
- Rádios com descrição de cada modo. `maxLength` no nome.
- Responsivo (cards, `sm:` grid). Sem scroll lateral (herdado do `overflow-x-hidden` do Shell).
- Acessibilidade: `<label>` envolvendo cada rádio/campo; `field-label`.
- Erros não vazam mensagem técnica do Postgres.

## 14. QA executado

| Suite | Comando | Resultado |
|---|---|---|
| Unitários | `npm test` | **28/28 PASS** (22 Fase 1 + 6 `settings.test.ts`) |
| Segurança Tela 1 | `npm run test:security:2` | **15/15 PASS** |
| Regressão Fase 1 | `npm run test:security` | **23/23 PASS** |
| Lint | `npx eslint` (arquivos da tela) | **sem erros** |
| Build | `npm run build` | **✓ Compiled successfully** |
| Produção | `curl` `/` e `/…/configuracoes` | 200 / 307 (rota nova no ar) |

## 15. Deploy

Commit único, `npm run build` verde, migration `0026` aplicada no Supabase de produção, deploy Vercel verificado.

## 16. Riscos

- **CONFLITO F2-C1**: se algum cliente já usa o papel `lider` de organização esperando poder editar o site, essa correção remove o acesso (esperado e alinhado à Fase 1). Owner/pastor/secretaria não são afetados.
- `member_mode='open'` continua sendo uma escolha do owner/pastor — a confirmação reduz, não elimina, o risco de ativação acidental.
- Auditoria da área Owner ainda é parcial (só config + publish). Avisos/agenda/etc. serão auditados nas próximas telas.

## 17. Backlog (registrado, não implementado)

- Edição de `slug` com tabela de redirects (F2-C2).
- Blindagem de `lider` em avisos / agenda / ministérios / oração / visitantes / departamentos (F2-A5) — uma tela por vez.
- Dashboard/visão geral do Owner.
- `custom_domain` editável + verificação DNS.
- Auditoria completa da área Owner.
- Tela de Equipe (staff) dedicada.

## 18. Status

**TELA 1 CONCLUÍDA.** Não iniciei a Tela 2 — aguardando nova autorização.
