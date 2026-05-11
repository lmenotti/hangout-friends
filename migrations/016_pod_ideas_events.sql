-- Ideas: pod-scoped fields
alter table public.ideas
  add column if not exists status text not null default 'open' check (status in ('open', 'scheduled', 'archived')),
  add column if not exists suggested_place text,
  add column if not exists proposed_date date,
  add column if not exists proposed_time time,
  add column if not exists vote_count integer not null default 0;

-- idea_votes: add created_at if missing
alter table public.idea_votes
  add column if not exists created_at timestamptz default now();

-- Events: link to source idea + pod
alter table public.events
  add column if not exists source_idea_id uuid references public.ideas(id) on delete set null;

-- Backfill pod_id on ideas/events from migration 014 (already nullable columns)
-- New rows will always have pod_id set via API
