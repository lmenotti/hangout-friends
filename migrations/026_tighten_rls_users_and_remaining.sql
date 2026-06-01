-- Tighten RLS: close remaining May 2026 audit gaps (HGT-109).
--
-- Background: all server-side Supabase access uses the service role client
-- (supabaseAdmin in lib/supabase.ts), which bypasses RLS. The anon key must not
-- be used for mutations or sensitive reads. Migration 020 removed permissive
-- mutation policies on core plan tables; this migration finishes the job:
--   - Drop public SELECT on users (exposes session tokens, emails, Google OAuth).
--   - Drop remaining USING (true) / WITH CHECK (true) mutation policies.
--   - Enable RLS on google_calendar_channels with no policies (deny-all via PostgREST).
--
-- After this migration, direct anon PostgREST access is denied for these operations.
-- Intentional public reads on polls, availability, events, etc. are unchanged.

-- users: block anon read of credentials and PII
DROP POLICY IF EXISTS "Public read" ON public.users;

-- polls (013, 018)
DROP POLICY IF EXISTS "Allow insert" ON public.polls;
DROP POLICY IF EXISTS "Allow update" ON public.polls;

-- poll_responses (013)
DROP POLICY IF EXISTS "Allow insert" ON public.poll_responses;
DROP POLICY IF EXISTS "Allow update" ON public.poll_responses;

-- pods (014)
DROP POLICY IF EXISTS "Allow insert" ON public.pods;
DROP POLICY IF EXISTS "Allow update" ON public.pods;

-- pod_members (014)
DROP POLICY IF EXISTS "Allow insert" ON public.pod_members;
DROP POLICY IF EXISTS "Allow delete" ON public.pod_members;

-- bug_reports (006)
DROP POLICY IF EXISTS "Allow insert" ON public.bug_reports;
DROP POLICY IF EXISTS "Allow update" ON public.bug_reports;
DROP POLICY IF EXISTS "Allow delete" ON public.bug_reports;

-- events (015 — insert/delete removed in 020)
DROP POLICY IF EXISTS "Allow update" ON public.events;

-- google_calendar_channels (025): service role only, no anon access
ALTER TABLE public.google_calendar_channels ENABLE ROW LEVEL SECURITY;
