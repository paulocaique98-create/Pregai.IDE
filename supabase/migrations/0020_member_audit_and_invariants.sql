-- FASE 1 (Membros) — Auditoria + invariantes de banco.
-- Objetivo: proteção do owner, imutabilidade de org_id, máquina de estados de status.

-- 1. Colunas de auditoria em organization_members -----------------------------
alter table organization_members
  add column if not exists approved_by     uuid references auth.users,
  add column if not exists approved_at     timestamptz,
  add column if not exists blocked_by      uuid references auth.users,
  add column if not exists blocked_at      timestamptz,
  add column if not exists blocked_reason  text,
  add column if not exists role_updated_by uuid references auth.users,
  add column if not exists role_updated_at timestamptz,
  add column if not exists updated_at      timestamptz not null default now();

-- 2. Log de auditoria genérico ----------------------------------------------
create table if not exists audit_logs (
  id            uuid primary key default uuid_generate_v4(),
  org_id        uuid not null references organizations on delete cascade,
  actor_user_id uuid references auth.users,
  action        text not null,
  entity_type   text not null,
  entity_id     uuid,
  metadata      jsonb not null default '{}',
  created_at    timestamptz not null default now()
);
create index if not exists audit_logs_org_created_idx on audit_logs (org_id, created_at desc);

alter table audit_logs enable row level security;
drop policy if exists "staff reads audit" on audit_logs;
create policy "staff reads audit" on audit_logs
  for select using (has_org_role(org_id, array['owner','pastor','secretaria']::org_role[]));
-- inserts: apenas via função SECURITY DEFINER abaixo (sem policy de insert => negado no acesso direto)

create or replace function log_audit(
  p_org uuid, p_action text, p_entity_type text, p_entity_id uuid, p_meta jsonb default '{}'
) returns void language sql security definer set search_path = public as $$
  insert into audit_logs (org_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (p_org, auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_meta, '{}'::jsonb));
$$;

-- 3. Invariantes: trigger BEFORE UPDATE em organization_members --------------
-- Regras impossíveis de burlar mesmo por chamada direta à API:
--   * org_id / user_id imutáveis (multi-tenant);
--   * linha de owner não muda (role/status) fora de um fluxo autorizado;
--   * ninguém vira owner via UPDATE;
--   * transições de status: pending->active, active->blocked, blocked->active.
create or replace function enforce_member_invariants()
returns trigger language plpgsql set search_path = public as $$
declare
  v_allow_owner boolean := coalesce(
    nullif(current_setting('pregai.allow_owner_change', true), ''), 'off'
  ) = 'on';
begin
  if new.org_id <> old.org_id then
    raise exception 'org_id é imutável';
  end if;
  if new.user_id <> old.user_id then
    raise exception 'user_id é imutável';
  end if;

  if not v_allow_owner then
    if old.role = 'owner' and (new.role <> old.role or new.status <> old.status) then
      raise exception 'o proprietário (owner) não pode ser alterado nesta operação';
    end if;
    if new.role = 'owner' and old.role <> 'owner' then
      raise exception 'não é possível promover a proprietário (owner)';
    end if;
  end if;

  if new.status <> old.status then
    if not (
      (old.status = 'pending' and new.status = 'active')  or
      (old.status = 'active'  and new.status = 'blocked') or
      (old.status = 'blocked' and new.status = 'active')
    ) then
      raise exception 'transição de status inválida: % -> %', old.status, new.status;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists organization_members_invariants on organization_members;
create trigger organization_members_invariants
  before update on organization_members
  for each row execute function enforce_member_invariants();

-- 4. Remover policies amplas de escrita. A partir daqui, toda escrita em
--    organization_members passa pelas RPCs SECURITY DEFINER (migration 0021).
drop policy if exists "owners manage members" on organization_members;
drop policy if exists "team updates member status" on organization_members;
-- "read own memberships" (SELECT) permanece.
-- "auth admin reads memberships" permanece.

-- 5. Diagnóstico de organizações sem owner válido (não corrige dados) --------
do $$
declare r record;
begin
  for r in
    select o.id, o.slug
    from organizations o
    where not exists (
      select 1 from organization_members m
      where m.org_id = o.id and m.role = 'owner' and m.status = 'active'
    )
  loop
    raise warning 'ATENÇÃO: organização % (%) não tem owner ativo', r.slug, r.id;
  end loop;
end $$;
