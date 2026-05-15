import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import VoteCard from "@/components/VoteCard";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import { Poll } from "@/types";
import { Room } from "@/lib/rooms";
import { Users, Clock } from "lucide-react";

interface Props {
  searchParams: Promise<{ category?: string }>;
}

const CATEGORY_ORDER = [
  "정치",
  "경제",
  "사회",
  "문화",
  "스포츠",
  "국제",
  "기술",
  "환경",
];

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

  const [{ data: rawPolls }, { data: rawRooms }] = await Promise.all([
    query,
    supabase.from("rooms").select("id, title, description, slug, icon, sort_order").order("sort_order", { ascending: true }).limit(8),
  ]);
  const rooms = (rawRooms ?? []) as Pick<Room, "id" | "title" | "description" | "slug" | "icon" | "sort_order">[];

  const polls: Poll[] = (rawPolls ?? []).map((p) => ({
    ...p,
    options: undefined,
    total_votes: (p.options ?? []).reduce(
      (sum: number, o: { votes_count: number }) => sum + o.votes_count,
      0
    ),
  }));

  /* Determine which polls the user has already voted on */
  const cookieStore = await cookies();
  const fingerprint = cookieStore.get("voter_id")?.value ?? null;
  const votedPollIds = new Set<string>();

  if (fingerprint && polls.length > 0) {
    const { data: voteRecords } = await supabase
      .from("votes")
      .select("poll_id")
      .eq("voter_fingerprint", fingerprint)
      .in(
        "poll_id",
        polls.map((p) => p.id)
      );
    (voteRecords ?? []).forEach((r: { poll_id: string }) =>
      votedPollIds.add(r.poll_id)
    );
  }

  /* Most popular poll as front-page hero (only on main, no category filter) */
  const heroPoll: Poll | null = !category
    ? ([...polls].sort((a, b) => (b.total_votes ?? 0) - (a.total_votes ?? 0))[0] ?? null)
    : null;

  /* Breaking news polls */
  const breakingPolls = polls.filter((p) => p.is_breaking);

  /* Group polls by category, excluding the hero */
  const heroId = heroPoll?.id;
  const pollsByCategory = polls.reduce<Record<string, Poll[]>>((acc, poll) => {
    if (heroId && poll.id === heroId) return acc;
    if (!acc[poll.category]) acc[poll.category] = [];
    acc[poll.category].push(poll);
    return acc;
  }, {});

  const orderedCategories = [
    ...CATEGORY_ORDER.filter((c) => pollsByCategory[c]),
    ...Object.keys(pollsByCategory).filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  /* Pick a poll for the sidebar quick-vote widget */
  const sidebarPollId = polls[2]?.id ?? polls[1]?.id ?? polls[0]?.id;

  const categoryColors: Record<string, string> = {
    정치: "bg-[#c9b99a] text-[#3d2b1f]",
    경제: "bg-[#a8b8c4] text-[#1a2e3a]",
    사회: "bg-[#a8c0a8] text-[#1a301a]",
    문화: "bg-[#b8a8c4] text-[#2a1a3a]",
    스포츠: "bg-[#c4b08a] text-[#3a2010]",
    국제: "bg-[#a0a8c0] text-[#1a1a3a]",
    기술: "bg-[#90b8b8] text-[#0a2828]",
    환경: "bg-[#98b898] text-[#0a2810]",
  };

  function getDaysLeft(endsAt: string | null): string {
    if (!endsAt) return "상시";
    const diff = Math.ceil((new Date(endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return "종료";
    if (diff === 0) return "오늘 마감";
    return `${diff}일 남음`;
  }

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
            <div className="flex items-center gap-0 overflow-hidden flex-wrap">
              {breakingPolls.map((p, i) => (
                <span key={p.id} className="flex items-center">
                  {i > 0 && <span className="text-red-300 mx-4 shrink-0 text-xs">◆</span>}
                  <Link href={`/votes/${p.id}`} className="text-sm font-bold hover:underline">
                    {p.title}
                  </Link>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

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

        {/* 1면 헤드라인 기사 */}
        {heroPoll && (
          <section className="mb-10">
            <div className="border-t-[6px] border-black flex items-center justify-between py-1.5 border-b-2 border-black">
              <span className="text-[11px] font-black tracking-[0.35em] uppercase">1면 헤드라인</span>
              {heroPoll.is_breaking && (
                <span className="bg-[#c0100a] text-white text-[11px] font-black px-3 py-0.5 tracking-[0.3em]">
                  속 보
                </span>
              )}
            </div>
            <Link href={`/votes/${heroPoll.id}`} className="block group">
              <article className="border border-t-0 border-[#1c1712]/25 px-6 py-8 sm:px-10 sm:py-10 hover:bg-black/[0.02] transition-colors">
                <div className="flex items-center gap-3 mb-6">
                  <span className={`text-sm font-bold px-2.5 py-0.5 ${categoryColors[heroPoll.category] ?? "bg-[#d8ccb0] text-[#3d3326]"}`}>
                    {heroPoll.category}
                  </span>
                  <span className="text-sm text-[#6b6356] flex items-center gap-1.5">
                    <Clock size={13} />
                    {getDaysLeft(heroPoll.ends_at)}
                  </span>
                  {votedPollIds.has(heroPoll.id) && (
                    <span className="text-[11px] font-bold text-[#6b5c30] bg-[#d4c88a] px-2 py-0.5 border border-[#b0a060]">
                      투표 완료
                    </span>
                  )}
                </div>
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.06] font-serif mb-6 group-hover:underline underline-offset-4 decoration-2">
                  {heroPoll.title}
                </h1>
                <hr className="border-t-2 border-[#1c1712] mb-6" />
                {heroPoll.description && (
                  <p className="text-lg leading-relaxed text-[#3d3326] max-w-3xl mb-8">
                    {heroPoll.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-[#6b6356]">
                  <span className="flex items-center gap-2">
                    <Users size={14} />
                    <strong className="text-[#1c1712] text-base">{(heroPoll.total_votes ?? 0).toLocaleString()}명</strong> 참여
                  </span>
                  <span className="text-[#c8bfa8]">·</span>
                  <span className="font-bold text-[#1c1712] underline underline-offset-2">지금 투표하기 →</span>
                </div>
              </article>
            </Link>
          </section>
        )}

        {polls.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <p className="text-2xl font-serif mb-2">진행 중인 투표가 없습니다</p>
            <p className="text-sm">곧 새로운 투표가 등록될 예정입니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
            {/* ── Main content ── */}
            <div className="flex flex-col gap-10">
              {orderedCategories.map((cat) => {
                const catPolls = pollsByCategory[cat];
                const headline = catPolls[0];
                const duos = catPolls.slice(1, 3);
                const mediums = catPolls.slice(3);
                return (
                  <section key={cat}>
                    <div className="border-t-4 border-black mb-0">
                      <span className="text-xs font-bold tracking-widest uppercase bg-black text-white px-2 py-0.5">
                        {cat}
                      </span>
                    </div>
                    <div className="border border-t-0 border-[#1c1712]/25">
                      {/* 헤드라인: 첫 번째 기사 전체 너비 */}
                      <div className={(duos.length > 0 || mediums.length > 0) ? "border-b border-[#1c1712]/25" : ""}>
                        <VoteCard poll={headline} size="headline" voted={votedPollIds.has(headline.id)} />
                      </div>
                      {/* 2단: 두 번째~세 번째 기사 */}
                      {duos.length > 0 && (
                        <div className={`grid gap-0 ${duos.length >= 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}${mediums.length > 0 ? " border-b border-[#1c1712]/25" : ""}`}>
                          {duos.map((poll, i) => (
                            <div key={poll.id} className={i > 0 ? "border-t sm:border-t-0 sm:border-l border-[#1c1712]/25" : ""}>
                              <VoteCard poll={poll} size="duo" voted={votedPollIds.has(poll.id)} />
                            </div>
                          ))}
                        </div>
                      )}
                      {/* 3단: 나머지 기사들 */}
                      {mediums.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-l border-t border-[#1c1712]/25">
                          {mediums.map((poll) => (
                            <div key={poll.id} className="border-r border-b border-[#1c1712]/25">
                              <VoteCard poll={poll} size="medium" voted={votedPollIds.has(poll.id)} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}

              {/* ── 테마 토론방 섹션 ── */}
              <section>
                <div className="border-t-4 border-black mb-4">
                  <span className="text-xs font-bold tracking-widest uppercase bg-black text-white px-2 py-0.5">
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
            </div>

            {/* ── Right sidebar ── */}
            <Sidebar pollId={sidebarPollId} />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
