create table if not exists expenses (
  id text primary key,
  description text not null,
  amount numeric(10, 2) not null check (amount > 0),
  paid_by text not null references people(id) on delete restrict,
  split_between jsonb not null default '[]'::jsonb,
  spent_at date not null default current_date,
  created_at timestamptz not null default now()
);

alter table expenses enable row level security;

drop policy if exists "public read expenses" on expenses;
drop policy if exists "public write expenses" on expenses;

create policy "public read expenses" on expenses for select using (true);
create policy "public write expenses" on expenses for all using (true) with check (true);
