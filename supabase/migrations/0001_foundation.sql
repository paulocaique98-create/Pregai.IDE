-- Fundacao multi-tenant: organizacoes, membros, perfis, config de site.
-- RLS por org_id. Rode via: npx supabase db push  (ou cole no SQL Editor).

create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
create type org_role as enum ('owner', 'pastor', 'secretaria', 'lider', 'membro');

create table organizations (
  id                    uuid primary key default uuid_generate_v4(),
  name                  text not null,
  slug                  text not null unique,
  plan                  text not null default 'trial',
  stripe_customer_id    text,
  subscription_status   text not null default 'trialing',
  trial_ends_at         timestamptz not null default (now() + interval '14 days'),
  created_at            timestamptz not null default now()
);

create table profiles (
  user_id     uuid primary key references auth.users on delete cascade,
  full_name   text,
  avatar_url  text,
  phone       text,
  created_at  timestamptz not null default now()
);

create table organization_members (
  org_id     uuid not null references organizations on delete cascade,
  user_id    uuid not null references auth.users on delete cascade,
  role       org_role not null default 'membro',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create table site_configs (
  org_id               uuid primary key references organizations on delete cascade,
  is_published         boolean not null default false,
  branding             jsonb not null default '{}',
  contact              jsonb not null default '{}',
  social_links         jsonb not null default '{}',
  hero                 jsonb not null default '{}',
  about                jsonb not null default '{}',
  schedule             jsonb not null default '[]',
  faq                  jsonb not null default '[]',
  media                jsonb not null default '{}',
  giving               jsonb not null default '{}',
  sections_visibility  jsonb not null default '{}',
  section_titles       jsonb not null default '{}',
  theme_config         jsonb not null default '{"defaultMode":"dark","allowToggle":true}',
  seo                  jsonb not null default '{}',
  updated_at           timestamptz not null default now()
);

create table site_ministries (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references organizations on delete cascade,
  title       text not null,
  description text[] not null default '{}',
  icon        text not null default 'Heart',
  sort_order  int not null default 0
);

create table site_events (
  id         uuid primary key default uuid_generate_v4(),
  org_id     uuid not null references organizations on delete cascade,
  title      text not null,
  event_date date,
  event_time text,
  tag        text,
  sort_order int not null default 0
);

create table prayer_requests (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid not null references organizations on delete cascade,
  name            text,
  phone           text,
  request         text not null,
  is_confidential boolean not null default false,
  status          text not null default 'novo',
  assigned_to     uuid references auth.users,
  created_at      timestamptz not null default now()
);

create table visitor_checkins (
  id           uuid primary key default uuid_generate_v4(),
  org_id       uuid not null references organizations on delete cascade,
  name         text not null,
  phone        text,
  planned_date date,
  party_size   int,
  kids_ages    text,
  created_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Helpers
create or replace function current_org_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select org_id from organization_members where user_id = auth.uid()
$$;

create or replace function has_org_role(target_org uuid, roles org_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from organization_members
    where org_id = target_org and user_id = auth.uid() and role = any(roles)
  )
$$;

-- ----------------------------------------------------------------------------
-- RLS
alter table organizations         enable row level security;
alter table profiles              enable row level security;
alter table organization_members  enable row level security;
alter table site_configs          enable row level security;
alter table site_ministries       enable row level security;
alter table site_events           enable row level security;
alter table prayer_requests       enable row level security;
alter table visitor_checkins      enable row level security;

create policy "own profile" on profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "members read their orgs" on organizations
  for select using (id in (select current_org_ids()));
create policy "owners update org" on organizations
  for update using (has_org_role(id, array['owner','pastor']::org_role[]));

create policy "read own memberships" on organization_members
  for select using (user_id = auth.uid() or org_id in (select current_org_ids()));
create policy "owners manage members" on organization_members
  for all using (has_org_role(org_id, array['owner','pastor']::org_role[]))
  with check (has_org_role(org_id, array['owner','pastor']::org_role[]));

-- site_configs / ministries / events: leitura publica quando publicado; escrita por equipe
create policy "public read published site" on site_configs
  for select using (is_published or org_id in (select current_org_ids()));
create policy "team writes site" on site_configs
  for all using (has_org_role(org_id, array['owner','pastor','secretaria','lider']::org_role[]))
  with check (has_org_role(org_id, array['owner','pastor','secretaria','lider']::org_role[]));

create policy "public read ministries" on site_ministries
  for select using (
    org_id in (select org_id from site_configs where is_published)
    or org_id in (select current_org_ids())
  );
create policy "team writes ministries" on site_ministries
  for all using (has_org_role(org_id, array['owner','pastor','secretaria','lider']::org_role[]))
  with check (has_org_role(org_id, array['owner','pastor','secretaria','lider']::org_role[]));

create policy "public read events" on site_events
  for select using (
    org_id in (select org_id from site_configs where is_published)
    or org_id in (select current_org_ids())
  );
create policy "team writes events" on site_events
  for all using (has_org_role(org_id, array['owner','pastor','secretaria','lider']::org_role[]))
  with check (has_org_role(org_id, array['owner','pastor','secretaria','lider']::org_role[]));

-- prayer_requests: qualquer um cria (via anon/insert); leitura restrita
create policy "anyone submits prayer" on prayer_requests
  for insert with check (true);
create policy "pastoral reads prayer" on prayer_requests
  for select using (
    (not is_confidential and org_id in (select current_org_ids()))
    or has_org_role(org_id, array['owner','pastor']::org_role[])
    or assigned_to = auth.uid()
  );
create policy "pastoral updates prayer" on prayer_requests
  for update using (has_org_role(org_id, array['owner','pastor','lider']::org_role[]));

create policy "anyone checks in" on visitor_checkins
  for insert with check (true);
create policy "team reads checkins" on visitor_checkins
  for select using (org_id in (select current_org_ids()));

-- ----------------------------------------------------------------------------
-- Provisiona perfil no signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
