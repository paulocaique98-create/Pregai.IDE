-- FASE 2 · Tela 2 — correção: `my_role(x) not in (...)` retorna NULL (não TRUE)
-- quando o usuário não é membro da org, deixando passar o cross-tenant.
-- Guarda explícita: `v_actor is null or v_actor not in (...)`.

create or replace function create_announcement(
  p_org uuid, p_title text, p_body text,
  p_is_pinned boolean default false, p_publish boolean default true
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_actor org_role;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  v_actor := my_role(p_org);
  if v_actor is null or v_actor not in ('owner','pastor','secretaria') then
    raise exception 'sem permissão para criar avisos';
  end if;
  if coalesce(trim(p_title), '') = '' then raise exception 'o título do aviso é obrigatório'; end if;
  if length(p_title) > 200 then raise exception 'título muito longo (máx. 200)'; end if;
  if length(coalesce(p_body, '')) > 5000 then raise exception 'texto muito longo (máx. 5000)'; end if;

  insert into announcements (org_id, title, body, is_pinned, is_published, created_by)
  values (p_org, trim(p_title), coalesce(trim(p_body), ''),
          coalesce(p_is_pinned, false), coalesce(p_publish, true), auth.uid())
  returning id into v_id;

  perform log_audit(p_org, 'announcement.create', 'announcement', v_id,
    jsonb_build_object('title', trim(p_title), 'published', coalesce(p_publish, true)));
  return v_id;
end;
$$;

create or replace function update_announcement(
  p_id uuid, p_title text, p_body text, p_is_pinned boolean
) returns void language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_actor org_role;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select org_id into v_org from announcements where id = p_id;
  if v_org is null then raise exception 'aviso não encontrado'; end if;
  v_actor := my_role(v_org);
  if v_actor is null or v_actor not in ('owner','pastor','secretaria') then
    raise exception 'sem permissão para editar avisos';
  end if;
  if coalesce(trim(p_title), '') = '' then raise exception 'o título do aviso é obrigatório'; end if;
  if length(p_title) > 200 then raise exception 'título muito longo (máx. 200)'; end if;
  if length(coalesce(p_body, '')) > 5000 then raise exception 'texto muito longo (máx. 5000)'; end if;

  update announcements
     set title = trim(p_title), body = coalesce(trim(p_body), ''),
         is_pinned = coalesce(p_is_pinned, false), updated_by = auth.uid()
   where id = p_id;

  perform log_audit(v_org, 'announcement.update', 'announcement', p_id,
                    jsonb_build_object('title', trim(p_title)));
end;
$$;

create or replace function set_announcement_published(p_id uuid, p_published boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_actor org_role;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select org_id into v_org from announcements where id = p_id;
  if v_org is null then raise exception 'aviso não encontrado'; end if;
  v_actor := my_role(v_org);
  if v_actor is null or v_actor not in ('owner','pastor','secretaria') then
    raise exception 'sem permissão para publicar avisos';
  end if;

  update announcements set is_published = p_published, updated_by = auth.uid()
   where id = p_id;

  perform log_audit(v_org,
    case when p_published then 'announcement.publish' else 'announcement.unpublish' end,
    'announcement', p_id, '{}');
end;
$$;

create or replace function delete_announcement(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_actor org_role;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select org_id into v_org from announcements where id = p_id;
  if v_org is null then return; end if;
  v_actor := my_role(v_org);
  if v_actor is null or v_actor not in ('owner','pastor','secretaria') then
    raise exception 'sem permissão para excluir avisos';
  end if;

  delete from notifications where entity_type = 'announcement' and entity_id = p_id;
  delete from announcements where id = p_id;

  perform log_audit(v_org, 'announcement.delete', 'announcement', p_id, '{}');
end;
$$;
