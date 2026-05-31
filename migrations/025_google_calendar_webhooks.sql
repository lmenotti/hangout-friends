-- Active Google Calendar push notification channels (one per connected user).
-- Channels expire after ≤7 days; the renewal cron recreates them before expiry.
create table if not exists public.google_calendar_channels (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  channel_id  text not null unique,
  resource_id text not null,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

-- Per-user busy-time cache populated on each successful fetch.
-- google_busy_cached_at = null means stale (invalidated by webhook or never fetched).
alter table public.users
  add column if not exists google_busy_cache      jsonb,
  add column if not exists google_busy_cached_at  timestamptz;
