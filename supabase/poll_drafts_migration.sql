-- AI 생성 투표 후보 테이블
CREATE TABLE IF NOT EXISTS poll_drafts (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  title         text        NOT NULL,
  description   text,
  category      text        NOT NULL DEFAULT '사회',
  question_type text        NOT NULL DEFAULT 'multiple',  -- binary | multiple | scale
  options       jsonb       NOT NULL DEFAULT '[]',
  source_url    text,
  source_outlet text,
  youtube_url   text,
  status        text        NOT NULL DEFAULT 'pending',   -- pending | approved | rejected
  created_at    timestamptz DEFAULT now(),
  reviewed_at   timestamptz
);

ALTER TABLE poll_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drafts_select" ON poll_drafts FOR SELECT USING (true);
CREATE POLICY "drafts_all"    ON poll_drafts FOR ALL   USING (true) WITH CHECK (true);
