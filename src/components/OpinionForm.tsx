"use client";

import { useState, useTransition } from "react";
import { submitOpinion } from "@/app/votes/[id]/actions";
import { Send, Loader2, ThumbsUp, ThumbsDown, MessageCircle } from "lucide-react";

interface Props {
  pollId: string;
}

type Stance = "pro" | "con" | "neutral" | "";

export default function OpinionForm({ pollId }: Props) {
  const [content, setContent] = useState("");
  const [stance, setStance] = useState<Stance>("");
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!content.trim()) return;
    startTransition(async () => {
      const result = await submitOpinion(pollId, content, stance || null);
      if (result.success) {
        setContent("");
        setStance("");
        setSubmitted(true);
      }
    });
  }

  if (submitted) {
    return (
      <div className="text-center py-3 text-sm text-[#2a6828] border border-[#6a9868] bg-[#ecf7e8] font-medium">
        의견이 등록되었습니다. 감사합니다!
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {(
          [
            { key: "pro", label: "찬성", Icon: ThumbsUp },
            { key: "con", label: "반대", Icon: ThumbsDown },
            { key: "neutral", label: "중립", Icon: MessageCircle },
          ] as const
        ).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setStance(stance === key ? "" : key)}
            className={`flex items-center gap-1 text-xs px-3 py-1.5 border font-medium transition-all ${
              stance === key
                ? key === "pro"
                  ? "bg-[#2a6828] text-white border-[#2a6828]"
                  : key === "con"
                  ? "bg-[#882020] text-white border-[#882020]"
                  : "bg-[#4a4030] text-white border-[#4a4030]"
                : "border-[#c0b090] text-[#5a5040] bg-[#f8f0da] hover:border-[#1c1712]"
            }`}
          >
            <Icon size={11} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          maxLength={100}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !isPending && handleSubmit()}
          placeholder="한 줄 의견을 남겨 주세요 (최대 100자)"
          className="flex-1 px-3 py-2 text-sm border-2 border-[#c0b090] bg-[#f8f0da] focus:border-[#1c1712] focus:outline-none placeholder:text-[#a09070]"
        />
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || isPending}
          className="px-4 py-2 bg-[#1c1712] text-[#f0e5c0] text-sm font-bold hover:bg-[#2e2519] disabled:bg-[#c8bfa8] disabled:text-[#8c8070] disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 shrink-0"
        >
          {isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
          게시
        </button>
      </div>
      <p className="text-[10px] text-[#a09070] text-right">{content.length} / 100</p>
    </div>
  );
}
