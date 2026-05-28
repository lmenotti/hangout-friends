-- Tighten RLS: remove USING (true) and WITH CHECK (true) mutation policies.
--
-- Background: all server-side Supabase access now goes through the service role
-- client (supabaseAdmin in lib/supabase.ts), which bypasses RLS entirely. The
-- anon key is no longer used for mutations anywhere in the codebase. These
-- permissive policies served as a placeholder but effectively allowed any caller
-- with the (public) anon key to delete or insert rows for any user.
--
-- After this migration, anon-key clients hitting PostgREST directly will be
-- denied all mutations by the RLS default-deny fallback. Reads remain open via
-- the existing "Public read" USING (true) SELECT policies, which is intentional
-- for public plan/availability data.

-- availability
DROP POLICY IF EXISTS "Allow delete" ON public.availability;
DROP POLICY IF EXISTS "Allow insert" ON public.availability;

-- users
DROP POLICY IF EXISTS "Allow delete" ON public.users;
DROP POLICY IF EXISTS "Allow insert" ON public.users;
DROP POLICY IF EXISTS "Allow update" ON public.users;

-- ideas
DROP POLICY IF EXISTS "Allow delete" ON public.ideas;
DROP POLICY IF EXISTS "Allow insert" ON public.ideas;

-- idea_votes
DROP POLICY IF EXISTS "Allow delete" ON public.idea_votes;
DROP POLICY IF EXISTS "Allow insert" ON public.idea_votes;

-- events
DROP POLICY IF EXISTS "Allow delete" ON public.events;
DROP POLICY IF EXISTS "Allow insert" ON public.events;

-- rsvps
DROP POLICY IF EXISTS "Allow delete" ON public.rsvps;
DROP POLICY IF EXISTS "Allow insert" ON public.rsvps;
DROP POLICY IF EXISTS "Allow update" ON public.rsvps;
