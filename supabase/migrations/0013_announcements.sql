-- Avisos / mural da igreja.
create table announcements (
  id           uuid primary key default uuid_generate_v4(),
  org_id       uuid not null references organizations on delete cascade,
  title        text not null,
  body         text not null default '',
  is_pinned    boolean not null default false,
  is_published boolean not null default true,
  created_by   uuid references auth.users,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on announcements (org_id);

alter table announcements enable row level security;

create policy "members read announcements" on announcements
  for select using (
    (is_published and org_id in (select current_org_ids()))
    or has_org_role(org_id, array['owner', 'pastor', 'secretaria', 'lider']::org_role[])
  );

create policy "team writes announcements" on announcements
  for all
  using (has_org_role(org_id, array['owner', 'pastor', 'secretaria', 'lider']::org_role[]))
  with check (has_org_role(org_id, array['owner', 'pastor', 'secretaria', 'lider']::org_role[]));
