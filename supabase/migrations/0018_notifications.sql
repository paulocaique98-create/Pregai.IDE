-- Notificações in-app + assinaturas de push (PWA).

create table notifications (
  id         uuid primary key default uuid_generate_v4(),
  org_id     uuid references organizations on delete cascade,
  user_id    uuid not null references auth.users on delete cascade,
  kind       text not null,
  title      text not null,
  body       text,
  url        text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index on notifications (user_id, created_at desc);

alter table notifications enable row level security;
create policy "own notifications read" on notifications
  for select using (user_id = auth.uid());
create policy "own notifications update" on notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
-- inserções são feitas via service-role (lib/notify.ts)

create table push_subscriptions (
  endpoint   text primary key,
  user_id    uuid not null references auth.users on delete cascade,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;
create policy "own push subs" on push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
