-- FASE 2 · Tela 2 — Avisos.
-- Tira o papel `lider` da escrita, move CRUD/publicação para RPCs auditadas,
-- protege invariantes e dá às notificações uma referência exata da entidade.

-- 1. notifications: referência de entidade (fim da heurística por título) --
alter table notifications
  add column if not exists entity_type text,
  add column if not exists entity_id   uuid;
create index if not exists notifications_entity_idx on notifications (entity_type, entity_id);

-- 2. announcements: coluna de auditoria + invariantes --------------------
alter table announcements
  add column if not exists updated_by uuid references auth.users;

create or replace function enforce_announcement_invariants()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.org_id <> old.org_id then raise exception 'org_id é imutável'; end if;
  if new.id <> old.id then raise exception 'id é imutável'; end if;
  if new.created_by is distinct from old.created_by then raise exception 'created_by é imutável'; end if;
  if new.created_at is distinct from old.created_at then raise exception 'created_at é imutável'; end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists announcements_invariants on announcements;
create trigger announcements_invariants
  before update on announcements
  for each row execute function enforce_announcement_invariants();

-- 3. RLS: `lider` perde a escrita global -----------------------------
drop policy if exists "team writes announcements" on announcements;
-- Sem policy de INSERT/UPDATE/DELETE para `authenticated` => acesso direto negado.
-- Escrita apenas pelas RPCs SECURITY DEFINER abaixo.
-- SELECT permanece: "members read announcements" (publicados p/ membros; tudo p/
-- staff, incluindo `lider` — leitura apenas).

-- 4. RPCs de administração de avisos --------------------------------
create or replace function create_announcement(
  p_org uuid, p_title text, p_body text,
  p_is_pinned boolean default false, p_publish boolean default true
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if my_role(p_org) not in ('owner','pastor','secretaria') then
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
grant execute on function create_announcement(uuid, text, text, boolean, boolean) to authenticated;

create or replace function update_announcement(
  p_id uuid, p_title text, p_body text, p_is_pinned boolean
) returns void language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select org_id into v_org from announcements where id = p_id;
  if v_org is null then raise exception 'aviso não encontrado'; end if;
  if my_role(v_org) not in ('owner','pastor','secretaria') then
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
grant execute on function update_announcement(uuid, text, text, boolean) to authenticated;

create or replace function set_announcement_published(p_id uuid, p_published boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select org_id into v_org from announcements where id = p_id;
  if v_org is null then raise exception 'aviso não encontrado'; end if;
  if my_role(v_org) not in ('owner','pastor','secretaria') then
    raise exception 'sem permissão para publicar avisos';
  end if;

  update announcements set is_published = p_published, updated_by = auth.uid()
   where id = p_id;

  perform log_audit(v_org,
    case when p_published then 'announcement.publish' else 'announcement.unpublish' end,
    'announcement', p_id, '{}');
end;
$$;
grant execute on function set_announcement_published(uuid, boolean) to authenticated;

create or replace function delete_announcement(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select org_id into v_org from announcements where id = p_id;
  if v_org is null then return; end if;
  if my_role(v_org) not in ('owner','pastor','secretaria') then
    raise exception 'sem permissão para excluir avisos';
  end if;

  delete from notifications where entity_type = 'announcement' and entity_id = p_id;
  delete from announcements where id = p_id;

  perform log_audit(v_org, 'announcement.delete', 'announcement', p_id, '{}');
end;
$$;
grant execute on function delete_announcement(uuid) to authenticated;

-- 5. Índice para a listagem (org + fixados primeiro + mais recentes) -----
create index if not exists announcements_org_list_idx
  on announcements (org_id, is_pinned desc, created_at desc);
