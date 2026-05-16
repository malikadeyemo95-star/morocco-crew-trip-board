do $$
begin
  alter publication supabase_realtime add table public.expenses;
exception
  when duplicate_object then null;
end $$;
