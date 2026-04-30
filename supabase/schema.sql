-- 투표 테이블
create table polls (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default '사회',
  is_active boolean not null default true,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

-- 선택지 테이블
create table options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  text text not null,
  votes_count integer not null default 0,
  display_order integer not null default 0
);

-- 투표 기록 테이블 (중복 투표 방지)
create table votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  option_id uuid not null references options(id) on delete cascade,
  voter_fingerprint text not null,
  created_at timestamptz not null default now(),
  unique(poll_id, voter_fingerprint)
);

-- 중복 투표 방지 인덱스
create index votes_poll_fingerprint_idx on votes(poll_id, voter_fingerprint);

-- 투표 수 증가 함수 (atomic)
create or replace function increment_vote(p_poll_id uuid, p_option_id uuid, p_fingerprint text)
returns json
language plpgsql
security definer
as $$
declare
  v_result json;
begin
  -- 중복 투표 체크
  if exists (
    select 1 from votes
    where poll_id = p_poll_id and voter_fingerprint = p_fingerprint
  ) then
    return json_build_object('success', false, 'error', 'already_voted');
  end if;

  -- 투표 기록 저장
  insert into votes(poll_id, option_id, voter_fingerprint)
  values(p_poll_id, p_option_id, p_fingerprint);

  -- options votes_count 증가
  update options
  set votes_count = votes_count + 1
  where id = p_option_id;

  return json_build_object('success', true);
end;
$$;

-- RLS 활성화
alter table polls enable row level security;
alter table options enable row level security;
alter table votes enable row level security;

-- 모든 사용자 읽기 허용
create policy "polls_read" on polls for select using (true);
create policy "options_read" on options for select using (true);
create policy "votes_read" on votes for select using (true);

-- 투표 함수는 security definer로 실행되므로 별도 정책 불필요

-- 샘플 데이터
insert into polls (title, description, category, ends_at) values
(
  '2026년 대한민국 최대 현안은 무엇이라고 생각하십니까?',
  '현재 우리 사회가 가장 시급히 해결해야 할 문제를 선택해 주세요.',
  '정치',
  now() + interval '30 days'
),
(
  '인공지능이 일자리에 미치는 영향, 어떻게 보십니까?',
  'AI 기술 발전이 고용 시장에 가져올 변화에 대한 여러분의 생각은?',
  '기술',
  now() + interval '14 days'
),
(
  '주 4일제 근무, 도입해야 할까요?',
  '선진국에서 확산 중인 주 4일제 도입에 대한 찬반 의견을 들려주세요.',
  '경제',
  now() + interval '7 days'
);

insert into options (poll_id, text, display_order)
select id, unnest(array['경제 불평등 해소', '기후 위기 대응', '저출산·고령화', '정치 개혁', '남북 관계']),
       generate_series(1, 5)
from polls where title like '%최대 현안%';

insert into options (poll_id, text, display_order)
select id, unnest(array['일자리 대폭 감소', '일부 직종 대체, 신규 직종 생성', '생산성 향상으로 긍정적', '영향 미미']),
       generate_series(1, 4)
from polls where title like '%인공지능%';

insert into options (poll_id, text, display_order)
select id, unnest(array['찬성 - 삶의 질 향상', '반대 - 생산성 저하 우려', '단계적 도입 검토', '잘 모르겠다']),
       generate_series(1, 4)
from polls where title like '%주 4일제%';
