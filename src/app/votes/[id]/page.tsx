import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import VoteForm from "@/components/VoteForm";
import OpinionSection from "@/components/OpinionSection";
import { ArrowLeft, ArrowRight, Clock, Users, Newspaper } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

const categoryColors: Record<string, string> = {
  정치: "bg-[#c9b99a] text-[#3d2b1f]",
  경제: "bg-[#a8b8c4] text-[#1a2e3a]",
  사회: "bg-[#a8c0a8] text-[#1a301a]",
  문화: "bg-[#b8a8c4] text-[#2a1a3a]",
  스포츠: "bg-[#c4b08a] text-[#3a2010]",
  국제: "bg-[#a0a8c0] text-[#1a1a3a]",
  기술: "bg-[#90b8b8] text-[#0a2828]",
  환경: "bg-[#98b898] text-[#0a2810]",
  "주식·테마주": "bg-[#c4a8a8] text-[#3a1a1a]",
};

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

  /* Next poll — same category first, fallback to any other */
  let nextPoll: { id: string; title: string; category: string } | null = null;
  {
    const { data: same } = await supabase
      .from("polls")
      .select("id, title, category")
      .eq("is_active", true)
      .eq("category", poll.category)
      .neq("id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    nextPoll = same;
  }
  if (!nextPoll) {
    const { data: any } = await supabase
      .from("polls")
      .select("id, title, category")
      .eq("is_active", true)
      .neq("id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    nextPoll = any;
  }

  const daysLeft = poll.ends_at
    ? Math.ceil(
        (new Date(poll.ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null;

  const daysLeftLabel =
    daysLeft === null
      ? "상시"
      : daysLeft > 0
      ? `${daysLeft}일 남음`
      : daysLeft === 0
      ? "오늘 마감"
      : "마감됨";

  const createdDate = new Date(poll.created_at).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  /* Split description into paragraphs for 2-column layout */
  const paragraphs = (poll.description ?? "")
    .split(/\n+/)
    .map((s: string) => s.trim())
    .filter(Boolean);
  const leadPara = paragraphs[0] ?? null;
  const bodyParas = paragraphs.slice(1);

  const catColor =
    categoryColors[poll.category] ?? "bg-[#d8ccb0] text-[#3d3326]";

  return (
    <div className="min-h-screen flex flex-col text-[#1c1712]">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-[#8c8070] hover:text-black mb-6 transition-colors font-medium tracking-wide uppercase"
        >
          <ArrowLeft size={13} />
          전체 투표 목록
        </Link>

        <article>
          {/* ── Article header ─────────────────────────────── */}
          <header className="mb-0">
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs font-bold px-2 py-0.5 ${catColor}`}>
                {poll.category}
              </span>
              {!poll.is_active && (
                <span className="text-xs text-red-700 font-bold border border-red-600 px-2 py-0.5">
                  종료된 투표
                </span>
              )}
            </div>

            <h1 className="text-3xl md:text-4xl font-black leading-tight font-serif border-t-4 border-b-4 border-black py-4 mb-0">
              {poll.title}
            </h1>

            {/* Meta bar */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#6b6356] border-b border-[#c8bfa0] py-2">
              <span className="flex items-center gap-1 font-bold text-[#1c1712]">
                <Newspaper size={11} />
                모두의 투표 편집부
              </span>
              <span>{createdDate} 게재</span>
              <span className="flex items-center gap-1">
                <Users size={11} />
                {totalVotes.toLocaleString()}명 참여
              </span>
              {poll.ends_at && (
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  {daysLeftLabel}
                </span>
              )}
            </div>
          </header>

          {/* ── 2-column article body ───────────────────────── */}
          {leadPara && (
            <div className="my-6 pb-6 border-b border-[#c8bfa0]">
              {/* Lead paragraph */}
              <p className="text-[15px] font-serif text-[#2d2520] leading-[1.85] mb-4">
                {leadPara}
              </p>

              {/* Body paragraphs in 2 columns */}
              {bodyParas.length > 0 && (
                <div className="md:columns-2 md:gap-8 md:[column-rule:1px_solid_#c8bfa0] clear-both text-sm font-serif text-[#3d3326] leading-[1.8]">
                  {bodyParas.map((p: string, i: number) => (
                    <p key={i} className="mb-3 break-inside-avoid">
                      {p}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Vote section ────────────────────────────────── */}
          <div className="border-t-2 border-black pt-6 mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest mb-5 text-[#6b6356]">
              {hasVoted ? "투표 결과" : "항목을 선택하고 투표해 주세요"}
            </h2>
            <VoteForm
              pollId={poll.id}
              options={options}
              hasVoted={hasVoted}
              votedOptionId={votedOptionId}
            />
          </div>

          {/* ── Opinions ────────────────────────────────────── */}
          <OpinionSection pollId={poll.id} optionCount={options.length} />
        </article>

        {/* ── Next poll teaser ─────────────────────────────── */}
        {nextPoll && (
          <div className="mt-12 border-t-4 border-black pt-5">
            <span className="text-[10px] font-black tracking-[0.3em] uppercase text-[#8c8070]">
              다음 투표
            </span>
            <Link href={`/votes/${nextPoll.id}`} className="group block mt-3">
              <div className="border-2 border-[#1c1712] p-5 flex items-center justify-between gap-4 hover:bg-[#ede0c0] transition-colors">
                <div className="min-w-0">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 mb-2 inline-block ${
                      categoryColors[nextPoll.category] ??
                      "bg-[#d8ccb0] text-[#3d3326]"
                    }`}
                  >
                    {nextPoll.category}
                  </span>
                  <h2 className="text-lg md:text-xl font-black font-serif leading-snug group-hover:underline truncate">
                    {nextPoll.title}
                  </h2>
                </div>
                <ArrowRight size={22} className="shrink-0 text-[#1c1712]" />
              </div>
            </Link>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
