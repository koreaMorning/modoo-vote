import Header from "@/components/Header";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Room, RoomCategoryWithRooms } from "@/lib/rooms";
import { MessageSquare } from "lucide-react";

export const metadata = { title: "토론방 - 모두의 투표" };

export default async function RoomsPage() {
  const supabase = await createClient();

  const [{ data: cats }, { data: rms }] = await Promise.all([
    supabase.from("room_categories").select("*").order("sort_order", { ascending: true }),
    supabase.from("rooms").select("id, category_id, title, description, slug, icon, sort_order").order("sort_order", { ascending: true }),
  ]);

  const categories: RoomCategoryWithRooms[] = (cats ?? []).map((cat) => ({
    ...cat,
    rooms: (rms ?? []).filter((r) => r.category_id === cat.id) as Room[],
  }));

  return (
    <div className="min-h-screen flex flex-col text-[#1c1712]">
      <Header />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        {/* 헤더 */}
        <div className="border-t-4 border-b-2 border-[#1c1712] mb-8">
          <div className="flex items-center gap-2 py-4">
            <MessageSquare size={20} strokeWidth={1.5} />
            <h2 className="text-2xl font-black font-serif">토론방</h2>
          </div>
          <p className="text-xs text-[#8c8070] pb-3">
            관심 주제에 참여해 실시간으로 의견을 나눠보세요.
          </p>
        </div>

        {categories.length === 0 ? (
          <div className="text-center py-16 text-[#a09080] text-sm">
            토론방을 준비 중입니다.
          </div>
        ) : (
          <div className="space-y-10">
            {categories.map((cat, idx) => (
              <section key={cat.id}>
                {/* 카테고리 구분선 */}
                {idx > 0 && <div className="border-t-2 border-[#1c1712] mb-10" />}

                {/* 카테고리 제목 */}
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-[11px] font-black tracking-[0.2em] uppercase text-[#8c8070] shrink-0">
                    {cat.name}
                  </h3>
                  <div className="flex-1 h-px bg-[#d4cfc4]" />
                </div>

                {/* 방 목록 */}
                {cat.rooms.length === 0 ? (
                  <p className="text-xs text-[#a09080] border border-[#d4cfc4] px-4 py-6 text-center">
                    아직 등록된 방이 없습니다.
                  </p>
                ) : (
                  <div className="border-l border-t border-[#d4cfc4]">
                    {cat.rooms.map((room) => (
                      <Link
                        key={room.id}
                        href={`/rooms/${room.slug}`}
                        className="flex items-start gap-4 border-r border-b border-[#d4cfc4] px-5 py-4 hover:bg-[#1c1712]/4 transition-colors group"
                      >
                        <span className="text-2xl shrink-0 mt-0.5">{room.icon ?? "💬"}</span>
                        <div className="min-w-0">
                          <h4 className="text-base font-black font-serif mb-1 group-hover:underline underline-offset-2">
                            {room.title} 토론방
                          </h4>
                          {room.description && (
                            <p className="text-xs text-[#8c8070] leading-relaxed">{room.description}</p>
                          )}
                          <p className="mt-2 text-[10px] text-[#a09080] font-bold tracking-widest uppercase">
                            입장하기 →
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
