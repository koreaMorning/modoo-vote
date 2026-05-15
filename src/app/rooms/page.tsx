import Header from "@/components/Header";
import Link from "next/link";
import { ROOMS } from "@/lib/rooms";
import { MessageSquare } from "lucide-react";

export const metadata = { title: "토론방 - 모두의 투표" };

export default function RoomsPage() {
  return (
    <div className="min-h-screen flex flex-col text-[#1c1712]">
      <Header />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        <div className="border-t-4 border-b-2 border-[#1c1712] mb-6">
          <div className="flex items-center gap-2 py-4">
            <MessageSquare size={20} strokeWidth={1.5} />
            <h2 className="text-2xl font-black font-serif">토론방</h2>
          </div>
          <p className="text-xs text-[#8c8070] pb-3">
            관심 주제에 참여해 실시간으로 의견을 나눠보세요.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-0 border-l border-t border-[#d4cfc4]">
          {ROOMS.map((room) => (
            <Link
              key={room.slug}
              href={`/rooms/${room.slug}`}
              className="border-r border-b border-[#d4cfc4] p-5 hover:bg-[#1c1712]/4 transition-colors group"
            >
              <div className="text-3xl mb-3">{room.icon}</div>
              <h3 className="text-lg font-black font-serif mb-1 group-hover:underline underline-offset-2">
                {room.title} 토론방
              </h3>
              <p className="text-xs text-[#8c8070] leading-relaxed">
                {room.description}
              </p>
              <div className="mt-3 text-[10px] text-[#a09080] font-bold tracking-widest uppercase flex items-center gap-1">
                입장하기 →
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
