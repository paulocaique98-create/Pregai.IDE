-- FASE 1 (Membros) — Leitura do diretório: paginação/busca/filtros server-side,
-- e-mail (de auth.users), escopo do líder de departamento.

create or replace function list_members(
  p_org uuid,
  p_search text default null,
  p_status text default null,
  p_role text default null,
  p_dept uuid default null,
  p_sort text default 'recent',
  p_limit int default 25,
  p_offset int default 0
) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_actor org_role;
  v_limit int := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_scoped uuid[];
  v_rows jsonb;
  v_total bigint;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  v_actor := my_role(p_org);

  if v_actor is null or v_actor not in ('owner','pastor','secretaria') then
    -- Não é equipe: só líder de departamento, com escopo restrito aos seus deptos.
    select coalesce(array_agg(department_id), '{}')
      into v_scoped
      from department_members
     where org_id = p_org and user_id = auth.uid()
       and role = 'leader' and status = 'active';
    if v_scoped = '{}' then raise exception 'sem acesso ao diretório de membros'; end if;
  end if;

  with base as (
    select m.user_id, m.role::text as role, m.status::text as status, m.created_at,
           p.full_name, p.phone, u.email,
           (select coalesce(jsonb_agg(d.name order by d.name), '[]'::jsonb)
              from department_members dm
              join departments d on d.id = dm.department_id
             where dm.org_id = p_org and dm.user_id = m.user_id and dm.status = 'active'
           ) as departments
      from organization_members m
      left join profiles p on p.user_id = m.user_id
      left join auth.users u on u.id = m.user_id
     where m.org_id = p_org
       and (v_scoped is null or exists (
             select 1 from department_members dm
              where dm.org_id = p_org and dm.user_id = m.user_id
                and dm.status = 'active' and dm.department_id = any(v_scoped)))
       and (p_status is null or p_status = '' or m.status::text = p_status)
       and (p_role is null or p_role = '' or m.role::text = p_role)
       and (p_dept is null or exists (
             select 1 from department_members dm
              where dm.org_id = p_org and dm.user_id = m.user_id
                and dm.status = 'active' and dm.department_id = p_dept))
       and (p_search is null or p_search = '' or
            coalesce(p.full_name, '') ilike '%' || p_search || '%' or
            coalesce(p.phone, '')     ilike '%' || p_search || '%' or
            coalesce(u.email, '')     ilike '%' || p_search || '%')
  )
  select count(*) into v_total from base;

  select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) into v_rows
  from (
    select * from base
    order by
      (case when p_sort = 'name'   then lower(full_name) end) asc nulls last,
      (case when p_sort = 'oldest' then created_at end) asc,
      created_at desc
    limit v_limit offset v_offset
  ) t;

  return jsonb_build_object(
    'rows', v_rows, 'total', v_total, 'limit', v_limit, 'offset', v_offset,
    'actor_role', v_actor,
    'can_manage', (v_actor in ('owner','pastor','secretaria')),
    'can_role', (v_actor in ('owner','pastor')),
    'scoped', (v_scoped is not null)
  );
end;
$$;
grant execute on function list_members(uuid, text, text, text, uuid, text, int, int) to authenticated;

-- Detalhe de um membro -----------------------------------------------------
create or replace function get_member(p_org uuid, p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_actor org_role; v_scoped uuid[]; v_out jsonb;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  v_actor := my_role(p_org);

  if v_actor is null or v_actor not in ('owner','pastor','secretaria') then
    select coalesce(array_agg(department_id), '{}')
      into v_scoped from department_members
     where org_id = p_org and user_id = auth.uid()
       and role = 'leader' and status = 'active';
    if v_scoped = '{}' then raise exception 'sem acesso'; end if;
    if not exists (
      select 1 from department_members
       where org_id = p_org and user_id = p_user and status = 'active'
         and department_id = any(v_scoped)
    ) then raise exception 'sem acesso a este membro'; end if;
  end if;

  select jsonb_build_object(
    'user_id', m.user_id,
    'role', m.role,
    'status', m.status,
    'created_at', m.created_at,
    'approved_at', m.approved_at,
    'blocked_at', m.blocked_at,
    'blocked_reason', m.blocked_reason,
    'role_updated_at', m.role_updated_at,
    'full_name', p.full_name,
    'phone', p.phone,
    'email', u.email,
    'departments', (
      select coalesce(jsonb_agg(jsonb_build_object('name', d.name, 'role', dm.role) order by d.name), '[]'::jsonb)
        from department_members dm join departments d on d.id = dm.department_id
       where dm.org_id = p_org and dm.user_id = m.user_id and dm.status = 'active'
    ),
    'can_manage', (v_actor in ('owner','pastor','secretaria')),
    'can_role', (v_actor in ('owner','pastor'))
  ) into v_out
  from organization_members m
  left join profiles p on p.user_id = m.user_id
  left join auth.users u on u.id = m.user_id
  where m.org_id = p_org and m.user_id = p_user;

  if v_out is null then raise exception 'membro não encontrado'; end if;
  return v_out;
end;
$$;
grant execute on function get_member(uuid, uuid) to authenticated;

-- Ações críticas para a aba de histórico ----------------------------------
create or replace function member_audit(p_org uuid, p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_actor org_role;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  v_actor := my_role(p_org);
  if v_actor is null or v_actor not in ('owner','pastor','secretaria') then
    raise exception 'sem acesso';
  end if;
  return (
    select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc), '[]'::jsonb)
    from audit_logs a
    where a.org_id = p_org and a.entity_type = 'member' and a.entity_id = p_user
  );
end;
$$;
grant execute on function member_audit(uuid, uuid) to authenticated;
