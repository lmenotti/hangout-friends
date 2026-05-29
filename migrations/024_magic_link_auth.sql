-- Optional email + magic link auth (HGT-11/13). Custom token pattern; no Supabase Auth.

alter table public.users
  add column if not exists email text;

create unique index if not exists users_email_lower_idx
  on public.users (lower(email))
  where email is not null;

create table if not exists public.magic_link_tokens (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  email text not null,
  name text,
  return_to text,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists magic_link_tokens_token_idx
  on public.magic_link_tokens (token)
  where used_at is null;

alter table public.magic_link_tokens enable row level security;
