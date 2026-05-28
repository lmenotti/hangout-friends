-- Plan-scoped ideas, anonymous voting, poll scheduling, and RSVPs

-- Ideas scoped to a poll (anonymous-friendly)
alter table public.ideas
  add column if not exists poll_id uuid references public.polls(id) on delete cascade,
  add column if not exists created_by_name text;

-- Poll lifecycle: polling → scheduled
alter table public.polls
  add column if not exists status text not null default 'polling'
    check (status in ('polling', 'scheduled')),
  add column if not exists scheduled_at timestamptz,
  add column if not exists scheduled_end_at timestamptz,
  add column if not exists scheduled_idea_id uuid references public.ideas(id) on delete set null,
  add column if not exists scheduled_slot_key text;

-- Anonymous upvotes on plan ideas (row-count model)
create table if not exists public.poll_idea_votes (
  idea_id uuid not null references public.ideas(id) on delete cascade,
  respondent_name text not null,
  created_at timestamptz default now(),
  primary key (idea_id, respondent_name)
);

-- RSVP on scheduled plans (anonymous, by first name)
create table if not exists public.poll_rsvps (
  poll_id uuid not null references public.polls(id) on delete cascade,
  respondent_name text not null,
  status text not null check (status in ('yes', 'maybe', 'no')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (poll_id, respondent_name)
);

create index if not exists ideas_poll_id_idx on public.ideas(poll_id);

alter table public.poll_idea_votes enable row level security;
alter table public.poll_rsvps enable row level security;

do $$ begin
  create policy "Public read" on public.poll_idea_votes for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Public read" on public.poll_rsvps for select using (true);
exception when duplicate_object then null; end $$;
