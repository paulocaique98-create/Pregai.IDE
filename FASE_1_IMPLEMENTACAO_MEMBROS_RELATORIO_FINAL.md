# RELATÓRIO FINAL — FASE 1 — MEMBROS

Data: 2026-09-07 · Base: commit inicial `c0439b2` · Produção: https://pregai-ide.vercel.app

---

## 1. Objetivo

Transformar o módulo de Membros de um CRUD simples em um módulo seguro, multi-tenant,
escalável, auditável e testável, sem quebrar funcionalidades existentes e **com a
autorização crítica no banco**, não apenas na interface.

## 2. Auditoria original

`FASE_1_AUDITORIA_MEMBROS.md`. Achados: P0-1..P0-5 (segurança), P1-1..P1-7 (escala),
P2-1..P2-11 (UX), O-1..O-6 (observações).

## 3. Problemas encontrados (resumo)

- **P0-1** Papel `owner` sem proteção no banco → secretaria/pastor podiam se promover a `owner` via API direta.
- **P0-2** Secretaria/pastor podiam bloquear o `owner` ou outros staff.
- **P0-3** Transições de status inválidas aceitas (`active→pending` etc.).
- **P0-4** Autorização de troca de papel divergente entre Server Action e RLS.
- **P0-5** Convites sem expiração, sem uso único, sempre `membro`, sem validação de auto-approve.
- **P1** Sem paginação/busca/filtros/ordenação; carga total a cada render.
- **P2** Líder via tela armada mas inerte; sem feedback; sem confirmação; sem `error.tsx`; sem detalhe do membro; e-mail não exibido.

## 4. Problemas corrigidos

| # | Correção | Onde | Verificação |
|---|---|---|---|
| P0-1 | Trigger `enforce_member_invariants` impede virar `owner` e alterar linha de owner via UPDATE (qualquer via). Policies amplas de escrita removidas; escrita só por RPC `SECURITY DEFINER`. | `0020`, `0021` | `phase1-security-check.mjs`: "secretaria PATCH role=owner via REST é rejeitado", "secretaria set_member_role é rejeitado" — **PASS** |
| P0-2 | `block_member`/`reactivate_member` recusam alvo `owner`; pastor só é bloqueado pelo owner; ninguém bloqueia a si mesmo. | `0021` | "pastor não bloqueia owner", "secretaria não bloqueia owner", "pastor não bloqueia outro pastor" — **PASS** |
| P0-3 | Máquina de estados no trigger: só `pending→active`, `active→blocked`, `blocked→active`. | `0020` | "active->pending via REST é rejeitado" (0 linhas), "aprovar quem já é ativo é rejeitado" — **PASS** |
| P0-4 | Regra única: apenas `owner`/`pastor` alteram papel, e só o `owner` mexe em `pastor`. RLS não permite mais UPDATE direto; a Server Action chama a RPC. | `0020`, `0021`, `actions.ts` | teste unitário + segurança — **PASS** |
| P0-5 | `expires_at` = 7 dias (default + backfill + NOT NULL); `used_at`/`used_by` (uso único, consumo atômico via `UPDATE ... WHERE used_at IS NULL RETURNING`); `revoked_at`; `create_invite` valida papel (nunca `owner`; staff só owner/pastor; pastor só pelo owner) e auto-approve (só owner/pastor). | `0022` | "secretaria não convida pastor", "ninguém convida owner", "secretaria não cria convite auto-approve", "convite não pode ser reutilizado", "convite expirado é rejeitado" — **PASS** |
| P1-1..4 | `list_members(p_org, p_search, p_status, p_role, p_dept, p_sort, p_limit, p_offset)` — paginação (25/página, teto 100), busca server-side (nome/telefone/e-mail via `auth.users`), filtros, 3 ordenações. `page.tsx` reescrita como server component + toolbar client com debounce 300ms. | `0023`, `0025`, `page.tsx`, `MembersToolbar.tsx` | "owner lista diretório com e-mail e total" — **PASS**; build — **PASS** |
| P1-5 | Uma RPC com joins substitui as 2 queries sequenciais + N perfis. | `0023` | — |
| P1-6 | Contagens dos `StatTile` via `count: "exact", head: true` (3 queries sem trazer linhas). | `page.tsx` | — |
| P2-1 | Líder (org-role `membro` que lidera departamento) recebe **diretório read-only limitado aos seus departamentos** (`list_members` calcula o escopo; sem controles de gestão). Plain `membro` continua sem acesso (`getOrgForPanel` → `notFound`). | `0023`, `page.tsx` | "lider sem departamento liderado não lista diretório", "lider não bloqueia ninguém" — **PASS** |
| P2-2 | Toda ação retorna `{ok, message|error}` e o componente cliente exibe feedback inline. | `actions.ts`, `MemberRowActions.tsx`, `InvitePanel.tsx` | — |
| P2-3 | Bloqueio abre confirmação com campo de motivo antes de executar. | `MemberRowActions.tsx` | — |
| P2-4 | `error.tsx` no segmento `painel/igreja/[slug]`. | `error.tsx` | build — **PASS** |
| P2-5 | Empty state distingue "nenhum membro ainda" de "nenhum membro corresponde ao filtro". | `page.tsx` | — |
| P2-6 | Página de detalhe `/painel/igreja/[slug]/membros/[userId]`: dados pessoais, vínculo, papel, departamentos, datas, motivo de bloqueio, **histórico de auditoria**. | `[userId]/page.tsx`, `get_member`, `member_audit` | build — **PASS** |
| P2-7 | `RoleSelect` (dentro de `MemberRowActions`): `aria-label`, mostra rascunho + botão "Aplicar" (sem auto-submit), estado pendente, erro. | `MemberRowActions.tsx` | — |
| P2-8 | Cópia do link de convite com `try/catch` + fallback `window.prompt`. | `InvitePanel.tsx` | — |
| P2-9/10/11 | Linha do diretório mostra **e-mail**, telefone, **data de entrada** e **departamentos**. | `page.tsx` | — |
| O-5 | `audit_logs` com `entity_type`/`entity_id` para todos os eventos de membro/convite. | `0020` | — |
| O-6 | Token de convite passou a `randomBytes(16)` (128 bits). | `actions.ts` | — |
| P1-1 (multi-tenant) | `org_id`/`user_id` imutáveis (trigger). RPCs resolvem a org do ator e recusam agir fora dela. | `0020`, `0021` | "owner A não age em membro da Org B", "owner A não lê membros da Org B" — **PASS** |

## 5. Problemas não corrigidos / adiados

- **Transferência de propriedade** — Fase 7 (conforme instrução). O terreno está pronto: o trigger tem escape-hatch `set_config('pregai.allow_owner_change','on',true)` para uma futura RPC de transferência.
- **Hash do token de convite (`token_hash`)** — mantido em texto puro. Mitigado: RLS já impede `SELECT` de convites por quem não é staff; token agora tem 128 bits, expira em 7 dias e é uso único. Migration de hash fica como dívida (backlog).
- **Rate-limit em `/c/[token]` e `/convite/[token]`** — backlog (infra de rate-limit é transversal).
- **`error.tsx` global do painel** (`/painel`, `/painel/igreja`) — criado só no segmento `[slug]` (escopo da fase). Backlog.
- **Importação de membros (CSV/XLSX)** — não implementada (fora do escopo). A arquitetura (RPCs de escrita, `audit_logs`) não impede.
- **JWT stale (O-1)** — sem mudança; RLS não usa o JWT. Disciplina mantida (ler do banco).

## 6. Arquivos analisados

`membros/page.tsx`, `membros/actions.ts`, `RoleSelect.tsx`, `InviteLink.tsx`,
`painel/igreja/[slug]/layout.tsx`, `Shell.tsx`, `lib/site/queries.ts`, `lib/auth.ts`,
`lib/site/member.ts`, `lib/platform.ts`, `c/[token]/route.ts`, `convite/[token]/route.ts`,
migrations `0001`–`0019`.

## 7. Arquivos criados

- `supabase/migrations/0020_member_audit_and_invariants.sql`
- `supabase/migrations/0021_member_admin_rpcs.sql`
- `supabase/migrations/0022_invites_hardening.sql`
- `supabase/migrations/0023_member_directory_rpcs.sql`
- `supabase/migrations/0024_member_indexes.sql`
- `supabase/migrations/0025_fix_list_members.sql`
- `src/lib/members/policy.ts` + `policy.test.ts`
- `src/lib/members/queries.ts`
- `src/app/painel/igreja/[slug]/membros/MembersToolbar.tsx`
- `src/app/painel/igreja/[slug]/membros/MemberRowActions.tsx`
- `src/app/painel/igreja/[slug]/membros/InvitePanel.tsx`
- `src/app/painel/igreja/[slug]/membros/[userId]/page.tsx`
- `src/app/painel/igreja/[slug]/error.tsx`
- `scripts/phase1-security-check.mjs`
- `vitest.config.ts`

## 8. Arquivos modificados

- `src/app/painel/igreja/[slug]/membros/page.tsx` (reescrita)
- `src/app/painel/igreja/[slug]/membros/actions.ts` (reescrita — RPCs + resultados)
- `src/app/igreja/[slug]/convite/[token]/route.ts` (trata `used`/`revoked`)
- `package.json` (`test`, `test:security`)

## 9. Arquivos removidos

- `src/app/painel/igreja/[slug]/membros/RoleSelect.tsx`
- `src/app/painel/igreja/[slug]/membros/InviteLink.tsx`

## 10. Migrations criadas

`0020`–`0025` (ver §7). Aplicadas em produção via `npx supabase db push`.
Nenhuma migration histórica foi editada ou removida.

## 11. Alterações no banco

- `organization_members`: + `approved_by/at`, `blocked_by/at`, `blocked_reason`, `role_updated_by/at`, `updated_at`.
- Nova tabela `audit_logs`.
- `organization_invites`: + `used_at`, `used_by`, `revoked_at`; `expires_at` default 7d + NOT NULL (backfill de existentes).
- Índices: `organization_members (org_id,status)`, `(org_id,role)`, `(org_id,created_at)`; `pg_trgm` + GIN em `profiles.full_name` e `profiles.phone`; `organization_invites (org_id,created_at)`; `audit_logs (org_id,created_at)`.
- Diagnóstico (não corretivo) de organizações sem owner ativo (RAISE WARNING). Nenhuma detectada.

## 12. Alterações RLS

- **Removidas** (`organization_members`): `owners manage members` (ALL), `team updates member status` (UPDATE) — davam UPDATE de qualquer coluna a owner/pastor/secretaria.
- **Mantidas**: `read own memberships` (SELECT), `auth admin reads memberships`.
- Escrita em `organization_members` agora **exclusivamente** via RPC `SECURITY DEFINER`.
- `audit_logs`: SELECT para owner/pastor/secretaria; INSERT só via `log_audit()` (sem policy de insert).

## 13. Alterações Server Actions

`actions.ts` reescrito: `approveMember`, `blockMember`, `reactivateMember`,
`changeMemberRole`, `createInvite`, `revokeInvite` — todas chamam RPC, retornam
`ActionResult`, revalidam a rota. Guard de app mantido como primeira barreira
(`getOrgForPanel`), mas a autorização efetiva é da RPC/trigger.

## 14. Alterações RPC

Novas: `my_role`, `approve_member`, `block_member`, `reactivate_member`,
`set_member_role`, `create_invite`, `revoke_invite`, `list_members`, `get_member`,
`member_audit`, `log_audit`. Substituída: `accept_invite` (consumo atômico + motivos
`used`/`revoked`/`expired`). Todas com `search_path` explícito, validação de
`auth.uid()`, resolução de org e papel do ator, e checagem de alvo quando aplicável.

## 15. Alterações de segurança

Ver §4 (P0-1..P0-5) e §12. Resultado: nenhuma autorização crítica de Membros
depende só do frontend.

## 16. Alterações multi-tenant

`org_id` imutável (trigger); RPCs recusam alvo fora da org do ator; leitura
cross-tenant já barrada por RLS e reconfirmada por teste.

## 17. Alterações de convites

Ver §4 P0-5 e §11.

## 18. Alterações de status

Máquina de estados no trigger (§4 P0-3). Colunas de auditoria de aprovação/bloqueio.

## 19. Alterações de UX

Toolbar de busca/filtros/ordenação; paginação; empty/error states; feedback e
confirmação nas ações; página de detalhe com histórico; `RoleSelect` sem
auto-submit; cópia de link resiliente; e-mail e data visíveis; cópia curta `/c/<token>`.

## 20. Alterações de performance

`list_members` (1 RPC com joins e paginação) no lugar de 3 queries sem limite +
render de todas as linhas. Contagens via `head:true`. Índices de filtro e busca (§11).

## 21. Auditoria

`audit_logs` grava `member.approve`, `member.block`, `member.unblock`,
`member.role_change`, `invite.create`, `invite.accept`, `invite.revoke`. Exibida na
aba Histórico do detalhe do membro (`member_audit`).

## 22. Testes criados

- **Unitários (vitest)** — `src/lib/members/policy.test.ts`: 22 testes (máquina de
  estados, `canManage` para aprovar/bloquear/papel com proteção de alvo,
  `assignableRoles`, convites).
- **Integração/segurança** — `scripts/phase1-security-check.mjs`: 23 asserções
  contra o Supabase real (cria 2 orgs + 7 usuários descartáveis, exercita as RPCs
  como cada papel, limpa tudo).

## 23. Testes executados

| Suite | Comando | Resultado |
|---|---|---|
| Unitários | `npm test` (`vitest run`) | **22/22 PASS** |
| Segurança/integração | `npm run test:security` | **23/23 PASS** |
| Lint | `npx eslint` (arquivos da fase) | **sem erros** |
| Build | `npm run build` | **✓ Compiled successfully** |

Cenários de segurança cobertos (todos **PASS**):
`secretaria→role=owner` (REST e RPC), `secretaria→block owner`, `pastor→block owner`,
`pastor→block pastor`, `secretaria→set_role`, `lider→block`, `lider→list_members`,
`orgA→membro orgB` (ação e leitura), `active→pending` (REST), aprovar já-ativo,
convite reutilizado, convite expirado, convite de pastor/owner por secretaria,
auto-approve por secretaria.

## 24. Resultado do lint

Sem erros nos arquivos da fase (`npx eslint src/lib/members src/app/painel/igreja/[slug]/membros src/app/painel/igreja/[slug]/error.tsx`).

## 25. Resultado do build

`✓ Compiled successfully` · `✓ Generating static pages (13/13)` · rota nova
`/painel/igreja/[slug]/membros/[userId]` presente.

## 26. Dívidas técnicas

- Token de convite em texto puro (mitigado; hash = backlog).
- Sem rate-limit nas rotas de convite.
- `error.tsx` só no segmento `[slug]` do painel.
- Testes de integração exigem Supabase real e usuários descartáveis (não roda em CI sem credenciais); não há mock local do Postgres/RLS.
- `list_members` usa `ilike '%x%'` — os índices trigram ajudam, mas busca em bases muito grandes pode evoluir para full-text.

## 27. Riscos restantes para produção

- Sessões já emitidas de secretaria/pastor: o RLS novo vale imediatamente (não depende do JWT), então não há janela de exposição.
- Organizações sem owner ativo: diagnóstico rodou, nenhuma encontrada. Se surgir (ex.: import manual), o trigger não impede o estado; a invariante "sempre um owner" só será garantida na Fase 7.
- `revalidatePath` com caminho concreto: se o Next mudar o comportamento de cache, revisar.

## 28. Backlog futuro (registrado, não implementado)

Transferência de propriedade (Fase 7) · hash de token · rate-limit · importação
CSV/XLSX de membros · `error.tsx` global do painel · full-text search · observabilidade
(Sentry) · unificar `getOrgForPanel`/`getOrgForMember` numa chamada.

## 29. Critérios de aceite

### Segurança
- [x] Owner protegido no banco (trigger + testes)
- [x] Secretaria não promove a Owner (REST e RPC)
- [x] Secretaria não altera papéis
- [x] Pastor não bloqueia Owner
- [x] Pastor não bloqueia Pastor
- [x] Líder não administra membros (só leitura, escopo do depto)
- [x] Cross-tenant bloqueado (ação e leitura)
- [x] `org_id` imutável
- [x] Server Actions e RPCs protegidas

### Status
- [x] Máquina de estados no banco
- [x] Transições inválidas bloqueadas

### Convites
- [x] Expiram em 7 dias
- [x] Uso único (consumo atômico)
- [x] Aceitação atômica
- [x] Papel validado no servidor
- [x] Auto-approve protegido
- [x] Owner não pode ser convidado

### Performance
- [x] Sem carregamento ilimitado
- [x] Paginação / busca / filtros / ordenação server-side
- [x] Queries com colunas explícitas + índices

### UX
- [x] Loading (skeleton existente) · Empty · Error · Success · Confirmação
- [x] Responsivo (cards, sem scroll lateral)
- [x] `aria-label` nos selects, foco visível (padrão do design system)
- [x] E-mail visível

### Auditoria
- [x] Ações críticas registradas em `audit_logs` + aba Histórico

### Testes
- [x] Segurança / RLS / cross-tenant / status / convites / permissões
- [x] Lint / Build / Testes passando

## 30. Status final

**CONCLUÍDA.**

Backend blindado e verificado (23/23), diretório escalável, UX completa,
auditoria, testes (22 unit + 23 integração), build e lint verdes, deploy em produção
(`https://pregai-ide.vercel.app`) saudável.

Não avancei para a Fase 2.
