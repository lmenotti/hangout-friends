create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  creator_name text not null,
  date_options jsonb not null default '[]',
  expires_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.poll_responses (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid references public.polls(id) on delete cascade,
  respondent_name text not null,
  availability jsonb not null default '{}',
  created_at timestamptz default now()
);

alter table public.polls enable row level security;
alter table public.poll_responses enable row level security;

do $$ begin
  create policy "Public read" on public.polls for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Allow insert" on public.polls for insert with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Public read" on public.poll_responses for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Allow insert" on public.poll_responses for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Allow update" on public.poll_responses for update using (true) with check (true);
exception when duplicate_object then null; end $$;
