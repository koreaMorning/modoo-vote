CREATE TABLE IF NOT EXISTS ott_schedule (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform     text NOT NULL,
  type         text NOT NULL CHECK (type IN ('rank', 'upcoming')),
  rank         integer,
  title        text NOT NULL,
  genre        text,
  desc         text,
  badges       text[],
  ep           text,
  upcoming_date text,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ott_schedule_platform_type_idx ON ott_schedule (platform, type);

ALTER TABLE ott_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON ott_schedule FOR SELECT USING (true);
