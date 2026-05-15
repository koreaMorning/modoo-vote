import Header from "@/components/Header";
import { Search } from "lucide-react";

export const metadata = { title: "검색 - 모두의 투표" };

export default function SearchPage() {
  return (
    <div className="min-h-screen flex flex-col text-[#1c1712]">
      <Header />
      <main className="flex-1 flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-xl">
          <div className="border-t-4 border-2 border-[#1c1712] flex items-center gap-2 px-3 py-2 bg-[#F0EDE6]">
            <Search size={18} className="text-[#8c8070] shrink-0" />
            <input
              type="text"
              placeholder="투표 제목, 키워드로 검색..."
              className="flex-1 bg-transparent text-sm font-sans focus:outline-none placeholder:text-[#a8a090]"
            />
          </div>
          <p className="text-xs text-[#a8a090] mt-6 text-center font-serif">검색 기능을 준비 중입니다.</p>
        </div>
      </main>
    </div>
  );
}
