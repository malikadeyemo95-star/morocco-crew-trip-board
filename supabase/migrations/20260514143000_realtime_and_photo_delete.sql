do $$
begin
  alter publication supabase_realtime add table public.checkins;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.reservations;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.events;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.people;
exception
  when duplicate_object then null;
end $$;

drop policy if exists "public delete trip photos" on storage.objects;

create policy "public delete trip photos"
on storage.objects
for delete
using (bucket_id = 'trip-photos');
