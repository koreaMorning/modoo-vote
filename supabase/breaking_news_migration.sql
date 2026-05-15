-- polls 테이블에 속보 지정 컬럼 추가
alter table polls add column if not exists is_breaking boolean not null default false;
