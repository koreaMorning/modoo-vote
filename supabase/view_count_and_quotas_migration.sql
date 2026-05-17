-- polls 조회수 컬럼 추가
ALTER TABLE polls ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

-- 조회수 원자적 증가 함수
CREATE OR REPLACE FUNCTION increment_poll_view_count(poll_id_param uuid)
RETURNS void LANGUAGE SQL SECURITY DEFINER AS $$
  UPDATE polls SET view_count = view_count + 1 WHERE id = poll_id_param;
$$;

-- 카테고리별 목표 수량 테이블
CREATE TABLE IF NOT EXISTS category_quotas (
  category text PRIMARY KEY,
  target_count integer NOT NULL DEFAULT 10
);

ALTER TABLE category_quotas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quotas_select" ON category_quotas FOR SELECT USING (true);
CREATE POLICY "quotas_all"    ON category_quotas FOR ALL   USING (true) WITH CHECK (true);

INSERT INTO category_quotas (category, target_count) VALUES
  ('정치', 10), ('경제', 10), ('사회', 10), ('문화', 10),
  ('스포츠', 10), ('국제', 10), ('기술', 10), ('환경', 10)
ON CONFLICT (category) DO NOTHING;
