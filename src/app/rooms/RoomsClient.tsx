'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { RoomCategoryWithRooms } from '@/lib/rooms';

const CAT_COLOR: Record<string, string> = {
  정치: '#c9b99a', 경제: '#a8b8c4', 사회: '#a8c0a8', 문화: '#b8a8c4',
  스포츠: '#c4b08a', 국제: '#a0a8c0', 기술: '#90b8b8', 환경: '#98b898', 연예: '#c8a0b4',
};

interface Props {
  categories: RoomCategoryWithRooms[];
  stanceCounts: Record<string, { pro: number; con: number }>;
}

export default function RoomsClient({ categories, stanceCounts }: Props) {
  const supabase = createClient();
  const [presenceCounts, setPresenceCounts] = useState<Record<string, number>>({});
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);

  useEffect(() => {
    const allRooms = categories.flatMap((c) => c.rooms);
    const channels: ReturnType<typeof supabase.channel>[] = [];

    for (const room of allRooms) {
      const slug = room.slug;
      const ch = supabase
        .channel(`room-${slug}`)
        .on('presence', { event: 'sync' }, () => {
          const count = Object.keys(ch.presenceState()).length;
          setPresenceCounts((prev) => ({ ...prev, [slug]: count }));
        })
        .subscribe();
      channels.push(ch);
    }

    channelsRef.current = channels;
    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const populated = categories.filter((c) => c.rooms.length > 0);

  if (populated.length === 0) {
    return (
      <div className="text-center py-16 text-[#a09080] text-sm border-2 border-[#e8e0d0]">
        토론방을 준비 중입니다.
      </div>
    );
  }

  return (
    <div>
      {populated.map((cat, idx) => {
        const accent = CAT_COLOR[cat.name] ?? '#c8bfa8';

        return (
          <section key={cat.id} className={idx > 0 ? 'mt-14' : ''}>

            {/* ── 카테고리 구분선 + 헤더 ── */}
            {idx > 0 && <div className="border-t-4 border-[#1c1712] mb-8" />}

            <div className="mb-5">
              <div className="flex items-end gap-3 mb-3">
                <div className="w-1.5 h-10 shrink-0" style={{ backgroundColor: accent }} />
                <h3 className="text-4xl font-black font-serif tracking-tight leading-none text-[#1c1712]">
                  {cat.name}
                </h3>
                <span className="text-[11px] font-bold tracking-widest uppercase mb-0.5" style={{ color: accent }}>
                  {cat.rooms.length}개 방
                </span>
              </div>
              <div className="border-b-2 border-[#1c1712]" />
            </div>

            {/* ── 방 목록 ── */}
            <div className="border-2 border-[#1c1712] divide-y-2 divide-[#e8e0d0]">
              {cat.rooms.map((room) => {
                const presence = presenceCounts[room.slug] ?? 0;
                const counts = stanceCounts[room.slug] ?? { pro: 0, con: 0 };
                const total = counts.pro + counts.con;
                const proRatio = total > 0 ? Math.round((counts.pro / total) * 100) : 50;

                return (
                  <Link
                    key={room.id}
                    href={`/rooms/${room.slug}`}
                    className="block bg-[#fdf8f0] hover:bg-[#f5f0e8] transition-colors group"
                  >
                    <div className="px-5 pt-4 pb-3">

                      {/* 방 제목 + 접속자 배지 */}
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="text-2xl shrink-0 mt-0.5 leading-none">
                            {room.icon ?? '💬'}
                          </span>
                          <div className="min-w-0">
                            <h4 className="text-lg font-black font-serif leading-tight group-hover:underline underline-offset-2 text-[#1c1712]">
                              {room.title}
                            </h4>
                            {room.description && (
                              <p className="text-xs text-[#8c8070] leading-relaxed mt-0.5 line-clamp-1">
                                {room.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {presence > 0 && (
                          <span className="text-[10px] font-black bg-[#1c1712] text-[#f0e5c0] px-2 py-0.5 shrink-0 whitespace-nowrap">
                            👥 {presence}명 접속 중
                          </span>
                        )}
                      </div>

                      {/* 찬반 비율 바 */}
                      <div className="h-2 bg-[#f0c8d0] overflow-hidden mb-1.5">
                        <div
                          className="h-full bg-[#4d9ab5] transition-all duration-500"
                          style={{ width: `${proRatio}%` }}
                        />
                      </div>

                      {/* 찬반 수치 */}
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-[#1a5c75]">
                          ▲ 찬성 {counts.pro.toLocaleString()}건 ({proRatio}%)
                        </span>
                        <span className="text-[#c4788a]">
                          ({100 - proRatio}%) 반대 {counts.con.toLocaleString()}건 ▼
                        </span>
                      </div>
                    </div>

                    {/* 푸터 */}
                    <div className="border-t border-[#e8e0d0] px-5 py-2 flex items-center justify-between">
                      <span className="text-[10px] font-black tracking-widest uppercase text-[#6b6356] group-hover:text-[#1c1712] transition-colors">
                        토론 참여하기 →
                      </span>
                      {total > 0 && (
                        <span className="text-[10px] text-[#a09080]">
                          총 {total.toLocaleString()}건
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

          </section>
        );
      })}
    </div>
  );
}
