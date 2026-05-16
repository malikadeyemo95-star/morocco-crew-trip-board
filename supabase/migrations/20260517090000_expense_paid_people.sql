alter table expenses
add column if not exists paid_people jsonb not null default '[]'::jsonb;

update expenses
set paid_people = jsonb_build_array(paid_by)
where paid_people = '[]'::jsonb;
