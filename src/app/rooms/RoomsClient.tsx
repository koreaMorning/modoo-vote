'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { RoomCategoryWithRooms } from '@/lib/rooms';

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

  return (
    <div className="space-y-10">
      {categories.map((cat, idx) => (
        <section key={cat.id}>
          {idx > 0 && <div className="border-t-2 border-[#1c1712] mb-10" />}

          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-[11px] font-black tracking-[0.2em] uppercase text-[#8c8070] shrink-0">
              {cat.name}
            </h3>
            <div className="flex-1 h-px bg-[#d4cfc4]" />
          </div>

          {cat.rooms.length === 0 ? (
            <p className="text-xs text-[#a09080] border border-[#d4cfc4] px-4 py-6 text-center">
              아직 등록된 방이 없습니다.
            </p>
          ) : (
            <div className="border-l border-t border-[#d4cfc4]">
              {cat.rooms.map((room) => {
                const presence = presenceCounts[room.slug] ?? 0;
                const counts = stanceCounts[room.slug] ?? { pro: 0, con: 0 };
                return (
                  <Link
                    key={room.id}
                    href={`/rooms/${room.slug}`}
                    className="flex items-start gap-4 border-r border-b border-[#d4cfc4] px-5 py-4 hover:bg-[#1c1712]/4 transition-colors group"
                  >
                    <span className="text-2xl shrink-0 mt-0.5">{room.icon ?? '💬'}</span>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-base font-black font-serif mb-1 group-hover:underline underline-offset-2">
                        {room.title} 토론방
                      </h4>
                      {room.description && (
                        <p className="text-xs text-[#8c8070] leading-relaxed mb-2">{room.description}</p>
                      )}
                      {/* 통계 */}
                      <div className="flex items-center gap-3 text-[11px]">
                        {presence > 0 && (
                          <span className="font-bold text-[#1c1712]">
                            👥 {presence}명 접속 중
                          </span>
                        )}
                        {(counts.pro > 0 || counts.con > 0) && (
                          <>
                            {presence > 0 && <span className="text-[#d4cfc4]">·</span>}
                            <span className="text-[#1a5c75] font-bold">찬성 {counts.pro.toLocaleString()}</span>
                            <span className="text-[#d4cfc4]">·</span>
                            <span className="text-[#c4788a] font-bold">반대 {counts.con.toLocaleString()}</span>
                          </>
                        )}
                      </div>
                      <p className="mt-2 text-[10px] text-[#a09080] font-bold tracking-widest uppercase">
                        입장하기 →
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
