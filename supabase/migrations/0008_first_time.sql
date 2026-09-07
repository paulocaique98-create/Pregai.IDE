-- Conteúdo da página "Primeira vez" do visitante.
alter table site_configs
  add column first_time jsonb not null default '{}';
