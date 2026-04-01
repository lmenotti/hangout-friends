-- Add half-hour granularity to availability slots
alter table public.availability
  add column if not exists minute integer not null default 0
  check (minute in (0, 30));

-- Update unique constraint to include minute
alter table public.availability
  drop constraint if exists availability_user_id_day_of_week_hour_key;

alter table public.availability
  add constraint availability_user_day_hour_minute_key
  unique (user_id, day_of_week, hour, minute);
