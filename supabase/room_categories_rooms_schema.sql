-- 토론방 카테고리 테이블
CREATE TABLE room_categories (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text NOT NULL,
  sort_order int  NOT NULL DEFAULT 0
);

-- 채팅방 테이블 (room_posts 통합, 기존 정적 ROOMS 대체)
CREATE TABLE rooms (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id      uuid        NOT NULL REFERENCES room_categories(id) ON DELETE CASCADE,
  title            text        NOT NULL,
  description      text,
  slug             text        NOT NULL UNIQUE,
  icon             text        DEFAULT '💬',
  post_title       text,
  post_content     text,
  post_updated_at  timestamptz,
  sort_order       int         NOT NULL DEFAULT 0,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE room_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms           ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rc_read"  ON room_categories FOR SELECT USING (true);
CREATE POLICY "rc_write" ON room_categories FOR ALL   USING (true) WITH CHECK (true);
CREATE POLICY "rm_read"  ON rooms           FOR SELECT USING (true);
CREATE POLICY "rm_write" ON rooms           FOR ALL   USING (true) WITH CHECK (true);

-- 초기 데이터 (기존 정적 ROOMS 이전)
INSERT INTO room_categories (name, sort_order) VALUES ('투자', 1), ('시사', 2);

INSERT INTO rooms (category_id, title, description, slug, icon, sort_order)
SELECT id, '주식',    '국내외 주식시장 & 종목 투자 전략 토론', 'stocks',     '📈', 1 FROM room_categories WHERE name = '투자';
INSERT INTO rooms (category_id, title, description, slug, icon, sort_order)
SELECT id, '부동산',  '아파트·토지·상가 부동산 시장 전망 토론', 'realestate', '🏠', 2 FROM room_categories WHERE name = '투자';
INSERT INTO rooms (category_id, title, description, slug, icon, sort_order)
SELECT id, '코인',    '비트코인·이더리움·알트코인 암호화폐 토론', 'crypto',    '💰', 3 FROM room_categories WHERE name = '투자';
INSERT INTO rooms (category_id, title, description, slug, icon, sort_order)
SELECT id, '이란전쟁','이란 핵협상·중동 정세·국제 분쟁 토론',  'iran-war',   '🌍', 1 FROM room_categories WHERE name = '시사';

-- 기존 room_posts → rooms 데이터 이전 (room_posts 테이블이 있는 경우)
-- UPDATE rooms r
-- SET post_title = rp.title, post_content = rp.content, post_updated_at = rp.updated_at
-- FROM room_posts rp WHERE r.slug = rp.room_slug;
