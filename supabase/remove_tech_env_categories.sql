-- 카테고리 7개로 축소: 기술/환경 제거
-- 기존 기술/환경 카테고리 게시글은 NULL이 되므로 원하면 UPDATE로 재분류 가능

-- category_quotas에서 기술/환경 삭제
DELETE FROM category_quotas WHERE category IN ('기술', '환경');

-- (선택) 기술 게시글 → 사회로 재분류, 환경 게시글 → 사회로 재분류
-- UPDATE polls SET category = '사회' WHERE category IN ('기술', '환경');
