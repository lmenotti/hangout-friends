-- Web Push subscriptions (PWA). Exactly three notification types are sent in app code;
-- see lib/pushNotifications.ts allowlist.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_id uuid references public.users(id) on delete cascade,
  device_id text,
  -- Plans to notify: [{ "poll_id": "...", "role": "creator"|"rsvp", "respondent_name": "..." }]
  plan_watches jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint push_subscriptions_user_or_device check (user_id is not null or device_id is not null),
  constraint push_subscriptions_endpoint_unique unique (endpoint)
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);
create index if not exists push_subscriptions_device_id_idx on public.push_subscriptions(device_id);

alter table public.push_subscriptions enable row level security;

-- No anon mutations; API routes use service role.
