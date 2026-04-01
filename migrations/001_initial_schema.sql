create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  token text unique not null,
  created_at timestamptz default now()
);

create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  hour integer not null check (hour between 0 and 23),
  unique(user_id, day_of_week, hour)
);

create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.idea_votes (
  idea_id uuid references public.ideas(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  primary key (idea_id, user_id)
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid references public.ideas(id) on delete set null,
  title text not null,
  description text,
  scheduled_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.rsvps (
  event_id uuid references public.events(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  status text not null check (status in ('yes', 'maybe', 'no')),
  primary key (event_id, user_id)
);

alter table public.users enable row level security;
alter table public.availability enable row level security;
alter table public.ideas enable row level security;
alter table public.idea_votes enable row level security;
alter table public.events enable row level security;
alter table public.rsvps enable row level security;

do $$ begin
  create policy "Public read" on public.users for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Public read" on public.availability for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Public read" on public.ideas for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Public read" on public.idea_votes for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Public read" on public.events for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Public read" on public.rsvps for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Allow insert" on public.users for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Allow update" on public.users for update using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Allow delete" on public.users for delete using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Allow insert" on public.availability for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Allow delete" on public.availability for delete using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Allow insert" on public.ideas for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Allow delete" on public.ideas for delete using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Allow insert" on public.idea_votes for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Allow delete" on public.idea_votes for delete using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Allow insert" on public.events for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Allow delete" on public.events for delete using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Allow insert" on public.rsvps for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Allow update" on public.rsvps for update using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Allow delete" on public.rsvps for delete using (true);
exception when duplicate_object then null; end $$;
