-- chat_messages 테이블에 nickname 컬럼 추가
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS nickname text NOT NULL DEFAULT '익명';

-- INSERT 정책 업데이트: nickname 길이도 검증
DROP POLICY IF EXISTS "chat_insert" ON chat_messages;
CREATE POLICY "chat_insert" ON chat_messages FOR INSERT
  WITH CHECK (
    char_length(content)  BETWEEN 1 AND 300
    AND char_length(nickname) BETWEEN 1 AND 20
  );
