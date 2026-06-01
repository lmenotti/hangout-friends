-- Plan ownership: who created this plan and can manage it.
-- creator_token  — secret set at creation, stored in httpOnly cookie on creator's device.
-- creator_user_id — nullable; set when an account holder creates a plan (future upgrade path).
-- Both columns are nullable so existing rows stay valid (pre-ownership plans allow anyone to manage).
alter table public.polls
  add column if not exists creator_token    text,
  add column if not exists creator_user_id  uuid references public.users(id) on delete set null;
