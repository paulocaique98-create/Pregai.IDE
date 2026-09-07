# FASE 1 — AUDITORIA DA TELA DE MEMBROS

> Diagnóstico. **Nenhum código foi alterado.** Aguardando autorização para implementar.
> Data: 2026-09-07 · Commit base: `c0439b2`
> Método: leitura estática de código, migrations e policies. Testes de runtime cross-tenant **NÃO** foram executados (exigem 2 orgs + usuários de teste). Cada achado abaixo está rotulado.

---

## 1. ARQUIVOS ENVOLVIDOS

| Papel | Arquivo |
|---|---|
| Página (server component) | `src/app/painel/igreja/[slug]/membros/page.tsx` |
| Server Actions | `src/app/painel/igreja/[slug]/membros/actions.ts` |
| Componente cliente — troca de papel | `src/app/painel/igreja/[slug]/membros/RoleSelect.tsx` |
| Componente cliente — link de convite | `src/app/painel/igreja/[slug]/membros/InviteLink.tsx` |
| Layout do painel (guard) | `src/app/painel/igreja/[slug]/layout.tsx` |
| Shell/nav | `src/app/painel/igreja/[slug]/Shell.tsx` |
| Skeleton | `src/app/painel/igreja/[slug]/loading.tsx` |
| Autorização/contexto | `src/lib/site/queries.ts` (`getOrgForMember`, `getOrgForPanel`), `src/lib/auth.ts` (`requireUser`, `getMemberships`) |
| Rota de convite curto | `src/app/c/[token]/route.ts` |
| Rota de convite (aceite) | `src/app/igreja/[slug]/convite/[token]/route.ts` |
| Primitivos de UI | `src/components/ui/primitives.tsx` (`StatTile`, `Avatar`, `Badge`, `EmptyState`, `PageHeader`, `SectionHeading`) |
| E-mail / notificação | `src/lib/email.ts`, `src/lib/notify.ts` |

**Migrations relevantes:** `0001_foundation`, `0002_auth_hook`, `0003_create_org_rpc`, `0004_membership_join`, `0006_staff_reads_profiles`, `0007_departments`, `0012_invites_and_primary_org`, `0018_notifications`.

---

## 2. BANCO DE DADOS UTILIZADO

### `organization_members`
- Colunas: `org_id`, `user_id`, `role` (enum `org_role`), `status` (enum `member_status`: pending/active/blocked), `created_at`.
- **PK composta `(org_id, user_id)` — não há coluna `id`.**
- Sem colunas de auditoria (`blocked_by`, `blocked_at`, `approved_by`, `role_changed_at`, `blocked_reason`).
- Sem `updated_at`.

### `profiles`
- `user_id` (PK), `full_name`, `avatar_url`, `phone`, `primary_org_id`, `created_at`.
- **Não há `email`** — o e-mail vive só em `auth.users` (acessível via `admin` client ou `userEmail()` em `notify`/`email`).

### `organizations`
- `member_mode` ('approval' | 'open') controla se quem entra fica `pending` ou `active`.

### `organization_invites`
- `token` (unique), `label`, `role` (default `membro`), `auto_approve`, `created_by`, `expires_at`, `created_at`.

### `departments` / `department_members`
- `department_members`: PK `(department_id, user_id)`, `org_id` (via trigger), `role` (member/leader), `status` (pending/active).

---

## 3. FLUXO ATUAL

### 3.1 Acesso à tela
```
/painel/igreja/[slug]/membros
  → layout.tsx: getOrgForPanel(slug)  [staff ativo OU líder de depto] senão notFound()
  → page.tsx:  getOrgForMember(slug)  [membership ativo em owner|pastor|secretaria|lider] senão notFound()
```

### 3.2 Leitura (page.tsx)
1. `organization_members` — `select("user_id, role, status, created_at").eq("org_id", org.id).order("created_at desc")` — **sem limite**.
2. `profiles` — `select("user_id, full_name, phone").in("user_id", ids)` — **sem limite**.
3. `organization_invites` — `select("id, token, label, auto_approve, created_at").eq("org_id", org.id)` — **sem limite**.
4. Particiona em memória: `pending` / `active` / `blocked`.
5. Render: 3 `StatTile` (contagens), seção de convites, fila de aprovação, diretório (active + blocked).

### 3.3 Mutações (actions.ts) — todas Server Actions `"use server"`
| Ação | Guard de papel (app) | Escreve |
|---|---|---|
| `createInvite` | `owner\|pastor\|secretaria` | insert `organization_invites` (role sempre default `membro`, sem `expires_at`) |
| `deleteInvite` | `owner\|pastor\|secretaria` | delete `organization_invites` |
| `setMemberRole` | `owner\|pastor` + allowlist `pastor\|secretaria\|lider\|membro` + `.neq("role","owner")` | update `role` |
| `setMemberStatus` | `owner\|pastor\|secretaria` + allowlist `pending\|active\|blocked` | update `status`; se `active` e antes ≠ `active` → `notify()` + e-mail |

Todas terminam com `revalidatePath("/painel/igreja/[slug]/membros")`. **Nenhuma retorna feedback de sucesso/erro para a UI.**

### 3.4 Convite → entrada
```
/c/<token>  (route.ts, admin client)  → lookup slug → redirect
/igreja/<slug>/convite/<token>  → se deslogado: /entrar?next=...  → accept_invite(token) RPC
  → cria organization_members (pending, ou active se auto_approve) + define primary_org_id
  → cookie pregai_join_intent + redirect /igreja/<slug>/membro
  → se pending: e-mail para staff
```

---

## 4. POLICIES RLS RELEVANTES (estado atual)

| Tabela | Policy | Operação | Quem |
|---|---|---|---|
| `organization_members` | `read own memberships` | SELECT | `user_id = auth.uid()` **OU** qualquer membro ativo da org |
| `organization_members` | `owners manage members` (0001) | ALL | `owner`, `pastor` |
| `organization_members` | `team updates member status` (0004) | UPDATE | `owner`, `pastor`, `secretaria` |
| `organization_members` | `auth admin reads memberships` | SELECT | `supabase_auth_admin` |
| `profiles` | `own profile` | ALL | próprio |
| `profiles` | `staff reads member profiles` (0006) | SELECT | qualquer membro ativo lê perfis de quem está na mesma org (via `current_org_ids()`) |
| `organizations` | `members read their orgs` | SELECT | membros ativos |
| `organizations` | `owners update org` | UPDATE | `owner`, `pastor` |
| `organization_invites` | `team manages invites` | ALL | `owner`, `pastor`, `secretaria` |
| `department_members` | `read department members` | SELECT | próprio **OU** `owner/pastor/secretaria` **OU** `leads_department()` |
| `department_members` | `leaders manage department members` | ALL | `owner/pastor/secretaria` **OU** `leads_department()` |

Helpers `current_org_ids()` / `has_org_role()` já filtram por `status = 'active'` (0004). `search_path = public` setado em todas. ✅ VERIFICADO (estático).

---

## 5. PROBLEMAS ENCONTRADOS

### 🔴 P0 — SEGURANÇA / AUTORIZAÇÃO / MULTI-TENANCY

**P0-1 · O papel `owner` não é protegido no banco — escalonamento de privilégio possível.**
`RISCO IDENTIFICADO (análise estática) · NÃO VERIFICADO em runtime`
A policy `team updates member status` permite UPDATE de **qualquer coluna** de `organization_members` (o nome engana; não há restrição de coluna) para `owner/pastor/secretaria`. Não há `CHECK`, trigger ou coluna-guard impedindo:
- uma **secretaria** ou **pastor** fazer `PATCH organization_members set role='owner'` (para si mesmo) via REST/SDK, contornando a Server Action;
- promover/rebaixar o `owner` atual;
- alterar `role` mesmo sem passar pela action `setMemberRole` (que restringe a `owner/pastor`).
A proteção de `role` hoje existe **apenas na Server Action** (`ASSIGNABLE`, `.neq("role","owner")`). Qualquer chamada direta à API com um JWT de secretaria/pastor ignora isso.
**Correção proposta:** trigger `BEFORE UPDATE` em `organization_members` que (a) bloqueia mudança de/para `role='owner'` exceto por RPC dedicada de transferência; (b) impede um não-owner de definir `role` acima do próprio nível; ou policy com `WITH CHECK` por coluna + RPCs específicas (`approve_member`, `set_member_role`, `block_member`) `SECURITY DEFINER` com toda a regra no banco, revogando UPDATE direto.

**P0-2 · Secretaria/pastor podem bloquear o `owner` ou outros staff.**
`RISCO IDENTIFICADO (estático)`
`setMemberStatus` não tem guard de alvo. Uma secretaria pode `status='blocked'` no `owner` → derruba o acesso do dono. RLS não impede.
**Correção proposta:** na RPC/trigger, proibir bloquear `owner`; proibir bloquear alguém de papel ≥ ao seu.

**P0-3 · Transições de status inválidas aceitas.**
`VERIFICADO (estático)`
`setMemberStatus` aceita qualquer um de `pending/active/blocked` sem validar a transição. Ex.: `active → pending` (não faz sentido), `blocked → pending`. Não há máquina de estados.
**Correção proposta:** validar transições: `pending→active`, `pending→blocked`, `active→blocked`, `blocked→active`. Rejeitar o resto.

**P0-4 · Autorização de troca de papel só no frontend/action, não no RLS.**
`RISCO IDENTIFICADO (estático)`
Ver P0-1. `setMemberRole` limita a `owner|pastor`, mas o RLS permite `secretaria` também. Divergência entre camada de app e camada de dados.

**P0-5 · Convites nunca expiram e sempre concedem `membro` — sem revalidação.**
`VERIFICADO (estático)`
`createInvite` não seta `expires_at` nem `role`. Um link vazado em grupo de WhatsApp funciona para sempre e para qualquer pessoa. `auto_approve=true` transforma isso em entrada direta sem aprovação.
**Correção proposta:** `expires_at` padrão (ex. 30 dias), opção de expiração e de limite de usos (`max_uses` / `used_count`), opção de revogar já existe. Auditar quem entrou por qual convite.

### 🟠 P1 — ESCALA / PERFORMANCE / CORRETUDE

**P1-1 · Sem paginação. Carrega 100% dos membros + perfis + convites a cada render.**
`VERIFICADO (estático)`
Para uma igreja de 2.000 membros: 3 queries sem `limit`, ~2.000 linhas de `organization_members` + 2.000 de `profiles` + render de 2.000 nós no diretório. Degradação garantida. É o cenário-alvo do produto ("centenas/milhares de membros").
**Correção proposta:** paginação server-side (cursor por `created_at,user_id`), busca e filtros server-side, contagens via `head:true count:"exact"` em vez de trazer tudo para contar.

**P1-2 · Sem busca.** Nenhuma forma de encontrar uma pessoa por nome/telefone. `VERIFICADO (estático)`

**P1-3 · Sem filtros.** Não dá para filtrar por status, papel ou departamento. A separação pending/active/blocked é fixa e implícita. `VERIFICADO (estático)`

**P1-4 · Sem ordenação configurável.** Só `created_at desc`. `VERIFICADO (estático)`

**P1-5 · Duas queries sequenciais (membros → perfis).**
`VERIFICADO (estático)`
Poderia ser um join (`organization_members` + `profiles(full_name, phone)`) numa query. Impacto baixo hoje, real em escala.

**P1-6 · Contagens de `StatTile` calculadas em memória sobre a lista completa.** Ligado a P1-1.

**P1-7 · `getOrgForMember` e `getOrgForPanel` fazem queries redundantes no mesmo request.**
`VERIFICADO (estático)`
O layout chama `getOrgForPanel` (2 queries) e a página chama `getOrgForMember` (2 queries) — ambas buscam a org pelo slug e a membership do usuário. `cache()` do React dedup por função, não entre as duas. ~4 queries onde bastariam 2.

### 🟡 P2 — UX / ACESSIBILIDADE / CONSISTÊNCIA

**P2-1 · Papel `lider` vê a tela inteira com botões que não funcionam.**
`VERIFICADO (estático)`
`getOrgForMember` aceita `lider`, então a página renderiza `RoleSelect`, "Aprovar", "Bloquear" etc. para um líder. As actions e o RLS rejeitam (silenciosamente). Resultado: UI "armada" que não faz nada → confunde e parece bug.
**Correção proposta:** decidir o que `lider` pode ver (provavelmente: diretório read-only, ou nem acessar a aba). Esconder controles que o papel não pode usar **e** garantir que o backend recuse (já recusa).

**P2-2 · Nenhum feedback após ações.** Aprovar/bloquear/trocar papel apenas re-renderiza. Sem toast, sem "Membro aprovado". `VERIFICADO (estático)`

**P2-3 · Ações destrutivas sem confirmação.** "Bloquear", "Recusar", "Revogar" convite executam no primeiro clique. `VERIFICADO (estático)`

**P2-4 · Sem `error.tsx` em nenhum lugar do `/painel`.** Se uma query falhar, cai no erro genérico do Next. Não há estado de erro tratado. `VERIFICADO (estático)`

**P2-5 · Diretório sem `EmptyState`.** Se não houver membros ativos/bloqueados, renderiza um card vazio. (A fila de aprovação tem empty state.) `VERIFICADO (estático)`

**P2-6 · Sem visualização detalhada do membro.** Não existe página/painel por membro. Não se vê: e-mail, data de entrada, departamentos, histórico, quem aprovou. `VERIFICADO (estático)`

**P2-7 · `RoleSelect` — `<select>` sem `aria-label`, auto-submete no `onChange` sem confirmação.** Trocar papel por engano (scroll no mobile sobre o select) é fácil e silencioso. `VERIFICADO (estático)`

**P2-8 · `InviteLink` usa `navigator.clipboard.writeText().then()` sem `catch`.**
`VERIFICADO (estático)`
Em contexto inseguro ou se a API não existir, promise rejeitada não tratada; o "copiado" nunca aparece e não há fallback.

**P2-9 · E-mail do membro não aparece na tela** (apesar de o `PageHeader` dizer "Aprove quem se cadastrou pelo site"). Só nome e telefone. Para aprovar alguém, o operador não vê o e-mail com que a pessoa se cadastrou. `VERIFICADO (estático)`

**P2-10 · Data de entrada (`created_at`) é buscada mas não exibida.** `VERIFICADO (estático)`

**P2-11 · Departamentos do membro não são exibidos.** `VERIFICADO (estático)`

### 🔵 OBSERVAÇÕES (não são bugs, mas relevantes)

**O-1 · JWT com claims de org/role potencialmente stale.**
O hook `custom_access_token_hook` injeta `app_metadata.orgs` (com `status`) no token, atualizado só no refresh (~1h). O RLS **não** usa o JWT (usa `current_org_ids()` que lê o banco), então segurança está ok. Mas qualquer código futuro que leia `app_metadata.orgs` do token verá dados desatualizados. Hoje `home.ts`/`queries.ts` leem do banco. Manter essa disciplina.

**O-2 · `organization_members` sem coluna `id`.** PK composta funciona, mas dificulta: referências de auditoria, importação idempotente, URLs de detalhe (`/membros/[id]`). Avaliar adicionar `id uuid default uuid_generate_v4()` como coluna única (mantendo a PK composta ou migrando).

**O-3 · Qualquer membro ativo pode enumerar `organization_members` da própria org via REST** (policy `read own memberships` inclui `org_id in current_org_ids()`). Vê `user_id`, `role`, `status` — **não** vê nome/telefone (profiles é staff-only). Provavelmente aceitável para igreja; registrar como decisão consciente.

**O-4 · `create_organization` sem limites.** Qualquer usuário autenticado cria orgs ilimitadas com qualquer slug livre. Fora do escopo da Fase 1 (é tema de billing/SaaS), mas anotado.

**O-5 · Notificação de "membro aprovado" não tem referência de entidade.** Ligada à dívida geral de `entity_type/entity_id` em `notifications`. Como notificação de aprovação não é apagada, o impacto aqui é baixo — mas a Fase 1 é boa oportunidade para introduzir o padrão.

**O-6 · `randomBytes(9)` = 72 bits de entropia no token de convite.** Suficiente, mas `randomBytes(16)` seria o padrão. Sem rate-limit em `/c/[token]` e `/convite/[token]`.

---

## 6. TESTES

**Existentes:** nenhum. Sem `vitest`, `jest`, `playwright`, nenhum `*.test.*` / `*.spec.*` no repo. `VERIFICADO`.

**Ausentes (mínimo para a Fase 1):**
- Unit: máquina de transição de status; guards de papel; validação de allowlists.
- Integração (contra Supabase, 2 orgs + usuários seed): cada policy de `organization_members` / `profiles` / `organization_invites`; RPC `accept_invite`.
- Cross-tenant (negativos): usuário da Org A lendo/editando membro da Org B → deve falhar; líder de depto da Org A editando membro → deve falhar; secretaria promovendo a `owner` → **deve falhar** (hoje passa — ver P0-1).
- E2E: login → membros → listar → buscar → filtrar → abrir perfil → aprovar → bloquear → reativar.
- Negativos E2E: papel sem permissão; sessão expirada; `user_id` inexistente; `user_id` de outro tenant.

---

## 7. PLANO DE IMPLEMENTAÇÃO (proposto — aguardando aprovação)

### Etapa A — Blindar o backend (P0) · **sem mudança visual**
1. Migration `0020_member_admin_guards.sql`:
   - RPCs `SECURITY DEFINER`: `approve_member(p_user)`, `block_member(p_user, p_reason)`, `reactivate_member(p_user)`, `set_member_role(p_user, p_role)` — toda a regra (transições válidas, proteção do `owner`, hierarquia de papéis, org do chamador) dentro do banco.
   - Trigger `BEFORE UPDATE` em `organization_members`: proíbe alterar `role`/`status` do `owner` e escalonamento para `owner` fora da RPC de transferência.
   - Colunas de auditoria: `approved_by`, `approved_at`, `blocked_by`, `blocked_at`, `blocked_reason`, `role_updated_by`, `role_updated_at` (nullable, sem default destrutivo).
   - Restringir a policy de UPDATE a colunas não-críticas ou revogar UPDATE direto e forçar uso das RPCs.
2. `actions.ts` passa a chamar as RPCs. Mantém os guards de app como primeira barreira (defense-in-depth).
3. Convites: `expires_at` default + `max_uses`/`used_count` (migration `0021`).
4. Testes de integração cobrindo P0-1..P0-5 (inclusive os negativos que hoje falham).

### Etapa B — Escala (P1)
5. `getMembersPage({ orgId, cursor, search, status, role, deptId, sort })` — query paginada com join a `profiles`, busca server-side (`ilike` em nome/telefone; e-mail exige join a `auth.users` via RPC ou view), contagens via `count:"exact", head:true`.
6. `page.tsx` → server component fino + componente cliente com busca (debounce 300ms), chips de filtro, "carregar mais"/paginação, ordenação.
7. Unificar `getOrgForPanel`/`getOrgForMember` para 1 par de queries por request.

### Etapa C — UX (P2)
8. Feedback (toast/inline) em todas as ações; confirmação em bloquear/recusar/revogar.
9. `error.tsx` no `/painel/igreja/[slug]`.
10. Empty state do diretório; e-mail + data de entrada + departamentos na linha/《detalhe》.
11. Página de detalhe do membro `/painel/igreja/[slug]/membros/[id]` com blocos (dados / vínculo / papéis / departamentos / histórico / ações) — respeitando o papel do operador.
12. `lider`: definir e aplicar visão read-only (ou remover a aba do nav do líder).
13. `RoleSelect` com `aria-label` + confirmação; `InviteLink` com `try/catch` + fallback.
14. Matriz de permissões documentada e testada (a preencher **com você**, ver §8).

### Etapa D — Fechamento
15. `npm run build` + lint + typecheck + testes.
16. Auditoria final (regressão, RLS, cross-tenant, mobile, a11y).
17. `FASE_1_RELATORIO_FINAL.md`.

---

## 8. DECISÕES DE PRODUTO QUE PRECISO DE VOCÊ (não vou inventar)

1. **`lider` (papel da organização, não líder de departamento) — o que vê na aba Membros?** Nada / diretório read-only / só o próprio departamento?
2. **`secretaria` pode alterar papéis?** Hoje: a action diz não (só owner/pastor), o RLS diz sim. Qual é a regra correta? Se pode, até qual papel (não `pastor`? não `secretaria`?)?
3. **`pastor` pode promover outro a `pastor`? Pode bloquear outro `pastor`?**
4. **Bloquear = ?** Perde acesso ao portal, alguém deixa de aparecer em escalas/relatórios? Mantém histórico? (proposta: soft-block, mantém tudo, só barra login/уso).
5. **Exclusão de membro existe?** Proposta: **não** — só bloquear. Confirmar. (Se um membro pediu para sair / LGPD, aí sim precisa de um fluxo de remoção com anonimização.)
6. **Convite:** expira em quanto tempo por padrão? Tem limite de usos? Pode conceder papel de staff (ex. convidar uma secretaria) ou só `membro`?
7. **Auto-aprovação (`member_mode = 'open'` e convite `auto_approve`)** continua existindo?
8. **Transferência de propriedade** entra na Fase 1 ou fica para a Fase 7 como planejado? (Recomendo Fase 7, mas a RPC de guarda do `owner` já deixa o terreno pronto.)

---

## 9. CRITÉRIOS DE ACEITE DA FASE 1

**Segurança**
- [ ] `owner` não pode ser rebaixado/bloqueado por ninguém exceto fluxo de transferência — **testado** (unit + integração).
- [ ] Escalonamento para `owner` via REST direto **bloqueado no banco** — teste negativo passa.
- [ ] Transições de status inválidas rejeitadas — teste.
- [ ] Cross-tenant (ler/editar membro de outra org) — teste negativo passa para todos os papéis.
- [ ] Líder de departamento não altera membros fora do escopo — teste negativo passa.
- [ ] Nenhuma autorização crítica somente no frontend — RPCs `SECURITY DEFINER` cobrindo aprovar/bloquear/reativar/papel.
- [ ] `search_path` explícito em toda RPC nova.

**Dados / escala**
- [ ] Zero `select("*")` na tela de membros (já ok) e nas novas queries.
- [ ] Paginação server-side funcionando com > 1.000 membros sem degradação perceptível.
- [ ] Busca server-side (nome, telefone; e-mail se aprovado o join).
- [ ] Filtros (status, papel, departamento) server-side.
- [ ] Ordenação.
- [ ] Contagens via `count` em vez de trazer todas as linhas.

**Membros (funcional)**
- [ ] Listagem · Busca · Filtros · Ordenação.
- [ ] Visualização detalhada por membro (respeitando papel do operador).
- [ ] Aprovação · Bloqueio (com motivo opcional) · Reativação — via RPC.
- [ ] Troca de papel conforme regras de §8 — via RPC.
- [ ] Convites com expiração + (opcional) limite de usos; rastro de quem entrou por qual convite.

**Auditoria**
- [ ] Colunas/`audit_logs` para aprovar, bloquear, reativar, trocar papel, criar/revogar convite.
- [ ] Padrão `entity_type`/`entity_id` introduzido (pelo menos para os eventos de membro).

**UX**
- [ ] Loading (existe) · Empty state (todas as listas) · Error state (`error.tsx`) · Feedback de ação · Confirmação em ações destrutivas.
- [ ] Desktop / tablet / mobile revisados, sem scroll lateral.
- [ ] `RoleSelect` e `InviteLink` acessíveis e à prova de erro.

**Testes**
- [ ] Unit (transições, guards) · Integração (todas as policies + RPCs) · Cross-tenant negativos · E2E do fluxo completo · Negativos E2E.
- [ ] `npm run build` + lint + typecheck passam.

---

## 10. STATUS DA FASE

**AUDITORIA CONCLUÍDA — IMPLEMENTAÇÃO NÃO INICIADA.**

Achados críticos que mudam o comportamento atual e precisam da sua decisão antes de implementar: **P0-1, P0-2, P0-4** (dependem das respostas de §8, itens 2 e 3) e todo o §8.

Aguardando: (a) respostas de §8; (b) autorização para executar a Etapa A.
