-- Domínio próprio da igreja (roteamento white-label). Nulo até a igreja configurar.
alter table organizations
  add column custom_domain text unique;
