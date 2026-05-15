import Header from "@/components/Header";
import { User, Bookmark, History } from "lucide-react";

export const metadata = { title: "내정보 - 모두의 투표" };

export default function ProfilePage() {
  return (
    <div className="min-h-screen flex flex-col text-[#1c1712]">
      <Header />
      <main className="flex-1 px-4 py-6 max-w-xl mx-auto w-full">

        {/* 프로필 헤더 */}
        <div className="border-t-4 border-2 border-[#1c1712] bg-[#fdf8f0] flex items-center gap-4 px-4 py-5 mb-4">
          <div className="w-14 h-14 rounded-full border-2 border-[#1c1712] bg-[#d4cfc4] flex items-center justify-center">
            <User size={28} strokeWidth={1.5} className="text-[#6b6356]" />
          </div>
          <div>
            <p className="text-base font-black font-serif">익명 사용자</p>
            <p className="text-xs text-[#8c8070] mt-0.5">로그인 기능 준비 중</p>
          </div>
        </div>

        {/* 스크랩 */}
        <section className="border-2 border-[#1c1712] mb-4">
          <div className="bg-[#1c1712] text-[#fdf8f0] px-3 py-2 flex items-center gap-2">
            <Bookmark size={13} />
            <span className="text-xs font-black tracking-widest">스크랩한 투표</span>
          </div>
          <div className="px-4 py-8 text-center">
            <Bookmark size={32} strokeWidth={1} className="mx-auto mb-2 text-[#c8bfa8]" />
            <p className="text-xs text-[#8c8070]">스크랩한 투표가 없습니다.</p>
            <p className="text-[10px] text-[#a8a090] mt-1">준비 중입니다.</p>
          </div>
        </section>

        {/* 참여 내역 */}
        <section className="border-2 border-[#1c1712]">
          <div className="bg-[#1c1712] text-[#fdf8f0] px-3 py-2 flex items-center gap-2">
            <History size={13} />
            <span className="text-xs font-black tracking-widest">참여한 투표</span>
          </div>
          <div className="px-4 py-8 text-center">
            <History size={32} strokeWidth={1} className="mx-auto mb-2 text-[#c8bfa8]" />
            <p className="text-xs text-[#8c8070]">참여한 투표 내역이 없습니다.</p>
            <p className="text-[10px] text-[#a8a090] mt-1">준비 중입니다.</p>
          </div>
        </section>

      </main>
    </div>
  );
}
