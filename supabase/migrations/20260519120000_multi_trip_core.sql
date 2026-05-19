-- Multi-trip foundation: keep Morocco intact while scoping shared data by trip.

alter table trips
  add column if not exists created_by uuid,
  add column if not exists country text not null default 'Morocco',
  add column if not exists city text,
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists currency text not null default 'EUR',
  add column if not exists cover_image text;

update trips
set
  country = coalesce(nullif(country, ''), 'Morocco'),
  city = coalesce(city, 'Marrakech'),
  start_date = coalesce(start_date, date '2026-08-16'),
  end_date = coalesce(end_date, date '2026-08-22'),
  currency = coalesce(nullif(currency, ''), 'EUR')
where id = 'morocco-crew-2026';

alter table events
  add column if not exists trip_id text references trips(id) on delete cascade,
  add column if not exists plan_type text not null default 'activity',
  add column if not exists sort_order integer not null default 0;

update events
set trip_id = coalesce(trip_id, 'morocco-crew-2026');

alter table events
  alter column trip_id set not null;

alter table checkins
  add column if not exists trip_id text references trips(id) on delete cascade;

update checkins
set trip_id = coalesce(
  checkins.trip_id,
  (select events.trip_id from events where events.id = checkins.event_id),
  'morocco-crew-2026'
);

alter table checkins
  alter column trip_id set not null;

alter table expenses
  add column if not exists trip_id text references trips(id) on delete cascade;

update expenses
set trip_id = coalesce(trip_id, 'morocco-crew-2026');

alter table expenses
  alter column trip_id set not null;

alter table trip_members drop constraint if exists trip_members_device_client_id_key;
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

drop policy if exists "public write trips" on trips;
create policy "public write trips" on trips for all using (true) with check (true);
