-- 연예 카테고리 쿼터 추가
INSERT INTO category_quotas (category, target_count)
VALUES ('연예', 10)
ON CONFLICT (category) DO NOTHING;
