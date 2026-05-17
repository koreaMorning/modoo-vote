import Link from "next/link";
import { Category } from "@/types";
import { getCurrentEdition } from "@/lib/publishing";

const categories: Category[] = [
  "정치",
  "경제",
  "사회",
  "문화",
  "스포츠",
  "국제",
  "기술",
  "환경",
  "연예",
];

export default function Header() {
  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: "Asia/Seoul",
  });

  const openDateMs = Date.UTC(2026, 4, 1); // 2026-05-01 UTC
  const todayMs = Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate()
  );
  const issueNumber = Math.max(1, Math.floor((todayMs - openDateMs) / 86400000) + 1);

  const { edition } = getCurrentEdition();

  return (
    <header className="border-b-4 border-black">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center py-1 text-xs border-b border-[#c8bfa8]">
          <span className="text-gray-600">{today}</span>
          <span className="text-gray-600 tracking-widest">
            대한민국 No.1 여론 투표 플랫폼
          </span>
        </div>

        <div className="py-6 text-center border-b-2 border-black relative">
          <Link href="/" className="inline-block">
            <h1 className="text-6xl font-black tracking-tighter font-serif leading-none select-none">
              모두의 투표
            </h1>
            <p className="text-xs tracking-[0.5em] mt-1 text-gray-500 uppercase">
              The People&apos;s Vote · 국민 여론 투표 신문
            </p>
          </Link>
          <span className="absolute right-0 bottom-2 text-[11px] font-bold tracking-widest text-[#6b6356] border border-[#c8bfa8] px-2 py-0.5">
            제&nbsp;{issueNumber}호&nbsp;·&nbsp;{edition}
          </span>
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
          <Link
            href="/rooms"
            className="px-4 py-1 text-sm font-bold hover:bg-[#1c1712] hover:text-[#fdf8f0] transition-colors text-[#1c1712] border-l-2 border-[#1c1712] ml-1"
          >
            토론방
          </Link>
        </nav>
      </div>
    </header>
  );
}
