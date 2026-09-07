-- Bucket para logo e imagem de capa dos sites das igrejas.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-assets', 'site-assets', true, 5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif']
)
on conflict (id) do nothing;

-- Caminho: <org_id>/<arquivo>. Só a equipe da igreja pode gravar na pasta da sua org.
create or replace function public.can_write_site_asset(obj_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select (storage.foldername(obj_name))[1] in (
    select org_id::text from organization_members
    where user_id = auth.uid() and status = 'active'
      and role in ('owner', 'pastor', 'secretaria', 'lider')
  )
$$;

create policy "site-assets insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'site-assets' and public.can_write_site_asset(name));

create policy "site-assets update" on storage.objects
  for update to authenticated
  using (bucket_id = 'site-assets' and public.can_write_site_asset(name));

create policy "site-assets delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'site-assets' and public.can_write_site_asset(name));
