-- Igreja principal do membro + links de convite.

alter table profiles
  add column primary_org_id uuid references organizations on delete set null;

create table organization_invites (
  id           uuid primary key default uuid_generate_v4(),
  org_id       uuid not null references organizations on delete cascade,
  token        text not null unique,
  label        text,
  role         org_role not null default 'membro',
  auto_approve boolean not null default false,
  created_by   uuid references auth.users,
  expires_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index on organization_invites (token);

alter table organization_invites enable row level security;

create policy "team manages invites" on organization_invites
  for all
  using (has_org_role(org_id, array['owner', 'pastor', 'secretaria']::org_role[]))
  with check (has_org_role(org_id, array['owner', 'pastor', 'secretaria']::org_role[]));

-- Aceitar convite: lookup + vínculo atômico. O token é o segredo (sem SELECT público).
create or replace function public.accept_invite(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_inv organization_invites;
  v_org organizations;
  v_status member_status;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  select * into v_inv from organization_invites where token = p_token;
  if v_inv.id is null then return jsonb_build_object('result', 'not_found'); end if;
  if v_inv.expires_at is not null and v_inv.expires_at < now() then
    return jsonb_build_object('result', 'expired');
  end if;

  select * into v_org from organizations where id = v_inv.org_id;

  select status into v_status from organization_members
  where org_id = v_inv.org_id and user_id = auth.uid();

  if not found then
    insert into organization_members (org_id, user_id, role, status)
    values (
      v_inv.org_id, auth.uid(), v_inv.role,
      case when v_inv.auto_approve then 'active'::member_status else 'pending'::member_status end
    )
    returning status into v_status;
  end if;

  update profiles set primary_org_id = v_inv.org_id
  where user_id = auth.uid() and primary_org_id is null;

  return jsonb_build_object('result', v_status::text, 'slug', v_org.slug);
end;
$$;
grant execute on function public.accept_invite(text) to authenticated;

-- create_organization / join_organization passam a definir a igreja principal.
create or replace function public.create_organization(p_name text, p_slug text)
returns organizations language plpgsql security definer set search_path = public as $$
declare v_org organizations;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into organizations (name, slug) values (p_name, p_slug) returning * into v_org;
  insert into organization_members (org_id, user_id, role, status)
  values (v_org.id, auth.uid(), 'owner', 'active');
  insert into site_configs (org_id) values (v_org.id);
  update profiles set primary_org_id = v_org.id
  where user_id = auth.uid() and primary_org_id is null;
  return v_org;
end;
$$;

create or replace function public.join_organization(p_slug text)
returns text language plpgsql security definer set search_path = public as $$
declare v_org organizations; v_status member_status;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into v_org from organizations where slug = p_slug;
  if v_org.id is null then return 'not_found'; end if;

  select status into v_status from organization_members
  where org_id = v_org.id and user_id = auth.uid();
  if found then return v_status::text; end if;

  insert into organization_members (org_id, user_id, role, status)
  values (
    v_org.id, auth.uid(), 'membro',
    case v_org.member_mode when 'open' then 'active'::member_status else 'pending'::member_status end
  )
  returning status into v_status;

  update profiles set primary_org_id = v_org.id
  where user_id = auth.uid() and primary_org_id is null;

  return v_status::text;
end;
$$;
