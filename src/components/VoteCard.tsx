import Link from "next/link";
import { Poll } from "@/types";
import { Clock, Users, CheckCheck } from "lucide-react";

interface Props {
  poll: Poll;
  size?: "headline" | "duo" | "large" | "medium" | "small";
  voted?: boolean;
}

function getDaysLeft(endsAt: string | null): string {
  if (!endsAt) return "상시";
  const diff = Math.ceil(
    (new Date(endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (diff < 0) return "종료";
  if (diff === 0) return "오늘 마감";
  return `${diff}일 남음`;
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
};

export default function VoteCard({ poll, size = "medium", voted = false }: Props) {
  const daysLeft = getDaysLeft(poll.ends_at);
  const totalVotes = poll.total_votes ?? 0;
  const catColor = categoryColors[poll.category] ?? "bg-[#d8ccb0] text-[#3d3326]";

  /* ── 헤드라인 (1면 최상단 전체 너비) ── */
  if (size === "headline") {
    return (
      <Link href={`/votes/${poll.id}`} className="block group">
        <article
          className={`p-6 transition-colors ${
            voted
              ? "bg-[#d0cbc0] hover:bg-[#c4bfb4]"
              : "bg-[#f5edd5] hover:bg-[#ede0c0]"
          }`}
        >
          <div className="flex items-center gap-2 mb-4">
            <span className={`text-xs font-bold px-2 py-0.5 ${catColor}`}>
              {poll.category}
            </span>
            <span className="text-xs text-[#6b6356] flex items-center gap-1">
              <Clock size={11} />
              {daysLeft}
            </span>
            {voted && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-[#6b5c30] bg-[#d4c88a] px-1.5 py-0.5 border border-[#b0a060]">
                <CheckCheck size={10} />
                투표 완료
              </span>
            )}
          </div>
          <h2 className="text-4xl font-black leading-tight font-serif group-hover:underline mb-4 pb-4 border-b-2 border-[#1c1712]">
            {poll.title}
          </h2>
          {poll.description && (
            <p className={`text-sm leading-relaxed mb-5 ${voted ? "text-[#5a5040]" : "text-[#6b6356]"}`}>
              {poll.description}
            </p>
          )}
          <div className={`flex items-center gap-1 text-xs ${voted ? "text-[#5a5040]" : "text-[#8c8070]"}`}>
            <Users size={11} />
            <span>{totalVotes.toLocaleString()}명 참여</span>
            <span className="mx-1.5 text-[#c8bfa8]">·</span>
            <span className="font-bold text-[#1c1712] underline underline-offset-2">투표하러 가기 →</span>
          </div>
        </article>
      </Link>
    );
  }

  /* ── 2단 중단 기사 ── */
  if (size === "duo") {
    return (
      <Link href={`/votes/${poll.id}`} className="block group h-full">
        <article
          className={`p-5 h-full transition-colors ${
            voted
              ? "bg-[#d0cbc0] hover:bg-[#c4bfb4]"
              : "bg-[#f5edd5] hover:bg-[#ede0c0]"
          }`}
        >
          <div className="flex items-center gap-1.5 mb-3">
            <span className={`text-xs font-bold px-1.5 py-0.5 ${catColor}`}>
              {poll.category}
            </span>
            <span className="text-[10px] text-[#8c8070] flex items-center gap-0.5">
              <Clock size={10} />
              {daysLeft}
            </span>
            {voted && <CheckCheck size={10} className="text-[#6b5c30]" />}
          </div>
          <h3 className="text-xl font-black leading-snug font-serif group-hover:underline mb-3 pb-3 border-b border-[#c8bfa8]">
            {poll.title}
          </h3>
          {poll.description && (
            <p className={`text-xs leading-relaxed mb-3 line-clamp-4 ${voted ? "text-[#5a5040]" : "text-[#6b6356]"}`}>
              {poll.description}
            </p>
          )}
          <div className={`flex items-center gap-1 text-[10px] mt-auto ${voted ? "text-[#6b5c30]" : "text-[#8c8070]"}`}>
            <Users size={10} />
            <span>{totalVotes.toLocaleString()}명 참여</span>
          </div>
        </article>
      </Link>
    );
  }

  if (size === "large") {
    return (
      <Link href={`/votes/${poll.id}`} className="block group">
        <article
          className={`border-2 p-6 transition-colors h-full relative ${
            voted
              ? "bg-[#d0cbc0] border-[#b0aaa0] hover:bg-[#c4bfb4]"
              : "bg-[#f5edd5] border-[#1c1712] hover:bg-[#ede0c0]"
          }`}
        >
          {voted && (
            <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-bold text-[#6b5c30] bg-[#d4c88a] px-1.5 py-0.5 border border-[#b0a060]">
              <CheckCheck size={10} />
              투표 완료
            </span>
          )}
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${catColor}`}>
              {poll.category}
            </span>
            <span className="text-xs text-[#6b6356] flex items-center gap-1">
              <Clock size={11} />
              {daysLeft}
            </span>
          </div>
          <h2 className="text-2xl font-black leading-tight font-serif group-hover:underline mb-3">
            {poll.title}
          </h2>
          {poll.description && (
            <p className={`text-sm leading-relaxed mb-4 line-clamp-3 ${voted ? "text-[#5a5040]" : "text-[#6b6356]"}`}>
              {poll.description}
            </p>
          )}
          <div className={`flex items-center gap-1 text-xs border-t pt-3 mt-auto ${voted ? "text-[#5a5040] border-[#a09870]" : "text-[#6b6356] border-[#c8bfa8]"}`}>
            <Users size={11} />
            <span>{totalVotes.toLocaleString()}명 참여</span>
          </div>
        </article>
      </Link>
    );
  }

  if (size === "small") {
    return (
      <Link href={`/votes/${poll.id}`} className="block group">
        <article
          className={`border-b py-3 px-2 transition-colors ${
            voted
              ? "border-[#b0aaa0] bg-[#d0cbc0] hover:bg-[#c4bfb4]"
              : "border-[#c8bfa8] hover:bg-[#ede0c0]"
          }`}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${catColor}`}>
              {poll.category}
            </span>
            {voted && <CheckCheck size={10} className="text-[#6b5c30]" />}
          </div>
          <h3
            className={`text-sm font-bold leading-snug font-serif group-hover:underline line-clamp-2 ${
              voted ? "text-[#3d3020]" : ""
            }`}
          >
            {poll.title}
          </h3>
          <div className={`flex items-center gap-1 text-xs mt-1 ${voted ? "text-[#6b5c30]" : "text-[#8c8070]"}`}>
            <Users size={10} />
            <span>{totalVotes.toLocaleString()}명</span>
            <span className="mx-1">·</span>
            <Clock size={10} />
            <span>{daysLeft}</span>
          </div>
        </article>
      </Link>
    );
  }

  /* ── medium (3단 하단) ── */
  return (
    <Link href={`/votes/${poll.id}`} className="block group h-full">
      <article
        className={`p-4 transition-colors h-full relative ${
          voted
            ? "bg-[#d0cbc0] hover:bg-[#c4bfb4]"
            : "bg-[#f5edd5] hover:bg-[#ede0c0]"
        }`}
      >
        {voted && (
          <span className="absolute top-2 right-2 flex items-center gap-0.5 text-[9px] font-bold text-[#6b5c30]">
            <CheckCheck size={9} />
            완료
          </span>
        )}
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs font-bold px-1.5 py-0.5 ${catColor}`}>
            {poll.category}
          </span>
          <span className={`text-[10px] flex items-center gap-0.5 ${voted ? "text-[#5a5040]" : "text-[#6b6356]"}`}>
            <Clock size={10} />
            {daysLeft}
          </span>
        </div>
        <h2
          className={`text-base font-black leading-snug font-serif group-hover:underline mb-2 line-clamp-2 ${
            voted ? "text-[#2e2418]" : ""
          }`}
        >
          {poll.title}
        </h2>
        {poll.description && (
          <p className={`text-xs line-clamp-2 mb-3 leading-relaxed ${voted ? "text-[#5a5040]" : "text-[#6b6356]"}`}>
            {poll.description}
          </p>
        )}
        <div className={`flex items-center gap-1 text-[10px] ${voted ? "text-[#6b5c30]" : "text-[#8c8070]"}`}>
          <Users size={10} />
          <span>{totalVotes.toLocaleString()}명 참여</span>
        </div>
      </article>
    </Link>
  );
}
