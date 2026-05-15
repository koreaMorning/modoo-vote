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
  const [sending, setSending]   = useState(false);
  const [stanceOpen, setStanceOpen] = useState(false);
  const proBottomRef            = useRef<HTMLDivElement>(null);
  const conBottomRef            = useRef<HTMLDivElement>(null);
  const stanceMenuRef           = useRef<HTMLDivElement>(null);
  const supabase                = createClient();

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

  // 새 메시지마다 각 컬럼 맨 아래로 스크롤
  useEffect(() => {
    proBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    conBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
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

      {/* ── 좌우 분할 채팅 ── */}
      <div className="flex-1 flex border border-[#d4cfc4] overflow-hidden min-h-0">

        {/* 찬성 컬럼 */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-[#d4cfc4]">
          {/* 컬럼 헤더 */}
          <div className="bg-[#c4873a] text-white px-3 py-2 text-[11px] font-black tracking-widest shrink-0 flex items-center justify-between">
            <span>▲ 찬성</span>
            <span className="font-normal opacity-80 text-[9px]">{proCount}건</span>
          </div>
          {/* 메시지 */}
          <div className="flex-1 overflow-y-auto bg-[#fdf8f2]">
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
                      className={`px-2.5 py-2 border-b border-[#e8e0d0] last:border-b-0 ${isMine ? 'bg-[#c4873a]/8' : ''}`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[9px] text-[#b0a080] leading-none">{time}</span>
                        {isMine && <span className="text-[8px] text-[#c4873a] font-black leading-none">나</span>}
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
          <div className="bg-[#3a5080] text-white px-3 py-2 text-[11px] font-black tracking-widest shrink-0 flex items-center justify-between">
            <span>▼ 반대</span>
            <span className="font-normal opacity-80 text-[9px]">{conCount}건</span>
          </div>
          {/* 메시지 */}
          <div className="flex-1 overflow-y-auto bg-[#f4f6fb]">
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
                      className={`px-2.5 py-2 border-b border-[#dde2ee] last:border-b-0 ${isMine ? 'bg-[#3a5080]/8' : ''}`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[9px] text-[#9098b0] leading-none">{time}</span>
                        {isMine && <span className="text-[8px] text-[#3a5080] font-black leading-none">나</span>}
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

      {/* ── 진영 선택 or 입력창 ── */}
      {stance === null ? (
        /* 진영 미선택: 선택 화면 */
        <div className="border-x border-b border-[#d4cfc4] bg-white px-4 py-4 shrink-0">
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
                stance === 'pro' ? 'bg-[#c4873a]' : 'bg-[#3a5080]'
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
                      ? 'bg-[#c4873a] text-white'
                      : 'bg-white text-[#8c4a00] hover:bg-[#c4873a]/15'
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
                      ? 'bg-[#3a5080] text-white'
                      : 'bg-white text-[#2a3a5a] hover:bg-[#3a5080]/15'
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
