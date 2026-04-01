alter table public.ideas add column if not exists duration_minutes int;
alter table public.ideas add column if not exists is_outdoor boolean default false;
alter table public.ideas add column if not exists location text;
alter table public.ideas add column if not exists travel_car_minutes int;
alter table public.ideas add column if not exists travel_transit_minutes int;
