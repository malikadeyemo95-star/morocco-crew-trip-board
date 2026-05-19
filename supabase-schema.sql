create table if not exists trips (
  id text primary key,
  name text not null,
  created_by uuid,
  country text not null default 'Morocco',
  city text,
  start_date date,
  end_date date,
  currency text not null default 'EUR',
  cover_image text,
  created_at timestamptz not null default now()
);

create table if not exists trip_members (
  id text primary key,
  trip_id text not null references trips(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('organiser', 'traveler')),
  user_id uuid,
  device_client_id text,
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

create table if not exists events (
  id text primary key,
  trip_id text not null references trips(id) on delete cascade default 'morocco-crew-2026',
  title text not null,
  location text,
  starts_at text not null,
  notes text,
  plan_type text not null default 'activity',
  sort_order integer not null default 0,
  alarm_offset integer not null default 30,
  alarmed boolean not null default false
);

create table if not exists checkins (
  trip_id text not null references trips(id) on delete cascade default 'morocco-crew-2026',
  event_id text not null references events(id) on delete cascade,
  person_id text not null references trip_members(id) on delete restrict,
  status text not null default 'not-ready',
  primary key (event_id, person_id)
);

create table if not exists expenses (
  id text primary key,
  trip_id text not null references trips(id) on delete cascade default 'morocco-crew-2026',
  description text not null,
  amount numeric(10, 2) not null check (amount > 0),
  paid_by text not null references trip_members(id) on delete restrict,
  split_between jsonb not null default '[]'::jsonb,
  paid_people jsonb not null default '[]'::jsonb,
  spent_at date not null default current_date,
  created_at timestamptz not null default now()
);

alter table trips enable row level security;
alter table trip_members enable row level security;
alter table trip_invites enable row level security;
alter table events enable row level security;
alter table checkins enable row level security;
alter table expenses enable row level security;

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
drop policy if exists "authenticated read events" on events;
drop policy if exists "authenticated write events" on events;
drop policy if exists "authenticated read checkins" on checkins;
drop policy if exists "authenticated write checkins" on checkins;
drop policy if exists "authenticated read expenses" on expenses;
drop policy if exists "authenticated write expenses" on expenses;
drop policy if exists "authenticated read trips" on trips;
drop policy if exists "authenticated write trips" on trips;
drop policy if exists "authenticated read trip members" on trip_members;
drop policy if exists "authenticated write trip members" on trip_members;
drop policy if exists "authenticated read trip invites" on trip_invites;
drop policy if exists "authenticated write trip invites" on trip_invites;

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

create unique index if not exists trip_members_trip_device_unique
  on trip_members (trip_id, device_client_id)
  where device_client_id is not null;
create unique index if not exists trip_members_trip_user_unique
  on trip_members (trip_id, user_id)
  where user_id is not null;
create index if not exists events_trip_id_starts_at_idx on events (trip_id, starts_at);
create index if not exists checkins_trip_id_idx on checkins (trip_id);
create index if not exists expenses_trip_id_spent_at_idx on expenses (trip_id, spent_at desc);
create index if not exists trip_members_user_id_idx on trip_members (user_id);

insert into trips (id, name, country, city, start_date, end_date, currency)
values ('morocco-crew-2026', 'Morocco Crew Trip', 'Morocco', 'Marrakech', '2026-08-16', '2026-08-22', 'EUR')
on conflict (id) do update set
  name = excluded.name,
  country = excluded.country,
  city = excluded.city,
  start_date = excluded.start_date,
  end_date = excluded.end_date,
  currency = excluded.currency;

insert into trip_members (id, trip_id, display_name, role, sort_order) values
  ('traveler-1', 'morocco-crew-2026', 'Malik', 'organiser', 1)
on conflict (id) do update set
  trip_id = excluded.trip_id,
  display_name = excluded.display_name,
  role = excluded.role,
  sort_order = excluded.sort_order;

insert into events (id, trip_id, title, location, starts_at, notes, alarm_offset, alarmed) values
  ('arrival-marrakech', 'morocco-crew-2026', 'Arrival in Marrakech', 'Marrakech', '2026-08-16T19:00', 'Arrival day. Eat out or find a supermarket to buy foodstuffs to cook dinner.', 60, false),
  ('brunch', 'morocco-crew-2026', 'Brunch', 'Marrakech', '2026-08-17T11:00', 'Start the first full day together before heading into the city.', 45, false),
  ('pottery-souks', 'morocco-crew-2026', 'Pottery class and souks walk', 'Marrakech city', '2026-08-17T14:00', 'Pottery class. Since you might be in the city, you can also walk around the souks.', 45, false),
  ('safran-koya', 'morocco-crew-2026', 'Dinner at Safran by Koya', 'Safran by Koya', '2026-08-17T21:00', 'Reserved for 21:00. About 11-13 minutes by car.', 60, false),
  ('quad-camel', 'morocco-crew-2026', 'Quad riding and camel riding', 'Marrakech', '2026-08-18T10:00', 'Adventure morning with quad riding and camel riding.', 60, false),
  ('pool-day', 'morocco-crew-2026', 'Pool day at home', 'Apartment', '2026-08-18T15:00', 'Relaxed pool time at home before dinner.', 30, false),
  ('buddah-bar', 'morocco-crew-2026', 'Dinner at Buddah Bar', 'Buddah Bar', '2026-08-18T21:30', 'Dinner at 21:30. About 11-13 minutes by car from the apartment.', 60, false),
  ('casablanca-trip', 'morocco-crew-2026', 'Day trip to Casablanca', 'Casablanca', '2026-08-19T09:00', 'Day trip from Marrakech to Casablanca.', 90, false),
  ('morocco-mall', 'morocco-crew-2026', 'Morocco Mall', 'Casablanca', '2026-08-19T13:00', 'Visit Morocco Mall, noted as the biggest mall in Africa.', 45, false),
  ('go-karting', 'morocco-crew-2026', 'Go karting', 'Casablanca', '2026-08-19T17:00', 'Go karting after the mall stop.', 45, false),
  ('medina-souk', 'morocco-crew-2026', 'Medina and souk market', 'Marrakech Medina', '2026-08-20T11:00', 'Go to the Medina and souk market.', 45, false),
  ('bracelet-making', 'morocco-crew-2026', 'Bracelet making', 'Marrakech', '2026-08-20T14:00', 'Bracelet making activity.', 30, false),
  ('perfume-making', 'morocco-crew-2026', 'Perfume making', 'Marrakech', '2026-08-20T16:00', 'Perfume making activity.', 30, false),
  ('nommos', 'morocco-crew-2026', 'Dinner at Nommos Marrakech', 'Nommos Marrakech', '2026-08-20T20:30', 'Could not reserve yet. About 18 minutes by car.', 60, false),
  ('pool-games', 'morocco-crew-2026', 'Pool and game day', 'Apartment', '2026-08-21T13:00', 'Pool and game day at home.', 30, false),
  ('club-night', 'morocco-crew-2026', 'Club night', 'Theatro or Club 555', '2026-08-21T23:30', 'Club Theatro or Club 555.', 90, false),
  ('chill-day', 'morocco-crew-2026', 'Chill day before leaving', 'Apartment', '2026-08-22T11:00', 'Chill day at home until leaving, if late checkout is possible.', 60, false)
on conflict (id) do update set
  trip_id = excluded.trip_id,
  title = excluded.title,
  location = excluded.location,
  starts_at = excluded.starts_at,
  notes = excluded.notes,
  alarm_offset = excluded.alarm_offset,
  alarmed = excluded.alarmed;
