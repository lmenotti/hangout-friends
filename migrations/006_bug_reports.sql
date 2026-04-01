create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  reported_by uuid references public.users(id) on delete set null,
  reported_at timestamptz default now() not null,
  resolved boolean default false not null
);

alter table public.bug_reports enable row level security;

do $$ begin
  create policy "Public read" on public.bug_reports for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Allow insert" on public.bug_reports for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Allow update" on public.bug_reports for update using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Allow delete" on public.bug_reports for delete using (true);
exception when duplicate_object then null; end $$;
