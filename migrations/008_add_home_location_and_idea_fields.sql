ALTER TABLE users ADD COLUMN IF NOT EXISTS home_location text;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS is_scheduled boolean NOT NULL DEFAULT false;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS suggested_at timestamptz;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS travel_origin text;
