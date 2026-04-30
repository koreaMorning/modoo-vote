import Link from "next/link";
import { Poll } from "@/types";
import { Clock, Users } from "lucide-react";

interface Props {
  poll: Poll;
  size?: "large" | "medium" | "small";
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
  정치: "bg-red-100 text-red-800",
  경제: "bg-blue-100 text-blue-800",
  사회: "bg-green-100 text-green-800",
  문화: "bg-purple-100 text-purple-800",
  스포츠: "bg-orange-100 text-orange-800",
  국제: "bg-indigo-100 text-indigo-800",
  기술: "bg-cyan-100 text-cyan-800",
  환경: "bg-emerald-100 text-emerald-800",
};

export default function VoteCard({ poll, size = "medium" }: Props) {
  const daysLeft = getDaysLeft(poll.ends_at);
  const totalVotes = poll.total_votes ?? 0;
  const catColor =
    categoryColors[poll.category] ?? "bg-gray-100 text-gray-800";

  if (size === "large") {
    return (
      <Link href={`/votes/${poll.id}`} className="block group">
        <article className="border-2 border-black p-6 hover:bg-gray-50 transition-colors h-full">
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded ${catColor}`}
            >
              {poll.category}
            </span>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock size={11} />
              {daysLeft}
            </span>
          </div>
          <h2 className="text-2xl font-black leading-tight font-serif group-hover:underline mb-3">
            {poll.title}
          </h2>
          {poll.description && (
            <p className="text-sm text-gray-600 leading-relaxed mb-4 line-clamp-3">
              {poll.description}
            </p>
          )}
          <div className="flex items-center gap-1 text-xs text-gray-500 border-t border-gray-200 pt-3 mt-auto">
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
        <article className="border-b border-gray-200 py-3 hover:bg-gray-50 px-2 transition-colors">
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className={`text-xs font-bold px-1.5 py-0.5 rounded ${catColor}`}
            >
              {poll.category}
            </span>
          </div>
          <h3 className="text-sm font-bold leading-snug font-serif group-hover:underline line-clamp-2">
            {poll.title}
          </h3>
          <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
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

  return (
    <Link href={`/votes/${poll.id}`} className="block group">
      <article className="border border-gray-300 p-4 hover:border-black hover:bg-gray-50 transition-colors h-full">
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded ${catColor}`}
          >
            {poll.category}
          </span>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Clock size={11} />
            {daysLeft}
          </span>
        </div>
        <h2 className="text-base font-black leading-snug font-serif group-hover:underline mb-2 line-clamp-2">
          {poll.title}
        </h2>
        {poll.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-3">
            {poll.description}
          </p>
        )}
        <div className="flex items-center gap-1 text-xs text-gray-400 mt-auto">
          <Users size={11} />
          <span>{totalVotes.toLocaleString()}명 참여</span>
        </div>
      </article>
    </Link>
  );
}
