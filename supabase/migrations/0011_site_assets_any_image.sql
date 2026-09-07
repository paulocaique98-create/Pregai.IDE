-- Aceitar qualquer imagem no bucket de assets do site.
update storage.buckets
set allowed_mime_types = null,
    file_size_limit = 10485760
where id = 'site-assets';
