"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { submitOpinion, updateOpinion, deleteOpinion } from "@/app/votes/[id]/actions";
import {
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Send,
  Loader2,
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react";

interface OpinionItem {
  id: string;
  content: string;
  stance: "pro" | "con" | "neutral" | null;
  voter_fingerprint: string;
  created_at: string;
}

interface Props {
  initialOpinions: OpinionItem[];
  currentFingerprint: string | null;
  pollId: string;
  isProscon: boolean;
}

type Stance = "pro" | "con" | "neutral" | "";

export default function OpinionClient({
  initialOpinions,
  currentFingerprint,
  pollId,
  isProscon,
}: Props) {
  const router = useRouter();
  const [opinions, setOpinions] = useState(initialOpinions);
  const myTempIds = useRef(new Set<string>());

  // 서버 refresh 후 실제 DB 데이터로 동기화
  useEffect(() => {
    setOpinions(initialOpinions);
    myTempIds.current.clear();
  }, [initialOpinions]);

  // Form
  const [content, setContent] = useState("");
  const [stance, setStance] = useState<Stance>("");
  const [submitPending, startSubmitTransition] = useTransition();

  // Edit
  const [editId, setEditId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editPending, startEditTransition] = useTransition();

  function handleSubmit() {
    if (!content.trim()) return;
    const trimmed = content.trim();
    const tempId = `__temp__${Date.now()}`;

    // 낙관적 추가
    myTempIds.current.add(tempId);
    setOpinions((prev) => [
      {
        id: tempId,
        content: trimmed,
        stance: (stance || null) as "pro" | "con" | "neutral" | null,
        voter_fingerprint: currentFingerprint ?? tempId,
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]);
    setContent("");
    setStance("");

    startSubmitTransition(async () => {
      const result = await submitOpinion(pollId, trimmed, stance || null);
      if (result.success) {
        router.refresh(); // 서버 재렌더 → useEffect에서 실제 데이터로 교체
      } else {
        // 롤백
        setOpinions((prev) => prev.filter((o) => o.id !== tempId));
        myTempIds.current.delete(tempId);
        setContent(trimmed);
      }
    });
  }

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
    startEditTransition(async () => {
      const result = await updateOpinion(id, editContent, pollId);
      if (result.success) {
        setOpinions((prev) =>
          prev.map((o) =>
            o.id === id ? { ...o, content: editContent.trim() } : o
          )
        );
        cancelEdit();
      }
    });
  }

  function handleDelete(id: string) {
    startEditTransition(async () => {
      const result = await deleteOpinion(id, pollId);
      if (result.success) {
        setOpinions((prev) => prev.filter((o) => o.id !== id));
      }
    });
  }

  const proCount = opinions.filter((o) => o.stance === "pro").length;
  const conCount = opinions.filter((o) => o.stance === "con").length;
  const isTemp = (id: string) => id.startsWith("__temp__");

  function isOwn(op: OpinionItem) {
    return (
      myTempIds.current.has(op.id) ||
      (!!currentFingerprint && op.voter_fingerprint === currentFingerprint)
    );
  }

  return (
    <section className="mt-8">
      {/* Header */}
      <div className="border-t-2 border-black pt-5 mb-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest">
            독자 의견
            <span className="ml-2 font-normal text-[#8c8070]">
              {opinions.length > 0 ? `${opinions.length}건` : ""}
            </span>
          </h2>
          {isProscon && opinions.length > 0 && (
            <div className="flex gap-4 text-xs text-[#6b6356]">
              <span className="flex items-center gap-1">
                <ThumbsUp size={11} className="text-[#2a6828]" />
                찬성 {proCount}
              </span>
              <span className="flex items-center gap-1">
                <ThumbsDown size={11} className="text-[#882020]" />
                반대 {conCount}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="space-y-2">
        {isProscon && (
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
        )}

        <div className="flex gap-2">
          <input
            type="text"
            maxLength={100}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && !submitPending && handleSubmit()
            }
            placeholder={
              isProscon
                ? "한 줄 의견을 남겨 주세요 (최대 100자)"
                : "자유롭게 의견을 남겨 주세요 (최대 100자)"
            }
            className="flex-1 px-3 py-2 text-sm border-2 border-[#c0b090] bg-[#f8f0da] focus:border-[#1c1712] focus:outline-none placeholder:text-[#a09070]"
          />
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || submitPending}
            className="px-4 py-2 bg-[#1c1712] text-[#f0e5c0] text-sm font-bold hover:bg-[#2e2519] disabled:bg-[#c8bfa8] disabled:text-[#8c8070] disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 shrink-0"
          >
            {submitPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            게시
          </button>
        </div>
        <p className="text-[10px] text-[#a09070] text-right">
          {content.length} / 100
        </p>
      </div>

      {/* List */}
      {opinions.length === 0 ? (
        <p className="mt-5 text-sm text-[#a09070] text-center py-6 border border-dashed border-[#c8bfa0] font-serif">
          첫 번째 의견을 남겨 주세요
        </p>
      ) : (
        <ul className="mt-5 space-y-1.5">
          {opinions.map((opinion) => {
            const own = isOwn(opinion);
            const editing = editId === opinion.id;
            const temp = isTemp(opinion.id);

            return (
              <li
                key={opinion.id}
                className={`flex items-start gap-2.5 px-3 py-2.5 text-sm border-l-[3px] ${
                  opinion.stance === "pro"
                    ? "border-[#3a8a30] bg-[#f0f8ee]"
                    : opinion.stance === "con"
                    ? "border-[#882020] bg-[#fdf0ee]"
                    : "border-[#b0a070] bg-[#faf5e8]"
                } ${temp ? "opacity-70" : ""}`}
              >
                <span className="mt-0.5 shrink-0">
                  {opinion.stance === "pro" ? (
                    <ThumbsUp size={12} className="text-[#3a8a30]" />
                  ) : opinion.stance === "con" ? (
                    <ThumbsDown size={12} className="text-[#882020]" />
                  ) : (
                    <MessageCircle size={12} className="text-[#8c8070]" />
                  )}
                </span>

                {editing ? (
                  <div className="flex-1 flex items-center gap-1.5">
                    <input
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      maxLength={100}
                      className="flex-1 px-2 py-0.5 text-sm border border-[#c0b090] bg-[#f8f0da] focus:outline-none"
                    />
                    <button
                      onClick={() => handleUpdate(opinion.id)}
                      disabled={editPending || !editContent.trim()}
                      className="text-[#2a6828] hover:text-[#1a4818] disabled:opacity-40"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="text-[#882020] hover:text-[#5a1010]"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <span className="text-[#2d2520] leading-snug flex-1">
                    {opinion.content}
                  </span>
                )}

                <div className="flex items-center gap-2 shrink-0 ml-auto">
                  {!editing && (
                    <span className="text-[10px] text-[#a09070] tabular-nums">
                      {new Date(opinion.created_at).toLocaleDateString(
                        "ko-KR",
                        { month: "numeric", day: "numeric" }
                      )}
                    </span>
                  )}
                  {own && !editing && !temp && (
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
                        disabled={editPending}
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
      )}
    </section>
  );
}
