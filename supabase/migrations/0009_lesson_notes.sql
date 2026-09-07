-- Anotações pessoais dos membros sobre as lições da EBD.
create table lesson_notes (
  org_id     uuid not null references organizations on delete cascade,
  user_id    uuid not null references auth.users on delete cascade,
  lesson_key text not null,
  content    text not null default '',
  updated_at timestamptz not null default now(),
  primary key (org_id, user_id, lesson_key)
);

create index on lesson_notes (user_id);

alter table lesson_notes enable row level security;

create policy "own lesson notes" on lesson_notes
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
