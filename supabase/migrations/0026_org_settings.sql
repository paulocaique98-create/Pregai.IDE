-- FASE 2 · Tela 1 — Configurações da Igreja.
-- Protege a identidade/faturamento de `organizations`, expõe `member_mode` e
-- `name` por RPC auditada, e tira o papel `lider` da escrita do site público.

-- 1. Invariantes de organizations -----------------------------------------
-- Só `name`, `member_mode` e `custom_domain` mudam via UPDATE normal.
-- `slug`, `id`, `plan`, faturamento e `created_at` ficam imutáveis (evita que
-- um pastor via REST direto quebre URLs ou mexa em billing).
create or replace function enforce_org_invariants()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.id <> old.id then raise exception 'id é imutável'; end if;
  if new.slug is distinct from old.slug then
    raise exception 'o endereço (slug) da igreja não pode ser alterado aqui';
  end if;
  if new.created_at is distinct from old.created_at then
    raise exception 'created_at é imutável';
  end if;
  if new.plan is distinct from old.plan
     or new.stripe_customer_id is distinct from old.stripe_customer_id
     or new.subscription_status is distinct from old.subscription_status
     or new.trial_ends_at is distinct from old.trial_ends_at then
    raise exception 'dados de assinatura não podem ser alterados por aqui';
  end if;
  if new.member_mode not in ('approval', 'open') then
    raise exception 'modo de entrada inválido';
  end if;
  return new;
end;
$$;

drop trigger if exists organizations_invariants on organizations;
create trigger organizations_invariants
  before update on organizations
  for each row execute function enforce_org_invariants();

-- 2. RPC de configurações ------------------------------------------------
create or replace function update_org_settings(
  p_org uuid, p_name text, p_member_mode text
) returns void language plpgsql security definer set search_path = public as $$
declare v_actor org_role; v_old organizations;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  v_actor := my_role(p_org);
  if v_actor is null or v_actor not in ('owner', 'pastor') then
    raise exception 'somente proprietário ou pastor alteram as configurações da igreja';
  end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'o nome da igreja é obrigatório'; end if;
  if length(trim(p_name)) > 120 then raise exception 'nome muito longo'; end if;
  if p_member_mode not in ('approval', 'open') then raise exception 'modo de entrada inválido'; end if;

  select * into v_old from organizations where id = p_org;

  update organizations
     set name = trim(p_name), member_mode = p_member_mode
   where id = p_org;

  perform log_audit(p_org, 'org.settings_change', 'organization', p_org,
    jsonb_build_object(
      'name', trim(p_name), 'member_mode', p_member_mode,
      'prev_name', v_old.name, 'prev_member_mode', v_old.member_mode
    ));
end;
$$;
grant execute on function update_org_settings(uuid, text, text) to authenticated;

-- 3. Auditoria de publicação do site -----------------------------------
create or replace function set_site_published(p_org uuid, p_published boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_actor org_role;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  v_actor := my_role(p_org);
  if v_actor is null or v_actor not in ('owner', 'pastor', 'secretaria') then
    raise exception 'sem permissão para publicar o site';
  end if;
  update site_configs set is_published = p_published, updated_at = now()
   where org_id = p_org;
  perform log_audit(p_org, case when p_published then 'site.publish' else 'site.unpublish' end,
                    'organization', p_org, '{}');
end;
$$;
grant execute on function set_site_published(uuid, boolean) to authenticated;

-- 4. Tira `lider` da escrita do site (config + conteúdo do site público) ---
drop policy if exists "team writes site" on site_configs;
create policy "team writes site" on site_configs
  for all using (has_org_role(org_id, array['owner','pastor','secretaria']::org_role[]))
  with check (has_org_role(org_id, array['owner','pastor','secretaria']::org_role[]));
