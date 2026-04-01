ALTER TABLE events ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id);
