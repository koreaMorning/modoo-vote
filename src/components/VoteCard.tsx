import Link from "next/link";
import { Poll } from "@/types";
import { Clock, Users, CheckCheck, Eye, PlayCircle } from "lucide-react";

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
  국제: "bg-[#a0a8c0] text-[#1a1a3a]",
  문화: "bg-[#b8a8c4] text-[#2a1a3a]",
  스포츠: "bg-[#c4b08a] text-[#3a2010]",
  연예: "bg-[#c8a0b4] text-[#3a1028]",
};

export default function VoteCard({ poll, size = "medium", voted = false }: Props) {
  const daysLeft = getDaysLeft(poll.ends_at);
  const totalVotes = poll.total_votes ?? 0;
  const catColor = categoryColors[poll.category] ?? "bg-[#d8ccb0] text-[#3d3326]";
  const isBreaking = poll.is_breaking ?? false;

  /* ── 헤드라인 (섹션 최상단 전체 너비) ── */
  if (size === "headline") {
    return (
      <Link href={`/votes/${poll.id}`} className="block group">
        <article className="p-6 transition-colors hover:bg-black/[0.02]">
          {/* 부제/메타 — 고딕체 */}
          <div className="flex items-center gap-2 mb-3 font-sans flex-wrap">
            {isBreaking && (
              <span className="text-[10px] font-black bg-[#c0100a] text-white px-2 py-0.5 tracking-widest">
                속보
              </span>
            )}
            {poll.youtube_url && (
              <span className="flex items-center gap-0.5 text-[10px] font-black bg-[#1a5c75] text-white px-1.5 py-0.5 tracking-wide">
                <PlayCircle size={10} />
                영상
              </span>
            )}
            <span className={`text-[11px] font-bold px-2 py-0.5 ${catColor}`}>
              {poll.category}
            </span>
            <span className="text-[11px] text-[#6b6356] flex items-center gap-1">
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
          {/* 헤드라인 — 명조 900 */}
          <h2 className="text-[1.75rem] md:text-[2.1rem] font-black leading-[1.18] font-serif group-hover:underline underline-offset-4 decoration-2 mb-3 pb-3 border-b border-[#c8bfa8]">
            {poll.title}
          </h2>
          {/* 본문 — 명조 regular */}
          {poll.description && (
            <p className="text-[13px] font-serif font-normal leading-[1.85] mb-4 text-[#3d3326] line-clamp-3">
              {poll.description}
            </p>
          )}
          {/* 참여/조회 정보 — 고딕 */}
          <div className="flex items-center gap-1 text-[11px] text-[#8c8070] font-sans">
            <Users size={11} />
            <span>{totalVotes.toLocaleString()}명 참여</span>
            {(poll.view_count ?? 0) > 0 && (
              <>
                <span className="mx-1 text-[#c8bfa8]">·</span>
                <Eye size={11} />
                <span>{(poll.view_count ?? 0).toLocaleString()}회</span>
              </>
            )}
            <span className="mx-1.5 text-[#c8bfa8]">·</span>
            <span className="font-bold text-[#1c1712] underline underline-offset-2">투표하러 가기 →</span>
          </div>
        </article>
      </Link>
    );
  }

  /* ── 2단 중간 기사 ── */
  if (size === "duo") {
    return (
      <Link href={`/votes/${poll.id}`} className="block group h-full">
        <article className="p-5 h-full transition-colors hover:bg-black/[0.02]">
          {/* 부제/메타 — 고딕 */}
          <div className="flex items-center gap-1.5 mb-2.5 font-sans flex-wrap">
            {isBreaking && (
              <span className="text-[9px] font-black bg-[#c0100a] text-white px-1.5 py-0.5 tracking-widest">
                속보
              </span>
            )}
            {poll.youtube_url && (
              <span className="flex items-center gap-0.5 text-[9px] font-black bg-[#1a5c75] text-white px-1 py-0.5">
                <PlayCircle size={9} />
                영상
              </span>
            )}
            <span className={`text-[11px] font-bold px-1.5 py-0.5 ${catColor}`}>
              {poll.category}
            </span>
            <span className="text-[10px] text-[#8c8070] flex items-center gap-0.5">
              <Clock size={10} />
              {daysLeft}
            </span>
            {voted && <CheckCheck size={10} className="text-[#6b5c30]" />}
          </div>
          {/* 헤드라인 — 명조 900 */}
          <h3 className="text-[1.15rem] font-black leading-[1.3] font-serif group-hover:underline mb-3 pb-3 border-b border-[#c8bfa8]">
            {poll.title}
          </h3>
          {/* 본문 — 명조 regular */}
          {poll.description && (
            <p className="text-[12px] font-serif font-normal leading-[1.8] mb-3 line-clamp-4 text-[#3d3326]">
              {poll.description}
            </p>
          )}
          {/* 참여/조회 정보 — 고딕 */}
          <div className="flex items-center gap-1 text-[10px] mt-auto text-[#8c8070] font-sans flex-wrap">
            <Users size={10} />
            <span>{totalVotes.toLocaleString()}명 참여</span>
            {(poll.view_count ?? 0) > 0 && (
              <>
                <span className="mx-1 text-[#c8bfa8]">·</span>
                <Eye size={10} />
                <span>{(poll.view_count ?? 0).toLocaleString()}회</span>
              </>
            )}
          </div>
        </article>
      </Link>
    );
  }

  if (size === "large") {
    return (
      <Link href={`/votes/${poll.id}`} className="block group">
        <article className="border-2 border-[#1c1712] p-6 transition-colors h-full relative hover:bg-black/[0.02]">
          {voted && (
            <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-bold text-[#6b5c30] bg-[#d4c88a] px-1.5 py-0.5 border border-[#b0a060] font-sans">
              <CheckCheck size={10} />
              투표 완료
            </span>
          )}
          <div className="flex items-center gap-2 mb-3 font-sans">
            <span className={`text-xs font-bold px-2 py-0.5 ${catColor}`}>
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
            <p className="text-sm font-serif font-normal leading-relaxed mb-4 line-clamp-3 text-[#3d3326]">
              {poll.description}
            </p>
          )}
          <div className="flex items-center gap-1 text-xs border-t border-[#c8bfa8] pt-3 mt-auto text-[#6b6356] font-sans">
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
        <article className="border-b border-[#c8bfa8] py-3 px-2 transition-colors hover:bg-black/[0.02]">
          <div className="flex items-center gap-1.5 mb-1 font-sans">
            <span className={`text-[11px] font-bold px-1.5 py-0.5 ${catColor}`}>
              {poll.category}
            </span>
            {voted && <CheckCheck size={10} className="text-[#6b5c30]" />}
          </div>
          <h3 className="text-[13px] font-black leading-snug font-serif group-hover:underline line-clamp-2 mb-1">
            {poll.title}
          </h3>
          <div className="flex items-center gap-1 text-[10px] text-[#8c8070] font-sans">
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

  /* ── medium (3단 기본) ── */
  return (
    <Link href={`/votes/${poll.id}`} className="block group h-full">
      <article className="p-4 transition-colors h-full relative hover:bg-black/[0.02]">
        {voted && (
          <span className="absolute top-2 right-2 flex items-center gap-0.5 text-[9px] font-bold text-[#6b5c30] font-sans">
            <CheckCheck size={9} />
            완료
          </span>
        )}
        {/* 부제/메타 — 고딕 */}
        <div className="flex items-center gap-1.5 mb-2 font-sans flex-wrap">
          {isBreaking && (
            <span className="text-[9px] font-black bg-[#c0100a] text-white px-1 py-0.5 tracking-wider">
              속보
            </span>
          )}
          {poll.youtube_url && (
            <span className="flex items-center gap-0.5 text-[9px] font-black bg-[#1a5c75] text-white px-1 py-0.5">
              <PlayCircle size={9} />
              영상
            </span>
          )}
          <span className={`text-[11px] font-bold px-1.5 py-0.5 ${catColor}`}>
            {poll.category}
          </span>
          <span className="text-[10px] flex items-center gap-0.5 text-[#6b6356]">
            <Clock size={10} />
            {daysLeft}
          </span>
        </div>
        {/* 기사 제목 — 명조 900 */}
        <h2 className="text-[0.95rem] font-black leading-snug font-serif group-hover:underline mb-2 line-clamp-3">
          {poll.title}
        </h2>
        {/* 본문 — 명조 regular */}
        {poll.description && (
          <p className="text-[11px] font-serif font-normal line-clamp-2 mb-3 leading-[1.75] text-[#3d3326]">
            {poll.description}
          </p>
        )}
        {/* 참여/조회 정보 — 고딕 */}
        <div className="flex items-center gap-1 text-[10px] text-[#8c8070] font-sans flex-wrap">
          <Users size={10} />
          <span>{totalVotes.toLocaleString()}명 참여</span>
          {(poll.view_count ?? 0) > 0 && (
            <>
              <span className="mx-0.5 text-[#c8bfa8]">·</span>
              <Eye size={10} />
              <span>{(poll.view_count ?? 0).toLocaleString()}회</span>
            </>
          )}
        </div>
      </article>
    </Link>
  );
}
