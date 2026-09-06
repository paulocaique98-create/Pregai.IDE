-- Separa "entrar como membro de uma igreja" de "criar uma igreja".

create type member_status as enum ('pending', 'active', 'blocked');

alter table organization_members
  add column status member_status not null default 'active';

-- membros comuns entram pendentes; owner/pastor/etc. seguem ativos
alter table organization_members alter column status set default 'pending';

alter table organizations
  add column member_mode text not null default 'approval'
  check (member_mode in ('approval', 'open'));

-- Só vínculos ativos contam para RLS -------------------------------------------
create or replace function current_org_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select org_id from organization_members
  where user_id = auth.uid() and status = 'active'
$$;

create or replace function has_org_role(target_org uuid, roles org_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from organization_members
    where org_id = target_org and user_id = auth.uid()
      and status = 'active' and role = any(roles)
  )
$$;

-- Hook do JWT: emite todos os vínculos, com status ----------------------------
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  claims jsonb := event->'claims';
  memberships jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object('org_id', org_id, 'role', role, 'status', status)), '[]'::jsonb)
  into memberships
  from organization_members
  where user_id = (event->>'user_id')::uuid;

  claims := jsonb_set(claims, '{app_metadata,orgs}', memberships);
  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- create_organization: fundador entra ATIVO como owner ------------------------
create or replace function public.create_organization(p_name text, p_slug text)
returns organizations language plpgsql security definer set search_path = public as $$
declare
  v_org organizations;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  insert into organizations (name, slug) values (p_name, p_slug)
  returning * into v_org;

  insert into organization_members (org_id, user_id, role, status)
  values (v_org.id, auth.uid(), 'owner', 'active');

  insert into site_configs (org_id) values (v_org.id);
  return v_org;
end;
$$;

-- join_organization: vincula a pessoa a uma igreja existente ------------------
create or replace function public.join_organization(p_slug text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_org organizations;
  v_status member_status;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  select * into v_org from organizations where slug = p_slug;
  if v_org.id is null then return 'not_found'; end if;

  select status into v_status
  from organization_members
  where org_id = v_org.id and user_id = auth.uid();

  if found then return v_status::text; end if;

  insert into organization_members (org_id, user_id, role, status)
  values (
    v_org.id, auth.uid(), 'membro',
    case v_org.member_mode when 'open' then 'active'::member_status else 'pending'::member_status end
  )
  returning status into v_status;

  return v_status::text;
end;
$$;

grant execute on function public.join_organization(text) to authenticated;

-- Equipe gerencia status dos membros
create policy "team updates member status" on organization_members
  for update using (has_org_role(org_id, array['owner','pastor','secretaria']::org_role[]))
  with check (has_org_role(org_id, array['owner','pastor','secretaria']::org_role[]));
