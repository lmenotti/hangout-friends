-- Enable RLS on the internal _migrations tracking table.
--
-- PostgREST exposes every table in the public schema by default. Without RLS,
-- any API client (anon or authenticated key) could read, insert, or delete
-- migration history rows — risking re-runs on next deploy or suppressed migrations.
--
-- No policies are added intentionally: RLS + zero policies = deny-all for every
-- PostgREST role. The migration runner (scripts/migrate.mjs) connects via a direct
-- Postgres connection (service role), which bypasses RLS, so deploys are unaffected.

ALTER TABLE public._migrations ENABLE ROW LEVEL SECURITY;
