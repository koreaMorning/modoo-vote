"use client";

import { useState, useTransition } from "react";
import { Option } from "@/types";
import { castVote } from "@/app/votes/[id]/actions";
import { CheckCircle2, Loader2, ThumbsUp, ThumbsDown } from "lucide-react";

interface Props {
  pollId: string;
  options: Option[];
  hasVoted: boolean;
  votedOptionId: string | null;
}

export default function VoteForm({
  pollId,
  options,
  hasVoted: initialHasVoted,
  votedOptionId: initialVotedOptionId,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(initialVotedOptionId);
  const [hasVoted, setHasVoted] = useState(initialHasVoted);
  const [localOptions, setLocalOptions] = useState(options);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleVote() {
    if (!selectedId || hasVoted) return;
    setError(null);
    startTransition(async () => {
      const result = await castVote(pollId, selectedId);
      if (result.success) {
        setHasVoted(true);
        setLocalOptions((prev) =>
          prev.map((o) =>
            o.id === selectedId ? { ...o, votes_count: o.votes_count + 1 } : o
          )
        );
      } else {
        setError(
          result.error === "already_voted"
            ? "이미 투표하셨습니다."
            : "투표 중 오류가 발생했습니다. 다시 시도해 주세요."
        );
      }
    });
  }

  const totalVotes = localOptions.reduce((sum, o) => sum + o.votes_count, 0);
  const isBinary = localOptions.length === 2;

  if (isBinary) {
    const [pro, con] = localOptions;
    const proPct = totalVotes > 0 ? Math.round((pro.votes_count / totalVotes) * 100) : 0;
    const conPct = totalVotes > 0 ? 100 - proPct : 0;

    if (hasVoted) {
      return (
        <div>
          <div className="flex border-2 border-[#1c1712] overflow-hidden mb-4">
            {/* 찬성 side */}
            <div className="flex-1 relative overflow-hidden">
              <div
                className="absolute inset-0 bg-[#b8ddb0]"
                style={{ width: `${proPct}%` }}
              />
              <div className={`relative p-4 ${pro.id === selectedId ? "ring-2 ring-inset ring-[#3a8a30]" : ""}`}>
                <div className="flex items-center gap-1 text-[#1a4018] mb-1">
                  <ThumbsUp size={13} />
                  <span className="text-xs font-bold uppercase tracking-wide">찬성</span>
                  {pro.id === selectedId && <CheckCircle2 size={12} className="ml-auto" />}
                </div>
                <p className="text-sm font-bold font-serif leading-snug">{pro.text}</p>
                <p className="text-2xl font-black mt-2 tabular-nums text-[#1a4018]">{proPct}%</p>
                <p className="text-xs text-[#3a6038]">{pro.votes_count.toLocaleString()}표</p>
              </div>
            </div>

            {/* divider */}
            <div className="w-0.5 bg-[#1c1712]" />

            {/* 반대 side */}
            <div className="flex-1 relative overflow-hidden">
              {/* bar grows from right */}
              <div
                className="absolute inset-0 bg-[#f0c0b4] flex justify-end"
              >
                <div
                  className="h-full bg-[#e8b0a0]"
                  style={{ width: `${conPct}%` }}
                />
              </div>
              <div className={`relative p-4 ${con.id === selectedId ? "ring-2 ring-inset ring-[#8a2020]" : ""}`}>
                <div className="flex items-center gap-1 text-[#4a1010] mb-1">
                  <ThumbsDown size={13} />
                  <span className="text-xs font-bold uppercase tracking-wide">반대</span>
                  {con.id === selectedId && <CheckCircle2 size={12} className="ml-auto" />}
                </div>
                <p className="text-sm font-bold font-serif leading-snug">{con.text}</p>
                <p className="text-2xl font-black mt-2 tabular-nums text-[#4a1010]">{conPct}%</p>
                <p className="text-xs text-[#703030]">{con.votes_count.toLocaleString()}표</p>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-[#8c8070]">
            총 {totalVotes.toLocaleString()}명 참여
          </p>
        </div>
      );
    }

    return (
      <div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => setSelectedId(pro.id)}
            className={`p-4 border-2 text-left transition-all ${
              selectedId === pro.id
                ? "border-[#2a6828] bg-[#a8d8a0] ring-2 ring-[#2a6828]"
                : "border-[#6a9868] bg-[#d8f0d0] hover:border-[#2a6828] hover:bg-[#c0e4b8]"
            }`}
          >
            <div className="flex items-center gap-1 mb-2">
              <ThumbsUp size={14} className="text-[#1a4018]" />
              <span className="text-xs font-bold text-[#1a4018] uppercase tracking-wide">찬성</span>
            </div>
            <p className="text-sm font-bold font-serif leading-snug text-[#1a3018]">{pro.text}</p>
          </button>

          <button
            onClick={() => setSelectedId(con.id)}
            className={`p-4 border-2 text-left transition-all ${
              selectedId === con.id
                ? "border-[#882020] bg-[#e8a898] ring-2 ring-[#882020]"
                : "border-[#b06060] bg-[#f8dcd8] hover:border-[#882020] hover:bg-[#f0ccc8]"
            }`}
          >
            <div className="flex items-center gap-1 mb-2">
              <ThumbsDown size={14} className="text-[#4a1010]" />
              <span className="text-xs font-bold text-[#4a1010] uppercase tracking-wide">반대</span>
            </div>
            <p className="text-sm font-bold font-serif leading-snug text-[#3a1010]">{con.text}</p>
          </button>
        </div>

        <button
          onClick={handleVote}
          disabled={!selectedId || isPending}
          className="w-full py-3 bg-[#1c1712] text-[#f0e5c0] font-bold text-sm hover:bg-[#2e2519] disabled:bg-[#c8bfa8] disabled:text-[#8c8070] disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              투표 중...
            </>
          ) : (
            "투표하기"
          )}
        </button>

        {error && <p className="text-red-600 text-sm text-center mt-2">{error}</p>}
        <p className="text-center text-xs text-[#8c8070] mt-2">
          총 {totalVotes.toLocaleString()}명 참여
        </p>
      </div>
    );
  }

  /* Multi-option (3+) layout — original vertical style */
  return (
    <div className="space-y-3">
      {localOptions.map((option) => {
        const pct =
          totalVotes > 0 ? Math.round((option.votes_count / totalVotes) * 100) : 0;
        const isSelected = selectedId === option.id;
        const isVoted = hasVoted && option.id === selectedId;

        return (
          <div key={option.id}>
            {hasVoted ? (
              <div className="relative">
                <div
                  className={`absolute inset-0 transition-all ${
                    isVoted ? "bg-[#1c1712]" : "bg-[#c8bfa8]"
                  }`}
                  style={{ width: `${pct}%` }}
                />
                <div
                  className={`relative flex justify-between items-center px-4 py-3 border ${
                    isVoted
                      ? "border-[#1c1712] text-white"
                      : "border-[#c0b090] text-[#3d3326]"
                  }`}
                >
                  <span className="font-medium text-sm flex items-center gap-2">
                    {isVoted && <CheckCircle2 size={15} />}
                    {option.text}
                  </span>
                  <span className="text-sm font-bold tabular-nums">{pct}%</span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setSelectedId(option.id)}
                className={`w-full text-left px-4 py-3 border-2 transition-all text-sm font-medium ${
                  isSelected
                    ? "border-[#1c1712] bg-[#1c1712] text-[#f0e5c0]"
                    : "border-[#c0b090] hover:border-[#1c1712] bg-[#f8f0da]"
                }`}
              >
                {option.text}
              </button>
            )}
          </div>
        );
      })}

      {!hasVoted && (
        <button
          onClick={handleVote}
          disabled={!selectedId || isPending}
          className="w-full py-3 bg-[#1c1712] text-[#f0e5c0] font-bold text-sm hover:bg-[#2e2519] disabled:bg-[#c8bfa8] disabled:text-[#8c8070] disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              투표 중...
            </>
          ) : (
            "투표하기"
          )}
        </button>
      )}

      {error && <p className="text-red-600 text-sm text-center">{error}</p>}

      <p className="text-center text-xs text-[#8c8070]">
        총 {totalVotes.toLocaleString()}명 참여
      </p>
    </div>
  );
}
