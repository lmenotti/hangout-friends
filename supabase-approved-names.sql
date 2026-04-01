create table if not exists public.approved_names (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now() not null
);

alter table public.approved_names enable row level security;

do $$ begin
  create policy "Admin manages approved_names" on public.approved_names for all using (true);
exception when duplicate_object then null;
end $$;
