-- 채팅 메시지 테이블
CREATE TABLE IF NOT EXISTS chat_messages (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  room_slug    text        NOT NULL,
  content      text        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 300),
  stance       text        NOT NULL CHECK (stance IN ('pro', 'con')),
  fingerprint  text        NOT NULL,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_room_created
  ON chat_messages (room_slug, created_at ASC);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_read"   ON chat_messages FOR SELECT USING (true);
CREATE POLICY "chat_insert" ON chat_messages FOR INSERT
  WITH CHECK (char_length(content) BETWEEN 1 AND 300);

-- Realtime 활성화 (Supabase 대시보드 > Database > Replication에서도 활성화 필요)
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
