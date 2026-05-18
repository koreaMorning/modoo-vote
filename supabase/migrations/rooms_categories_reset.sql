-- 토론방 카테고리 초기화: 기존 투자/시사 제거, 게시글 카테고리 9개로 통일
-- Supabase SQL Editor에서 실행하세요.

-- 1. 기존 rooms 삭제 (room_categories 외래키 constraint 때문에 먼저 삭제)
DELETE FROM rooms;

-- 2. 기존 room_categories 삭제
DELETE FROM room_categories;

-- 3. 게시글 카테고리와 동일한 9개 카테고리 삽입
INSERT INTO room_categories (name, sort_order) VALUES
  ('정치', 1),
  ('경제', 2),
  ('사회', 3),
  ('문화', 4),
  ('스포츠', 5),
  ('국제', 6),
  ('기술', 7),
  ('환경', 8),
  ('연예', 9);
