-- Custom Access Token Hook: injeta os org_ids e papel do usuario no JWT.
-- Depois de aplicar, ative em: Dashboard -> Authentication -> Hooks
--   -> Customize Access Token (JWT) Claims -> public.custom_access_token_hook

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  claims    jsonb := event->'claims';
  memberships jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object('org_id', org_id, 'role', role)), '[]'::jsonb)
  into memberships
  from organization_members
  where user_id = (event->>'user_id')::uuid;

  claims := jsonb_set(claims, '{app_metadata,orgs}', memberships);
  return jsonb_set(event, '{claims}', claims);
end;
$$;

grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
grant all on table public.organization_members to supabase_auth_admin;
create policy "auth admin reads memberships" on public.organization_members
  for select to supabase_auth_admin using (true);
