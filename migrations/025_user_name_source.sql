-- Track how users.name was chosen (plan cookie, email parse, Google upgrade, etc.)

alter table public.users
  add column if not exists name_source text;

alter table public.users drop constraint if exists users_name_source_check;

alter table public.users add constraint users_name_source_check
  check (
    name_source is null
    or name_source in ('plan_identity', 'derived', 'email_local', 'google', 'manual')
  );
