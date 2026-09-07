# Pregai — Runbook operacional

SaaS multi-tenant de sites e operação para igrejas.
**Produção:** https://pregai-ide.vercel.app · **Repo:** `paulocaique98-create/Pregai.IDE` · **Supabase:** projeto `bdwekdtrifxeqqcfvyou`

---

## 1. Stack

| Camada | O quê |
|---|---|
| App | Next.js 16 (App Router, RSC, server actions), React 19, Tailwind v4 |
| Dados | Supabase — Postgres + RLS, Auth, Storage; RPCs `SECURITY DEFINER` no lugar de Edge Functions |
| Deploy | Vercel — build automático a cada push na `main` |
| E-mail | Resend (opcional; sem chave os envios viram no-op) |

---

## 2. Variáveis de ambiente

### Vercel (Production + Preview + Development)
| Chave | Valor / origem |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://bdwekdtrifxeqqcfvyou.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | idem (secreta) |
| `NEXT_PUBLIC_APP_URL` | URL de produção (ex: `https://pregai-ide.vercel.app` ou o domínio próprio) |
| `NEXT_PUBLIC_TENANT_BASE_DOMAIN` | domínio-base para subdomínios de igreja (ver §6) |
| `PLATFORM_ADMIN_EMAILS` | e-mails de super-admin, separados por vírgula — **hoje aponta p/ e-mail inexistente, corrigir para `paulo_caique@hotmail.com`** |
| `RESEND_API_KEY` | (opcional) Resend → API Keys |
| `EMAIL_FROM` | (opcional) ex: `Pregai <no-reply@pregai.app>` — o domínio precisa estar verificado no Resend |

### Só local (`.env.local`, não vai para o Vercel)
`SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF` — usados pela Supabase CLI para migrations.
`STITCH_API_KEY` — MCP do Stitch (escopo local, em `~/.claude.json`).

---

## 3. Ativações manuais no dashboard do Supabase (NÃO versionadas)

Se o projeto Supabase for recriado, refazer tudo isto:

1. **Auth → Hooks** → *Customize Access Token (JWT) Claims* → função `public.custom_access_token_hook` → **Enable**.
   Sem isso, `app_metadata.orgs` não entra no JWT (não quebra RLS, que lê a tabela, mas convém).
2. **Auth → Sign In / Providers → Email** → provedor **habilitado**.
   *Confirm email* está **desligado** hoje (para testes). **Religar** quando o Resend/SMTP estiver pronto.
3. **Auth → Providers → Google** → Client ID + Secret (Google Cloud → APIs & Services → Credentials).
   Redirect URI no Google: `https://bdwekdtrifxeqqcfvyou.supabase.co/auth/v1/callback`.
4. **Auth → URL Configuration**:
   - Site URL = URL de produção.
   - Redirect URLs = produção `/**` + `http://localhost:3000/**` (+ cada domínio próprio de igreja, ou usar um domínio único de auth).
5. **SMTP (quando for usar e-mail do Supabase)** → Auth → Emails → SMTP: host `smtp.resend.com`, porta 465, user `resend`, senha = API key do Resend.

---

## 4. Migrations

Aplicadas via CLI. **Uma a uma, nunca destrutivas.**

```bash
npx supabase db push -p '<SUPABASE_DB_PASSWORD>'
```

Migrations vivem em `supabase/migrations/NNNN_*.sql`. Ordem importa. Já aplicadas: `0001`–`0017`.

| # | Introduz |
|---|---|
| 0001 | fundação multi-tenant + RLS |
| 0002 | hook de JWT |
| 0003 | RPC `create_organization` |
| 0004 | status de vínculo, RPC `join_organization`, `member_mode` |
| 0005 | leitura pública de `organizations` com site publicado |
| 0006 | equipe lê perfis da mesma igreja |
| 0007 | `departments` + `department_members` + liderança |
| 0008 | `site_configs.first_time` |
| 0009 | `lesson_notes` (anotações da EBD) |
| 0010–0011 | bucket `site-assets` + policies |
| 0012 | `organization_invites` + `profiles.primary_org_id` + `accept_invite` |
| 0013 | `announcements` (avisos) |
| 0014 | `visitor_checkins.status` |
| 0015 | `event_registrations` + `site_events.capacity/registration_open` |
| 0016 | RPC pública `event_taken_counts` |
| 0017 | `organizations.custom_domain` |

---

## 5. Papéis e acesso

**Papéis na igreja:** `owner` (imutável) · `pastor` · `secretaria` · `lider` · `membro`.
**Status do vínculo:** `pending` · `active` · `blocked`.
**Super-admin da plataforma:** por e-mail (`PLATFORM_ADMIN_EMAILS`) → portal `/admin`.
**Líder de departamento:** um `membro` pode liderar um departamento e acessa só o painel daquele departamento.

Roteamento pós-login: `src/lib/home.ts` → `resolveHome()`. Prefere a **igreja principal** (`primary_org_id`); com várias, cai em `/painel` (que lista tudo).

**Vínculo de membro é deliberado:** se a pessoa já é membro de outra igreja e chega numa nova sem ter vindo do login dela, vê uma tela de confirmação (não vincula em silêncio). Cookie `pregai_join_intent` marca a intenção.

---

## 6. Domínio próprio / subdomínio

O `src/proxy.ts` já reescreve `<slug>.<NEXT_PUBLIC_TENANT_BASE_DOMAIN>` → `/igreja/<slug>`.
**Inerte** enquanto `NEXT_PUBLIC_TENANT_BASE_DOMAIN` for o host da Vercel.

Para ativar de verdade:
1. Comprar o domínio da plataforma (ex: `pregai.app`).
2. Vercel → Settings → Domains → adicionar `pregai.app` **e** `*.pregai.app` (wildcard).
3. `NEXT_PUBLIC_TENANT_BASE_DOMAIN=pregai.app` · `NEXT_PUBLIC_APP_URL=https://pregai.app` → redeploy.
4. Supabase → Redirect URLs → adicionar `https://*.pregai.app/**` (ou domínio de auth único).
5. Domínio 100% próprio da igreja: usar a coluna `organizations.custom_domain` + Vercel Domains API (ainda não implementado no proxy — hoje só subdomínio).

---

## 7. Integrações externas (scraping — frágil)

| Fonte | Uso | Cache |
|---|---|---|
| bibliaon.com/versiculo_do_dia | versículo do dia (portal do membro) | 10 min |
| bibliaon.com/devocional_diario | devocional completo | 10 min |
| estudantesdabiblia.com.br | lições CPAD 3º tri 2026 | 24 h |

Se o HTML dessas fontes mudar, o conteúdo quebra silenciosamente. Código: `src/lib/verse.ts`, `src/lib/ebd.ts`.
Plano: permitir conteúdo próprio da igreja (roadmap P2).

---

## 8. Segurança — pendências

- Rotacionar `STITCH_API_KEY` (Google) e o **client secret do Google OAuth** — passaram por chat durante o desenvolvimento.
- Corrigir `PLATFORM_ADMIN_EMAILS` no Vercel.
- Religar *Confirm email* no Supabase quando o e-mail estiver configurado.

---

## 9. Comandos

```bash
npm run dev            # local (http://localhost:3000)
npm run build          # build de produção (rodar antes de todo commit)
npx supabase db push -p '<senha>'   # aplicar migrations pendentes
git push origin main   # deploy automático na Vercel
```
