"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getDrafts,
  approveDraft,
  rejectDraft,
  updateDraft,
  deleteDraft,
  getCategoryQuotas,
  getPolls,
  DraftRow,
} from "./actions";
import { Category } from "@/types";

const CATEGORIES: Category[] = ["정치", "경제", "사회", "문화", "스포츠", "국제", "기술", "환경"];
const RSS_CATEGORIES = ["정치", "경제", "사회", "문화", "국제", "기술", "스포츠", "환경", "연예"];

type StatusFilter = "pending" | "approved" | "rejected" | "all";

const Q_TYPE_LABEL: Record<string, string> = {
  binary: "찬반형",
  multiple: "객관식",
  scale: "정도형",
};

export default function DraftsTab({ onPollCreated }: { onPollCreated: () => Promise<void> }) {
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");

  // Generation state
  const [genCategory, setGenCategory] = useState("정치");
  const [fetching, setFetching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [batchItems, setBatchItems] = useState<unknown[]>([]);
  const [batchStats, setBatchStats] = useState<{ outlet_count: number; total_fetched: number } | null>(null);

  // Per-draft action state
  const [actionId, setActionId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    description: string;
    category: Category;
    options: string[];
  }>({ title: "", description: "", category: "정치", options: [] });

  const loadDrafts = useCallback(async () => {
    const data = await getDrafts();
    setDrafts(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  const filtered =
    statusFilter === "all" ? drafts : drafts.filter((d) => d.status === statusFilter);

  const counts = {
    pending: drafts.filter((d) => d.status === "pending").length,
    approved: drafts.filter((d) => d.status === "approved").length,
    rejected: drafts.filter((d) => d.status === "rejected").length,
  };

  async function handleFetch() {
    setFetching(true);
    setGenMsg(null);
    setBatchItems([]);
    setBatchStats(null);
    try {
      const res = await fetch(
        `/api/admin/rss/batch?category=${encodeURIComponent(genCategory)}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBatchItems(data.items ?? []);
      setBatchStats({ outlet_count: data.outlet_count, total_fetched: data.total_fetched });
      setGenMsg({
        type: "ok",
        text: `${data.outlet_count}개 언론사 · ${data.total_fetched}개 수집 → 중복 제거 후 ${(data.items ?? []).length}개`,
      });
    } catch (e) {
      setGenMsg({ type: "err", text: String(e) });
    } finally {
      setFetching(false);
    }
  }

  async function handleGenerate() {
    if (batchItems.length === 0) return;
    setGenerating(true);
    setGenMsg(null);
    try {
      const [quotas, polls] = await Promise.all([getCategoryQuotas(), getPolls()]);
      const currentCount = (polls as { category: string }[]).filter(
        (p) => p.category === genCategory
      ).length;
      const target = quotas[genCategory] ?? 10;
      const quota_needed = Math.max(1, target - currentCount);

      const res = await fetch("/api/admin/ai/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: batchItems, category: genCategory, quota_needed }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGenMsg({ type: "ok", text: `${data.count}개 후보 생성 완료` });
      setBatchItems([]);
      setBatchStats(null);
      await loadDrafts();
      setStatusFilter("pending");
    } catch (e) {
      setGenMsg({ type: "err", text: "AI 생성 실패: " + String(e) });
    } finally {
      setGenerating(false);
    }
  }

  async function handleApprove(id: string) {
    setActionId(id);
    const result = await approveDraft(id);
    setActionId(null);
    if (result.success) {
      await loadDrafts();
      await onPollCreated();
    } else {
      alert(result.error);
    }
  }

  async function handleReject(id: string) {
    setActionId(id);
    const result = await rejectDraft(id);
    setActionId(null);
    if (result.success) await loadDrafts();
    else alert(result.error);
  }

  async function handleDelete(id: string) {
    if (!confirm("이 초안을 삭제할까요?")) return;
    setActionId(id);
    const result = await deleteDraft(id);
    setActionId(null);
    if (result.success) await loadDrafts();
    else alert(result.error);
  }

  function startEdit(d: DraftRow) {
    setEditingId(d.id);
    setEditForm({
      title: d.title,
      description: d.description ?? "",
      category: d.category as Category,
      options: [...d.options],
    });
  }

  async function saveEdit() {
    if (!editingId) return;
    setActionId(editingId);
    const result = await updateDraft(editingId, editForm);
    setActionId(null);
    if (result.success) {
      setEditingId(null);
      await loadDrafts();
    } else {
      alert(result.error);
    }
  }

  if (loading)
    return <div className="py-16 text-center text-sm text-[#8c8070]">로딩 중...</div>;

  return (
    <div>
      {/* AI Generation Panel */}
      <div className="border-2 border-[#1c1712] mb-6">
        <div className="border-b-2 border-[#1c1712] bg-[#1c1712] text-[#f0e5c0] px-4 py-2">
          <span className="text-[10px] font-black tracking-[0.25em] uppercase">AI 후보 자동 생성</span>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <select
              value={genCategory}
              onChange={(e) => setGenCategory(e.target.value)}
              className="border-2 border-[#c8bfa8] bg-[#f5f0e8] px-3 py-2 text-sm flex-1 min-w-[120px]"
            >
              {RSS_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <button
              onClick={handleFetch}
              disabled={fetching || generating}
              className="border-2 border-[#1c1712] bg-[#f5f0e8] text-[#1c1712] px-4 py-2 text-sm font-bold hover:bg-[#ede0c0] transition-colors disabled:opacity-50"
            >
              {fetching ? "수집 중..." : "① RSS 수집"}
            </button>
            <button
              onClick={handleGenerate}
              disabled={batchItems.length === 0 || generating || fetching}
              className="border-2 border-[#1c1712] bg-[#1c1712] text-[#f0e5c0] px-4 py-2 text-sm font-bold hover:bg-[#3d2b1f] transition-colors disabled:opacity-50"
            >
              {generating ? "생성 중..." : "② AI 후보 생성"}
            </button>
          </div>

          {batchStats && batchItems.length > 0 && (
            <p className="text-[11px] text-[#6b6356]">
              {batchStats.outlet_count}개 언론사 · {batchStats.total_fetched}개 수집 →
              중복 제거 후 <strong>{batchItems.length}개</strong> 기사 대기 중
            </p>
          )}

          {genMsg && (
            <div
              className={`border p-2 text-xs font-medium ${
                genMsg.type === "ok"
                  ? "border-green-600 bg-green-50 text-green-800"
                  : "border-red-600 bg-red-50 text-red-800"
              }`}
            >
              {genMsg.text}
            </div>
          )}
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-0 border-b-2 border-[#1c1712] mb-6">
        {(
          [
            ["pending", `대기 (${counts.pending})`],
            ["approved", `승인 (${counts.approved})`],
            ["rejected", `거부 (${counts.rejected})`],
            ["all", `전체 (${drafts.length})`],
          ] as [StatusFilter, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`px-5 py-2 text-sm font-bold border-b-2 -mb-0.5 transition-colors ${
              statusFilter === key
                ? "border-[#1c1712] text-[#1c1712] bg-[#f5f0e8]"
                : "border-transparent text-[#6b6356] hover:text-[#1c1712]"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={loadDrafts}
          className="ml-auto text-xs border border-[#c8bfa8] px-3 py-1 mb-0.5 self-center hover:border-[#1c1712] transition-colors"
        >
          새로고침
        </button>
      </div>

      {/* Draft list */}
      {filtered.length === 0 && (
        <div className="border-2 border-[#c8bfa8] py-16 text-center text-sm text-[#8c8070]">
          {statusFilter === "pending"
            ? "대기 중인 초안이 없습니다. RSS 수집 후 AI 후보 생성을 실행해주세요."
            : "해당 상태의 초안이 없습니다."}
        </div>
      )}

      <div className="space-y-4">
        {filtered.map((draft) => (
          <div key={draft.id} className="border-2 border-[#c8bfa8] bg-[#fdf8f0]">
            {editingId === draft.id ? (
              /* Edit form */
              <div className="p-4 space-y-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#6b6356] block mb-1">
                    투표 제목
                  </label>
                  <input
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full border-2 border-[#c8bfa8] bg-white px-3 py-2 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#6b6356] block mb-1">
                    배경 설명
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={4}
                    className="w-full border-2 border-[#c8bfa8] bg-white px-3 py-2 text-sm resize-none leading-relaxed"
                  />
                </div>
                <div className="flex gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#6b6356] block mb-1">
                      카테고리
                    </label>
                    <select
                      value={editForm.category}
                      onChange={(e) =>
                        setEditForm({ ...editForm, category: e.target.value as Category })
                      }
                      className="border-2 border-[#c8bfa8] bg-white px-3 py-2 text-sm"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#6b6356] block mb-1">
                    선택지
                  </label>
                  <div className="space-y-1.5">
                    {editForm.options.map((opt, i) => (
                      <input
                        key={i}
                        value={opt}
                        onChange={(e) => {
                          const opts = [...editForm.options];
                          opts[i] = e.target.value;
                          setEditForm({ ...editForm, options: opts });
                        }}
                        className="w-full border border-[#c8bfa8] bg-white px-3 py-1.5 text-sm"
                        placeholder={`선택지 ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveEdit}
                    disabled={actionId === draft.id}
                    className="border-2 border-[#1c1712] bg-[#1c1712] text-[#f0e5c0] px-4 py-1.5 text-sm font-bold disabled:opacity-50 hover:bg-[#3d2b1f] transition-colors"
                  >
                    {actionId === draft.id ? "저장 중..." : "저장"}
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="border-2 border-[#c8bfa8] px-4 py-1.5 text-sm hover:border-[#1c1712] transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              /* Card view */
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Meta badges */}
                    <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                      <span className="text-[10px] font-black bg-[#1c1712] text-[#f0e5c0] px-2 py-0.5">
                        {draft.category}
                      </span>
                      <span className="text-[10px] border border-[#c8bfa8] px-2 py-0.5 font-bold text-[#6b6356]">
                        {Q_TYPE_LABEL[draft.question_type] ?? draft.question_type}
                      </span>
                      {draft.source_outlet && (
                        <span className="text-[10px] text-[#8c8070]">{draft.source_outlet}</span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 ${
                          draft.status === "pending"
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : draft.status === "approved"
                            ? "bg-green-100 text-green-800 border border-green-300"
                            : "bg-red-100 text-red-700 border border-red-300"
                        }`}
                      >
                        {draft.status === "pending"
                          ? "대기"
                          : draft.status === "approved"
                          ? "승인됨"
                          : "거부됨"}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-sm font-black leading-snug mb-2 font-serif">{draft.title}</h3>

                    {/* Description */}
                    {draft.description && (
                      <p className="text-xs text-[#6b6356] leading-relaxed mb-2 line-clamp-2">
                        {draft.description}
                      </p>
                    )}

                    {/* Options */}
                    <div className="flex gap-1.5 flex-wrap mb-2">
                      {draft.options.map((opt, i) => (
                        <span
                          key={i}
                          className="text-[10px] border border-[#c8bfa8] px-2 py-0.5 bg-white"
                        >
                          {opt}
                        </span>
                      ))}
                    </div>

                    {/* Source link */}
                    {draft.source_url && (
                      <a
                        href={draft.source_url}
                        target="_blank"
                        className="text-[10px] text-[#4d9ab5] hover:underline truncate block max-w-sm"
                      >
                        {draft.source_url}
                      </a>
                    )}

                    <p className="text-[10px] text-[#a09080] mt-1">
                      {new Date(draft.created_at).toLocaleDateString("ko-KR", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {draft.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleApprove(draft.id)}
                          disabled={actionId === draft.id}
                          className="border-2 border-green-600 bg-green-600 text-white px-3 py-1.5 text-xs font-bold hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          {actionId === draft.id ? "..." : "승인"}
                        </button>
                        <button
                          onClick={() => startEdit(draft)}
                          className="border-2 border-[#c8bfa8] px-3 py-1.5 text-xs hover:border-[#1c1712] transition-colors"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleReject(draft.id)}
                          disabled={actionId === draft.id}
                          className="border-2 border-red-400 text-red-600 px-3 py-1.5 text-xs hover:bg-red-50 disabled:opacity-50 transition-colors"
                        >
                          거부
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(draft.id)}
                      disabled={actionId === draft.id}
                      className="border border-[#c8bfa8] text-[#8c8070] px-3 py-1 text-[10px] hover:border-red-400 hover:text-red-600 disabled:opacity-50 transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
