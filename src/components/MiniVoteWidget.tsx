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

export default function MiniVoteWidget({
  pollId,
  options,
  hasVoted: initialHasVoted,
  votedOptionId: initialVotedOptionId,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(initialVotedOptionId);
  const [hasVoted, setHasVoted] = useState(initialHasVoted);
  const [localOptions, setLocalOptions] = useState(options);
  const [isPending, startTransition] = useTransition();

  const totalVotes = localOptions.reduce((s, o) => s + o.votes_count, 0);

  function handleVote() {
    if (!selectedId || hasVoted) return;
    startTransition(async () => {
      const result = await castVote(pollId, selectedId);
      if (result.success) {
        setHasVoted(true);
        setLocalOptions((prev) =>
          prev.map((o) =>
            o.id === selectedId ? { ...o, votes_count: o.votes_count + 1 } : o
          )
        );
      }
    });
  }

  return (
    <div className="space-y-2">
      {localOptions.map((option) => {
        const pct = totalVotes > 0 ? Math.round((option.votes_count / totalVotes) * 100) : 0;
        const isSelected = selectedId === option.id;

        if (hasVoted) {
          return (
            <div key={option.id} className="relative overflow-hidden">
              <div
                className={`absolute inset-0 ${isSelected ? "bg-[#a09060]" : "bg-[#c8bfa0]"}`}
                style={{ width: `${pct}%` }}
              />
              <div
                className={`relative flex justify-between items-center px-2 py-1.5 border text-xs ${
                  isSelected ? "border-[#6b5c30] font-bold" : "border-[#b0a080]"
                }`}
              >
                <span className="flex items-center gap-1">
                  {isSelected && <CheckCircle2 size={11} />}
                  {option.text}
                </span>
                <span className="tabular-nums font-bold">{pct}%</span>
              </div>
            </div>
          );
        }

        return (
          <button
            key={option.id}
            onClick={() => setSelectedId(option.id)}
            className={`w-full text-left px-2 py-1.5 border text-xs font-medium transition-all ${
              isSelected
                ? "border-[#1c1712] bg-[#1c1712] text-[#f0e5c0]"
                : "border-[#b0a060] bg-[#f0e8cc] hover:border-[#1c1712]"
            }`}
          >
            {option.text}
          </button>
        );
      })}

      {!hasVoted && (
        <button
          onClick={handleVote}
          disabled={!selectedId || isPending}
          className="w-full py-1.5 bg-[#1c1712] text-[#f0e5c0] font-bold text-xs hover:bg-[#2e2519] disabled:bg-[#c8bfa8] disabled:text-[#8c8070] disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
        >
          {isPending ? <Loader2 size={12} className="animate-spin" /> : "투표하기"}
        </button>
      )}

      <p className="text-center text-[10px] text-[#8c8070]">
        총 {totalVotes.toLocaleString()}명 참여
      </p>
    </div>
  );
}
