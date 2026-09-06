-- Departamentos (ministérios operacionais) com liderança delegada.

create type dept_role as enum ('member', 'leader');
create type dept_status as enum ('pending', 'active');

create table departments (
  id                  uuid primary key default uuid_generate_v4(),
  org_id              uuid not null references organizations on delete cascade,
  name                text not null,
  slug                text not null,
  description         text,
  is_active           boolean not null default true,
  allow_join_requests boolean not null default true,
  created_at          timestamptz not null default now(),
  unique (org_id, slug)
);

create table department_members (
  department_id uuid not null references departments on delete cascade,
  user_id       uuid not null references auth.users on delete cascade,
  org_id        uuid not null references organizations on delete cascade,
  role          dept_role not null default 'member',
  status        dept_status not null default 'pending',
  created_at    timestamptz not null default now(),
  primary key (department_id, user_id)
);

create index on department_members (org_id);
create index on department_members (user_id);

-- org_id preenchido a partir do departamento
create or replace function set_department_member_org()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select org_id into new.org_id from departments where id = new.department_id;
  return new;
end;
$$;
create trigger department_members_set_org
  before insert on department_members
  for each row execute function set_department_member_org();

-- Helpers -------------------------------------------------------------------
create or replace function leads_department(p_dept uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from department_members
    where department_id = p_dept and user_id = auth.uid()
      and role = 'leader' and status = 'active'
  )
$$;

create or replace function leads_any_department(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from department_members
    where org_id = p_org and user_id = auth.uid()
      and role = 'leader' and status = 'active'
  )
$$;

-- Membro pede para entrar num departamento --------------------------------
create or replace function request_join_department(p_dept uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_dept departments;
  v_status dept_status;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  select * into v_dept from departments where id = p_dept and is_active;
  if v_dept.id is null then return 'not_found'; end if;

  -- precisa ser membro ativo da igreja
  if not exists (
    select 1 from organization_members
    where org_id = v_dept.org_id and user_id = auth.uid() and status = 'active'
  ) then
    return 'not_a_member';
  end if;

  select status into v_status
  from department_members where department_id = p_dept and user_id = auth.uid();
  if found then return v_status::text; end if;

  if not v_dept.allow_join_requests then return 'closed'; end if;

  insert into department_members (department_id, user_id, role, status)
  values (p_dept, auth.uid(), 'member', 'pending')
  returning status into v_status;
  return v_status::text;
end;
$$;
grant execute on function request_join_department(uuid) to authenticated;

-- RLS ---------------------------------------------------------------------
alter table departments        enable row level security;
alter table department_members enable row level security;

create policy "org members read departments" on departments
  for select using (org_id in (select current_org_ids()));
create policy "org leaders manage departments" on departments
  for all using (has_org_role(org_id, array['owner','pastor','secretaria','lider']::org_role[]))
  with check (has_org_role(org_id, array['owner','pastor','secretaria','lider']::org_role[]));

create policy "read department members" on department_members
  for select using (
    user_id = auth.uid()
    or has_org_role(org_id, array['owner','pastor','secretaria']::org_role[])
    or leads_department(department_id)
  );
create policy "member leaves department" on department_members
  for delete using (user_id = auth.uid());
create policy "leaders manage department members" on department_members
  for all using (
    has_org_role(org_id, array['owner','pastor','secretaria']::org_role[])
    or leads_department(department_id)
  )
  with check (
    has_org_role(org_id, array['owner','pastor','secretaria']::org_role[])
    or leads_department(department_id)
  );
