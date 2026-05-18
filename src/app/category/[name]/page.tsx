import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import VoteCard from "@/components/VoteCard";
import Link from "next/link";
import { Poll } from "@/types";
import { rankPolls } from "@/lib/ranking";

const VALID_CATEGORIES = [
  "정치", "경제", "사회", "문화", "스포츠", "국제", "기술", "환경", "연예",
];

const categoryColors: Record<string, string> = {
  정치: "#c9b99a", 경제: "#a8b8c4", 사회: "#a8c0a8", 문화: "#b8a8c4",
  스포츠: "#c4b08a", 국제: "#a0a8c0", 기술: "#90b8b8", 환경: "#98b898", 연예: "#c8a0b4",
};

interface Props {
  params: Promise<{ name: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { name } = await params;
  const cat = decodeURIComponent(name);
  return { title: `${cat} - 모두의 투표` };
}

export default async function CategoryPage({ params }: Props) {
  const { name } = await params;
  const cat = decodeURIComponent(name);

  if (!VALID_CATEGORIES.includes(cat)) notFound();

  const supabase = await createClient();
  const now = new Date().toISOString();

  const [{ data: rawPolls }, { data: totalVotersData }] = await Promise.all([
    supabase
      .from("polls")
      .select("*, options(votes_count)")
      .eq("is_active", true)
      .eq("category", cat)
      .or(`is_breaking.eq.true,publish_at.is.null,publish_at.lte.${now}`),
    supabase.rpc("get_total_unique_voters"),
  ]);

  const totalUsers = Number(totalVotersData ?? 0);

  const polls: Poll[] = (rawPolls ?? []).map((p) => ({
    ...p,
    options: undefined,
    total_votes: (p.options ?? []).reduce(
      (sum: number, o: { votes_count: number }) => sum + o.votes_count,
      0
    ),
  }));

  const pollIds = polls.map((p) => p.id);

  const cookieStore = await cookies();
  const fingerprint = cookieStore.get("voter_id")?.value ?? null;

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
  const accent = categoryColors[cat] ?? "#c8bfa8";

  return (
    <div className="min-h-screen flex flex-col text-[#1c1712]">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {/* 헤더 */}
        <div className="mb-8">
          <div
            className="border-t-[6px] mb-0"
            style={{ borderColor: accent }}
          />
          <div className="border-b-2 border-[#1c1712] flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-8 shrink-0" style={{ backgroundColor: accent }} />
              <h1 className="text-3xl font-black font-serif">{cat}</h1>
              <span className="text-sm text-[#8c8070]">
                {rankedPolls.length}개 투표
              </span>
            </div>
            <Link
              href="/"
              className="text-[11px] font-bold text-[#6b6356] hover:text-[#1c1712] transition-colors"
            >
              ← 전체 보기
            </Link>
          </div>
        </div>

        {rankedPolls.length === 0 ? (
          <div className="text-center py-24 text-[#a09080]">
            <p className="text-xl font-serif mb-2">아직 게시글이 없습니다</p>
            <p className="text-sm">곧 새로운 투표가 등록될 예정입니다.</p>
          </div>
        ) : (
          <>
            {/* 1위: 헤드라인 */}
            <div className="border border-[#1c1712]/25 mb-6">
              <VoteCard
                poll={rankedPolls[0]}
                size="headline"
                voted={votedPollIds.has(rankedPolls[0].id)}
              />
            </div>

            {/* 나머지: 3열 그리드 */}
            {rankedPolls.length > 1 && (
              <div className="border border-[#c8bfa8]">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-l border-t border-[#c8bfa8]">
                  {rankedPolls.slice(1).map((poll) => (
                    <div key={poll.id} className="border-r border-b border-[#c8bfa8]">
                      <VoteCard
                        poll={poll}
                        size="medium"
                        voted={votedPollIds.has(poll.id)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
