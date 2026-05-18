-- 테마 테이블
CREATE TABLE IF NOT EXISTS themes (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  title       text        NOT NULL,
  description text,
  end_date    date,
  is_active   boolean     NOT NULL DEFAULT true,
  sort_order  int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 테마 ↔ 투표 게시글 연결
CREATE TABLE IF NOT EXISTS theme_polls (
  theme_id uuid NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  poll_id  uuid NOT NULL REFERENCES polls(id)  ON DELETE CASCADE,
  PRIMARY KEY (theme_id, poll_id)
);

-- 테마 ↔ 토론방 연결
CREATE TABLE IF NOT EXISTS theme_rooms (
  theme_id  uuid NOT NULL REFERENCES themes(id)  ON DELETE CASCADE,
  room_slug text NOT NULL REFERENCES rooms(slug) ON DELETE CASCADE,
  PRIMARY KEY (theme_id, room_slug)
);

-- RLS (anon 읽기 허용, service_role 쓰기)
ALTER TABLE themes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon read themes"      ON themes      FOR SELECT USING (true);
CREATE POLICY "anon read theme_polls" ON theme_polls FOR SELECT USING (true);
CREATE POLICY "anon read theme_rooms" ON theme_rooms FOR SELECT USING (true);
