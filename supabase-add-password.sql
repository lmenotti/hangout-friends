-- Run in Supabase SQL Editor
alter table public.users add column if not exists password_hash text;
