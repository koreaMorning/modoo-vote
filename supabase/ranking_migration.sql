-- 정렬 알고리즘 관련 컬럼 추가
ALTER TABLE polls ADD COLUMN IF NOT EXISTS source_count    integer NOT NULL DEFAULT 1;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS is_main_article boolean NOT NULL DEFAULT false;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS is_pinned       boolean NOT NULL DEFAULT false;

-- AI 후보 초안에도 source_count 추가
ALTER TABLE poll_drafts ADD COLUMN IF NOT EXISTS source_count integer NOT NULL DEFAULT 1;

-- 고유 투표자 수 카운트 함수 (α 계산용)
CREATE OR REPLACE FUNCTION get_total_unique_voters()
RETURNS bigint
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT COUNT(DISTINCT voter_fingerprint) FROM votes;
$$;
