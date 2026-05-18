-- opinion_reactions 테이블 생성
create table if not exists opinion_reactions (
  id uuid primary key default gen_random_uuid(),
  opinion_id uuid not null references poll_opinions(id) on delete cascade,
  voter_fingerprint text not null,
  reaction text not null check (reaction in ('like', 'dislike')),
  created_at timestamptz not null default now(),
  unique(opinion_id, voter_fingerprint)
);

create index if not exists opinion_reactions_opinion_id_idx on opinion_reactions(opinion_id);
create index if not exists opinion_reactions_fingerprint_idx on opinion_reactions(voter_fingerprint);

-- poll_opinions에 likes_count, dislikes_count, nickname 컬럼 추가 (없을 경우)
alter table poll_opinions add column if not exists likes_count integer not null default 0;
alter table poll_opinions add column if not exists dislikes_count integer not null default 0;
alter table poll_opinions add column if not exists nickname text not null default '';

-- RLS 정책
alter table opinion_reactions enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='opinion_reactions' and policyname='opinion_reactions_select') then
    create policy "opinion_reactions_select" on opinion_reactions for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='opinion_reactions' and policyname='opinion_reactions_insert') then
    create policy "opinion_reactions_insert" on opinion_reactions for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='opinion_reactions' and policyname='opinion_reactions_update') then
    create policy "opinion_reactions_update" on opinion_reactions for update using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='opinion_reactions' and policyname='opinion_reactions_delete') then
    create policy "opinion_reactions_delete" on opinion_reactions for delete using (true);
  end if;
end $$;

-- toggle_opinion_reaction 함수 (원자적 토글)
create or replace function toggle_opinion_reaction(
  p_opinion_id uuid,
  p_fingerprint text,
  p_reaction text
) returns json
language plpgsql
security definer
as $$
declare
  v_existing_id uuid;
  v_existing_reaction text;
  v_new_reaction text;
begin
  select id, reaction
  into v_existing_id, v_existing_reaction
  from opinion_reactions
  where opinion_id = p_opinion_id and voter_fingerprint = p_fingerprint;

  if v_existing_reaction = p_reaction then
    -- 같은 반응 → 취소
    delete from opinion_reactions where id = v_existing_id;
    if p_reaction = 'like' then
      update poll_opinions set likes_count = greatest(0, likes_count - 1) where id = p_opinion_id;
    else
      update poll_opinions set dislikes_count = greatest(0, dislikes_count - 1) where id = p_opinion_id;
    end if;
    v_new_reaction := null;

  elsif v_existing_reaction is not null then
    -- 반응 변경
    update opinion_reactions set reaction = p_reaction where id = v_existing_id;
    if p_reaction = 'like' then
      update poll_opinions
        set likes_count = likes_count + 1,
            dislikes_count = greatest(0, dislikes_count - 1)
        where id = p_opinion_id;
    else
      update poll_opinions
        set likes_count = greatest(0, likes_count - 1),
            dislikes_count = dislikes_count + 1
        where id = p_opinion_id;
    end if;
    v_new_reaction := p_reaction;

  else
    -- 신규 반응
    insert into opinion_reactions (opinion_id, voter_fingerprint, reaction)
    values (p_opinion_id, p_fingerprint, p_reaction);
    if p_reaction = 'like' then
      update poll_opinions set likes_count = likes_count + 1 where id = p_opinion_id;
    else
      update poll_opinions set dislikes_count = dislikes_count + 1 where id = p_opinion_id;
    end if;
    v_new_reaction := p_reaction;
  end if;

  return json_build_object('reaction', v_new_reaction);
end;
$$;
