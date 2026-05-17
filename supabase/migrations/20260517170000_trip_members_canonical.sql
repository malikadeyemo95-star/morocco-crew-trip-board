-- Make trip_members the canonical identity table for all active trip behavior.

delete from checkins
where not exists (
  select 1 from trip_members where trip_members.id = checkins.person_id
);

delete from expenses
where not exists (
  select 1 from trip_members where trip_members.id = expenses.paid_by
);

alter table checkins drop constraint if exists checkins_person_id_fkey;
alter table checkins
  add constraint checkins_person_id_fkey
  foreign key (person_id) references trip_members(id) on delete restrict;

alter table expenses drop constraint if exists expenses_paid_by_fkey;
alter table expenses
  add constraint expenses_paid_by_fkey
  foreign key (paid_by) references trip_members(id) on delete restrict;

drop table if exists reservations;
drop table if exists people;
