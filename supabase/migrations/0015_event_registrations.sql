-- Inscrição em eventos com limite de vagas.
alter table site_events
  add column capacity int,
  add column registration_open boolean not null default false;

create table event_registrations (
  id         uuid primary key default uuid_generate_v4(),
  event_id   uuid not null references site_events on delete cascade,
  org_id     uuid not null references organizations on delete cascade,
  name       text not null,
  phone      text,
  party_size int not null default 1,
  created_at timestamptz not null default now()
);
create index on event_registrations (event_id);
create index on event_registrations (org_id);

create or replace function set_event_registration_org()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select org_id into new.org_id from site_events where id = new.event_id;
  return new;
end;
$$;
create trigger event_registrations_set_org
  before insert on event_registrations
  for each row execute function set_event_registration_org();

alter table event_registrations enable row level security;

create policy "anyone registers" on event_registrations
  for insert with check (true);
create policy "team reads registrations" on event_registrations
  for select using (org_id in (select current_org_ids()));
create policy "team removes registrations" on event_registrations
  for delete using (
    has_org_role(org_id, array['owner', 'pastor', 'secretaria', 'lider']::org_role[])
  );
