"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  submitOpinion,
  updateOpinion,
  deleteOpinion,
  reactToOpinion,
} from "@/app/votes/[id]/actions";
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
  likes_count: number;
  dislikes_count: number;
}

interface Props {
  initialOpinions: OpinionItem[];
  initialMyReactions: Record<string, "like" | "dislike">;
  currentFingerprint: string | null;
  pollId: string;
  isProscon: boolean;
}

type Stance = "pro" | "con" | "neutral" | "";

export default function OpinionClient({
  initialOpinions,
  initialMyReactions,
  currentFingerprint,
  pollId,
  isProscon,
}: Props) {
  const router = useRouter();
  const [opinions, setOpinions] = useState(initialOpinions);
  const [myReactions, setMyReactions] = useState(initialMyReactions);
  const myTempIds = useRef(new Set<string>());

  useEffect(() => {
    // 임시 의견이 있는데 서버가 빈 배열을 반환하면 동기화 건너뜀
    // (컬럼 누락·네트워크 오류 등으로 SELECT 실패 시 낙관적 상태 보호)
    if (myTempIds.current.size > 0 && initialOpinions.length === 0) return;
    setOpinions(initialOpinions);
    setMyReactions(initialMyReactions);
    myTempIds.current.clear();
  }, [initialOpinions, initialMyReactions]);

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

    myTempIds.current.add(tempId);
    setOpinions((prev) => [
      {
        id: tempId,
        content: trimmed,
        stance: (stance || null) as "pro" | "con" | "neutral" | null,
        voter_fingerprint: currentFingerprint ?? tempId,
        created_at: new Date().toISOString(),
        likes_count: 0,
        dislikes_count: 0,
      },
      ...prev,
    ]);
    setContent("");
    setStance("");

    startSubmitTransition(async () => {
      const result = await submitOpinion(pollId, trimmed, stance || null);
      if (result.success) {
        router.refresh();
      } else {
        setOpinions((prev) => prev.filter((o) => o.id !== tempId));
        myTempIds.current.delete(tempId);
        setContent(trimmed);
      }
    });
  }

  function handleReact(opinionId: string, reaction: "like" | "dislike") {
    const current = myReactions[opinionId] ?? null;
    const newReaction: "like" | "dislike" | null =
      current === reaction ? null : reaction;

    const likeDelta =
      (newReaction === "like" ? 1 : 0) - (current === "like" ? 1 : 0);
    const dislikeDelta =
      (newReaction === "dislike" ? 1 : 0) - (current === "dislike" ? 1 : 0);

    setMyReactions((prev) => {
      const next = { ...prev };
      if (newReaction === null) delete next[opinionId];
      else next[opinionId] = newReaction;
      return next;
    });
    setOpinions((prev) =>
      prev.map((o) =>
        o.id === opinionId
          ? {
              ...o,
              likes_count: Math.max(0, o.likes_count + likeDelta),
              dislikes_count: Math.max(0, o.dislikes_count + dislikeDelta),
            }
          : o
      )
    );

    reactToOpinion(opinionId, reaction, pollId).then((result) => {
      if (!result.success) {
        // 롤백
        setMyReactions((prev) => {
          const next = { ...prev };
          if (current === null) delete next[opinionId];
          else next[opinionId] = current;
          return next;
        });
        setOpinions((prev) =>
          prev.map((o) =>
            o.id === opinionId
              ? {
                  ...o,
                  likes_count: Math.max(0, o.likes_count - likeDelta),
                  dislikes_count: Math.max(0, o.dislikes_count - dislikeDelta),
                }
              : o
          )
        );
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
            const myReaction = myReactions[opinion.id] ?? null;

            return (
              <li
                key={opinion.id}
                className={`flex items-start gap-2.5 px-3 py-2.5 text-sm border-l-[3px] ${
                  opinion.stance === "pro"
                    ? "border-[#3a8a30] bg-[#f0f8ee]"
                    : opinion.stance === "con"
                    ? "border-[#882020] bg-[#fdf0ee]"
                    : "border-[#b0a070] bg-[#faf5e8]"
                } ${temp ? "opacity-60" : ""}`}
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

                {/* 내용 or 수정 입력 */}
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

                {/* 우측: 좋아요·싫어요 + 날짜 + 수정·삭제 */}
                <div className="flex items-center gap-2 shrink-0 ml-auto">
                  {!editing && !temp && (
                    <>
                      <button
                        onClick={() => handleReact(opinion.id, "like")}
                        className={`flex items-center gap-0.5 text-[11px] tabular-nums transition-colors ${
                          myReaction === "like"
                            ? "text-[#2a6828] font-bold"
                            : "text-[#a09070] hover:text-[#2a6828]"
                        }`}
                        title="좋아요"
                      >
                        <ThumbsUp size={11} />
                        {opinion.likes_count > 0 && (
                          <span>{opinion.likes_count}</span>
                        )}
                      </button>
                      <button
                        onClick={() => handleReact(opinion.id, "dislike")}
                        className={`flex items-center gap-0.5 text-[11px] tabular-nums transition-colors ${
                          myReaction === "dislike"
                            ? "text-[#882020] font-bold"
                            : "text-[#a09070] hover:text-[#882020]"
                        }`}
                        title="싫어요"
                      >
                        <ThumbsDown size={11} />
                        {opinion.dislikes_count > 0 && (
                          <span>{opinion.dislikes_count}</span>
                        )}
                      </button>
                    </>
                  )}

                  {!editing && (
                    <span className="text-[10px] text-[#a09070] tabular-nums">
                      {new Date(opinion.created_at).toLocaleDateString("ko-KR", {
                        month: "numeric",
                        day: "numeric",
                      })}
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
