import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

export const metadata = { title: "특집 테마 - 모두의 투표" };

function dday(endDate: string | null): { label: string; urgent: boolean } {
  if (!endDate) return { label: "상시", urgent: false };
  const diff = Math.ceil(
    (new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (diff < 0) return { label: "종료", urgent: false };
  if (diff === 0) return { label: "오늘 마감", urgent: true };
  if (diff <= 3) return { label: `D-${diff}`, urgent: true };
  return { label: `D-${diff}`, urgent: false };
}

export default async function ThemesPage() {
  const supabase = await createClient();

  const { data: rawThemes } = await supabase
    .from("themes")
    .select("*, theme_polls(count)")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const themes = (rawThemes ?? []).map(
    (t: {
      id: string; title: string; description: string | null;
      end_date: string | null; sort_order: number; created_at: string;
      theme_polls: { count: number }[];
    }) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      end_date: t.end_date,
      poll_count: t.theme_polls?.[0]?.count ?? 0,
    })
  );

  return (
    <div className="min-h-screen flex flex-col text-[#1c1712]">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        {/* 특집면 헤더 */}
        <div className="text-center mb-10">
          <div className="border-t-[6px] border-[#1c1712] pt-4 mb-2">
            <p className="text-[10px] font-black tracking-[0.5em] uppercase text-[#8c8070] mb-1">
              Special Edition
            </p>
            <h1 className="text-5xl font-black font-serif leading-none tracking-tight">
              특집 테마
            </h1>
          </div>
          <div className="border-b-2 border-[#1c1712] pb-4">
            <p className="text-xs tracking-widest text-[#6b6356] mt-2">
              지금 주목해야 할 핵심 이슈를 깊이 있게 다룹니다
            </p>
          </div>
        </div>

        {themes.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-[#c8bfa8]">
            <p className="text-xl font-serif text-[#a09080] mb-2">현재 진행 중인 특집이 없습니다</p>
            <p className="text-xs text-[#c8bfa8]">곧 새로운 특집이 시작될 예정입니다</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 border border-[#1c1712]">
            {themes.map((theme, i) => {
              const { label, urgent } = dday(theme.end_date);
              const col = i % 3;
              return (
                <Link
                  key={theme.id}
                  href={`/themes/${theme.id}`}
                  className={[
                    "group block p-6 hover:bg-[#fdf8f0] transition-colors",
                    col > 0 ? "border-l border-[#1c1712]" : "",
                    i >= 3 ? "border-t border-[#1c1712]" : "",
                  ].join(" ")}
                >
                  {/* D-day 배지 */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-[9px] font-black tracking-[0.4em] uppercase text-[#8c8070]">
                      특집
                    </span>
                    <span
                      className={`text-[11px] font-black px-2 py-0.5 shrink-0 ${
                        urgent
                          ? "bg-[#c0100a] text-white"
                          : label === "종료"
                          ? "bg-[#c8bfa8] text-[#6b6356]"
                          : "bg-[#1c1712] text-white"
                      }`}
                    >
                      {label}
                    </span>
                  </div>

                  {/* 제목 */}
                  <h2 className="text-xl font-black font-serif leading-tight group-hover:underline underline-offset-2 mb-3 pb-3 border-b border-[#c8bfa8]">
                    {theme.title}
                  </h2>

                  {/* 설명 */}
                  {theme.description && (
                    <p className="text-[12px] font-serif leading-relaxed text-[#3d3326] line-clamp-3 mb-4">
                      {theme.description}
                    </p>
                  )}

                  {/* 메타 */}
                  <div className="flex items-center justify-between text-[10px] text-[#8c8070] font-sans">
                    <span>투표 {theme.poll_count}개</span>
                    <span className="font-bold text-[#1c1712] group-hover:underline">
                      특집 보기 →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
