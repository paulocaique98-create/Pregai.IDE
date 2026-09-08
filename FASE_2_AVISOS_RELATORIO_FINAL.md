# FASE 2 — TELA 2 — AVISOS

Data: 2026-09-07 · Produção: https://pregai-ide.vercel.app

## 1. Objetivo

Blindar a tela de Avisos com o padrão da Tela 1: tirar o papel `lider` de
organização da administração global, mover CRUD/publicação para RPCs auditadas,
proteger invariantes no banco, e provar por teste que a interface não é a única barreira.

## 2. Estado anterior

- Tabela `announcements` (0013): `id, org_id, title, body, is_pinned, is_published (bool, default true), created_by, created_at, updated_at`. Sem enum de status, sem `published_at`, sem `updated_by`.
- `avisos/page.tsx`: `getOrgForMember` (inclui `lider`). Carregava **todos** os avisos (colunas explícitas, sem limite). Um `<form>` por linha.
- `avisos/actions.ts`: `createAnnouncement`/`updateAnnouncement`/`deleteAnnouncement` — só `if (!ctx)`, **sem checagem de papel**. `lider` tinha CRUD completo.
- RLS `team writes announcements` (ALL): `owner, pastor, secretaria, **lider**`.
- **Bug**: `fields()` fazia `is_published: fd.get("is_published") !== "off"` — checkbox desmarcado (ausente) `!== "off"` → `true`. **Impossível despublicar** pela edição.
- Conteúdo é texto puro, renderizado como texto (`whitespace-pre-wrap`). Sem HTML, sem uploads.

## 3. Auditoria

`UI → Server Component → Server Actions → RLS → Banco`:
- Sem RPCs (escrita direta na tabela via client autenticado + RLS).
- Sem trigger de invariantes → `org_id`/`created_by` mutáveis via REST.
- Sem auditoria de nenhuma ação de aviso.
- Notificações de aviso limpas por heurística `org_id + kind + title` (dívida da Fase 1).
- Sem paginação.

## 4. Problemas encontrados

| # | Problema | Gravidade | Status |
|---|---|---|---|
| AV-1 | `lider` de organização tem CRUD global de avisos (app + RLS) | **P0** | **Corrigido** |
| AV-2 | Actions sem checagem de papel; sem auditoria | P1 | **Corrigido** |
| AV-3 | Impossível despublicar um aviso pela UI (bug do `!== "off"`) | P1 | **Corrigido** (toggle explícito via RPC) |
| AV-4 | `org_id` / `created_by` do aviso mutáveis via REST direto | P1 | **Corrigido** (trigger) |
| AV-5 | Erros retornavam `error.message` cru do Postgres | P2 | **Corrigido** |
| AV-6 | Notificações limpas por título (heurística frágil) | P2 | **Corrigido** (`entity_type`/`entity_id`) |
| AV-7 | Sem paginação | P2 | **Corrigido** (20/página) |
| AV-8 | RPCs novas: `my_role(x) not in (...)` retorna NULL (não TRUE) p/ não-membro → cross-tenant passava | **P0 (introduzido e corrigido no mesmo ciclo)** | **Corrigido** (migration 0028; pego pelo teste de cross-tenant) |

## 5. Regras de negócio

Nenhuma regra documentada conflita com a matriz proposta. `lider` não tem relação
com `announcements` no modelo — portanto **`lider` = somente leitura** (confirmado).
Sem máquina de estados: `is_published` é booleano; publicar/despublicar são livres
entre si (documentado — não é `draft→published` unidirecional).

## 6. Matriz de permissões

| Ação | Owner | Pastor | Secretaria | Líder | Membro |
|---|:-:|:-:|:-:|:-:|:-:|
| Ver avisos no painel | SIM | SIM | SIM | **SIM (leitura)** | não |
| Criar / Editar | SIM | SIM | SIM | não | não |
| Publicar / Despublicar | SIM | SIM | SIM | não | não |
| Excluir | SIM | SIM | SIM | não | não |

## 7. Alterações de frontend

- `avisos/page.tsx` (reescrita): server component; `canManageAnnouncements(ctx.role)`; paginação `.range()` (20/página) + `count: "exact"`; **view read-only** para `lider` (lista + aviso explicativo); editor completo para owner/pastor/secretaria.
- `avisos/AnnouncementsManager.tsx` (novo, client): form de criação (título, detalhes, fixar, "publicar agora"), linhas com editar inline / **toggle publicar-despublicar** / excluir com **confirmação**; feedback `{ok,message|error}` por ação; `maxLength` nos campos; sem double-submit (`useTransition` + `disabled`).

## 8. Alterações de backend

- `avisos/actions.ts` (reescrita): `createAnnouncement`, `updateAnnouncement`, `setAnnouncementPublished`, `deleteAnnouncement` — todas chamam RPC, validam via `validateAnnouncement`, retornam `AvisoResult`, mensagens de erro genéricas. Push aos membros (`notifyMany`) ao criar publicado ou ao publicar, agora com `entity_type`/`entity_id`.
- `src/lib/announcements/policy.ts` (novo) + `policy.test.ts`.
- `src/lib/notify.ts`: `Notice` aceita `entity_type`/`entity_id`; `notify()` grava nas novas colunas.

## 9. Server Actions

Ver §8. Guard de app (`getOrgForMember`) como primeira barreira; autorização efetiva nas RPCs.

## 10. RPCs (migrations 0027 + 0028, SECURITY DEFINER, `search_path=public`)

| RPC | Ator | Auditoria |
|---|---|---|
| `create_announcement(p_org, p_title, p_body, p_is_pinned, p_publish)` → uuid | owner/pastor/secretaria | `announcement.create` |
| `update_announcement(p_id, p_title, p_body, p_is_pinned)` | owner/pastor/secretaria (org do aviso) | `announcement.update` |
| `set_announcement_published(p_id, p_published)` | idem | `announcement.publish` / `announcement.unpublish` |
| `delete_announcement(p_id)` | idem | `announcement.delete` |

Todas: `if v_actor is null or v_actor not in (...)` (corrigido em 0028), resolvem a
org a partir da linha, validam título (1–200) e corpo (≤5000).

## 11. RLS

- `announcements` · `team writes announcements` (ALL, incluía `lider`): **removida**. Sem policy de INSERT/UPDATE/DELETE para `authenticated` → acesso direto negado; escrita só pelas RPCs.
- `members read announcements` (SELECT): **inalterada** — membros leem publicados; staff (incl. `lider`) lê tudo (somente leitura).

## 12. Migrations

- `0027_announcements_hardening.sql` — colunas `notifications.entity_type/entity_id` + índice; `announcements.updated_by`; trigger `enforce_announcement_invariants`; drop da policy de escrita; 4 RPCs; índice `announcements (org_id, is_pinned desc, created_at desc)`.
- `0028_fix_announcement_rpc_null_guard.sql` — recria as 4 RPCs com guarda `v_actor is null or ...`.

Aplicadas em produção via `npx supabase db push`. Nenhuma migration histórica editada.

## 13. Banco

- `announcements`: + `updated_by`.
- `notifications`: + `entity_type`, `entity_id` (nullable; backfill não necessário — heurística por título continua funcionando para linhas antigas na action de exclusão? **Não** — a action nova só apaga por `entity_id`. Notificações de avisos criadas antes desta migration não serão apagadas ao excluir o aviso; impacto baixo, registrado no backlog).

## 14. Multi-tenancy

- Trigger: `org_id` do aviso imutável.
- RPCs resolvem a org a partir da própria linha do aviso e checam `my_role(org_da_linha)`.
- Teste cross-tenant (owner A → aviso da Org B): editar / excluir / despublicar → **todos rejeitados** (após 0028).

## 15. Auditoria

`audit_logs` (padrão Fase 1): `announcement.create`, `announcement.update`,
`announcement.publish`, `announcement.unpublish`, `announcement.delete` — com
`org_id`, `actor_user_id` (via `log_audit`), `entity_type='announcement'`, `entity_id`.
Verificado por teste (inclui conferência do `entity_id` no `announcement.delete`).

## 16. Segurança — `scripts/phase2-avisos-check.mjs` — **22/22 PASS**

| Grupo | Cenários |
|---|---|
| Managers | owner cria · pastor cria rascunho · secretaria edita · secretaria publica · pastor despublica — **todos PASS** |
| Líder | criar/editar/despublicar/excluir por RPC → **rejeitado**; inserir/editar/excluir por REST → **403 / 0 linhas**; **ler → permitido** |
| Membro comum | não lê rascunhos |
| Cross-tenant | owner A editar/excluir/despublicar aviso da Org B → **rejeitado** |
| Invariante | `org_id` do aviso não muda via REST |
| Validação | título vazio → rejeitado |
| Auditoria | create/update/publish/unpublish/delete registradas; `entity_id` correto no delete |

## 17. Performance

- Listagem: 1 query com colunas explícitas + `count: "exact"` + `.range()` (20/página). Índice `announcements_org_list_idx` cobre `org_id` + ordenação (`is_pinned desc, created_at desc`).
- Ações: 1 RPC cada. Push é melhor-esforço em `Promise.all`.
- Sem `select('*')`, sem N+1.

## 18. UX

- Loading (`useTransition`), sucesso/erro inline por ação, **confirmação** para excluir, toggle explícito publicar/despublicar (corrige o bug de nunca despublicar).
- Rascunho vs publicado com `Badge`; fixados primeiro.
- `lider`: aviso claro de "somente leitura".
- Responsivo (cards, `flex-wrap`), sem scroll lateral.

## 19. Acessibilidade

`<label>` em todos os campos e checkboxes; botões com texto; `aria-disabled` na paginação; foco padrão do design system; sem `dangerouslySetInnerHTML`.

## 20. Testes unitários

`src/lib/announcements/policy.test.ts` — 6 testes (`canManageAnnouncements`, `validateAnnouncement`). `npm test` = **34/34 PASS** (22 Fase 1 + 6 Tela 1 + 6 Tela 2).

## 21. Testes de segurança

`npm run test:security:avisos` — **22/22 PASS** (Supabase real, 6 usuários + 2 orgs descartáveis, limpeza ao final).

## 22. Cross-tenant

Coberto em §16 (3 cenários, todos rejeitados após 0028).

## 23. Regressão Fase 1

`npm run test:security` → **23/23 PASS**. `npm run test:security:2` (Tela 1) → **15/15 PASS**. Nada quebrado.

## 24. Lint

`npx eslint` nos arquivos da tela → **sem erros**.

## 25. Build

`npm run build` → **✓ Compiled successfully**.

## 26. Produção

Commit único, migrations `0027`/`0028` aplicadas no Supabase de produção, deploy Vercel verificado (`/…/avisos` → 307 para login, rota no ar).

## 27. Riscos

- **Notificações antigas de avisos** (criadas antes de `0027`) não têm `entity_id` → não serão apagadas ao excluir o aviso. Impacto baixo; a heurística antiga por título foi removida da action. Backlog: migration de backfill opcional.
- `lider` de organização perde a escrita de avisos — esperado e alinhado à Fase 1 / Tela 1 (CONFLITO F2-C1).
- `is_published` sem máquina de estados: publicar/despublicar são livres. Documentado; não é bug.

## 28. Backlog

- Backfill de `notifications.entity_id` para avisos antigos.
- Aplicar o mesmo padrão às telas restantes: Agenda, Ministérios, Oração, Visitantes, Departamentos (F2-A5), Dashboard do Owner.
- Auditoria completa da área Owner.

## 29. Status

**TELA 2 CONCLUÍDA.** Não iniciei a Tela 3 (Agenda) — aguardando nova autorização.
