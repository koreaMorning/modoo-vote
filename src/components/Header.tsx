import Link from "next/link";
import { Category } from "@/types";

const categories: Category[] = [
  "정치",
  "경제",
  "사회",
  "문화",
  "스포츠",
  "국제",
  "기술",
  "환경",
];

export default function Header() {
  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <header className="border-b-4 border-black">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center py-1 text-xs border-b border-[#c8bfa8]">
          <span className="text-gray-600">{today}</span>
          <span className="text-gray-600 tracking-widest">
            대한민국 No.1 여론 투표 플랫폼
          </span>
        </div>

        <div className="py-6 text-center border-b-2 border-black">
          <Link href="/" className="inline-block">
            <h1 className="text-6xl font-black tracking-tighter font-serif leading-none select-none">
              모두의 투표
            </h1>
            <p className="text-xs tracking-[0.5em] mt-1 text-gray-500 uppercase">
              The People&apos;s Vote · 국민 여론 투표 신문
            </p>
          </Link>
        </div>

        <nav className="flex justify-center gap-0 py-1 flex-wrap">
          {categories.map((cat, i) => (
            <Link
              key={cat}
              href={`/?category=${encodeURIComponent(cat)}`}
              className={`px-4 py-1 text-sm font-medium hover:bg-black hover:text-white transition-colors border-r border-[#c8bfa8]`}
            >
              {cat}
            </Link>
          ))}
          <Link
            href="/schedule"
            className="px-4 py-1 text-sm font-bold hover:bg-[#1c1712] hover:text-[#f0e5c0] transition-colors text-[#8c3a00] border-l-2 border-[#8c3a00] ml-2"
          >
            OTT 편성표
          </Link>
        </nav>
      </div>
    </header>
  );
}
