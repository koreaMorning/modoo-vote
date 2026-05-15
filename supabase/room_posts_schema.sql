-- 토론방 주제 게시글 테이블 (방 당 1개, upsert 방식)
CREATE TABLE IF NOT EXISTS room_posts (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  room_slug   text        NOT NULL UNIQUE,
  title       text        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  content     text        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE room_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "room_posts_read"  ON room_posts FOR SELECT USING (true);
CREATE POLICY "room_posts_write" ON room_posts FOR ALL   USING (true) WITH CHECK (true);
