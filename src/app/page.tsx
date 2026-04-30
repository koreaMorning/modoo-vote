import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import VoteCard from "@/components/VoteCard";
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

  const polls: Poll[] = (rawPolls ?? []).map((p) => ({
    ...p,
    options: undefined,
    total_votes: (p.options ?? []).reduce(
      (sum: number, o: { votes_count: number }) => sum + o.votes_count,
      0
    ),
  }));

  const [featured, ...rest] = polls;
  const secondary = rest.slice(0, 2);
  const remaining = rest.slice(2);

  return (
    <div className="min-h-screen flex flex-col bg-white text-black">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
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
          <>
            <section className="mb-8">
              <div className="border-t-4 border-black mb-4">
                <span className="text-xs font-bold tracking-widest uppercase bg-black text-white px-2 py-0.5">
                  주요 투표
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  {featured && <VoteCard poll={featured} size="large" />}
                </div>
                <div className="flex flex-col gap-0">
                  {secondary.map((poll) => (
                    <VoteCard key={poll.id} poll={poll} size="small" />
                  ))}
                </div>
              </div>
            </section>

            {remaining.length > 0 && (
              <section>
                <div className="border-t-2 border-black mb-4">
                  <span className="text-xs font-bold tracking-widest uppercase text-gray-500 py-1 inline-block">
                    더 많은 투표
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {remaining.map((poll) => (
                    <VoteCard key={poll.id} poll={poll} size="medium" />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
