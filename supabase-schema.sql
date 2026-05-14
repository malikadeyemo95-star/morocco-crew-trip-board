create table if not exists people (
  id text primary key,
  name text not null,
  sort_order integer not null
);

create table if not exists events (
  id text primary key,
  title text not null,
  location text,
  starts_at text not null,
  notes text,
  alarm_offset integer not null default 30,
  alarmed boolean not null default false
);

create table if not exists checkins (
  event_id text not null references events(id) on delete cascade,
  person_id text not null references people(id) on delete cascade,
  status text not null default 'not-ready',
  primary key (event_id, person_id)
);

create table if not exists reservations (
  person_id text primary key references people(id) on delete cascade,
  client_id text not null,
  claimed_at timestamptz not null default now()
);

create table if not exists expenses (
  id text primary key,
  description text not null,
  amount numeric(10, 2) not null check (amount > 0),
  paid_by text not null references people(id) on delete restrict,
  split_between jsonb not null default '[]'::jsonb,
  spent_at date not null default current_date,
  created_at timestamptz not null default now()
);

alter table people enable row level security;
alter table events enable row level security;
alter table checkins enable row level security;
alter table reservations enable row level security;
alter table expenses enable row level security;

drop policy if exists "public read people" on people;
drop policy if exists "public write people" on people;
drop policy if exists "public read events" on events;
drop policy if exists "public write events" on events;
drop policy if exists "public read checkins" on checkins;
drop policy if exists "public write checkins" on checkins;
drop policy if exists "public read reservations" on reservations;
drop policy if exists "public write reservations" on reservations;
drop policy if exists "public read expenses" on expenses;
drop policy if exists "public write expenses" on expenses;

create policy "public read people" on people for select using (true);
create policy "public read events" on events for select using (true);
create policy "public write events" on events for all using (true) with check (true);
create policy "public read checkins" on checkins for select using (true);
create policy "public write checkins" on checkins for all using (true) with check (true);
create policy "public read reservations" on reservations for select using (true);
create policy "public write reservations" on reservations for all using (true) with check (true);
create policy "public read expenses" on expenses for select using (true);
create policy "public write expenses" on expenses for all using (true) with check (true);

insert into people (id, name, sort_order) values
  ('traveler-1', 'Traveler 1', 1),
  ('traveler-2', 'Traveler 2', 2),
  ('traveler-3', 'Traveler 3', 3),
  ('traveler-4', 'Traveler 4', 4),
  ('traveler-5', 'Traveler 5', 5),
  ('traveler-6', 'Traveler 6', 6),
  ('traveler-7', 'Traveler 7', 7)
on conflict (id) do update set
  name = excluded.name,
  sort_order = excluded.sort_order;

insert into events (id, title, location, starts_at, notes, alarm_offset, alarmed) values
  ('arrival-marrakech', 'Arrival in Marrakech', 'Marrakech', '2026-08-16T19:00', 'Arrival day. Eat out or find a supermarket to buy foodstuffs to cook dinner.', 60, false),
  ('brunch', 'Brunch', 'Marrakech', '2026-08-17T11:00', 'Start the first full day together before heading into the city.', 45, false),
  ('pottery-souks', 'Pottery class and souks walk', 'Marrakech city', '2026-08-17T14:00', 'Pottery class. Since you might be in the city, you can also walk around the souks.', 45, false),
  ('safran-koya', 'Dinner at Safran by Koya', 'Safran by Koya', '2026-08-17T21:00', 'Reserved for 21:00. About 11-13 minutes by car.', 60, false),
  ('quad-camel', 'Quad riding and camel riding', 'Marrakech', '2026-08-18T10:00', 'Adventure morning with quad riding and camel riding.', 60, false),
  ('pool-day', 'Pool day at home', 'Apartment', '2026-08-18T15:00', 'Relaxed pool time at home before dinner.', 30, false),
  ('buddah-bar', 'Dinner at Buddah Bar', 'Buddah Bar', '2026-08-18T21:30', 'Dinner at 21:30. About 11-13 minutes by car from the apartment.', 60, false),
  ('casablanca-trip', 'Day trip to Casablanca', 'Casablanca', '2026-08-19T09:00', 'Day trip from Marrakech to Casablanca.', 90, false),
  ('morocco-mall', 'Morocco Mall', 'Casablanca', '2026-08-19T13:00', 'Visit Morocco Mall, noted as the biggest mall in Africa.', 45, false),
  ('go-karting', 'Go karting', 'Casablanca', '2026-08-19T17:00', 'Go karting after the mall stop.', 45, false),
  ('medina-souk', 'Medina and souk market', 'Marrakech Medina', '2026-08-20T11:00', 'Go to the Medina and souk market.', 45, false),
  ('bracelet-making', 'Bracelet making', 'Marrakech', '2026-08-20T14:00', 'Bracelet making activity.', 30, false),
  ('perfume-making', 'Perfume making', 'Marrakech', '2026-08-20T16:00', 'Perfume making activity.', 30, false),
  ('nommos', 'Dinner at Nommos Marrakech', 'Nommos Marrakech', '2026-08-20T20:30', 'Could not reserve yet. About 18 minutes by car.', 60, false),
  ('pool-games', 'Pool and game day', 'Apartment', '2026-08-21T13:00', 'Pool and game day at home.', 30, false),
  ('club-night', 'Club night', 'Theatro or Club 555', '2026-08-21T23:30', 'Club Theatro or Club 555.', 90, false),
  ('chill-day', 'Chill day before leaving', 'Apartment', '2026-08-22T11:00', 'Chill day at home until leaving, if late checkout is possible.', 60, false)
on conflict (id) do update set
  title = excluded.title,
  location = excluded.location,
  starts_at = excluded.starts_at,
  notes = excluded.notes,
  alarm_offset = excluded.alarm_offset,
  alarmed = excluded.alarmed;

insert into checkins (event_id, person_id, status)
select events.id, people.id, 'not-ready'
from events
cross join people
on conflict (event_id, person_id) do nothing;
