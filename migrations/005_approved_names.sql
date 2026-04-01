create table if not exists public.approved_names (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now() not null
);

alter table public.approved_names enable row level security;

do $$ begin
  create policy "Public read" on public.approved_names for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Allow insert" on public.approved_names for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Allow delete" on public.approved_names for delete using (true);
exception when duplicate_object then null; end $$;
