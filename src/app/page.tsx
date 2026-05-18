import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import VoteCard from "@/components/VoteCard";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import { Poll } from "@/types";
import { Room } from "@/lib/rooms";
import { rankPolls } from "@/lib/ranking";

const CATEGORY_ORDER = [
  "정치", "경제", "사회", "문화", "스포츠", "국제", "기술", "환경", "연예",
];

export default async function HomePage() {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [{ data: rawPolls }, { data: rawRooms }, { data: totalVotersData }] =
    await Promise.all([
      supabase
        .from("polls")
        .select("*, options(votes_count)")
        .eq("is_active", true)
        .or(`is_breaking.eq.true,publish_at.is.null,publish_at.lte.${now}`),
      supabase
        .from("rooms")
        .select("id, title, description, slug, icon, sort_order")
        .order("sort_order", { ascending: true })
        .limit(8),
      supabase.rpc("get_total_unique_voters"),
    ]);

  const rooms = (rawRooms ?? []) as Pick<
    Room,
    "id" | "title" | "description" | "slug" | "icon" | "sort_order"
  >[];
  const totalUsers = Number(totalVotersData ?? 0);

  const polls: Poll[] = (rawPolls ?? []).map((p) => ({
    ...p,
    options: undefined,
    total_votes: (p.options ?? []).reduce(
      (sum: number, o: { votes_count: number }) => sum + o.votes_count,
      0
    ),
  }));

  const cookieStore = await cookies();
  const fingerprint = cookieStore.get("voter_id")?.value ?? null;
  const pollIds = polls.map((p) => p.id);

  const [voteRecordsResult, opinionsResult] = await Promise.all([
    fingerprint && pollIds.length > 0
      ? supabase
          .from("votes")
          .select("poll_id")
          .eq("voter_fingerprint", fingerprint)
          .in("poll_id", pollIds)
      : Promise.resolve({ data: null }),
    pollIds.length > 0
      ? supabase.from("opinions").select("poll_id").in("poll_id", pollIds)
      : Promise.resolve({ data: null }),
  ]);

  const votedPollIds = new Set<string>();
  (voteRecordsResult.data ?? []).forEach((r: { poll_id: string }) =>
    votedPollIds.add(r.poll_id)
  );

  const commentCounts: Record<string, number> = {};
  (opinionsResult.data ?? []).forEach((o: { poll_id: string }) => {
    commentCounts[o.poll_id] = (commentCounts[o.poll_id] ?? 0) + 1;
  });

  const rankedPolls = rankPolls(polls, commentCounts, totalUsers);
  const breakingPolls = polls.filter((p) => p.is_breaking);

  /* TOP 5 → 1면 헤드라인 */
  const top5 = rankedPolls.slice(0, 5);
  const top5Ids = new Set(top5.map((p) => p.id));

  /* 카테고리별 상위 3개 (top5 제외) */
  const pollsByCategory: Record<string, Poll[]> = {};
  for (const poll of rankedPolls) {
    if (top5Ids.has(poll.id)) continue;
    if (!pollsByCategory[poll.category]) pollsByCategory[poll.category] = [];
    if (pollsByCategory[poll.category].length < 3)
      pollsByCategory[poll.category].push(poll);
  }

  const orderedCategories = [
    ...CATEGORY_ORDER.filter((c) => (pollsByCategory[c]?.length ?? 0) > 0),
    ...Object.keys(pollsByCategory).filter(
      (c) => !CATEGORY_ORDER.includes(c) && (pollsByCategory[c]?.length ?? 0) > 0
    ),
  ];

  const sidebarPollId = polls[2]?.id ?? polls[1]?.id ?? polls[0]?.id;

  return (
    <div className="min-h-screen flex flex-col text-[#1c1712]">
      <Header />

      {/* 속보 띠 */}
      {breakingPolls.length > 0 && (
        <div className="bg-[#c0100a] text-white border-b-4 border-[#8b0000]">
          <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-4">
            <span className="font-black text-[11px] tracking-[0.35em] bg-white text-[#c0100a] px-2.5 py-1 shrink-0 border-2 border-white">
              속 보
            </span>
            <div className="flex items-center overflow-hidden flex-wrap">
              {breakingPolls.map((p, i) => (
                <span key={p.id} className="flex items-center">
                  {i > 0 && (
                    <span className="text-red-300 mx-4 shrink-0 text-xs">◆</span>
                  )}
                  <Link
                    href={`/votes/${p.id}`}
                    className="text-sm font-bold hover:underline"
                  >
                    {p.title}
                  </Link>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {polls.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <p className="text-2xl font-serif mb-2">진행 중인 투표가 없습니다</p>
            <p className="text-sm">곧 새로운 투표가 등록될 예정입니다.</p>
          </div>
        ) : (
          <>
            {/* ── 1면 헤드라인 (TOP 5) ── */}
            {top5.length > 0 && (
              <section className="mb-10">
                <div className="border-t-[6px] border-[#1c1712] border-b-2 border-b-[#1c1712] flex items-center py-1.5">
                  <span className="text-[11px] font-black tracking-[0.35em] uppercase">
                    1면 헤드라인
                  </span>
                </div>

                <div className="border border-t-0 border-[#1c1712]/25">
                  {/* 1위: 전체 너비 */}
                  <div className={top5.length > 1 ? "border-b border-[#c8bfa8]" : ""}>
                    <VoteCard
                      poll={top5[0]}
                      size="headline"
                      voted={votedPollIds.has(top5[0].id)}
                    />
                  </div>

                  {/* 2~3위: 2단 */}
                  {top5.length > 1 && (
                    <div
                      className={`grid grid-cols-1 sm:grid-cols-2${
                        top5.length > 3 ? " border-b border-[#c8bfa8]" : ""
                      }`}
                    >
                      <div>
                        <VoteCard
                          poll={top5[1]}
                          size="duo"
                          voted={votedPollIds.has(top5[1].id)}
                        />
                      </div>
                      {top5[2] && (
                        <div className="border-t sm:border-t-0 sm:border-l border-[#c8bfa8]">
                          <VoteCard
                            poll={top5[2]}
                            size="duo"
                            voted={votedPollIds.has(top5[2].id)}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* 4~5위: 2단 */}
                  {top5.length > 3 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2">
                      <div>
                        <VoteCard
                          poll={top5[3]}
                          size="duo"
                          voted={votedPollIds.has(top5[3].id)}
                        />
                      </div>
                      {top5[4] && (
                        <div className="border-t sm:border-t-0 sm:border-l border-[#c8bfa8]">
                          <VoteCard
                            poll={top5[4]}
                            size="duo"
                            voted={votedPollIds.has(top5[4].id)}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ── 카테고리별 섹션 + 사이드바 ── */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
              <div className="flex flex-col gap-8">
                {orderedCategories.map((cat) => {
                  const catPolls = pollsByCategory[cat];
                  return (
                    <section key={cat}>
                      {/* 카테고리 헤더 */}
                      <div className="border-t-[3px] border-[#1c1712] flex items-center mb-0">
                        <span className="text-[11px] font-black tracking-[0.3em] uppercase font-sans bg-[#1c1712] text-white px-2.5 py-1 leading-none">
                          {cat}
                        </span>
                        <div className="flex-1 border-b border-[#c8bfa8] self-end" />
                      </div>

                      {/* 카드 3개 */}
                      <div className="border border-t-0 border-[#c8bfa8]">
                        <div className="grid grid-cols-1 sm:grid-cols-3">
                          {catPolls.map((poll, i) => (
                            <div
                              key={poll.id}
                              className={
                                i > 0
                                  ? "border-t sm:border-t-0 sm:border-l border-[#c8bfa8]"
                                  : ""
                              }
                            >
                              <VoteCard
                                poll={poll}
                                size="medium"
                                voted={votedPollIds.has(poll.id)}
                              />
                            </div>
                          ))}
                        </div>

                        {/* 더보기 */}
                        <div className="border-t border-[#c8bfa8] px-4 py-2">
                          <Link
                            href={`/category/${encodeURIComponent(cat)}`}
                            className="text-[11px] font-bold tracking-wide text-[#6b6356] hover:text-[#1c1712] transition-colors"
                          >
                            {cat} 더보기 →
                          </Link>
                        </div>
                      </div>
                    </section>
                  );
                })}

                {/* 테마 토론방 섹션 */}
                {rooms.length > 0 && (
                  <section>
                    <div className="border-t-4 border-[#1c1712] mb-0">
                      <span className="text-xs font-bold tracking-widest uppercase bg-[#1c1712] text-white px-2 py-0.5">
                        테마 토론방
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-2 border-[#1c1712] divide-x-2 divide-[#1c1712]">
                      {rooms.map((room) => (
                        <Link
                          key={room.slug}
                          href={`/rooms/${room.slug}`}
                          className="group block p-4 hover:bg-black/[0.04] transition-colors"
                        >
                          <div className="text-2xl mb-2">{room.icon ?? "💬"}</div>
                          <div className="text-sm font-black font-serif group-hover:underline mb-1">
                            {room.title}
                          </div>
                          <div className="text-[10px] text-[#8c8070] leading-snug line-clamp-2">
                            {room.description}
                          </div>
                          <div className="mt-3 text-[10px] font-bold tracking-wide text-[#1c1712] uppercase">
                            입장하기 →
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {/* 사이드바 */}
              <Sidebar pollId={sidebarPollId} />
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
