import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import VoteForm from "@/components/VoteForm";
import { ArrowLeft, Clock, Users } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function VotePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const cookieStore = await cookies();
  const fingerprint = cookieStore.get("voter_id")?.value ?? null;

  const { data: poll } = await supabase
    .from("polls")
    .select("*, options(*)")
    .eq("id", id)
    .single();

  if (!poll) notFound();

  const options = (poll.options ?? []).sort(
    (a: { display_order: number }, b: { display_order: number }) =>
      a.display_order - b.display_order
  );

  const totalVotes = options.reduce(
    (sum: number, o: { votes_count: number }) => sum + o.votes_count,
    0
  );

  let hasVoted = false;
  let votedOptionId: string | null = null;

  if (fingerprint) {
    const { data: voteRecord } = await supabase
      .from("votes")
      .select("option_id")
      .eq("poll_id", id)
      .eq("voter_fingerprint", fingerprint)
      .single();

    if (voteRecord) {
      hasVoted = true;
      votedOptionId = voteRecord.option_id;
    }
  }

  const daysLeft = poll.ends_at
    ? Math.ceil(
        (new Date(poll.ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null;

  const createdDate = new Date(poll.created_at).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen flex flex-col bg-white text-black">
      <Header />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-black mb-6 transition-colors"
        >
          <ArrowLeft size={14} />
          전체 투표 목록
        </Link>

        <article>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-bold bg-black text-white px-2 py-1">
              {poll.category}
            </span>
            {!poll.is_active && (
              <span className="text-xs text-red-600 font-bold border border-red-600 px-2 py-0.5">
                종료된 투표
              </span>
            )}
          </div>

          <h1 className="text-3xl font-black leading-tight font-serif mb-4 border-b-2 border-black pb-4">
            {poll.title}
          </h1>

          <div className="flex items-center gap-4 text-xs text-gray-500 mb-6">
            <span>{createdDate}</span>
            <span className="flex items-center gap-1">
              <Users size={12} />
              {totalVotes.toLocaleString()}명 참여
            </span>
            {daysLeft !== null && (
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {daysLeft > 0
                  ? `${daysLeft}일 남음`
                  : daysLeft === 0
                  ? "오늘 마감"
                  : "마감됨"}
              </span>
            )}
          </div>

          {poll.description && (
            <p className="text-base text-gray-700 leading-relaxed mb-8 p-4 bg-gray-50 border-l-4 border-black">
              {poll.description}
            </p>
          )}

          <div className="border-t-2 border-black pt-6">
            <h2 className="text-sm font-bold uppercase tracking-widest mb-4 text-gray-500">
              {hasVoted ? "투표 결과" : "항목을 선택하고 투표해 주세요"}
            </h2>
            <VoteForm
              pollId={poll.id}
              options={options}
              hasVoted={hasVoted}
              votedOptionId={votedOptionId}
            />
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
