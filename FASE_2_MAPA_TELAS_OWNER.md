# FASE 2 — MAPA DAS TELAS DA ÁREA OWNER / OPERAÇÃO

> Auditoria de mapeamento. Base: produção pós-Fase 1. Nenhum código alterado nesta etapa.
> Data: 2026-09-07.

---

## 1. Entrada e contexto

| Item | Como funciona hoje |
|---|---|
| Login | `/entrar` (e-mail+senha) e `/igreja/<slug>/entrar` (membro). `signInWithPassword`. Sessão em cookies (`@supabase/ssr`, ~400 dias — Fase 0). |
| Roteamento pós-login | `resolveHome()` (`src/lib/home.ts`): platform-admin → `/admin` (exceto se dono de 1 igreja); staff de 1 igreja → `/painel/igreja/<slug>`; staff de várias → `/painel`. |
| Guard do painel da igreja | `layout.tsx` → `getOrgForPanel(slug)` (staff ativo **ou** líder de departamento) senão `notFound()`. |
| Guard de cada página | maioria usa `getOrgForMember(slug)` → exige membership **ativa** em `owner\|pastor\|secretaria\|lider`. |
| Papel do ator | `getOrgForMember` retorna `role`; `getOrgForPanel` retorna `role` + `isStaff` + `leadsAny`. Lido do banco (não do JWT). |
| Slug | validado só por "existe organização com esse slug" + membership. |

---

## 2. Telas existentes

| Rota | Nome na UI | Guard | Tabelas | Escrita | Papéis que editam (hoje) |
|---|---|---|---|---|---|
| `/painel` | Suas igrejas | `getMemberships` | `organization_members`, `organizations` | — | — |
| `/painel/igreja/[slug]` | **Início** (é o Editor do site) | `getOrgForMember` | `site_configs`, `organizations`(nome via ctx) | `saveSite`, `setPublished`, `uploadSiteAsset` | **owner, pastor, secretaria, lider** ⚠️ |
| `/painel/igreja/[slug]/avisos` | Avisos | `getOrgForMember` | `announcements` | CRUD | owner, pastor, secretaria, lider |
| `/painel/igreja/[slug]/agenda` (+ `[eventId]`) | Agenda | `getOrgForMember` | `site_events`, `event_registrations` | CRUD | owner, pastor, secretaria, lider |
| `/painel/igreja/[slug]/membros` (+ `[userId]`) | Membros e equipe | `getOrgForPanel` | `organization_members`, `profiles`, `organization_invites`, `audit_logs` | **RPCs (Fase 1)** | owner, pastor, secretaria (líder = leitura escopada) |
| `/painel/igreja/[slug]/oracoes` | Pedidos de oração | `getOrgForMember` | `prayer_requests` | `setPrayerStatus` | owner, pastor, secretaria, lider |
| `/painel/igreja/[slug]/visitantes` | Visitantes | `getOrgForMember` | `visitor_checkins` | `setVisitorStatus` | owner, pastor, secretaria, lider |
| `/painel/igreja/[slug]/ministerios` | Ministérios do site | `getOrgForMember` | `site_ministries` | CRUD | owner, pastor, secretaria, lider |
| `/painel/igreja/[slug]/departamentos` (+ `[deptId]`, escalas) | Departamentos | `getOrgForPanel` | `departments`, `department_members`, `serving_*` | CRUD + `setDeptMember` | staff **ou** líder do depto |
| `/admin` | Igrejas (plataforma) | `isPlatformAdmin` (email) + `createAdminClient` (service-role) | tudo | leitura | platform admin |

---

## 3. Telas ausentes ou só parcialmente cobertas

| Falta | Evidência | Impacto |
|---|---|---|
| **Configurações da Igreja** | `organizations.name` só editável indiretamente; `member_mode` ('approval'\|'open', migration 0004) **sem nenhuma UI** e **sem nenhuma referência no código**; `custom_domain` (0017) idem; `slug` não editável. | Owner não consegue: renomear a igreja, abrir/fechar entrada automática de membros, ver/definir domínio. |
| **Dashboard/visão geral do Owner** | `/painel/igreja/[slug]` é o editor do site, não um resumo operacional. | Owner não tem panorama (pendências, membros, próximos eventos, site no ar). |
| **Equipe (staff) como visão dedicada** | Está dentro de "Membros" (Fase 1). | OK por ora; pode virar aba filtrada. |
| **Papéis e transferência de propriedade** | — | **Fase 7** (fora do escopo). |
| **Prestação de contas / financeiro** | — | Fase futura. |
| **Configuração de notificações/e-mail da igreja** | `orgStaffEmails` lê e-mails do staff; sem tela. | Backlog. |

---

## 4. Problemas de segurança já identificados na área Owner (fora de Membros)

| # | Problema | Gravidade |
|---|---|---|
| F2-A1 | **Um `lider` (papel da organização) pode editar e publicar/despublicar o site público inteiro**, editar avisos, agenda, ministérios, oração, visitantes. `getOrgForMember` inclui `lider`; as RLS `team writes *` incluem `lider`. Contradiz a regra da Fase 1 ("líder limitado aos departamentos"). | **P0** |
| F2-A2 | `saveSite`/`setPublished`/`uploadSiteAsset` só checam `if (!ctx)` — qualquer staff, incl. `lider`. Sem auditoria de publish/unpublish. | P1 |
| F2-A3 | `member_mode` só pode ser alterado por SQL direto; se algum dia exposto sem cuidado, um toggle para `'open'` faz qualquer pessoa virar membro ativo sem aprovação. | P1 (ao expor) |
| F2-A4 | `organizations` UPDATE RLS = `owner\|pastor`; sem trigger protegendo `slug`/`id`. Trocar `slug` quebra todos os links, QR codes e o roteamento por subdomínio, sem redirecionamento. | P1 |
| F2-A5 | `departamentos/actions.ts`: `createDepartment`/`deleteDepartment` exigem `isStaff` (bom), mas `isStaff` inclui `lider` de organização — um `lider` cria/exclui departamentos de toda a igreja. | P2 |
| F2-A6 | Nenhuma ação da área Owner (fora Membros) grava `audit_logs`. | P2 |
| F2-A7 | Erros das actions retornam `error.message` cru do Postgres para a UI (`saveSite`). | P2 |

---

## 5. Decisão — PRIMEIRA TELA da Fase 2

### Escolhida: **"Configurações da Igreja"** (`/painel/igreja/[slug]/configuracoes`) + blindagem da fronteira de autorização da área de operação.

**Por quê (critérios do prompt):**

1. **Importância operacional** — é o núcleo do que só o Owner controla: identidade da igreja e política de entrada de membros (`member_mode`). Hoje não existe.
2. **Dependências** — `member_mode` alimenta o fluxo de join da Fase 1 (`join_organization`, `accept_invite`); a tela fecha um buraco que a Fase 1 deixou aberto (entrada automática não gerenciável).
3. **Risco** — `member_mode='open'` é uma decisão de segurança (aprovação automática de qualquer um). Precisa de tela com confirmação e regra clara de quem pode mudar.
4. **Estrutura existente** — as colunas (`name`, `member_mode`, `custom_domain`) já existem no schema; não estou inventando o modelo, estou expondo config real.
5. **Impacto sobre outras telas** — define o padrão de autorização Owner-vs-Pastor da Fase 2 e resolve F2-A1/A2/A3/A4 (a fronteira "líder não é admin global", que contamina todas as outras telas da área).

**Escopo da Tela 1:**
- Nova tela `configuracoes` com: **Identidade** (nome), **Entrada de membros** (`member_mode` approval/open com confirmação), **Domínio** (exibe `custom_domain`/URL — somente leitura nesta fase).
- RPC `update_org_settings` (SECURITY DEFINER) + auditoria.
- Blindagem F2-A1/A2: `lider` (papel de organização) deixa de escrever no site e nas configs — no app **e** na RLS. `getOrgForMember` continua, mas as escritas de site passam a exigir `owner\|pastor\|secretaria` e a RLS `team writes site` perde `lider`.
- Auditoria de `site.publish` / `site.unpublish` / `org.settings_change`.
- `slug` **não** editável nesta fase (quebra links; exige sistema de redirect) — registrado como backlog/CONFLITO.

**Fora da Tela 1 (próximas telas, requerem nova autorização):** Dashboard do Owner, blindagem de avisos/agenda/ministérios/oração/visitantes contra `lider` (mesma correção, aplicada tela a tela), tela de Equipe.

---

## 6. Conflitos registrados (decisão de produto pendente)

**CONFLITO F2-C1 — `lider` (papel de organização) na área de operação.**
- Regra documentada (Fase 1): "Líder permanece limitado aos departamentos que lidera. Não transformar o Líder em administrador global."
- Código atual: `getOrgForMember` e as RLS `team writes *` dão ao `lider` de organização poder total sobre site, avisos, agenda, ministérios, oração e visitantes.
- Impacto: se algum cliente já usa o papel `lider` de organização esperando esse poder, a correção remove acesso.
- **Decisão adotada (segura, alinhada à Fase 1):** `lider` de organização perde escrita no site/config nesta tela. As demais telas serão ajustadas uma a uma. Se você quiser um "gerente operacional" com poder amplo, isso deve ser um papel/*flag* explícito, não o `lider`.

**CONFLITO F2-C2 — troca de `slug`.**
- Não há sistema de redirecionamento de slug antigo. Trocar quebra links/QR/subdomínio.
- **Decisão:** `slug` fica somente-leitura na Tela 1. Edição de slug = tarefa futura com tabela de redirects.
