'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ThumbsUp, Send } from 'lucide-react';
import { Room } from '@/lib/rooms';

interface Opinion {
  id: string;
  content: string;
  stance: 'pro' | 'con';
  likes: number;
  likedByMe: boolean;
  createdAt: string;
}

const SEED: Record<string, Omit<Opinion, 'likedByMe'>[]> = {
  stocks: [
    { id: 's1', content: '삼성전자 지금이 진짜 저점이다. 반도체 사이클 회복은 확실히 온다.', stance: 'pro', likes: 24, createdAt: '오전 9:32' },
    { id: 's2', content: 'HBM 수요 폭발. SK하이닉스 연내 목표가 상향 충분히 가능하다.', stance: 'pro', likes: 17, createdAt: '오전 10:15' },
    { id: 's3', content: '미국 금리 인하 기대감 여전. 성장주 중심 강세장 지속 예상.', stance: 'pro', likes: 9, createdAt: '오전 11:04' },
    { id: 's4', content: 'PER 40배는 버블이다. 실적 뒷받침 없이 오른 주가는 언젠간 무너진다.', stance: 'con', likes: 31, createdAt: '오전 9:41' },
    { id: 's5', content: '중국발 반도체 공급과잉 우려가 현실화되고 있다. 지금은 조심할 때.', stance: 'con', likes: 14, createdAt: '오전 10:57' },
    { id: 's6', content: '미중 무역갈등 재점화. 수출 의존도 높은 국내 주식엔 직격탄 될 것.', stance: 'con', likes: 8, createdAt: '오후 12:03' },
  ],
  realestate: [
    { id: 'r1', content: '강남 불패는 아직 살아있다. 공급 부족 구조적 문제는 해결 안 됐다.', stance: 'pro', likes: 28, createdAt: '오전 10:20' },
    { id: 'r2', content: '금리 하락기에 부동산만한 투자처가 없다. 지금이 매수 기회다.', stance: 'pro', likes: 12, createdAt: '오전 11:45' },
    { id: 'r3', content: '금리가 여전히 높다. 거래량 급감이 이미 신호를 보내고 있다.', stance: 'con', likes: 22, createdAt: '오전 9:58' },
    { id: 'r4', content: '전세사기 여파로 주거 불안 심화. 집값 추가 하락 가능성 충분하다.', stance: 'con', likes: 10, createdAt: '오후 1:12' },
  ],
  crypto: [
    { id: 'c1', content: '비트코인 ETF 승인 이후 기관 자금 유입 본격화됐다. 상승 여력 충분.', stance: 'pro', likes: 35, createdAt: '오전 8:50' },
    { id: 'c2', content: '반감기 효과 + 유동성 확대. 코인 불장의 사이클은 반복된다.', stance: 'pro', likes: 19, createdAt: '오전 10:33' },
    { id: 'c3', content: '각국 규제 강화로 실질적 사용처 여전히 제한적. 투기 수단일 뿐.', stance: 'con', likes: 27, createdAt: '오전 9:15' },
    { id: 'c4', content: '변동성이 너무 크다. 개인 투자자 피해 사례가 계속 나오고 있다.', stance: 'con', likes: 13, createdAt: '오전 11:28' },
  ],
  'iran-war': [
    { id: 'i1', content: '이스라엘-이란 직접 충돌 확대 시 유가 급등. 에너지 안보 위기 현실화.', stance: 'pro', likes: 20, createdAt: '오전 9:05' },
    { id: 'i2', content: '미국의 중동 재개입은 불가피하다. 충돌 확산 막을 억지력이 필요하다.', stance: 'pro', likes: 11, createdAt: '오전 10:40' },
    { id: 'i3', content: '외교적 해결이 우선이다. 군사적 충돌은 민간인 피해만 더 키운다.', stance: 'con', likes: 33, createdAt: '오전 8:45' },
    { id: 'i4', content: '이란 경제 제재 효과 이미 증명됐다. 추가 무력 사용의 명분이 없다.', stance: 'con', likes: 15, createdAt: '오전 11:20' },
  ],
};

function getSeeds(slug: string): Opinion[] {
  return (SEED[slug] ?? []).map((o) => ({ ...o, likedByMe: false }));
}

export default function RoomClient({ room }: { room: Room }) {
  const [opinions, setOpinions] = useState<Opinion[]>(() => getSeeds(room.slug));
  const [text, setText] = useState('');
  const [stance, setStance] = useState<'pro' | 'con'>('pro');

  const proList = opinions.filter((o) => o.stance === 'pro').sort((a, b) => b.likes - a.likes);
  const conList = opinions.filter((o) => o.stance === 'con').sort((a, b) => b.likes - a.likes);
  const total = opinions.length;
  const proRatio = total > 0 ? Math.round((proList.length / total) * 100) : 50;

  function handleSubmit() {
    if (!text.trim()) return;
    const now = new Date();
    const h = now.getHours();
    const m = String(now.getMinutes()).padStart(2, '0');
    const label = `${h < 12 ? '오전' : '오후'} ${h <= 12 ? h : h - 12}:${m}`;
    setOpinions((prev) => [
      { id: Date.now().toString(), content: text.trim(), stance, likes: 0, likedByMe: false, createdAt: label },
      ...prev,
    ]);
    setText('');
  }

  function handleLike(id: string) {
    setOpinions((prev) =>
      prev.map((o) =>
        o.id === id
          ? { ...o, likes: o.likedByMe ? o.likes - 1 : o.likes + 1, likedByMe: !o.likedByMe }
          : o
      )
    );
  }

  return (
    <div>
      {/* Back */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs text-[#8c8070] hover:text-black mb-6 transition-colors font-medium tracking-wide uppercase"
      >
        <ArrowLeft size={13} />
        메인으로
      </Link>

      {/* Room header */}
      <div className="border-t-4 border-black mb-8">
        <div className="py-5 border-b-2 border-black">
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-3xl leading-none">{room.icon}</span>
            <h1 className="text-4xl font-black font-serif leading-tight">{room.title} 토론방</h1>
          </div>
          <p className="text-sm text-[#6b6356]">{room.description}</p>
          <div className="flex items-center gap-2 mt-3 text-[11px] text-[#8c8070] font-medium">
            <span>찬성 {proList.length}건</span>
            <span className="text-[#c8bfa8]">·</span>
            <span>반대 {conList.length}건</span>
            <span className="text-[#c8bfa8]">·</span>
            <span>총 {total}건</span>
          </div>
        </div>
      </div>

      {/* Opinion form */}
      <div className="border-2 border-[#1c1712] p-5 mb-6">
        <div className="text-[10px] font-black tracking-widest uppercase text-[#6b6356] mb-3">
          의견 작성
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(); }}
          placeholder="이 주제에 대한 의견을 자유롭게 작성해 주세요..."
          rows={3}
          className="w-full border border-[#c8bfa8] bg-transparent px-3 py-2 text-sm font-serif leading-relaxed resize-none outline-none focus:border-[#1c1712] transition-colors"
        />
        <div className="flex items-center gap-3 mt-3">
          {/* Stance toggle */}
          <div className="flex border-2 border-[#1c1712] overflow-hidden shrink-0">
            <button
              onClick={() => setStance('pro')}
              className={`px-4 py-2 text-xs font-black tracking-wider transition-colors ${
                stance === 'pro'
                  ? 'bg-[#1c1712] text-[#f0e5c0]'
                  : 'text-[#6b6356] hover:bg-black/5'
              }`}
            >
              ▲ 찬성
            </button>
            <button
              onClick={() => setStance('con')}
              className={`px-4 py-2 text-xs font-black tracking-wider border-l-2 border-[#1c1712] transition-colors ${
                stance === 'con'
                  ? 'bg-[#1c1712] text-[#f0e5c0]'
                  : 'text-[#6b6356] hover:bg-black/5'
              }`}
            >
              ▼ 반대
            </button>
          </div>
          <span className="text-[10px] text-[#a09080] hidden sm:block">Ctrl+Enter로 빠른 등록</span>
          <button
            onClick={handleSubmit}
            disabled={!text.trim()}
            className="ml-auto flex items-center gap-2 px-5 py-2 border-2 border-[#1c1712] bg-[#1c1712] text-[#f0e5c0] text-xs font-black tracking-wider hover:bg-[#3d2b1f] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={12} />
            등록
          </button>
        </div>
      </div>

      {/* Ratio bar */}
      <div className="mb-5">
        <div className="flex justify-between text-[11px] font-bold mb-1.5">
          <span className="text-[#8c4a00]">▲ 찬성 {proList.length}건 ({proRatio}%)</span>
          <span className="text-[#2a3a5a]">▼ 반대 {conList.length}건 ({100 - proRatio}%)</span>
        </div>
        <div className="h-2 w-full bg-[#a0a8c0] overflow-hidden">
          <div
            className="h-full bg-[#c4a870] transition-all duration-500"
            style={{ width: `${proRatio}%` }}
          />
        </div>
      </div>

      {/* Battle arena */}
      <div className="grid grid-cols-2 border-2 border-[#1c1712] divide-x-2 divide-[#1c1712]">
        {/* 찬성 */}
        <div>
          <div className="bg-[#1c1712] text-[#f0e5c0] px-4 py-2.5 text-[11px] font-black tracking-[0.2em] uppercase">
            ▲ 찬 성
          </div>
          <div className="divide-y divide-[#d8d0c4]">
            {proList.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#a09080]">
                첫 번째 찬성 의견을 작성해 주세요
              </div>
            ) : (
              proList.map((op) => (
                <OpinionCard key={op.id} opinion={op} onLike={handleLike} />
              ))
            )}
          </div>
        </div>

        {/* 반대 */}
        <div>
          <div className="bg-[#3a4a5c] text-[#dce8f0] px-4 py-2.5 text-[11px] font-black tracking-[0.2em] uppercase">
            ▼ 반 대
          </div>
          <div className="divide-y divide-[#d8d0c4]">
            {conList.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#a09080]">
                첫 번째 반대 의견을 작성해 주세요
              </div>
            ) : (
              conList.map((op) => (
                <OpinionCard key={op.id} opinion={op} onLike={handleLike} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OpinionCard({
  opinion,
  onLike,
}: {
  opinion: Opinion;
  onLike: (id: string) => void;
}) {
  return (
    <div className="p-4 hover:bg-black/[0.02] transition-colors">
      <p className="text-sm font-serif leading-relaxed text-[#2d2520] mb-3">
        {opinion.content}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#a09080]">{opinion.createdAt}</span>
        <button
          onClick={() => onLike(opinion.id)}
          className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 border transition-colors ${
            opinion.likedByMe
              ? 'border-[#1c1712] bg-[#1c1712] text-[#f0e5c0]'
              : 'border-[#c8bfa8] text-[#6b6356] hover:border-[#1c1712] hover:text-[#1c1712]'
          }`}
        >
          <ThumbsUp size={10} />
          <span className="font-bold">{opinion.likes}</span>
        </button>
      </div>
    </div>
  );
}
