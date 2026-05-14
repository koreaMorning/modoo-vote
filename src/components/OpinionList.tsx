"use client";

import { useState, useTransition } from "react";
import { updateOpinion, deleteOpinion } from "@/app/votes/[id]/actions";
import { ThumbsUp, ThumbsDown, MessageCircle, Pencil, Trash2, Check, X } from "lucide-react";

interface OpinionItem {
  id: string;
  content: string;
  stance: "pro" | "con" | "neutral" | null;
  voter_fingerprint: string;
  created_at: string;
}

interface Props {
  opinions: OpinionItem[];
  currentFingerprint: string | null;
  pollId: string;
}

export default function OpinionList({ opinions: initial, currentFingerprint, pollId }: Props) {
  const [opinions, setOpinions] = useState(initial);
  const [editId, setEditId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isPending, startTransition] = useTransition();

  function startEdit(op: OpinionItem) {
    setEditId(op.id);
    setEditContent(op.content);
  }

  function cancelEdit() {
    setEditId(null);
    setEditContent("");
  }

  function handleUpdate(id: string) {
    if (!editContent.trim()) return;
    startTransition(async () => {
      const result = await updateOpinion(id, editContent, pollId);
      if (result.success) {
        setOpinions((prev) =>
          prev.map((o) => (o.id === id ? { ...o, content: editContent.trim() } : o))
        );
        cancelEdit();
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteOpinion(id, pollId);
      if (result.success) {
        setOpinions((prev) => prev.filter((o) => o.id !== id));
      }
    });
  }

  if (opinions.length === 0) {
    return (
      <p className="mt-5 text-sm text-[#a09070] text-center py-6 border border-dashed border-[#c8bfa0] font-serif">
        첫 번째 의견을 남겨 주세요
      </p>
    );
  }

  return (
    <ul className="mt-5 space-y-1.5">
      {opinions.map((opinion) => {
        const isOwn = !!currentFingerprint && opinion.voter_fingerprint === currentFingerprint;
        const isEditing = editId === opinion.id;

        return (
          <li
            key={opinion.id}
            className={`flex items-start gap-2.5 px-3 py-2.5 text-sm border-l-[3px] ${
              opinion.stance === "pro"
                ? "border-[#3a8a30] bg-[#f0f8ee]"
                : opinion.stance === "con"
                ? "border-[#882020] bg-[#fdf0ee]"
                : "border-[#b0a070] bg-[#faf5e8]"
            }`}
          >
            {/* 스탠스 아이콘 */}
            <span className="mt-0.5 shrink-0">
              {opinion.stance === "pro" ? (
                <ThumbsUp size={12} className="text-[#3a8a30]" />
              ) : opinion.stance === "con" ? (
                <ThumbsDown size={12} className="text-[#882020]" />
              ) : (
                <MessageCircle size={12} className="text-[#8c8070]" />
              )}
            </span>

            {/* 내용 or 편집 인풋 */}
            {isEditing ? (
              <div className="flex-1 flex items-center gap-1.5">
                <input
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  maxLength={100}
                  className="flex-1 px-2 py-0.5 text-sm border border-[#c0b090] bg-[#f8f0da] focus:outline-none"
                />
                <button
                  onClick={() => handleUpdate(opinion.id)}
                  disabled={isPending || !editContent.trim()}
                  className="text-[#2a6828] hover:text-[#1a4818] disabled:opacity-40"
                >
                  <Check size={14} />
                </button>
                <button onClick={cancelEdit} className="text-[#882020] hover:text-[#5a1010]">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <span className="text-[#2d2520] leading-snug flex-1">{opinion.content}</span>
            )}

            {/* 날짜 + 수정·삭제 버튼 */}
            <div className="flex items-center gap-2 shrink-0 ml-auto">
              {!isEditing && (
                <span className="text-[10px] text-[#a09070] tabular-nums">
                  {new Date(opinion.created_at).toLocaleDateString("ko-KR", {
                    month: "numeric",
                    day: "numeric",
                  })}
                </span>
              )}
              {isOwn && !isEditing && (
                <>
                  <button
                    onClick={() => startEdit(opinion)}
                    className="text-[#8c8070] hover:text-[#1c1712] transition-colors"
                    title="수정"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    onClick={() => handleDelete(opinion.id)}
                    disabled={isPending}
                    className="text-[#8c8070] hover:text-[#882020] transition-colors disabled:opacity-40"
                    title="삭제"
                  >
                    <Trash2 size={11} />
                  </button>
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
