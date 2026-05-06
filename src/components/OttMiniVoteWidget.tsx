"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const BATTLE = {
  label: "이번 주 OTT 신작 대결",
  a: { platform: "Netflix", title: "오징어 게임 시즌 3" },
  b: { platform: "티빙", title: "우리들의 블루스 시즌 2" },
};

export default function OttMiniVoteWidget() {
  const router = useRouter();
  const [voted, setVoted] = useState<"a" | "b" | null>(null);
  const [counts, setCounts] = useState({ a: 482, b: 318 });

  const total = counts.a + counts.b;
  const pctA = Math.round((counts.a / total) * 100);
  const pctB = 100 - pctA;

  function handleVote(side: "a" | "b") {
    if (voted) {
      router.push("/schedule");
      return;
    }
    setCounts((prev) => ({ ...prev, [side]: prev[side] + 1 }));
    setVoted(side);
  }

  return (
    <div
      className="border-2 border-[#1c1712] cursor-pointer"
      onClick={() => voted && router.push("/schedule")}
    >
      {/* Header */}
      <div className="bg-[#8c3a00] text-[#f5ede0] px-3 py-1.5 flex items-center justify-between">
        <span className="text-[10px] font-black tracking-widest uppercase">
          OTT 신작 대결
        </span>
        <span className="text-[9px] opacity-70">클릭하면 편성표로</span>
      </div>

      <div className="p-3">
        <p className="text-[11px] font-bold font-serif leading-snug mb-3 pb-2 border-b border-[#c8bfa0]">
          {BATTLE.label}
        </p>

        {/* VS layout */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-1 mb-3">
          {/* Side A */}
          <button
            onClick={(e) => { e.stopPropagation(); handleVote("a"); }}
            className={`text-left p-2 border transition-all ${
              voted === "a"
                ? "border-[#8c3a00] bg-[#8c3a00] text-[#f5ede0]"
                : voted === "b"
                ? "border-[#c8bfa0] bg-[#ede7da] opacity-60"
                : "border-[#b0a060] hover:border-[#8c3a00] hover:bg-[#f5ede0]"
            }`}
          >
            <p className="text-[9px] font-bold tracking-wider opacity-70 mb-0.5">
              {BATTLE.a.platform}
            </p>
            <p className="text-[11px] font-black font-serif leading-tight">
              {BATTLE.a.title}
            </p>
          </button>

          {/* VS divider */}
          <div className="flex items-center justify-center px-1">
            <span className="text-[11px] font-black text-[#c8bfa0]">VS</span>
          </div>

          {/* Side B */}
          <button
            onClick={(e) => { e.stopPropagation(); handleVote("b"); }}
            className={`text-left p-2 border transition-all ${
              voted === "b"
                ? "border-[#8c3a00] bg-[#8c3a00] text-[#f5ede0]"
                : voted === "a"
                ? "border-[#c8bfa0] bg-[#ede7da] opacity-60"
                : "border-[#b0a060] hover:border-[#8c3a00] hover:bg-[#f5ede0]"
            }`}
          >
            <p className="text-[9px] font-bold tracking-wider opacity-70 mb-0.5">
              {BATTLE.b.platform}
            </p>
            <p className="text-[11px] font-black font-serif leading-tight">
              {BATTLE.b.title}
            </p>
          </button>
        </div>

        {/* Result bar (shown after voting) */}
        {voted && (
          <div className="space-y-1 mb-2">
            <div className="flex items-center gap-1.5">
              <div className="flex-1 bg-[#e8e0d0] h-2 relative overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-[#8c3a00]"
                  style={{ width: `${pctA}%` }}
                />
              </div>
              <span className="text-[10px] font-bold tabular-nums w-7 text-right">{pctA}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex-1 bg-[#e8e0d0] h-2 relative overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-[#6b5c40]"
                  style={{ width: `${pctB}%` }}
                />
              </div>
              <span className="text-[10px] font-bold tabular-nums w-7 text-right">{pctB}%</span>
            </div>
          </div>
        )}

        <p className="text-center text-[9px] text-[#8c8070]">
          {voted
            ? "편성표에서 더 많은 신작 보기 →"
            : `총 ${total.toLocaleString()}명 참여 · 클릭으로 투표`}
        </p>
      </div>
    </div>
  );
}
