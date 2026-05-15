'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Room } from '@/lib/rooms';

const CHAT_FP_KEY    = 'modoo-chat-fp';
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

interface ChatMsg {
  id: string;
  room_slug: string;
  content: string;
  stance: 'pro' | 'con';
  fingerprint: string;
  created_at: string;
}

export default function RoomClient({ room }: { room: Room }) {
  const [msgs, setMsgs]       = useState<ChatMsg[]>([]);
  const [text, setText]       = useState('');
  const [stance, setStance]   = useState<'pro' | 'con' | null>(null);
  const [fp, setFp]           = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef             = useRef<HTMLDivElement>(null);
  const supabase              = createClient();

  useEffect(() => {
    setFp(getFingerprint());
    setStance(getSavedStance(room.slug));
  }, [room.slug]);

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

  // Realtime 구독
  useEffect(() => {
    const channel = supabase
      .channel(`room-${room.slug}`)
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
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [room.slug]);

  // 새 메시지마다 맨 아래로 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs.length]);

  const handleSubmit = useCallback(async () => {
    const content = text.trim();
    if (!content || !fp || !stance || sending) return;
    setSending(true);
    setText('');
    await supabase.from('chat_messages').insert({
      room_slug: room.slug,
      content,
      stance,
      fingerprint: fp,
    });
    setSending(false);
  }, [text, fp, stance, sending, room.slug]);

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
          <span className="text-xl leading-none">{room.icon}</span>
          <h1 className="text-lg font-black font-serif leading-none">{room.title}</h1>
          <span className="text-xs text-[#8c8070] hidden sm:block">— {room.description}</span>
        </div>

        {/* 찬반 비율 바 */}
        <div className="pt-2">
          <div className="flex justify-between text-[10px] font-bold mb-1">
            <span className="text-[#8c4a00]">▲ 찬성 {proCount}건 ({proRatio}%)</span>
            <span className="text-[#2a3a5a]">▼ 반대 {conCount}건 ({100 - proRatio}%)</span>
          </div>
          <div className="h-1.5 bg-[#a0a8c0] overflow-hidden rounded-none">
            <div
              className="h-full bg-[#c4873a] transition-all duration-500"
              style={{ width: `${proRatio}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── 채팅 스트림 ── */}
      <div className="flex-1 overflow-y-auto border border-[#d4cfc4] bg-[#faf7f2]">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-xs text-[#8c8070]">
            불러오는 중...
          </div>
        ) : msgs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-xs text-[#a09080] gap-2">
            <Users size={24} strokeWidth={1} className="opacity-40" />
            첫 번째 의견을 남겨보세요!
          </div>
        ) : (
          <div className="flex flex-col">
            {msgs.map((msg, idx) => {
              const isMine  = msg.fingerprint === fp;
              const isPro   = msg.stance === 'pro';
              const time    = new Date(msg.created_at).toLocaleTimeString('ko-KR', {
                hour: '2-digit', minute: '2-digit', hour12: false,
              });
              const prevMsg = msgs[idx - 1];
              const sameMinute =
                prevMsg &&
                new Date(prevMsg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) === time &&
                prevMsg.fingerprint === msg.fingerprint;

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2 px-3 py-1.5 border-b border-[#ede8e0] last:border-b-0 ${
                    isMine ? 'bg-[#f0ede6]/60' : ''
                  }`}
                >
                  {/* 시간 */}
                  <span className="text-[9px] text-[#b0a898] shrink-0 w-8 mt-0.5 leading-none">
                    {sameMinute ? '' : time}
                  </span>

                  {/* 찬반 배지 */}
                  <span
                    className={`shrink-0 text-[9px] font-black px-1 py-0.5 mt-0.5 leading-none ${
                      isPro
                        ? 'bg-[#c4873a]/15 text-[#8c4a00]'
                        : 'bg-[#3a5080]/15 text-[#2a3a5a]'
                    }`}
                  >
                    {isPro ? '▲찬' : '▼반'}
                  </span>

                  {/* 내용 */}
                  <span
                    className={`flex-1 text-[13px] font-serif leading-snug ${
                      isMine ? 'text-[#1c1712] font-bold' : 'text-[#2d2520]'
                    }`}
                  >
                    {msg.content}
                  </span>

                  {/* 본인 표시 */}
                  {isMine && (
                    <span className="shrink-0 text-[8px] text-[#a09080] mt-0.5 leading-none">나</span>
                  )}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── 진영 선택 or 입력창 ── */}
      {stance === null ? (
        /* 진영 미선택: 선택 화면 */
        <div className="border border-t-0 border-[#1c1712] bg-[#fdf8f0] px-4 py-4 shrink-0">
          <p className="text-[11px] font-black tracking-widest text-center text-[#6b6356] mb-3 uppercase">
            먼저 진영을 선택하세요
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => chooseStance('pro')}
              className="flex-1 py-3 bg-[#c4873a] text-white font-black text-sm hover:opacity-90 transition-opacity"
            >
              ▲ 찬성
            </button>
            <button
              onClick={() => chooseStance('con')}
              className="flex-1 py-3 bg-[#3a5080] text-white font-black text-sm hover:opacity-90 transition-opacity"
            >
              ▼ 반대
            </button>
          </div>
          <p className="text-[9px] text-[#a09080] text-center mt-2">
            선택 후 변경할 수 없습니다
          </p>
        </div>
      ) : (
        /* 진영 선택 완료: 입력창 */
        <div className="border border-t-0 border-[#1c1712] bg-[#fdf8f0] flex items-center gap-2 px-3 py-2 shrink-0">
          {/* 고정된 진영 배지 */}
          <span
            className={`shrink-0 text-[10px] font-black px-2 py-1.5 text-white ${
              stance === 'pro' ? 'bg-[#c4873a]' : 'bg-[#3a5080]'
            }`}
          >
            {stance === 'pro' ? '▲찬성' : '▼반대'}
          </span>

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
