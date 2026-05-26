-- Add slug column (nullable first so backfill can run)
ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS slug text;

-- Backfill existing polls: lowercase title → strip special chars → spaces to hyphens → random 4-char suffix
UPDATE public.polls
SET slug = (
  COALESCE(
    NULLIF(
      lower(trim(both '-' from
        regexp_replace(
          regexp_replace(title, '[^a-zA-Z0-9 ]', '', 'g'),
          '\s+', '-', 'g'
        )
      )),
      ''
    ),
    'plan'
  ) || '-' || substring(replace(gen_random_uuid()::text, '-', ''), 1, 4)
)
WHERE slug IS NULL;

-- Enforce not null and uniqueness
ALTER TABLE public.polls ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS polls_slug_idx ON public.polls(slug);

-- Allow update so API can set slug on insert
DO $$ BEGIN
  CREATE POLICY "Allow update" ON public.polls FOR UPDATE USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
