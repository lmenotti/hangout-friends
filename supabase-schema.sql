-- Run this in the Supabase SQL Editor to set up your database

create table public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  token text unique not null,
  created_at timestamptz default now()
);

create table public.availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  hour integer not null check (hour between 0 and 23),
  unique(user_id, day_of_week, hour)
);

create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now()
);

create table public.idea_votes (
  idea_id uuid references public.ideas(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  primary key (idea_id, user_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid references public.ideas(id) on delete set null,
  title text not null,
  description text,
  scheduled_at timestamptz,
  created_at timestamptz default now()
);

create table public.rsvps (
  event_id uuid references public.events(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  status text not null check (status in ('yes', 'maybe', 'no')),
  primary key (event_id, user_id)
);

-- Allow public read/write (since we're using token-based identity, not Supabase auth)
alter table public.users enable row level security;
alter table public.availability enable row level security;
alter table public.ideas enable row level security;
alter table public.idea_votes enable row level security;
alter table public.events enable row level security;
alter table public.rsvps enable row level security;

create policy "Allow all" on public.users for all using (true) with check (true);
create policy "Allow all" on public.availability for all using (true) with check (true);
create policy "Allow all" on public.ideas for all using (true) with check (true);
create policy "Allow all" on public.idea_votes for all using (true) with check (true);
create policy "Allow all" on public.events for all using (true) with check (true);
create policy "Allow all" on public.rsvps for all using (true) with check (true);
