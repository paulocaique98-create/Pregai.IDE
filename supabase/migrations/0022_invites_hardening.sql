-- FASE 1 (Membros) — Convites: expiração (7 dias), uso único, revogação,
-- validação de papel/auto-approve no servidor, aceitação atômica.

alter table organization_invites
  add column if not exists used_at    timestamptz,
  add column if not exists used_by    uuid references auth.users,
  add column if not exists revoked_at timestamptz;

-- Convites existentes sem prazo ganham 7 dias a partir da criação.
update organization_invites
   set expires_at = created_at + interval '7 days'
 where expires_at is null;

alter table organization_invites alter column expires_at set default (now() + interval '7 days');
alter table organization_invites alter column expires_at set not null;

-- CRIAR CONVITE (token gerado pela aplicação e passado aqui) ----------------
create or replace function create_invite(
  p_org uuid, p_token text, p_label text default null,
  p_role org_role default 'membro', p_auto_approve boolean default false
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_actor org_role; v_id uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  v_actor := my_role(p_org);
  if v_actor is null or v_actor not in ('owner','pastor','secretaria') then
    raise exception 'sem permissão para criar convites';
  end if;
  if p_role = 'owner' then raise exception 'não é possível convidar como proprietário'; end if;
  if p_role <> 'membro' and v_actor not in ('owner','pastor') then
    raise exception 'somente proprietário ou pastor podem convidar equipe';
  end if;
  if p_role = 'pastor' and v_actor <> 'owner' then
    raise exception 'somente o proprietário pode convidar um pastor';
  end if;
  if p_auto_approve and v_actor not in ('owner','pastor') then
    raise exception 'somente proprietário ou pastor podem criar convite com aprovação automática';
  end if;
  if p_token is null or length(p_token) < 16 then raise exception 'token inválido'; end if;

  insert into organization_invites (org_id, token, label, role, auto_approve, created_by, expires_at)
  values (p_org, p_token, nullif(trim(p_label), ''), p_role, p_auto_approve, auth.uid(),
          now() + interval '7 days')
  returning id into v_id;

  perform log_audit(p_org, 'invite.create', 'invitation', v_id,
                    jsonb_build_object('role', p_role, 'auto_approve', p_auto_approve));
  return jsonb_build_object('id', v_id);
end;
$$;
grant execute on function create_invite(uuid, text, text, org_role, boolean) to authenticated;

-- REVOGAR CONVITE ------------------------------------------------------
create or replace function revoke_invite(p_org uuid, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_actor org_role;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  v_actor := my_role(p_org);
  if v_actor is null or v_actor not in ('owner','pastor','secretaria') then
    raise exception 'sem permissão';
  end if;
  update organization_invites set revoked_at = now()
   where id = p_id and org_id = p_org and revoked_at is null;
  perform log_audit(p_org, 'invite.revoke', 'invitation', p_id, '{}');
end;
$$;
grant execute on function revoke_invite(uuid, uuid) to authenticated;

-- ACEITAR CONVITE (consumo atômico: uso único) ----------------------------
create or replace function accept_invite(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_inv organization_invites; v_org organizations; v_status member_status;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  update organization_invites
     set used_at = now(), used_by = auth.uid()
   where token = p_token
     and used_at is null
     and revoked_at is null
     and expires_at > now()
  returning * into v_inv;

  if not found then
    select * into v_inv from organization_invites where token = p_token;
    if v_inv.id is null then return jsonb_build_object('result', 'not_found'); end if;
    if v_inv.revoked_at is not null then return jsonb_build_object('result', 'revoked'); end if;
    if v_inv.used_at is not null then return jsonb_build_object('result', 'used'); end if;
    return jsonb_build_object('result', 'expired');
  end if;

  select * into v_org from organizations where id = v_inv.org_id;

  select status into v_status from organization_members
   where org_id = v_inv.org_id and user_id = auth.uid();

  if not found then
    insert into organization_members (org_id, user_id, role, status)
    values (v_inv.org_id, auth.uid(), v_inv.role,
      case when v_inv.auto_approve then 'active'::member_status else 'pending'::member_status end)
    returning status into v_status;
    perform log_audit(v_inv.org_id, 'invite.accept', 'member', auth.uid(),
                      jsonb_build_object('invite', v_inv.id, 'role', v_inv.role));
  end if;

  update profiles set primary_org_id = v_inv.org_id
   where user_id = auth.uid() and primary_org_id is null;

  return jsonb_build_object('result', v_status::text, 'slug', v_org.slug);
end;
$$;
grant execute on function accept_invite(text) to authenticated;
