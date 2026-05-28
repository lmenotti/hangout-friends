-- Plan archival: polls expire 30 days after event date (see expires_at column).
-- Cron job sets archived_at; data is retained, not deleted.

alter table public.polls
  add column if not exists archived_at timestamptz;

create index if not exists polls_pending_expiration_idx
  on public.polls (expires_at)
  where archived_at is null and expires_at is not null;

-- Backfill expires_at for existing polls missing it (30 days after last date option or scheduled date).
update public.polls
set expires_at = (
  case
    when status = 'scheduled' and scheduled_at is not null then
      (scheduled_at + interval '30 days')
    else
      (
        (
          (date_options->>-1)::date + interval '1 day' - interval '1 millisecond'
        ) + interval '30 days'
      )
  end
)
where expires_at is null
  and jsonb_array_length(date_options) > 0;
