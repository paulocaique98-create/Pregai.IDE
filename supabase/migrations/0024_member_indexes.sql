-- FASE 1 (Membros) — Índices para paginação/filtros do diretório.
-- Justificativa: list_members filtra por org_id + status/role e ordena por created_at.

create index if not exists organization_members_org_status_idx
  on organization_members (org_id, status);

create index if not exists organization_members_org_role_idx
  on organization_members (org_id, role);

create index if not exists organization_members_org_created_idx
  on organization_members (org_id, created_at desc);

-- Busca por nome/telefone (ilike '%x%'): trigramas.
create extension if not exists pg_trgm;

create index if not exists profiles_full_name_trgm_idx
  on profiles using gin (full_name gin_trgm_ops);

create index if not exists profiles_phone_trgm_idx
  on profiles using gin (phone gin_trgm_ops);

-- Convite: lookup por token já é unique; índice para varrer por org.
create index if not exists organization_invites_org_idx
  on organization_invites (org_id, created_at desc);
