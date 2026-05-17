create table if not exists trips (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists trip_members (
  id text primary key,
  trip_id text not null references trips(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('organiser', 'traveler')),
  user_id uuid,
  device_client_id text unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists trip_invites (
  token text primary key,
  trip_id text not null references trips(id) on delete cascade,
  created_by text references trip_members(id) on delete set null,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table trips enable row level security;
alter table trip_members enable row level security;
alter table trip_invites enable row level security;

drop policy if exists "public read trips" on trips;
drop policy if exists "public read trip members" on trip_members;
drop policy if exists "public write trip members" on trip_members;
drop policy if exists "public read trip invites" on trip_invites;
drop policy if exists "public write trip invites" on trip_invites;

create policy "public read trips" on trips for select using (true);
create policy "public read trip members" on trip_members for select using (true);
create policy "public write trip members" on trip_members for all using (true) with check (true);
create policy "public read trip invites" on trip_invites for select using (true);
create policy "public write trip invites" on trip_invites for all using (true) with check (true);

drop policy if exists "public insert mirrored people" on people;
create policy "public insert mirrored people"
on people
for insert
with check (exists (select 1 from trip_members where trip_members.id = people.id));

insert into trips (id, name)
values ('morocco-crew-2026', 'Morocco Crew Trip')
on conflict (id) do update set name = excluded.name;

insert into trip_members (id, trip_id, display_name, role, device_client_id, sort_order)
select
  people.id,
  'morocco-crew-2026',
  people.name,
  case when people.id = 'traveler-1' then 'organiser' else 'traveler' end,
  reservations.client_id,
  people.sort_order
from people
left join reservations on reservations.person_id = people.id
on conflict (id) do update set
  trip_id = excluded.trip_id,
  display_name = excluded.display_name,
  role = excluded.role,
  device_client_id = coalesce(trip_members.device_client_id, excluded.device_client_id),
  sort_order = excluded.sort_order;

do $$
begin
  alter publication supabase_realtime add table public.trip_members;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.trip_invites;
exception
  when duplicate_object then null;
end $$;
