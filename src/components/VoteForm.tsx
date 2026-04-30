"use client";

import { useState, useTransition } from "react";
import { Option } from "@/types";
import { castVote } from "@/app/votes/[id]/actions";
import { CheckCircle2, Loader2 } from "lucide-react";

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
  const [selectedId, setSelectedId] = useState<string | null>(
    initialVotedOptionId
  );
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
            o.id === selectedId
              ? { ...o, votes_count: o.votes_count + 1 }
              : o
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

  return (
    <div className="space-y-3">
      {localOptions.map((option) => {
        const pct =
          totalVotes > 0
            ? Math.round((option.votes_count / totalVotes) * 100)
            : 0;
        const isSelected = selectedId === option.id;
        const isVoted = hasVoted && option.id === selectedId;

        return (
          <div key={option.id}>
            {hasVoted ? (
              <div className="relative">
                <div
                  className={`absolute inset-0 rounded transition-all ${
                    isVoted ? "bg-black" : "bg-gray-200"
                  }`}
                  style={{ width: `${pct}%` }}
                />
                <div
                  className={`relative flex justify-between items-center px-4 py-3 border rounded ${
                    isVoted
                      ? "border-black text-white"
                      : "border-gray-300 text-gray-700"
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
                className={`w-full text-left px-4 py-3 border-2 rounded transition-all text-sm font-medium ${
                  isSelected
                    ? "border-black bg-black text-white"
                    : "border-gray-300 hover:border-gray-600 bg-white"
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
          className="w-full py-3 bg-black text-white font-bold text-sm rounded hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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

      <p className="text-center text-xs text-gray-400">
        총 {totalVotes.toLocaleString()}명 참여
      </p>
    </div>
  );
}
