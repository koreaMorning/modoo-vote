-- rooms 테이블에 진영 이름 컬럼 추가
-- Supabase SQL Editor에서 실행하세요.

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS stance_a text DEFAULT '찬성',
  ADD COLUMN IF NOT EXISTS stance_b text DEFAULT '반대';
