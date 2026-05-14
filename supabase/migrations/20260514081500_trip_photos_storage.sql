insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trip-photos',
  'trip-photos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read trip photos" on storage.objects;
drop policy if exists "public upload trip photos" on storage.objects;
drop policy if exists "public update trip photos" on storage.objects;

create policy "public read trip photos"
on storage.objects
for select
using (bucket_id = 'trip-photos');

create policy "public upload trip photos"
on storage.objects
for insert
with check (bucket_id = 'trip-photos');

create policy "public update trip photos"
on storage.objects
for update
using (bucket_id = 'trip-photos')
with check (bucket_id = 'trip-photos');
