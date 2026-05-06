import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

const platforms = [
  {
    name: "Netflix",
    color: "#E50914",
    labelColor: "#fff",
    shows: [
      { title: "오징어 게임 시즌 3", genre: "서스펜스", date: "2025.06.27", isNew: true },
      { title: "폭싹 속았수다", genre: "드라마", date: "2025.04.02", isNew: false },
      { title: "나는 솔로 특별판", genre: "리얼리티", date: "2025.05.15", isNew: true },
      { title: "닭강정", genre: "액션코미디", date: "2025.03.14", isNew: false },
    ],
  },
  {
    name: "티빙",
    color: "#FF153C",
    labelColor: "#fff",
    shows: [
      { title: "우리들의 블루스 시즌 2", genre: "드라마", date: "2025.06.14", isNew: true },
      { title: "환혼 시즌 3", genre: "판타지", date: "2025.07.05", isNew: true },
      { title: "술꾼도시여자들 시즌 3", genre: "코미디", date: "2025.05.30", isNew: false },
      { title: "이재, 곧 죽습니다 시즌 2", genre: "판타지", date: "2025.08.01", isNew: true },
    ],
  },
  {
    name: "웨이브",
    color: "#0065FF",
    labelColor: "#fff",
    shows: [
      { title: "연모 리마스터", genre: "사극", date: "2025.04.20", isNew: false },
      { title: "조선 정신과 의사 유세풍 시즌 3", genre: "사극드라마", date: "2025.06.07", isNew: true },
      { title: "두 번째 남편", genre: "멜로", date: "2025.05.05", isNew: false },
      { title: "미드나잇 런너 2", genre: "액션", date: "2025.07.12", isNew: true },
    ],
  },
  {
    name: "쿠팡플레이",
    color: "#2A6EE4",
    labelColor: "#fff",
    shows: [
      { title: "SNL 코리아 시즌 6", genre: "예능", date: "2025.05.01", isNew: true },
      { title: "안나 2", genre: "스릴러", date: "2025.06.21", isNew: true },
      { title: "소년시대 시즌 2", genre: "드라마", date: "2025.08.10", isNew: true },
      { title: "내 남편과 결혼해줘 스핀오프", genre: "로맨스", date: "2025.04.28", isNew: false },
    ],
  },
  {
    name: "왓챠",
    color: "#FF0558",
    labelColor: "#fff",
    shows: [
      { title: "페르소나 시즌 3", genre: "앤솔로지", date: "2025.05.22", isNew: true },
      { title: "시맨틱 에러 시즌 2", genre: "BL", date: "2025.07.18", isNew: true },
      { title: "결혼작사 이혼작곡 시즌 4", genre: "드라마", date: "2025.06.03", isNew: false },
      { title: "유미의 세포들 시즌 3", genre: "로맨스", date: "2025.08.25", isNew: true },
    ],
  },
  {
    name: "Disney+",
    color: "#113CCF",
    labelColor: "#fff",
    shows: [
      { title: "무빙 시즌 2", genre: "슈퍼히어로", date: "2025.07.24", isNew: true },
      { title: "카지노 시즌 2", genre: "범죄드라마", date: "2025.09.05", isNew: true },
      { title: "삼식이 삼촌 시즌 2", genre: "드라마", date: "2025.06.30", isNew: false },
      { title: "비질란테 시즌 2", genre: "액션", date: "2025.08.14", isNew: true },
    ],
  },
];

export default function SchedulePage() {
  return (
    <div className="min-h-screen flex flex-col text-[#1c1712]">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {/* Page masthead */}
        <div className="border-t-4 border-black mb-6">
          <div className="flex items-baseline gap-4 pt-2">
            <h2 className="text-3xl font-black font-serif">OTT 편성표</h2>
            <span className="text-xs text-gray-500 tracking-widest uppercase">
              Streaming Schedule 2025
            </span>
          </div>
          <p className="text-xs text-[#6b5c40] mt-1 mb-4">
            넷플릭스 · 티빙 · 웨이브 · 쿠팡플레이 · 왓챠 · 디즈니+ 신작 및 예정작 안내
          </p>
          <div className="border-t border-[#c8bfa8]" />
        </div>

        {/* Platform grids */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {platforms.map((platform) => (
            <section key={platform.name} className="border-2 border-[#1c1712]">
              {/* Platform header */}
              <div
                className="px-3 py-2"
                style={{ backgroundColor: platform.color }}
              >
                <span
                  className="text-sm font-black tracking-widest"
                  style={{ color: platform.labelColor }}
                >
                  {platform.name}
                </span>
              </div>

              {/* Show list */}
              <ul className="divide-y divide-[#c8bfa8]">
                {platform.shows.map((show) => (
                  <li key={show.title} className="px-3 py-2.5 flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold font-serif leading-snug">
                          {show.title}
                        </span>
                        {show.isNew && (
                          <span className="text-[9px] font-black tracking-wider bg-[#1c1712] text-[#f0e5c0] px-1.5 py-0.5 shrink-0">
                            NEW
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-[#8c8070]">{show.genre}</span>
                        <span className="text-[10px] text-[#b0a080]">{show.date}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {/* Back link */}
        <div className="mt-8 pt-4 border-t border-[#c8bfa8]">
          <Link
            href="/"
            className="text-xs text-[#8c8070] hover:text-black underline underline-offset-2"
          >
            &larr; 홈으로 돌아가기
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
