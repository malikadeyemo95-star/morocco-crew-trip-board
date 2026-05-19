-- First public-app security step: table access now requires a signed-in Supabase user.
-- Member-only policies can build on this once all legacy Morocco members are claimed.

drop policy if exists "public read events" on events;
drop policy if exists "public write events" on events;
drop policy if exists "public read checkins" on checkins;
drop policy if exists "public write checkins" on checkins;
drop policy if exists "public read expenses" on expenses;
drop policy if exists "public write expenses" on expenses;
drop policy if exists "public read trips" on trips;
drop policy if exists "public write trips" on trips;
drop policy if exists "public read trip members" on trip_members;
drop policy if exists "public write trip members" on trip_members;
drop policy if exists "public read trip invites" on trip_invites;
drop policy if exists "public write trip invites" on trip_invites;

create policy "authenticated read events" on events for select using (auth.role() = 'authenticated');
create policy "authenticated write events" on events for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated read checkins" on checkins for select using (auth.role() = 'authenticated');
create policy "authenticated write checkins" on checkins for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated read expenses" on expenses for select using (auth.role() = 'authenticated');
create policy "authenticated write expenses" on expenses for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated read trips" on trips for select using (auth.role() = 'authenticated');
create policy "authenticated write trips" on trips for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated read trip members" on trip_members for select using (auth.role() = 'authenticated');
create policy "authenticated write trip members" on trip_members for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated read trip invites" on trip_invites for select using (auth.role() = 'authenticated');
create policy "authenticated write trip invites" on trip_invites for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
