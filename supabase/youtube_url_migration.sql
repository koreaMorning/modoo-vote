-- polls 테이블에 youtube_url 컬럼 추가
ALTER TABLE polls ADD COLUMN IF NOT EXISTS youtube_url text;

-- rooms 테이블에 youtube_url 컬럼 추가
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS youtube_url text;
