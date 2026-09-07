# Pregai — Levantamento do Projeto

> Documento de contexto para colaboração com outra IA.
> Última atualização: 2026-09-07. Produção: https://pregai-ide.vercel.app

---

## 1. O que é o Pregai

SaaS multi-tenant (multi-igreja) que dá a cada igreja:

1. **Site público white-label** (`/igreja/<slug>`) — apresentação da igreja, editável pelo painel, com cor e logo próprios.
2. **Portal do membro** (`/igreja/<slug>/membro`) — área logada para membros: avisos, agenda, devocional, EBD, contribuição PIX, escalas, departamentos.
3. **Painel de operação** (`/painel/igreja/<slug>`) — para a equipe (owner/pastor/secretaria/líder): editor do site, avisos, agenda, membros, oração, visitantes, departamentos e escalas.
4. **Admin da plataforma** (`/admin`) — visão do super-admin do SaaS (lista de igrejas).

Tudo em **português (pt-BR)**. Design **monocromático (preto e branco), minimalista**, com a cor principal da igreja aplicada como acento.

Deploy contínuo: GitHub `paulocaique98-create/Pregai.IDE` → Vercel (a cada push na `main`).

---

## 2. Stack técnica

| Camada | Tecnologia |
|---|---|
| Framework | **Next.js 16.3.4** (App Router, React Server Components, Server Actions, `proxy.ts` = middleware renomeado) |
| UI | React 19.2, **Tailwind v4** (tokens HSL), Material Symbols (icon font), Inter + Playfair Display (`next/font`) |
| Backend | **Supabase** — Postgres + Row-Level Security, Auth (hook `custom_access_token_hook` no JWT), Storage (bucket `site-assets`), RPCs `SECURITY DEFINER` |
| Notificações | **Web Push (VAPID)** via lib `web-push` + tabela `notifications` (in-app) |
| E-mail | **Resend** (`src/lib/email.ts`) — **inerte sem `RESEND_API_KEY`**; hoje sem domínio verificado |
| PIX | Implementação própria do BR Code EMV + CRC16 (`src/lib/site/pix.ts`), QR via `qrcode` |
| Scraping c/ cache | Versículo + devocional (BíbliaOn), lições EBD/CPAD (estudantesdabiblia.com.br) |
| PWA | `manifest.webmanifest` por igreja + Service Worker (`public/sw.js`) |

**Não há integração paga** (sem WhatsApp API, sem Stripe ativo). Decisão do dono: tudo dentro do app.

---

## 3. Modelo de dados (multi-tenancy)

- `organizations` (id, slug, name, `custom_domain`, config do site em JSON) + `organization_members` (papéis: **owner / pastor / secretaria / lider / membro**; status: **pending / active / blocked**; `member_mode`: approval | open).
- Toda tabela de conteúdo tem `org_id`. Políticas RLS usam funções: `current_org_ids()`, `has_org_role()`, `leads_department()`, `leads_any_department()`.
- `profiles` (1:1 com `auth.users`): `full_name`, `phone`, `primary_org_id` (igreja principal do usuário).
- Migrations `0001`–`0019` em `supabase/migrations/` (aplicadas via `npx supabase db push`).

### Tabelas principais por área
| Área | Tabelas / RPCs |
|---|---|
| Organização | `organizations`, `organization_members`, `profiles`, RPC `create_organization`, `join_organization` |
| Convites | `organization_invites` (token único, label, role, `auto_approve`, `expires_at`), RPC `accept_invite(token)` |
| Site | JSON em `organizations` (branding, hero, about, first_time, giving, contact, social_links, media, section_titles, sections_visibility) |
| Site — ministérios (vitrine) | `site_ministries` (title, description[], icon, sort_order) |
| Agenda | `site_events` (+ `capacity`, `registration_open`), `event_registrations`, RPC `event_taken_counts` |
| Avisos | `announcements` (title, body, is_pinned, is_published) |
| Oração | `prayer_requests` (status: novo/orando/atendido; `is_confidential`) |
| Visitantes | `visitor_checkins` (status: novo/contatado/compareceu/arquivado) |
| Departamentos | `departments`, `department_members` (status pending/active), líder delegado |
| Escalas | `serving_schedules`, `serving_assignments` (status enum pending/confirmed/declined, token único p/ confirmar sem login), RPCs `assignment_by_token`, `respond_assignment` |
| EBD | lições via scraping + `lesson_notes` (anotações do membro) |
| Notificações | `notifications` (kind, title, body, url, read_at), `push_subscriptions` (endpoint, p256dh, auth) |

---

## 4. O QUE JÁ ESTÁ PRONTO ✅

### 4.1 Fundação / infra
- [x] Projeto Next 16 + Supabase, deploy automático na Vercel.
- [x] Auth por e-mail + senha. **JWT hook** injeta papéis/orgs no token.
- [x] "Confirm email" **desligado** (decisão: usar só Supabase, sem Resend por ora).
- [x] RLS em todas as tabelas; RPCs `SECURITY DEFINER` no lugar de Edge Functions.
- [x] **Sessão persistente ~400 dias** — membro não é deslogado ao fechar/reabrir o app (corrigido em `cookie-options.ts` + `server.ts` + `proxy.ts`).
- [x] `loading.tsx` (skeletons) no portal e no painel; versículo do dia via Suspense.
- [x] Roteamento: `resolveHome()` leva o usuário logado ao lugar certo por permissão (prefere `primary_org_id`; super-admin dono de 1 única igreja vai ao painel dela, não ao `/admin`).

### 4.2 Site público (`/igreja/<slug>`)
- [x] Hero (rótulo, título, subtítulo, imagem de capa), seção "última transmissão" logo abaixo.
- [x] Seções: Quem somos, Agenda, Ministérios (vitrine), Primeira vez, Dízimos/Ofertas (PIX + QR), Contato, Mídia (reassistir última live).
- [x] Cor principal e logo da igreja aplicados em todo o site e portal.
- [x] Botão vermelho "Inscreva-se no canal" (YouTube).
- [x] Header fixo com âncoras + bottom nav no mobile.
- [x] **"Planeje sua visita"** — formulário na seção Primeira vez → cai na fila de Visitantes do painel.
- [x] **Inscrição em eventos** — evento com vaga limitada mostra vagas restantes e botão inscrever; lista de inscritos no painel.
- [x] Página **`/bio`** — "link na bio" com blocos automáticos (última live, próximo evento, PIX, oração, área do membro) + redes sociais.
- [x] **JSON-LD** `Church` (endereço, horários, sameAs) para SEO.
- [x] Páginas legais: `/privacidade`, `/termos`.
- [x] PWA: `manifest.webmanifest` por igreja, página `/igreja/<slug>/instalar`.

### 4.3 Portal do membro (`/igreja/<slug>/membro`)
- [x] **Vínculo deliberado**: se a pessoa já é membro de outra igreja, aparece tela de confirmação antes de entrar (cookie `pregai_join_intent` + estado `needs_confirm`).
- [x] Igreja principal + **seletor "trocar igreja"** no header quando há mais de uma.
- [x] Início: Minha escala, Avisos, Palavra do dia, Última live, Próximos eventos, Onde você serve.
- [x] Páginas: Avisos, Agenda, Devocional, EBD (com anotações), Contribuição (PIX), Departamentos, Escala, Notificações, Perfil.
- [x] **Sino de notificações** com contador de não lidas + página `/membro/notificacoes`.
- [x] **Web Push** — toggle de ativação; recebe push de "membro aprovado" e "novo aviso".

### 4.4 Painel de operação (`/painel/igreja/<slug>`)
- [x] **Editor do site** — seções recolhíveis (começam fechadas), barra fixa Salvar/Publicar, upload de logo e capa do dispositivo (Storage), controle de quais seções aparecem.
- [x] **Avisos** — CRUD, fixar no topo, publicar/despublicar; publicar notifica membros; **excluir remove também as notificações geradas**.
- [x] **Agenda** — CRUD de eventos, ordenados por data, capacidade + inscrições.
- [x] **Membros e equipe** — fila de aprovação, diretório, troca de papel, bloquear/reativar, **links de convite** (`/c/<token>` curto, com opção "aprovar na hora").
- [x] **Oração** — lista com status (novo/orando/atendido), marca confidencial, link WhatsApp.
- [x] **Visitantes** — fila com status (novo/contatado/veio), link WhatsApp.
- [x] **Ministérios do site** — CRUD do texto de vitrine (título + descrição + ícone). É só conteúdo do site, não gestão de equipe.
- [x] **Departamentos** — CRUD, líder delegado aprova membros e gerencia o time.
- [x] **Escalas ministeriais** (por departamento):
  - Montar escala por data + funções.
  - Escalar voluntário (recebe notificação in-app + push).
  - Membro confirma / "não posso" no portal **ou** via link `/confirmar/<token>` **sem login**.
  - Detecção de conflito (mesma pessoa em duas escalas no mesmo dia).
  - Líder é avisado quando o voluntário responde.
- [x] Navegação lateral: "Início", "Avisos", "Agenda", "Departamentos", "Oração", "Membros" + (mais) "Ministérios do site", "Visitantes".
- [x] Mobile/tablet: overflow corrigido, sem scroll lateral, `StatTile` robusto, bottom nav.

### 4.5 Admin da plataforma
- [x] `/admin` — lista de igrejas (super-admin por `PLATFORM_ADMIN_EMAILS`).

### 4.6 Preparo de produção
- [x] Roteamento por **subdomínio** no `proxy.ts` (`<slug>.dominio` → `/igreja/<slug>`) — inerte até configurar `NEXT_PUBLIC_TENANT_BASE_DOMAIN`.
- [x] Coluna `custom_domain` em `organizations`.
- [x] Service Worker v2 (não cacheia HTML; cache só de estáticos).
- [x] Scaffold de e-mail Resend (no-op sem chave): membro aprovado, novo pendente, novo pedido de oração, novo visitante.
- [x] `RUNBOOK.md` na raiz (env vars, ativações manuais no Supabase, migrations, comandos).

---

## 5. O QUE FALTA FAZER 🚧

### 5.1 Próximo planejado
- [ ] **Lote 6 — Acervo de mensagens**: sermões + séries, importação do YouTube, aba no painel, páginas pública e do membro.
- [ ] **Lote 7 — Papéis e transferência de propriedade**: transferir "owner", limites por papel mais finos, auditoria.
- [ ] **Lote 8 — P2 (lote grande)**: células/pequenos grupos, campanhas, prestação de contas (financeiro), "ao vivo agora", exportações (CSV).

### 5.2 Pendências do dono (fora do escopo da IA — precisam de ação no dashboard)
- [ ] **Stripe / billing** — cobrança das igrejas. **Adiado para o fim de tudo.**
- [ ] **Registrar domínio** (sugestão: `pregai.com.br`) no registro.br. **Adiado para o fim.**
- [ ] **E-mail transacional** — Resend precisa de domínio verificado; hoje e-mails do app só chegam ao próprio dono via `onboarding@resend.dev`. Alternativas: usar SMTP do Supabase, ou verificar domínio no Resend depois de registrá-lo.
- [ ] **VAPID em produção** — adicionar `VAPID_PRIVATE_KEY` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_SUBJECT` nas env vars da Vercel e redeploy para o push disparar nos celulares (hoje só a parte in-app funciona sem isso).
- [ ] Confirmar no Supabase **Authentication → Sessions** que "Time-box user sessions" e "Inactivity timeout" estão **desligados**.
- [ ] Decidir se `PLATFORM_ADMIN_EMAILS` na Vercel deve ter um e-mail de admin **separado** do e-mail de owner de igreja de teste.

### 5.3 Dívidas técnicas / pontos de atenção
- [ ] **"Ministérios do site" vs "Departamentos"** são cadastros separados e o nome confunde. Avaliar unificar ou renomear ("Ministérios do site" → "Vitrine de ministérios"?).
- [ ] Notificações não têm referência à entidade de origem — ao excluir um aviso, a limpeza de notificações é feita por `org_id + kind + title` (heurística, não FK).
- [ ] Sem testes automatizados. Verificação hoje é manual + scripts `.mjs` ad-hoc contra a REST API do Supabase.
- [ ] Sem observabilidade (logs estruturados, Sentry, etc.).
- [ ] Scraping de versículo/EBD depende de sites de terceiros — quebra silenciosa se o HTML mudar.
- [ ] E-mail e push são "melhor esforço" (falha não bloqueia a ação, mas também não alerta).
- [ ] Onboarding de nova igreja (`/onboarding`) existe mas o fluxo completo de "criar igreja do zero" precisa de revisão de UX.
- [ ] i18n: strings hardcoded em pt-BR (ok por ora, mas não há infra de tradução).
- [ ] Acessibilidade não auditada formalmente.

### 5.4 Ainda não existe (backlog aberto, sem lote definido)
- [ ] Financeiro real (entradas/saídas, relatórios, recibos de doação).
- [ ] Chat / comunicação interna entre membros.
- [ ] Calendário com RSVP e lembretes.
- [ ] Gestão de patrimônio / reservas de espaço.
- [ ] Multi-idioma.
- [ ] App nativo (hoje é PWA).
- [ ] Painel de métricas para a igreja (frequência, crescimento, engajamento).
- [ ] Importação de base de membros existente (planilha).

---

## 6. Ambiente e operação

**Env vars (Vercel + `.env.local`):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_PASSWORD`, `PLATFORM_ADMIN_EMAILS`, `RESEND_API_KEY` (opcional), `EMAIL_FROM`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `NEXT_PUBLIC_TENANT_BASE_DOMAIN` (ainda não usado).

**Ciclo de deploy:** editar → `npm run build` (tem que passar) → `git commit` → `git push` → Vercel publica → conferir `https://pregai-ide.vercel.app`.

**Migrations:** `npx supabase db push` com a senha do banco.

**Detalhe importante do repo:** o `AGENTS.md` avisa que esta versão do Next tem breaking changes — sempre consultar `node_modules/next/dist/docs/` antes de escrever código de framework.

---

## 7. Estado atual resumido

**Pronto para uso real por uma igreja piloto:** site público, portal do membro, painel de operação, avisos, agenda, oração, visitantes, departamentos, escalas, EBD, devocional, PIX, notificações in-app.

**Falta para escala comercial:** billing (Stripe), domínio próprio + e-mail transacional, push em produção, acervo de mensagens, financeiro, testes/observabilidade.
