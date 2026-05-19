drop policy if exists "public write trips" on trips;
create policy "public write trips" on trips for all using (true) with check (true);
