-- Criacao de organizacao de forma atomica, contornando o chicken-egg do RLS
-- (o usuario ainda nao e membro no momento do insert).

create or replace function public.create_organization(p_name text, p_slug text)
returns organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org organizations;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into organizations (name, slug) values (p_name, p_slug)
  returning * into v_org;

  insert into organization_members (org_id, user_id, role)
  values (v_org.id, auth.uid(), 'owner');

  insert into site_configs (org_id) values (v_org.id);

  return v_org;
end;
$$;

grant execute on function public.create_organization(text, text) to authenticated;
