'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Room } from '@/lib/rooms';

const CHAT_FP_KEY  = 'modoo-chat-fp';
const NICKNAME_KEY = 'modoo-chat-nickname';
const stanceKey = (slug: string) => `modoo-room-stance-${slug}`;

function getFingerprint(): string {
  try {
    let fp = localStorage.getItem(CHAT_FP_KEY);
    if (!fp) { fp = crypto.randomUUID(); localStorage.setItem(CHAT_FP_KEY, fp); }
    return fp;
  } catch { return 'anon'; }
}
function getSavedStance(slug: string): 'pro' | 'con' | null {
  try { const v = localStorage.getItem(stanceKey(slug)); return v === 'pro' || v === 'con' ? v : null; } catch { return null; }
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
  const stanceA = room.stance_a ?? '찬성';
  const stanceB = room.stance_b ?? '반대';

  const [msgs, setMsgs]                       = useState<ChatMsg[]>([]);
  const [text, setText]                       = useState('');
  const [stance, setStance]                   = useState<'pro' | 'con' | null>(null);
  const [fp, setFp]                           = useState('');
  const [nickname, setNickname]               = useState('');
  const [nicknameInput, setNicknameInput]     = useState('');
  const [loading, setLoading]                 = useState(true);
  const [sending, setSending]                 = useState(false);
  const [confirming, setConfirming]           = useState(false);
  const [stanceOpen, setStanceOpen]           = useState(false);
  const [presenceUsers, setPresenceUsers]     = useState<{ nickname: string }[]>([]);
  const [articleExpanded, setArticleExpanded] = useState(false);

  const bottomRef     = useRef<HTMLDivElement>(null);
  const stanceMenuRef = useRef<HTMLDivElement>(null);
  const channelRef    = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const supabase      = createClient();

  useEffect(() => {
    if (!stanceOpen) return;
    function onOutside(e: MouseEvent) {
      if (stanceMenuRef.current && !stanceMenuRef.current.contains(e.target as Node))
        setStanceOpen(false);
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
    const myFp = fp || getFingerprint();
    const { data } = await supabase
      .from('chat_messages').select('id')
      .eq('room_slug', room.slug).eq('nickname', name).neq('fingerprint', myFp).limit(1);
    const finalName = data && data.length > 0
      ? `${name}#${Math.floor(Math.random() * 90 + 10)}` : name;
    saveNickname(finalName);
    setNickname(finalName);
    setNicknameInput(finalName);
    setConfirming(false);
  }

  function chooseStance(s: 'pro' | 'con') { saveStance(room.slug, s); setStance(s); }

  useEffect(() => {
    supabase.from('chat_messages').select('*')
      .eq('room_slug', room.slug).order('created_at', { ascending: true }).limit(300)
      .then(({ data }) => { if (data) setMsgs(data as ChatMsg[]); setLoading(false); });
  }, [room.slug]);

  useEffect(() => {
    if (!fp) return;
    const ch = supabase
      .channel(`room-${room.slug}`, { config: { presence: { key: fp } } })
      .on('presence', { event: 'sync' }, () => {
        const state = ch.presenceState<{ nickname: string }>();
        const users = Object.values(state)
          .map((p) => ({ nickname: (p[0] as { nickname: string }).nickname }))
          .filter((u) => !!u.nickname);
        setPresenceUsers(users);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_slug=eq.${room.slug}` },
        (payload) => setMsgs((prev) => [...prev, payload.new as ChatMsg])
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && nickname) await ch.track({ nickname });
      });
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); channelRef.current = null; };
  }, [room.slug, fp]);

  useEffect(() => {
    if (!fp || !nickname || !channelRef.current) return;
    channelRef.current.track({ nickname });
  }, [fp, nickname]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs.length]);

  const handleSubmit = useCallback(async () => {
    const content = text.trim();
    if (!content || !fp || !stance || !nickname || sending) return;
    setSending(true);
    setText('');
    await supabase.from('chat_messages').insert({ room_slug: room.slug, content, stance, fingerprint: fp, nickname });
    setSending(false);
  }, [text, fp, stance, nickname, sending, room.slug]);

  const proCount = msgs.filter((m) => m.stance === 'pro').length;
  const conCount = msgs.filter((m) => m.stance === 'con').length;
  const total    = msgs.length;
  const proRatio = total > 0 ? Math.round((proCount / total) * 100) : 50;

  const youtubeEmbed = (() => {
    if (!room.youtube_url) return null;
    const m = room.youtube_url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? `https://www.youtube.com/embed/${m[1]}` : null;
  })();

  return (
    <div className="flex flex-col pb-24">

      {/* 브레드크럼 */}
      <div className="flex items-center gap-2 py-3 border-b border-[#d4cfc4]">
        <Link href="/rooms" className="text-xs text-[#8c8070] hover:text-[#1c1712] flex items-center gap-1 transition-colors">
          <ArrowLeft size={12} /> 토론방
        </Link>
      </div>

      {/* 제목 */}
      <div className="py-5 border-b-4 border-[#1c1712]">
        <h1 className="text-2xl font-black font-serif leading-tight text-[#1c1712]">{room.title}</h1>
      </div>

      {/* 유튜브 */}
      {youtubeEmbed && (
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            src={youtubeEmbed}
            title="YouTube video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full border-0"
          />
        </div>
      )}

      {/* 기사 내용 (접힘) */}
      {room.post_content && (
        <div className="border-b border-[#d4cfc4]">
          <button
            onClick={() => setArticleExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-[11px] font-black tracking-widest uppercase text-[#6b6356] hover:bg-[#f5f0e8] transition-colors"
          >
            기사 내용
            {articleExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {articleExpanded && (
            <div className="px-4 pb-5 bg-[#faf7f0] border-t border-[#e8e0d0]">
              <p className="text-sm text-[#2d2520] leading-[1.9] whitespace-pre-wrap font-serif pt-4">
                {room.post_content}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 채팅 헤더 */}
      <div className="bg-[#1c1712] text-[#f0e5c0] px-3 py-1.5 flex items-center justify-between">
        <span className="text-[10px] font-black tracking-[0.2em] uppercase">실시간 찬반 토론</span>
        <span className="text-[9px] text-[#c8b890]">👥 {presenceUsers.length}명</span>
      </div>

      {/* 찬반 비율 바 */}
      <div className="bg-[#fdf8f0] px-3 py-2 border-b border-[#d4cfc4]">
        <div className="flex justify-between text-[10px] font-bold mb-1.5">
          <span className="text-[#1a5c75]">▲ {stanceA} {proCount}건 ({proRatio}%)</span>
          <span className="text-[#7a3040]">({100 - proRatio}%) {conCount}건 {stanceB} ▼</span>
        </div>
        <div className="h-1.5 bg-[#e8b8c4] overflow-hidden">
          <div className="h-full bg-[#4d9ab5] transition-all duration-500" style={{ width: `${proRatio}%` }} />
        </div>
      </div>

      {/* 메시지 목록 */}
      <div className="bg-white min-h-[200px]">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-[10px] text-[#a09080]">로딩 중...</div>
        ) : msgs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <p className="text-[11px] text-[#a09080]">첫 번째 의견을 남겨보세요</p>
            <div className="flex gap-3">
              <span className="border border-[#4d9ab5] text-[#4d9ab5] px-2 py-0.5 text-[10px] font-bold">▲ {stanceA}</span>
              <span className="border border-[#c4788a] text-[#c4788a] px-2 py-0.5 text-[10px] font-bold">▼ {stanceB}</span>
            </div>
          </div>
        ) : (
          <div className="py-2">
            {msgs.map((msg) => {
              const isPro  = msg.stance === 'pro';
              const isMine = msg.fingerprint === fp;
              const time   = new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

              if (isPro) {
                return (
                  <div key={msg.id} className="flex justify-start px-3 py-1.5">
                    <div className="flex flex-col items-start max-w-[75%]">
                      <span className="text-[10px] text-[#5a7080] mb-0.5 ml-0.5">{msg.nickname || '익명'}</span>
                      <div className={`px-3 py-2 text-sm leading-relaxed ${isMine ? 'bg-[#4d9ab5] text-white' : 'bg-[#cde9f5] text-[#1a3040]'}`}>
                        {msg.content}
                      </div>
                      <span className="text-[9px] text-[#a0b0b8] mt-0.5 ml-0.5">{time}</span>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div key={msg.id} className="flex justify-end px-3 py-1.5">
                    <div className="flex flex-col items-end max-w-[75%]">
                      <span className="text-[10px] text-[#806070] mb-0.5 mr-0.5">{msg.nickname || '익명'}</span>
                      <div className={`px-3 py-2 text-sm leading-relaxed ${isMine ? 'bg-[#c4788a] text-white' : 'bg-[#fce4ea] text-[#3a1020]'}`}>
                        {msg.content}
                      </div>
                      <span className="text-[9px] text-[#b0a0a8] mt-0.5 mr-0.5">{time}</span>
                    </div>
                  </div>
                );
              }
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* 입력창 (하단 고정) */}
      <div className="sticky bottom-0 z-20 border-t-2 border-[#1c1712] bg-white shadow-[0_-2px_8px_rgba(28,23,18,0.1)]">
        {nickname === '' ? (
          <div className="px-4 py-3">
            <p className="text-[10px] font-black tracking-widest text-[#6b6356] mb-2 uppercase">닉네임을 입력하세요</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') confirmNickname(); }}
                placeholder="사용할 닉네임 (최대 20자)"
                maxLength={20}
                autoFocus
                className="flex-1 border border-[#c8bfa8] bg-[#fdf8f0] px-3 py-2 text-sm focus:outline-none focus:border-[#1c1712] transition-colors"
              />
              <button
                onClick={confirmNickname}
                disabled={!nicknameInput.trim() || confirming}
                className="px-4 py-2 bg-[#1c1712] text-[#fdf8f0] text-xs font-black hover:opacity-80 disabled:opacity-35 transition-opacity shrink-0"
              >
                {confirming ? '확인 중...' : '확인'}
              </button>
            </div>
          </div>
        ) : stance === null ? (
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black tracking-widest text-[#6b6356] uppercase">진영을 선택하세요</p>
              <button
                onClick={() => setNickname('')}
                className="text-[9px] text-[#a09080] hover:text-[#1c1712] transition-colors underline underline-offset-2"
              >
                닉네임 변경 ({nickname})
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => chooseStance('pro')} className="flex-1 py-2.5 bg-[#4d9ab5] text-white font-black text-sm hover:opacity-90 transition-opacity">
                ▲ {stanceA}
              </button>
              <button onClick={() => chooseStance('con')} className="flex-1 py-2.5 bg-[#c4788a] text-white font-black text-sm hover:opacity-90 transition-opacity">
                ▼ {stanceB}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2">
            <div ref={stanceMenuRef} className="relative shrink-0">
              <button
                onClick={() => setStanceOpen((v) => !v)}
                className={`text-[10px] font-black px-2.5 py-2 text-white flex items-center gap-1 hover:opacity-85 transition-opacity ${stance === 'pro' ? 'bg-[#4d9ab5]' : 'bg-[#c4788a]'}`}
              >
                {stance === 'pro' ? `▲ ${stanceA}` : `▼ ${stanceB}`}
                <span className={`text-[6px] ml-0.5 transition-transform ${stanceOpen ? 'rotate-180' : ''}`}>▲</span>
              </button>
              {stanceOpen && (
                <div className="absolute bottom-full left-0 mb-1 z-20 border border-[#1c1712] shadow-lg overflow-hidden">
                  <button
                    onClick={() => { chooseStance('pro'); setStanceOpen(false); }}
                    className={`flex w-full items-center gap-1.5 px-3 py-2 text-[11px] font-black whitespace-nowrap transition-colors ${stance === 'pro' ? 'bg-[#4d9ab5] text-white' : 'bg-white text-[#1a5c75] hover:bg-[#4d9ab5]/15'}`}
                  >
                    ▲ {stanceA} {stance === 'pro' && <span className="text-[7px] opacity-60 ml-auto">●</span>}
                  </button>
                  <div className="border-t border-[#d4cfc4]" />
                  <button
                    onClick={() => { chooseStance('con'); setStanceOpen(false); }}
                    className={`flex w-full items-center gap-1.5 px-3 py-2 text-[11px] font-black whitespace-nowrap transition-colors ${stance === 'con' ? 'bg-[#c4788a] text-white' : 'bg-white text-[#7a3040] hover:bg-[#c4788a]/15'}`}
                  >
                    ▼ {stanceB} {stance === 'con' && <span className="text-[7px] opacity-60 ml-auto">●</span>}
                  </button>
                </div>
              )}
            </div>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              placeholder={`${stance === 'pro' ? stanceA : stanceB} 의견을 입력하세요...`}
              maxLength={300}
              className="flex-1 bg-[#fdf8f0] border border-[#c8bfa8] text-sm px-3 py-2 focus:outline-none focus:border-[#1c1712] transition-colors"
            />
            <button
              onClick={handleSubmit}
              disabled={!text.trim() || sending}
              className="flex items-center gap-1 px-3 py-2 bg-[#1c1712] text-[#fdf8f0] text-xs font-black hover:opacity-80 disabled:opacity-35 shrink-0 transition-opacity"
            >
              <Send size={11} /> 전송
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
