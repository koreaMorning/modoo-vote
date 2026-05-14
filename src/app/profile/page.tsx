import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { User } from "lucide-react";

export const metadata = { title: "내정보 - 모두의 투표" };

export default function ProfilePage() {
  return (
    <div className="min-h-screen flex flex-col text-[#1c1712]">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16">
        <User size={44} strokeWidth={1} className="mb-4 text-[#8c8070]" />
        <h2 className="text-2xl font-black font-serif mb-2">내정보</h2>
        <p className="text-sm text-[#8c8070]">나의 투표 내역과 활동 정보를 확인하세요.</p>
        <p className="text-xs text-[#a8a090] mt-1">준비 중입니다.</p>
      </main>
      <Footer />
    </div>
  );
}
