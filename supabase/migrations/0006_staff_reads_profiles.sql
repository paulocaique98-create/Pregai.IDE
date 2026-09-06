-- Equipe pode ver o perfil (nome, telefone) de quem pertence a mesma igreja.
create policy "staff reads member profiles" on profiles
  for select using (
    user_id in (
      select user_id from organization_members
      where org_id in (select current_org_ids())
    )
  );
