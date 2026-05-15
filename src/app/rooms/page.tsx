import Header from "@/components/Header";
import { MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Room, RoomCategoryWithRooms } from "@/lib/rooms";
import RoomsClient from "./RoomsClient";

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

  /* 방별 찬성/반대 건수 집계 */
  const slugs = (rms ?? []).map((r) => r.slug);
  const stanceCounts: Record<string, { pro: number; con: number }> = {};

  if (slugs.length > 0) {
    const { data: msgs } = await supabase
      .from("chat_messages")
      .select("room_slug, stance")
      .in("room_slug", slugs);

    for (const msg of msgs ?? []) {
      if (!stanceCounts[msg.room_slug]) stanceCounts[msg.room_slug] = { pro: 0, con: 0 };
      if (msg.stance === "pro") stanceCounts[msg.room_slug].pro++;
      else if (msg.stance === "con") stanceCounts[msg.room_slug].con++;
    }
  }

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
          <RoomsClient categories={categories} stanceCounts={stanceCounts} />
        )}
      </main>
    </div>
  );
}
