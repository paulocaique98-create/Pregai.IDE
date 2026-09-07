-- FASE 1 (Membros) — RPCs de administração. Toda a autorização (ator, alvo,
-- ação, organização, transição) vive aqui e/ou no trigger de invariantes.

-- Papel ativo do usuário atual numa org (null se não for membro ativo) -------
create or replace function my_role(p_org uuid)
returns org_role language sql stable security definer set search_path = public as $$
  select role from organization_members
  where org_id = p_org and user_id = auth.uid() and status = 'active'
$$;
grant execute on function my_role(uuid) to authenticated;

-- APROVAR ------------------------------------------------------------------
create or replace function approve_member(p_org uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_actor org_role; v_target organization_members;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  v_actor := my_role(p_org);
  if v_actor is null or v_actor not in ('owner','pastor','secretaria') then
    raise exception 'sem permissão para aprovar membros';
  end if;
  select * into v_target from organization_members where org_id = p_org and user_id = p_user;
  if not found then raise exception 'membro não encontrado'; end if;
  if v_target.status <> 'pending' then raise exception 'este membro não está aguardando aprovação'; end if;

  update organization_members
     set status = 'active', approved_by = auth.uid(), approved_at = now()
   where org_id = p_org and user_id = p_user;

  perform log_audit(p_org, 'member.approve', 'member', p_user, '{}');
end;
$$;
grant execute on function approve_member(uuid, uuid) to authenticated;

-- BLOQUEAR ---------------------------------------------------------------
create or replace function block_member(p_org uuid, p_user uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_actor org_role; v_target organization_members;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  v_actor := my_role(p_org);
  if v_actor is null or v_actor not in ('owner','pastor','secretaria') then
    raise exception 'sem permissão para bloquear membros';
  end if;
  if p_user = auth.uid() then raise exception 'você não pode bloquear a si mesmo'; end if;
  select * into v_target from organization_members where org_id = p_org and user_id = p_user;
  if not found then raise exception 'membro não encontrado'; end if;
  if v_target.role = 'owner' then raise exception 'o proprietário não pode ser bloqueado'; end if;
  if v_target.role = 'pastor' and v_actor <> 'owner' then
    raise exception 'somente o proprietário pode bloquear um pastor';
  end if;
  if v_target.status <> 'active' then raise exception 'somente membros ativos podem ser bloqueados'; end if;

  update organization_members
     set status = 'blocked', blocked_by = auth.uid(), blocked_at = now(),
         blocked_reason = nullif(trim(p_reason), '')
   where org_id = p_org and user_id = p_user;

  perform log_audit(p_org, 'member.block', 'member', p_user,
                    jsonb_build_object('reason', nullif(trim(p_reason), '')));
end;
$$;
grant execute on function block_member(uuid, uuid, text) to authenticated;

-- REATIVAR -------------------------------------------------------------
create or replace function reactivate_member(p_org uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_actor org_role; v_target organization_members;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  v_actor := my_role(p_org);
  if v_actor is null or v_actor not in ('owner','pastor','secretaria') then
    raise exception 'sem permissão para reativar membros';
  end if;
  select * into v_target from organization_members where org_id = p_org and user_id = p_user;
  if not found then raise exception 'membro não encontrado'; end if;
  if v_target.role = 'pastor' and v_actor <> 'owner' then
    raise exception 'somente o proprietário pode reativar um pastor';
  end if;
  if v_target.status <> 'blocked' then raise exception 'este membro não está bloqueado'; end if;

  update organization_members
     set status = 'active', blocked_by = null, blocked_at = null, blocked_reason = null
   where org_id = p_org and user_id = p_user;

  perform log_audit(p_org, 'member.unblock', 'member', p_user, '{}');
end;
$$;
grant execute on function reactivate_member(uuid, uuid) to authenticated;

-- ALTERAR PAPEL ------------------------------------------------------
create or replace function set_member_role(p_org uuid, p_user uuid, p_role org_role)
returns void language plpgsql security definer set search_path = public as $$
declare v_actor org_role; v_target organization_members;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  v_actor := my_role(p_org);
  if v_actor is null or v_actor not in ('owner','pastor') then
    raise exception 'somente proprietário ou pastor podem alterar papéis';
  end if;
  if p_role = 'owner' then raise exception 'não é possível definir o papel de proprietário'; end if;
  if p_role not in ('pastor','secretaria','lider','membro') then
    raise exception 'papel inválido';
  end if;
  if p_user = auth.uid() then raise exception 'você não pode alterar o seu próprio papel'; end if;
  select * into v_target from organization_members where org_id = p_org and user_id = p_user;
  if not found then raise exception 'membro não encontrado'; end if;
  if v_target.role = 'owner' then raise exception 'o papel do proprietário não pode ser alterado aqui'; end if;
  if (p_role = 'pastor' or v_target.role = 'pastor') and v_actor <> 'owner' then
    raise exception 'somente o proprietário pode promover ou alterar um pastor';
  end if;
  if v_target.role = p_role then return; end if;

  update organization_members
     set role = p_role, role_updated_by = auth.uid(), role_updated_at = now()
   where org_id = p_org and user_id = p_user;

  perform log_audit(p_org, 'member.role_change', 'member', p_user,
                    jsonb_build_object('from', v_target.role, 'to', p_role));
end;
$$;
grant execute on function set_member_role(uuid, uuid, org_role) to authenticated;
