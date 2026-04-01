-- Run in Supabase SQL Editor
alter table public.events add column if not exists end_time timestamptz;
alter table public.events add column if not exists location text;
