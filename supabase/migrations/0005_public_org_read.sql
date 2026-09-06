-- O site publico precisa ler organizations por slug sem sessao.
create policy "public read orgs with published site" on organizations
  for select using (
    id in (select org_id from site_configs where is_published)
  );
