import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Bookmark } from "lucide-react";

export const metadata = { title: "스크랩 - 모두의 투표" };

export default function ScrapPage() {
  return (
    <div className="min-h-screen flex flex-col text-[#1c1712]">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16">
        <Bookmark size={44} strokeWidth={1} className="mb-4 text-[#8c8070]" />
        <h2 className="text-2xl font-black font-serif mb-2">스크랩</h2>
        <p className="text-sm text-[#8c8070]">관심 있는 투표를 스크랩해서 모아볼 수 있습니다.</p>
        <p className="text-xs text-[#a8a090] mt-1">준비 중입니다.</p>
      </main>
      <Footer />
    </div>
  );
}
