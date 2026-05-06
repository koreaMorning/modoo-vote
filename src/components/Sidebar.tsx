import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";
import MiniVoteWidget from "./MiniVoteWidget";
import { Option } from "@/types";

interface Props {
  pollId?: string;
}

export default async function Sidebar({ pollId }: Props) {
  const supabase = await createClient();

  let poll: {
    id: string;
    title: string;
    category: string;
    options: Option[];
  } | null = null;
  let hasVoted = false;
  let votedOptionId: string | null = null;

  if (pollId) {
    const { data } = await supabase
      .from("polls")
      .select("id, title, category, options(*)")
      .eq("id", pollId)
      .single();

    if (data) {
      const sorted = ((data.options as Option[]) ?? []).sort(
        (a, b) => a.display_order - b.display_order
      );
      poll = { ...data, options: sorted };

      const cookieStore = await cookies();
      const fingerprint = cookieStore.get("voter_id")?.value ?? null;
      if (fingerprint) {
        const { data: voteRecord } = await supabase
          .from("votes")
          .select("option_id")
          .eq("poll_id", pollId)
          .eq("voter_fingerprint", fingerprint)
          .single();
        if (voteRecord) {
          hasVoted = true;
          votedOptionId = voteRecord.option_id;
        }
      }
    }
  }

  return (
    <aside className="space-y-5">
      {poll && (
        <div className="border-2 border-[#1c1712]">
          <div className="bg-[#1c1712] text-[#f0e5c0] px-3 py-1.5 flex items-center justify-between">
            <span className="text-[10px] font-black tracking-widest uppercase">
              빠른 투표
            </span>
            <span className="text-[10px] opacity-60">{poll.category}</span>
          </div>
          <div className="p-3">
            <h3 className="text-sm font-black font-serif leading-snug mb-3 pb-2 border-b border-[#c8bfa0]">
              {poll.title}
            </h3>
            <MiniVoteWidget
              pollId={poll.id}
              options={poll.options}
              hasVoted={hasVoted}
              votedOptionId={votedOptionId}
            />
            <Link
              href={`/votes/${poll.id}`}
              className="block text-center text-[10px] text-[#8c8070] hover:text-black mt-2 underline underline-offset-2"
            >
              자세히 보기
            </Link>
          </div>
        </div>
      )}

      {/* Ad block 1 */}
      <div className="border-2 border-[#1c1712] p-4 text-center font-serif">
        <p className="text-[9px] tracking-[0.4em] text-[#8c8070] mb-3 uppercase">
          광 고
        </p>
        <div className="border border-[#c8bfa0] p-3 mb-2">
          <p className="text-3xl font-black leading-none mb-1">기아 EV9</p>
          <p className="text-xs leading-relaxed text-[#3d3326]">
            전기차의 새로운 기준
            <br />
            지금 시승 신청하세요
          </p>
          <p className="text-[10px] mt-2 font-bold tracking-widest border-t border-[#c8bfa0] pt-2">
            KIA MOTORS
          </p>
        </div>
        <p className="text-[8px] text-[#a09070]">* 광고 문의: ad@modoo-vote.kr</p>
      </div>

      {/* Ad block 2 */}
      <div className="border border-[#b5ab96] p-3 font-serif">
        <p className="text-[9px] tracking-[0.4em] text-[#8c8070] mb-2 uppercase">
          광 고
        </p>
        <div className="text-center">
          <p className="text-lg font-black">삼성 갤럭시 S25</p>
          <p className="text-[11px] text-[#3d3326] mt-1">
            AI가 바꾸는 일상
          </p>
          <div className="mt-2 py-1 border border-[#1c1712] text-[10px] font-bold">
            지금 구매하기
          </div>
        </div>
      </div>

      {/* Category navigation */}
      <div className="border-t-2 border-black pt-3">
        <p className="text-[10px] font-bold tracking-widest uppercase mb-2">
          분야별 투표
        </p>
        <div className="grid grid-cols-2 gap-1">
          {["정치", "경제", "사회", "문화", "스포츠", "기술"].map((cat) => (
            <Link
              key={cat}
              href={`/?category=${encodeURIComponent(cat)}`}
              className="text-xs py-1 px-2 border border-[#c8bfa0] hover:bg-[#1c1712] hover:text-[#f0e5c0] hover:border-[#1c1712] transition-colors text-center"
            >
              {cat}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
