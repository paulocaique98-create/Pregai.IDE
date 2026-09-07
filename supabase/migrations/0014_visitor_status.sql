-- Fila de visitantes: andamento do contato.
alter table visitor_checkins
  add column status text not null default 'novo';

create policy "team updates checkins" on visitor_checkins
  for update
  using (org_id in (select current_org_ids()))
  with check (org_id in (select current_org_ids()));
