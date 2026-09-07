-- Contagem pública de inscritos por evento (para mostrar "N vagas" no site).
create or replace function public.event_taken_counts(p_org uuid)
returns table (event_id uuid, taken bigint)
language sql stable security definer set search_path = public as $$
  select er.event_id, coalesce(sum(er.party_size), 0)::bigint
  from event_registrations er
  join site_events se on se.id = er.event_id
  where se.org_id = p_org
  group by er.event_id
$$;
grant execute on function public.event_taken_counts(uuid) to anon, authenticated;
