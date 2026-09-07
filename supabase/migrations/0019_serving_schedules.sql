-- Escalas ministeriais dentro dos departamentos.

create type assignment_status as enum ('pending', 'confirmed', 'declined');

create table serving_schedules (
  id            uuid primary key default uuid_generate_v4(),
  org_id        uuid not null references organizations on delete cascade,
  department_id uuid not null references departments on delete cascade,
  service_date  date not null,
  title         text not null default 'Escala',
  notes         text,
  created_by    uuid references auth.users,
  created_at    timestamptz not null default now()
);
create index on serving_schedules (department_id, service_date);
create index on serving_schedules (org_id);

create table serving_assignments (
  id            uuid primary key default uuid_generate_v4(),
  schedule_id   uuid not null references serving_schedules on delete cascade,
  org_id        uuid not null references organizations on delete cascade,
  department_id uuid not null references departments on delete cascade,
  service_date  date not null,
  role          text not null,
  user_id       uuid references auth.users on delete set null,
  status        assignment_status not null default 'pending',
  token         text not null unique,
  responded_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index on serving_assignments (user_id, service_date);
create index on serving_assignments (token);
create index on serving_assignments (schedule_id);

create or replace function set_assignment_meta()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select org_id, department_id, service_date
  into new.org_id, new.department_id, new.service_date
  from serving_schedules where id = new.schedule_id;
  return new;
end;
$$;
create trigger serving_assignments_meta
  before insert on serving_assignments
  for each row execute function set_assignment_meta();

alter table serving_schedules enable row level security;
alter table serving_assignments enable row level security;

create policy "dept manages schedules" on serving_schedules for all
  using (
    has_org_role(org_id, array['owner','pastor','secretaria']::org_role[])
    or leads_department(department_id)
  )
  with check (
    has_org_role(org_id, array['owner','pastor','secretaria']::org_role[])
    or leads_department(department_id)
  );
create policy "dept members read schedules" on serving_schedules for select
  using (
    department_id in (
      select department_id from department_members
      where user_id = auth.uid() and status = 'active'
    )
  );

create policy "dept manages assignments" on serving_assignments for all
  using (
    has_org_role(org_id, array['owner','pastor','secretaria']::org_role[])
    or leads_department(department_id)
  )
  with check (
    has_org_role(org_id, array['owner','pastor','secretaria']::org_role[])
    or leads_department(department_id)
  );
create policy "own assignment read" on serving_assignments for select
  using (user_id = auth.uid());

-- Info da escalação pelo token (sem login).
create or replace function public.assignment_by_token(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(
    (select jsonb_build_object(
      'found', true,
      'status', a.status::text,
      'role', a.role,
      'date', a.service_date,
      'title', s.title,
      'department', d.name,
      'church', o.name
    )
    from serving_assignments a
    join serving_schedules s on s.id = a.schedule_id
    join departments d on d.id = a.department_id
    join organizations o on o.id = a.org_id
    where a.token = p_token),
    jsonb_build_object('found', false)
  )
$$;
grant execute on function public.assignment_by_token(text) to anon, authenticated;

-- Responder a escalação pelo token.
create or replace function public.respond_assignment(p_token text, p_response text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_st assignment_status;
begin
  if p_response not in ('confirmed', 'declined') then
    return jsonb_build_object('result', 'bad');
  end if;
  update serving_assignments
  set status = p_response::assignment_status, responded_at = now()
  where token = p_token
  returning status into v_st;
  if not found then return jsonb_build_object('result', 'not_found'); end if;
  return jsonb_build_object('result', v_st::text);
end;
$$;
grant execute on function public.respond_assignment(text, text) to anon, authenticated;
