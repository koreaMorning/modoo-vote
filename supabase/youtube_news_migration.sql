CREATE TABLE IF NOT EXISTS youtube_news (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id      text UNIQUE NOT NULL,
  channel_id    text NOT NULL,
  channel_name  text NOT NULL,
  title         text NOT NULL,
  description   text,
  published_at  timestamptz NOT NULL,
  thumbnail_url text,
  fetched_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS youtube_news_published_at_idx ON youtube_news (published_at DESC);
CREATE INDEX IF NOT EXISTS youtube_news_channel_id_idx   ON youtube_news (channel_id);

ALTER TABLE youtube_news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON youtube_news FOR SELECT USING (true);
