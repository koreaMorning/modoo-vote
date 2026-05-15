'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Room } from '@/lib/rooms';

/* Room 타입은 lib/rooms.ts에서 import (DB 스키마 기반) */

const CHAT_FP_KEY    = 'modoo-chat-fp';
const NICKNAME_KEY   = 'modoo-chat-nickname';
const stanceKey = (slug: string) => `modoo-room-stance-${slug}`;

function getFingerprint(): string {
  try {
    let fp = localStorage.getItem(CHAT_FP_KEY);
    if (!fp) {
      fp = crypto.randomUUID();
      localStorage.setItem(CHAT_FP_KEY, fp);
    }
    return fp;
  } catch {
    return 'anon';
  }
}

function getSavedStance(slug: string): 'pro' | 'con' | null {
  try {
    const v = localStorage.getItem(stanceKey(slug));
    return v === 'pro' || v === 'con' ? v : null;
  } catch {
    return null;
  }
}

function saveStance(slug: string, s: 'pro' | 'con') {
  try { localStorage.setItem(stanceKey(slug), s); } catch {}
}

function getSavedNickname(): string {
  try { return localStorage.getItem(NICKNAME_KEY) ?? ''; } catch { return ''; }
}

function saveNickname(name: string) {
  try { localStorage.setItem(NICKNAME_KEY, name); } catch {}
}

interface ChatMsg {
  id: string;
  room_slug: string;
  content: string;
  stance: 'pro' | 'con';
  fingerprint: string;
  nickname: string;
  created_at: string;
}

export default function RoomClient({ room }: { room: Room }) {
  const [msgs, setMsgs]             = useState<ChatMsg[]>([]);
  const [text, setText]             = useState('');
  const [stance, setStance]         = useState<'pro' | 'con' | null>(null);
  const [fp, setFp]                 = useState('');
  const [nickname, setNickname]     = useState('');
  const [nicknameInput, setNicknameInput] = useState('');
  const [loading, setLoading]           = useState(true);
  const [sending, setSending]           = useState(false);
  const [confirming, setConfirming]     = useState(false);
  const [stanceOpen, setStanceOpen]     = useState(false);
  const [presenceUsers, setPresenceUsers] = useState<{ nickname: string }[]>([]);
  const proBottomRef  = useRef<HTMLDivElement>(null);
  const conBottomRef  = useRef<HTMLDivElement>(null);
  const stanceMenuRef = useRef<HTMLDivElement>(null);
  const channelRef    = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const supabase      = createClient();

  // 드롭업 외부 클릭 시 닫기
  useEffect(() => {
    if (!stanceOpen) return;
    function onOutside(e: MouseEvent) {
      if (stanceMenuRef.current && !stanceMenuRef.current.contains(e.target as Node)) {
        setStanceOpen(false);
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [stanceOpen]);

  useEffect(() => {
    setFp(getFingerprint());
    setStance(getSavedStance(room.slug));
    const saved = getSavedNickname();
    setNickname(saved);
    setNicknameInput(saved);
  }, [room.slug]);

  async function confirmNickname() {
    const name = nicknameInput.trim();
    if (!name || confirming) return;
    setConfirming(true);

    // 같은 방에서 다른 사람이 이미 쓰는 닉네임인지 확인
    const myFp = fp || getFingerprint();
    const { data } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('room_slug', room.slug)
      .eq('nickname', name)
      .neq('fingerprint', myFp)
      .limit(1);

    // 중복이면 닉네임#42 형태로 변환
    const finalName = data && data.length > 0
      ? `${name}#${Math.floor(Math.random() * 90 + 10)}`
      : name;

    saveNickname(finalName);
    setNickname(finalName);
    setNicknameInput(finalName);
    setConfirming(false);
  }

  function chooseStance(s: 'pro' | 'con') {
    saveStance(room.slug, s);
    setStance(s);
  }

  // 초기 메시지 로드
  useEffect(() => {
    supabase
      .from('chat_messages')
      .select('*')
      .eq('room_slug', room.slug)
      .order('created_at', { ascending: true })
      .limit(300)
      .then(({ data }) => {
        if (data) setMsgs(data as ChatMsg[]);
        setLoading(false);
      });
  }, [room.slug]);

  // Realtime 채널 (presence + postgres_changes 통합)
  // fp가 준비된 뒤에 채널을 열어야 presence key로 fp 사용 가능
  useEffect(() => {
    if (!fp) return;

    const ch = supabase
      .channel(`room-${room.slug}`, {
        config: { presence: { key: fp } },
      })
      .on('presence', { event: 'sync' }, () => {
        const state = ch.presenceState<{ nickname: string }>();
        // key 당 첫 번째 presence만 사용 (같은 fp의 여러 탭 → 1명으로 집계)
        const users = Object.values(state)
          .map((presences) => ({ nickname: (presences[0] as { nickname: string }).nickname }))
          .filter((u) => !!u.nickname);
        setPresenceUsers(users);
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_slug=eq.${room.slug}`,
        },
        (payload) => {
          setMsgs((prev) => [...prev, payload.new as ChatMsg]);
        }
      )
      .subscribe(async (status) => {
        // 구독 완료 시점에 이미 닉네임이 있으면 즉시 track
        if (status === 'SUBSCRIBED' && nickname) {
          await ch.track({ nickname });
        }
      });

    channelRef.current = ch;
    return () => {
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [room.slug, fp]); // fp 준비 후 한 번만 실행

  // 닉네임 확정 후 presence 등록 (닉네임 변경 시에도 재등록)
  useEffect(() => {
    if (!fp || !nickname || !channelRef.current) return;
    channelRef.current.track({ nickname });
  }, [fp, nickname]);

  // 새 메시지마다 각 컬럼 맨 아래로 스크롤
  useEffect(() => {
    proBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    conBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs.length]);

  const handleSubmit = useCallback(async () => {
    const content = text.trim();
    if (!content || !fp || !stance || !nickname || sending) return;
    setSending(true);
    setText('');
    await supabase.from('chat_messages').insert({
      room_slug: room.slug,
      content,
      stance,
      fingerprint: fp,
      nickname,
    });
    setSending(false);
  }, [text, fp, stance, nickname, sending, room.slug]);

  const proCount = msgs.filter((m) => m.stance === 'pro').length;
  const conCount = msgs.filter((m) => m.stance === 'con').length;
  const total    = msgs.length;
  const proRatio = total > 0 ? Math.round((proCount / total) * 100) : 50;

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>

      {/* ── 방 헤더 ── */}
      <div className="border-t-4 border-[#1c1712] pb-3 shrink-0">
        <div className="flex items-center gap-2 py-3 border-b border-[#d4cfc4]">
          <Link
            href="/rooms"
            className="text-xs text-[#8c8070] hover:text-[#1c1712] flex items-center gap-1 transition-colors"
          >
            <ArrowLeft size={12} /> 토론방
          </Link>
          <span className="text-[#c8bfa8] text-xs">·</span>
          <span className="text-xl leading-none">{room.icon ?? '💬'}</span>
          <h1 className="text-lg font-black font-serif leading-none">{room.title}</h1>
          {room.description && <span className="text-xs text-[#8c8070] hidden sm:block">— {room.description}</span>}
        </div>

        {/* 찬반 비율 바 */}
        <div className="pt-2">
          <div className="flex justify-between text-[10px] font-bold mb-1">
            <span className="text-[#1a5c75]">▲ 찬성 {proCount}건 ({proRatio}%)</span>
            <span className="text-[#7a3040]">▼ 반대 {conCount}건 ({100 - proRatio}%)</span>
          </div>
          <div className="h-1.5 bg-[#e8b8c4] overflow-hidden rounded-none">
            <div
              className="h-full bg-[#4d9ab5] transition-all duration-500"
              style={{ width: `${proRatio}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── 주제 게시글 ── */}
      {room.post_title && room.post_content && (
        <RoomPostBanner
          title={room.post_title}
          content={room.post_content}
          updatedAt={room.post_updated_at ?? room.created_at}
        />
      )}

      {/* ── 접속자 현황 ── */}
      <div className="border-x border-b border-[#d4cfc4] bg-[#f5f0e8] px-3 py-1.5 shrink-0 flex items-center gap-2.5 overflow-hidden">
        <span className="text-[9px] font-black text-[#8c8070] shrink-0 whitespace-nowrap">
          👥 {presenceUsers.length}명 접속 중
        </span>
        {presenceUsers.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto min-w-0 flex-1">
            {presenceUsers.map((user, i) => (
              <span
                key={i}
                className="text-[9px] bg-white border border-[#d4cfc4] px-1.5 py-0.5 shrink-0 text-[#4a4035] leading-none"
              >
                {user.nickname}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── 좌우 분할 채팅 ── */}
      <div className="flex-1 flex border border-[#d4cfc4] overflow-hidden min-h-0">

        {/* 찬성 컬럼 */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-[#d4cfc4]">
          {/* 컬럼 헤더 */}
          <div className="bg-[#4d9ab5] text-white px-3 py-2 text-[11px] font-black tracking-widest shrink-0 flex items-center justify-between">
            <span>▲ 찬성</span>
            <span className="font-normal opacity-80 text-[9px]">{proCount}건</span>
          </div>
          {/* 메시지 */}
          <div className="flex-1 overflow-y-auto bg-[#f0f7fb]">
            {loading ? (
              <div className="flex items-center justify-center h-20 text-[10px] text-[#a09080]">로딩중...</div>
            ) : msgs.filter(m => m.stance === 'pro').length === 0 ? (
              <div className="flex flex-col items-center justify-center h-24 text-[10px] text-[#b0a080] gap-1">
                <Users size={16} strokeWidth={1} className="opacity-30" />
                첫 찬성 의견을 남겨보세요
              </div>
            ) : (
              <div className="flex flex-col">
                {msgs.filter(m => m.stance === 'pro').map((msg) => {
                  const isMine = msg.fingerprint === fp;
                  const time = new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
                  return (
                    <div
                      key={msg.id}
                      className={`px-2.5 py-2 border-b border-[#c8dce8] last:border-b-0 ${isMine ? 'bg-[#4d9ab5]/8' : ''}`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-[10px] font-bold leading-none truncate max-w-[80px] ${isMine ? 'text-[#1a5c75]' : 'text-[#4a6070]'}`}>
                          {msg.nickname || '익명'}
                        </span>
                        <span className="text-[9px] text-[#b0a080] leading-none shrink-0">{time}</span>
                      </div>
                      <p className={`text-[12px] font-serif leading-snug ${isMine ? 'text-[#1c1712] font-bold' : 'text-[#2d2520]'}`}>
                        {msg.content}
                      </p>
                    </div>
                  );
                })}
                <div ref={proBottomRef} />
              </div>
            )}
          </div>
        </div>

        {/* 반대 컬럼 */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* 컬럼 헤더 */}
          <div className="bg-[#c4788a] text-white px-3 py-2 text-[11px] font-black tracking-widest shrink-0 flex items-center justify-between">
            <span>▼ 반대</span>
            <span className="font-normal opacity-80 text-[9px]">{conCount}건</span>
          </div>
          {/* 메시지 */}
          <div className="flex-1 overflow-y-auto bg-[#fdf0f3]">
            {loading ? (
              <div className="flex items-center justify-center h-20 text-[10px] text-[#a09080]">로딩중...</div>
            ) : msgs.filter(m => m.stance === 'con').length === 0 ? (
              <div className="flex flex-col items-center justify-center h-24 text-[10px] text-[#9098b0] gap-1">
                <Users size={16} strokeWidth={1} className="opacity-30" />
                첫 반대 의견을 남겨보세요
              </div>
            ) : (
              <div className="flex flex-col">
                {msgs.filter(m => m.stance === 'con').map((msg) => {
                  const isMine = msg.fingerprint === fp;
                  const time = new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
                  return (
                    <div
                      key={msg.id}
                      className={`px-2.5 py-2 border-b border-[#e8c8d0] last:border-b-0 ${isMine ? 'bg-[#c4788a]/8' : ''}`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-[10px] font-bold leading-none truncate max-w-[80px] ${isMine ? 'text-[#c4788a]' : 'text-[#7a5060]'}`}>
                          {msg.nickname || '익명'}
                        </span>
                        <span className="text-[9px] text-[#9098b0] leading-none shrink-0">{time}</span>
                      </div>
                      <p className={`text-[12px] font-serif leading-snug ${isMine ? 'text-[#1c1712] font-bold' : 'text-[#2d2520]'}`}>
                        {msg.content}
                      </p>
                    </div>
                  );
                })}
                <div ref={conBottomRef} />
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── 닉네임 / 진영 선택 / 입력창 ── */}
      {nickname === '' ? (
        /* Step 1: 닉네임 입력 */
        <div className="border-x border-b border-[#d4cfc4] bg-white px-4 py-4 shrink-0">
          <p className="text-[11px] font-black tracking-widest text-center text-[#6b6356] mb-3 uppercase">
            닉네임을 입력하세요
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmNickname(); }}
              placeholder="사용할 닉네임 (최대 20자)"
              maxLength={20}
              autoFocus
              className="flex-1 border-b-2 border-[#c8bfa8] focus:border-[#1c1712] bg-transparent px-1 py-2 text-sm font-serif focus:outline-none transition-colors placeholder:text-[#b0a898]"
            />
            <button
              onClick={confirmNickname}
              disabled={!nicknameInput.trim() || confirming}
              className="px-4 py-2 bg-[#1c1712] text-[#fdf8f0] text-xs font-black hover:opacity-80 disabled:opacity-35 transition-opacity shrink-0"
            >
              {confirming ? '확인 중...' : '확인'}
            </button>
          </div>
          <p className="text-[9px] text-[#a09080] text-center mt-2">
            닉네임은 브라우저에 저장되어 다음 방문 시 유지됩니다
          </p>
        </div>
      ) : stance === null ? (
        /* Step 2: 진영 선택 */
        <div className="border-x border-b border-[#d4cfc4] bg-white px-4 py-4 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-black tracking-widest text-[#6b6356] uppercase">
              진영을 선택하세요
            </p>
            <button
              onClick={() => setNickname('')}
              className="text-[9px] text-[#a09080] hover:text-[#1c1712] transition-colors underline underline-offset-2"
            >
              닉네임 변경 ({nickname})
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => chooseStance('pro')}
              className="flex-1 py-3 bg-[#4d9ab5] text-white font-black text-sm hover:opacity-90 transition-opacity"
            >
              ▲ 찬성
            </button>
            <button
              onClick={() => chooseStance('con')}
              className="flex-1 py-3 bg-[#c4788a] text-white font-black text-sm hover:opacity-90 transition-opacity"
            >
              ▼ 반대
            </button>
          </div>
          <p className="text-[9px] text-[#a09080] text-center mt-2">
            입력창 버튼으로 언제든 변경할 수 있습니다
          </p>
        </div>
      ) : (
        /* 진영 선택 완료: 입력창 */
        <div className="border-x border-b border-[#d4cfc4] bg-white flex items-center gap-2 px-3 py-2 shrink-0">
          {/* 진영 드롭업 버튼 */}
          <div ref={stanceMenuRef} className="relative shrink-0">
            <button
              onClick={() => setStanceOpen(v => !v)}
              className={`text-[10px] font-black px-2.5 py-1.5 text-white flex items-center gap-1 transition-opacity hover:opacity-85 ${
                stance === 'pro' ? 'bg-[#4d9ab5]' : 'bg-[#c4788a]'
              }`}
            >
              {stance === 'pro' ? '▲찬성' : '▼반대'}
              <span className={`text-[6px] ml-0.5 transition-transform ${stanceOpen ? 'rotate-180' : ''}`}>▲</span>
            </button>

            {stanceOpen && (
              <div className="absolute bottom-full left-0 mb-1 z-20 border border-[#1c1712] shadow-lg overflow-hidden min-w-[64px]">
                <button
                  onClick={() => { chooseStance('pro'); setStanceOpen(false); }}
                  className={`flex w-full items-center gap-1.5 px-3 py-2 text-[11px] font-black transition-colors ${
                    stance === 'pro'
                      ? 'bg-[#4d9ab5] text-white'
                      : 'bg-white text-[#1a5c75] hover:bg-[#4d9ab5]/15'
                  }`}
                >
                  ▲ 찬성
                  {stance === 'pro' && <span className="text-[7px] opacity-60 ml-auto">●</span>}
                </button>
                <div className="border-t border-[#d4cfc4]" />
                <button
                  onClick={() => { chooseStance('con'); setStanceOpen(false); }}
                  className={`flex w-full items-center gap-1.5 px-3 py-2 text-[11px] font-black transition-colors ${
                    stance === 'con'
                      ? 'bg-[#c4788a] text-white'
                      : 'bg-white text-[#7a3040] hover:bg-[#c4788a]/15'
                  }`}
                >
                  ▼ 반대
                  {stance === 'con' && <span className="text-[7px] opacity-60 ml-auto">●</span>}
                </button>
              </div>
            )}
          </div>

          {/* 텍스트 입력 */}
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            placeholder="의견을 입력하세요... (Enter로 전송)"
            maxLength={300}
            className="flex-1 bg-transparent text-sm font-serif focus:outline-none border-b border-[#c8bfa8] py-1 focus:border-[#1c1712] transition-colors placeholder:text-[#b0a898]"
          />

          {/* 전송 버튼 */}
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || sending}
            className="flex items-center gap-1 px-3 py-2 bg-[#1c1712] text-[#fdf8f0] text-xs font-black hover:opacity-80 disabled:opacity-35 shrink-0 transition-opacity"
          >
            <Send size={11} />
            전송
          </button>
        </div>
      )}
    </div>
  );
}

/* ── 주제 게시글 배너 ── */
const RoomPostBanner = memo(function RoomPostBanner({
  title, content, updatedAt,
}: { title: string; content: string; updatedAt: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-x border-b border-[#d4cfc4] bg-[#fdf8f0] shrink-0">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#1c1712]/5 border-b border-[#d4cfc4]">
        <span className="text-[9px] font-black tracking-widest uppercase text-[#8c8070]">주제 게시글</span>
        <span className="text-[9px] text-[#a09080]">
          {new Date(updatedAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
        </span>
      </div>
      <div className="px-3 pt-2 pb-1">
        <p className="text-[13px] font-black font-serif leading-snug text-[#1c1712]">{title}</p>
      </div>
      <div className={`px-3 pb-2 overflow-hidden transition-all duration-300 ${expanded ? '' : 'max-h-[52px]'}`}>
        <p className="text-[11px] text-[#4a4035] leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-[9px] font-bold text-[#8c8070] hover:text-[#1c1712] py-1 border-t border-[#d4cfc4] transition-colors tracking-widest"
      >
        {expanded ? '▲ 접기' : '▼ 더보기'}
      </button>
    </div>
  );
});
