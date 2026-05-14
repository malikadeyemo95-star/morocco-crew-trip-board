do $$
begin
  alter publication supabase_realtime add table storage.objects;
exception
  when duplicate_object then null;
end $$;
