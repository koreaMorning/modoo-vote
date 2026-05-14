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

  const { data: rawPolls } = await query;

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

  /* Group polls by category */
  const pollsByCategory = polls.reduce<Record<string, Poll[]>>((acc, poll) => {
    if (!acc[poll.category]) acc[poll.category] = [];
    acc[poll.category].push(poll);
    return acc;
  }, {});

  const orderedCategories = [
    ...CATEGORY_ORDER.filter((c) => pollsByCategory[c]),
    ...Object.keys(pollsByCategory).filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  /* Pick a poll for the sidebar quick-vote widget */
  const sidebarPollId = polls[1]?.id ?? polls[0]?.id;

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
            {/* ── Main content ── */}
            <div className="flex flex-col gap-10">
              {orderedCategories.map((cat) => {
                const catPolls = pollsByCategory[cat];
                return (
                  <section key={cat}>
                    <div className="border-t-4 border-black mb-4">
                      <span className="text-xs font-bold tracking-widest uppercase bg-black text-white px-2 py-0.5">
                        {cat}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {catPolls.map((poll) => (
                        <VoteCard
                          key={poll.id}
                          poll={poll}
                          size="medium"
                          voted={votedPollIds.has(poll.id)}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
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
