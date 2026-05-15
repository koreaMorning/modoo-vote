-- poll_opinions 테이블에 nickname 컬럼 추가
ALTER TABLE poll_opinions ADD COLUMN IF NOT EXISTS nickname text NOT NULL DEFAULT '';
