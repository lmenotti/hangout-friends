create table if not exists public.pods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.pod_members (
  pod_id uuid references public.pods(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz default now(),
  primary key (pod_id, user_id)
);

alter table public.events add column if not exists pod_id uuid references public.pods(id) on delete set null;
alter table public.ideas add column if not exists pod_id uuid references public.pods(id) on delete set null;
alter table public.users add column if not exists last_seen timestamptz;

alter table public.pods enable row level security;
alter table public.pod_members enable row level security;

do $$ begin
  create policy "Public read" on public.pods for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Allow insert" on public.pods for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Allow update" on public.pods for update using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Public read" on public.pod_members for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Allow insert" on public.pod_members for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Allow delete" on public.pod_members for delete using (true);
exception when duplicate_object then null; end $$;
