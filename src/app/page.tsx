import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import VoteCard from "@/components/VoteCard";
import Sidebar from "@/components/Sidebar";
import { Poll } from "@/types";

interface Props {
  searchParams: Promise<{ category?: string }>;
}

export default async function HomePage({ searchParams }: Props) {
  const { category } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("polls")
    .select("*, options(votes_count)")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  const { data: rawPolls } = await query;

  const allPolls: Poll[] = (rawPolls ?? []).map((p) => ({
    ...p,
    options: undefined,
    total_votes: (p.options ?? []).reduce(
      (sum: number, o: { votes_count: number }) => sum + o.votes_count,
      0
    ),
  }));

  /* 중복 제거 */
  const seen = new Set<string>();
  const polls = allPolls.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  /* 정치 카테고리 우선, 나머지는 최신순 유지 */
  if (!category) {
    polls.sort((a, b) => {
      if (a.category === "정치" && b.category !== "정치") return -1;
      if (a.category !== "정치" && b.category === "정치") return 1;
      return 0;
    });
  }

  /* 투표 여부 확인 */
  const cookieStore = await cookies();
  const fingerprint = cookieStore.get("voter_id")?.value ?? null;
  const votedPollIds = new Set<string>();

  if (fingerprint && polls.length > 0) {
    const { data: voteRecords } = await supabase
      .from("votes")
      .select("poll_id")
      .eq("voter_fingerprint", fingerprint)
      .in("poll_id", polls.map((p) => p.id));
    (voteRecords ?? []).forEach((r: { poll_id: string }) =>
      votedPollIds.add(r.poll_id)
    );
  }

  /* 1면 섹션 분배 */
  const [headline, second, third, ...rest] = polls;
  const duo = [second, third].filter(Boolean);
  const columns = rest;

  const sidebarPollId = duo[0]?.id ?? columns[0]?.id;

  return (
    <div className="min-h-screen flex flex-col text-[#1c1712]">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {category && (
          <div className="flex items-center gap-2 mb-6">
            <span className="text-sm font-bold bg-black text-white px-3 py-1">
              {category}
            </span>
            <a href="/" className="text-sm text-gray-500 hover:text-black">
              전체 보기
            </a>
          </div>
        )}

        {polls.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <p className="text-2xl font-serif mb-2">진행 중인 투표가 없습니다</p>
            <p className="text-sm">곧 새로운 투표가 등록될 예정입니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">

            {/* ── 메인 1면 ── */}
            <div>

              {/* ① 헤드라인 */}
              {headline && (
                <section className="mb-0">
                  <div className="border-t-4 border-[#1c1712] flex items-baseline gap-3 pt-1 pb-1 mb-0">
                    <span className="text-[10px] font-black tracking-[0.35em] uppercase bg-[#1c1712] text-[#f0e5c0] px-2 py-0.5">
                      헤드라인
                    </span>
                    <span className="text-[10px] text-[#8c8070] tracking-widest">
                      오늘의 주요 투표
                    </span>
                  </div>
                  <div className="border-2 border-[#1c1712]">
                    <VoteCard
                      poll={headline}
                      size="headline"
                      voted={votedPollIds.has(headline.id)}
                    />
                  </div>
                </section>
              )}

              {/* ② 2단 중단 */}
              {duo.length > 0 && (
                <section className="mt-5 mb-0">
                  <div className="border-t-2 border-[#1c1712] flex items-baseline gap-3 pt-1 pb-1">
                    <span className="text-[10px] font-black tracking-[0.35em] uppercase text-[#1c1712]">
                      주요 투표
                    </span>
                    <span className="flex-1 border-t border-[#c8bfa8] self-center" />
                  </div>
                  <div className="border-2 border-[#1c1712] grid grid-cols-1 sm:grid-cols-2 divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-[#1c1712]">
                    {duo.map((poll) => (
                      <VoteCard
                        key={poll.id}
                        poll={poll}
                        size="duo"
                        voted={votedPollIds.has(poll.id)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* ③ 3단 하단 */}
              {columns.length > 0 && (
                <section className="mt-5">
                  <div className="border-t-2 border-[#8a8070] flex items-baseline gap-3 pt-1 pb-1">
                    <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#6b6356]">
                      더 많은 투표
                    </span>
                    <span className="flex-1 border-t border-[#c8bfa8] self-center" />
                  </div>
                  <div className="border border-[#8a8070] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#8a8070]">
                    {columns.map((poll) => (
                      <VoteCard
                        key={poll.id}
                        poll={poll}
                        size="medium"
                        voted={votedPollIds.has(poll.id)}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* ── 우측 사이드바 ── */}
            <Sidebar pollId={sidebarPollId} />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
