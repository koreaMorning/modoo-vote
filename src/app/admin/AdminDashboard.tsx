"use client";

import { useState, useCallback } from "react";
import {
  createPoll,
  updatePoll,
  togglePollActive,
  getPolls,
  logoutAdmin,
  PollInput,
} from "./actions";
import { Category } from "@/types";

const CATEGORIES: Category[] = ["정치", "경제", "사회", "문화", "스포츠", "국제", "기술", "환경"];

const RSS_CATEGORIES = ["정치", "경제", "사회", "문화", "국제", "기술", "스포츠", "환경"];

interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

interface PollRow {
  id: string;
  title: string;
  category: string;
  is_active: boolean;
  created_at: string;
  ends_at: string | null;
  total_votes: number;
}

type Tab = "news" | "posts" | "write";

interface Props {
  initialPolls: PollRow[];
}

export default function AdminDashboard({ initialPolls }: Props) {
  const [tab, setTab] = useState<Tab>("news");
  const [polls, setPolls] = useState<PollRow[]>(initialPolls);

  const refreshPolls = useCallback(async () => {
    const fresh = await getPolls();
    setPolls(fresh as PollRow[]);
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f0e8] text-[#1c1712]">
      {/* Header */}
      <div className="bg-[#1c1712] text-[#f0e5c0] py-3 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-black font-serif text-lg tracking-tight">모두의 투표</span>
          <span className="text-[10px] tracking-widest text-[#c8b890] uppercase">Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/" className="text-xs text-[#c8b890] hover:text-white">← 사이트로</a>
          <form action={logoutAdmin}>
            <button className="text-xs border border-[#c8b890] px-3 py-1 hover:bg-[#c8b890] hover:text-[#1c1712] transition-colors">
              로그아웃
            </button>
          </form>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b-2 border-[#1c1712] bg-[#ede0c0]">
        <div className="max-w-6xl mx-auto px-6 flex gap-0">
          {([["news", "뉴스 스크랩"], ["posts", "게시글 관리"], ["write", "직접 작성"]] as [Tab, string][]).map(
            ([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-6 py-3 text-sm font-bold tracking-wide border-b-2 -mb-0.5 transition-colors ${
                  tab === key
                    ? "border-[#1c1712] text-[#1c1712] bg-[#f5f0e8]"
                    : "border-transparent text-[#6b6356] hover:text-[#1c1712]"
                }`}
              >
                {label}
              </button>
            )
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {tab === "news" && <NewsTab />}
        {tab === "posts" && <PostsTab polls={polls} onRefresh={refreshPolls} />}
        {tab === "write" && <WriteTab onCreated={refreshPolls} />}
      </div>
    </div>
  );
}

/* ─────────────────── 뉴스 스크랩 탭 ─────────────────── */
function NewsTab() {
  const [rssCategory, setRssCategory] = useState("정치");
  const [items, setItems] = useState<RssItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<RssItem | null>(null);
  const [converted, setConverted] = useState<{ title: string; description: string; options: string[] } | null>(null);
  const [converting, setConverting] = useState(false);
  const [saveCategory, setSaveCategory] = useState<Category>("정치");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function fetchRss() {
    setLoading(true);
    setItems([]);
    setSelected(null);
    setConverted(null);
    try {
      const res = await fetch(`/api/admin/rss?category=${encodeURIComponent(rssCategory)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setItems(data.items ?? []);
    } catch (e) {
      setMsg({ type: "err", text: String(e) });
    } finally {
      setLoading(false);
    }
  }

  async function convertArticle(item: RssItem) {
    setSelected(item);
    setConverted(null);
    setConverting(true);
    try {
      const res = await fetch("/api/admin/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: item.title, description: item.description }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setConverted(data);
    } catch (e) {
      setMsg({ type: "err", text: "AI 변환 실패: " + String(e) });
    } finally {
      setConverting(false);
    }
  }

  async function saveConverted() {
    if (!converted) return;
    setSaving(true);
    setMsg(null);
    const result = await createPoll({
      title: converted.title,
      description: converted.description,
      category: saveCategory,
      options: converted.options,
    });
    setSaving(false);
    if (result.success) {
      setMsg({ type: "ok", text: "게시글이 등록되었습니다!" });
      setConverted(null);
      setSelected(null);
    } else {
      setMsg({ type: "err", text: result.error ?? "실패" });
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: RSS list */}
      <div>
        <h2 className="text-sm font-black uppercase tracking-widest mb-4">뉴스 RSS 가져오기</h2>
        <div className="flex gap-2 mb-4">
          <select
            value={rssCategory}
            onChange={(e) => setRssCategory(e.target.value)}
            className="border-2 border-[#1c1712] bg-[#f5f0e8] px-3 py-2 text-sm font-medium flex-1"
          >
            {RSS_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <button
            onClick={fetchRss}
            disabled={loading}
            className="border-2 border-[#1c1712] bg-[#1c1712] text-[#f0e5c0] px-4 py-2 text-sm font-bold hover:bg-[#3d2b1f] transition-colors disabled:opacity-50"
          >
            {loading ? "로딩..." : "가져오기"}
          </button>
        </div>

        {items.length === 0 && !loading && (
          <p className="text-sm text-[#8c8070] py-8 text-center border border-[#c8bfa8]">
            카테고리를 선택하고 가져오기를 눌러주세요
          </p>
        )}

        <div className="space-y-2">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => convertArticle(item)}
              className={`w-full text-left border-2 p-3 transition-colors hover:border-[#1c1712] hover:bg-[#ede0c0] ${
                selected?.link === item.link
                  ? "border-[#1c1712] bg-[#ede0c0]"
                  : "border-[#c8bfa8]"
              }`}
            >
              <p className="text-sm font-bold leading-snug">{item.title}</p>
              <p className="text-xs text-[#8c8070] mt-1">
                {new Date(item.pubDate).toLocaleDateString("ko-KR", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Right: AI conversion result */}
      <div>
        <h2 className="text-sm font-black uppercase tracking-widest mb-4">AI 변환 결과</h2>

        {msg && (
          <div
            className={`border-2 p-3 mb-4 text-sm font-medium ${
              msg.type === "ok"
                ? "border-green-700 bg-green-50 text-green-800"
                : "border-red-700 bg-red-50 text-red-800"
            }`}
          >
            {msg.text}
          </div>
        )}

        {converting && (
          <div className="border-2 border-[#c8bfa8] p-8 text-center text-sm text-[#8c8070]">
            AI가 변환 중입니다...
          </div>
        )}

        {!converting && !converted && !selected && (
          <div className="border-2 border-[#c8bfa8] p-8 text-center text-sm text-[#8c8070]">
            왼쪽에서 기사를 선택하면 AI가 자동으로 투표 형식으로 변환합니다
          </div>
        )}

        {converted && (
          <div className="border-2 border-[#1c1712]">
            <ConvertedEditor
              initial={converted}
              onChange={setConverted}
              saveCategory={saveCategory}
              onSaveCategoryChange={setSaveCategory}
              onSave={saveConverted}
              saving={saving}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ConvertedEditor({
  initial,
  onChange,
  saveCategory,
  onSaveCategoryChange,
  onSave,
  saving,
}: {
  initial: { title: string; description: string; options: string[] };
  onChange: (v: { title: string; description: string; options: string[] }) => void;
  saveCategory: Category;
  onSaveCategoryChange: (c: Category) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const [local, setLocal] = useState(initial);

  function update(patch: Partial<typeof local>) {
    const next = { ...local, ...patch };
    setLocal(next);
    onChange(next);
  }

  function updateOption(i: number, val: string) {
    const opts = [...local.options];
    opts[i] = val;
    update({ options: opts });
  }

  function addOption() {
    update({ options: [...local.options, ""] });
  }

  function removeOption(i: number) {
    update({ options: local.options.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="text-[10px] font-black uppercase tracking-widest text-[#6b6356] block mb-1">
          투표 제목
        </label>
        <input
          value={local.title}
          onChange={(e) => update({ title: e.target.value })}
          className="w-full border-2 border-[#c8bfa8] bg-[#f5f0e8] px-3 py-2 text-sm font-bold"
        />
      </div>
      <div>
        <label className="text-[10px] font-black uppercase tracking-widest text-[#6b6356] block mb-1">
          배경 설명
        </label>
        <textarea
          value={local.description}
          onChange={(e) => update({ description: e.target.value })}
          rows={5}
          className="w-full border-2 border-[#c8bfa8] bg-[#f5f0e8] px-3 py-2 text-sm leading-relaxed resize-none"
        />
      </div>
      <div>
        <label className="text-[10px] font-black uppercase tracking-widest text-[#6b6356] block mb-1">
          선택지
        </label>
        <div className="space-y-2">
          {local.options.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                className="flex-1 border-2 border-[#c8bfa8] bg-[#f5f0e8] px-3 py-2 text-sm"
                placeholder={`선택지 ${i + 1}`}
              />
              {local.options.length > 2 && (
                <button
                  onClick={() => removeOption(i)}
                  className="border-2 border-red-400 text-red-600 px-3 hover:bg-red-50 text-sm"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        {local.options.length < 4 && (
          <button
            onClick={addOption}
            className="mt-2 text-xs border border-[#c8bfa8] px-3 py-1 hover:border-[#1c1712] transition-colors"
          >
            + 선택지 추가
          </button>
        )}
      </div>
      <div>
        <label className="text-[10px] font-black uppercase tracking-widest text-[#6b6356] block mb-1">
          카테고리
        </label>
        <select
          value={saveCategory}
          onChange={(e) => onSaveCategoryChange(e.target.value as Category)}
          className="border-2 border-[#c8bfa8] bg-[#f5f0e8] px-3 py-2 text-sm w-full"
        >
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <button
        onClick={onSave}
        disabled={saving}
        className="w-full border-2 border-[#1c1712] bg-[#1c1712] text-[#f0e5c0] py-2.5 text-sm font-bold hover:bg-[#3d2b1f] transition-colors disabled:opacity-50"
      >
        {saving ? "등록 중..." : "게시글 등록"}
      </button>
    </div>
  );
}

/* ─────────────────── 게시글 관리 탭 ─────────────────── */
function PostsTab({ polls, onRefresh }: { polls: PollRow[]; onRefresh: () => Promise<void> }) {
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ title: string; category: Category; ends_at: string }>({
    title: "",
    category: "정치",
    ends_at: "",
  });
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function startEdit(p: PollRow) {
    setEditId(p.id);
    setEditData({
      title: p.title,
      category: p.category as Category,
      ends_at: p.ends_at ? p.ends_at.slice(0, 10) : "",
    });
  }

  async function saveEdit() {
    if (!editId) return;
    setSaving(editId);
    const result = await updatePoll(editId, {
      title: editData.title,
      category: editData.category,
      ends_at: editData.ends_at,
    });
    setSaving(null);
    if (result.success) {
      setMsg({ type: "ok", text: "수정되었습니다" });
      setEditId(null);
      await onRefresh();
    } else {
      setMsg({ type: "err", text: result.error ?? "실패" });
    }
  }

  async function handleToggle(id: string, current: boolean) {
    setSaving(id);
    const result = await togglePollActive(id, !current);
    setSaving(null);
    if (result.success) {
      await onRefresh();
    } else {
      setMsg({ type: "err", text: result.error ?? "실패" });
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-black uppercase tracking-widest">게시글 관리 ({polls.length}개)</h2>
        <button
          onClick={onRefresh}
          className="text-xs border border-[#c8bfa8] px-3 py-1 hover:border-[#1c1712] transition-colors"
        >
          새로고침
        </button>
      </div>

      {msg && (
        <div
          className={`border-2 p-3 mb-4 text-sm font-medium ${
            msg.type === "ok"
              ? "border-green-700 bg-green-50 text-green-800"
              : "border-red-700 bg-red-50 text-red-800"
          }`}
        >
          {msg.text}
          <button onClick={() => setMsg(null)} className="ml-3 text-xs underline">닫기</button>
        </div>
      )}

      <div className="border-2 border-[#1c1712] divide-y-2 divide-[#c8bfa8]">
        {polls.length === 0 && (
          <div className="py-12 text-center text-sm text-[#8c8070]">등록된 게시글이 없습니다</div>
        )}
        {polls.map((p) => (
          <div key={p.id} className="p-4">
            {editId === p.id ? (
              /* Edit form */
              <div className="space-y-3">
                <input
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  className="w-full border-2 border-[#c8bfa8] bg-[#f5f0e8] px-3 py-2 text-sm font-bold"
                />
                <div className="flex gap-2">
                  <select
                    value={editData.category}
                    onChange={(e) => setEditData({ ...editData, category: e.target.value as Category })}
                    className="border-2 border-[#c8bfa8] bg-[#f5f0e8] px-3 py-2 text-sm flex-1"
                  >
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <input
                    type="date"
                    value={editData.ends_at}
                    onChange={(e) => setEditData({ ...editData, ends_at: e.target.value })}
                    className="border-2 border-[#c8bfa8] bg-[#f5f0e8] px-3 py-2 text-sm flex-1"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveEdit}
                    disabled={saving === p.id}
                    className="border-2 border-[#1c1712] bg-[#1c1712] text-[#f0e5c0] px-4 py-1.5 text-sm font-bold hover:bg-[#3d2b1f] transition-colors disabled:opacity-50"
                  >
                    {saving === p.id ? "저장 중..." : "저장"}
                  </button>
                  <button
                    onClick={() => setEditId(null)}
                    className="border-2 border-[#c8bfa8] px-4 py-1.5 text-sm hover:border-[#1c1712] transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              /* Row display */
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold bg-[#1c1712] text-[#f0e5c0] px-2 py-0.5">
                      {p.category}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 border ${
                        p.is_active
                          ? "border-green-600 text-green-700"
                          : "border-red-500 text-red-600"
                      }`}
                    >
                      {p.is_active ? "활성" : "비활성"}
                    </span>
                    <span className="text-[10px] text-[#8c8070]">
                      {p.total_votes.toLocaleString()}명 참여
                    </span>
                  </div>
                  <p className="text-sm font-bold leading-snug truncate">{p.title}</p>
                  <p className="text-[11px] text-[#8c8070] mt-0.5">
                    {new Date(p.created_at).toLocaleDateString("ko-KR")}
                    {p.ends_at && ` · 마감 ${new Date(p.ends_at).toLocaleDateString("ko-KR")}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`/votes/${p.id}`}
                    target="_blank"
                    className="text-xs border border-[#c8bfa8] px-3 py-1 hover:border-[#1c1712] transition-colors"
                  >
                    보기
                  </a>
                  <button
                    onClick={() => startEdit(p)}
                    className="text-xs border border-[#c8bfa8] px-3 py-1 hover:border-[#1c1712] transition-colors"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleToggle(p.id, p.is_active)}
                    disabled={saving === p.id}
                    className={`text-xs border px-3 py-1 transition-colors disabled:opacity-50 ${
                      p.is_active
                        ? "border-red-400 text-red-600 hover:bg-red-50"
                        : "border-green-500 text-green-700 hover:bg-green-50"
                    }`}
                  >
                    {saving === p.id ? "..." : p.is_active ? "비활성화" : "활성화"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────── 직접 작성 탭 ─────────────────── */
function WriteTab({ onCreated }: { onCreated: () => Promise<void> }) {
  const empty = { title: "", description: "", category: "정치" as Category, ends_at: "", options: ["", ""] };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function updateOption(i: number, val: string) {
    const opts = [...form.options];
    opts[i] = val;
    setForm({ ...form, options: opts });
  }

  function addOption() {
    if (form.options.length < 4) setForm({ ...form, options: [...form.options, ""] });
  }

  function removeOption(i: number) {
    if (form.options.length <= 2) return;
    setForm({ ...form, options: form.options.filter((_, idx) => idx !== i) });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return setMsg({ type: "err", text: "제목을 입력해주세요" });
    if (form.options.filter((o) => o.trim()).length < 2)
      return setMsg({ type: "err", text: "선택지를 최소 2개 입력해주세요" });

    setSaving(true);
    setMsg(null);
    const result = await createPoll(form as PollInput);
    setSaving(false);
    if (result.success) {
      setMsg({ type: "ok", text: "게시글이 등록되었습니다!" });
      setForm(empty);
      await onCreated();
    } else {
      setMsg({ type: "err", text: result.error ?? "실패" });
    }
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-sm font-black uppercase tracking-widest mb-6">직접 작성</h2>

      {msg && (
        <div
          className={`border-2 p-3 mb-6 text-sm font-medium ${
            msg.type === "ok"
              ? "border-green-700 bg-green-50 text-green-800"
              : "border-red-700 bg-red-50 text-red-800"
          }`}
        >
          {msg.text}
          <button onClick={() => setMsg(null)} className="ml-3 text-xs underline">닫기</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="border-2 border-[#1c1712] divide-y-2 divide-[#c8bfa8]">
        <div className="p-5 space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-[#6b6356] block">
            투표 제목 *
          </label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="질문 형식으로 작성해주세요"
            maxLength={100}
            className="w-full border-2 border-[#c8bfa8] bg-[#f5f0e8] px-3 py-2 text-sm font-bold"
          />
        </div>

        <div className="p-5 space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-[#6b6356] block">
            배경 설명
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="투표 배경을 중립적으로 설명해주세요"
            rows={6}
            className="w-full border-2 border-[#c8bfa8] bg-[#f5f0e8] px-3 py-2 text-sm leading-relaxed resize-none"
          />
        </div>

        <div className="p-5 grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#6b6356] block">
              카테고리 *
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
              className="w-full border-2 border-[#c8bfa8] bg-[#f5f0e8] px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#6b6356] block">
              마감일 (선택)
            </label>
            <input
              type="date"
              value={form.ends_at}
              onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
              className="w-full border-2 border-[#c8bfa8] bg-[#f5f0e8] px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="p-5 space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-[#6b6356] block mb-2">
            선택지 * (최소 2개, 최대 4개)
          </label>
          {form.options.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <span className="flex items-center text-xs text-[#8c8070] w-5 shrink-0 font-bold">{i + 1}</span>
              <input
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                placeholder={`선택지 ${i + 1}`}
                maxLength={50}
                className="flex-1 border-2 border-[#c8bfa8] bg-[#f5f0e8] px-3 py-2 text-sm"
              />
              {form.options.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  className="border-2 border-red-400 text-red-600 px-3 hover:bg-red-50 text-sm"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {form.options.length < 4 && (
            <button
              type="button"
              onClick={addOption}
              className="text-xs border border-[#c8bfa8] px-3 py-1.5 hover:border-[#1c1712] transition-colors"
            >
              + 선택지 추가
            </button>
          )}
        </div>

        <div className="p-5">
          <button
            type="submit"
            disabled={saving}
            className="w-full border-2 border-[#1c1712] bg-[#1c1712] text-[#f0e5c0] py-3 text-sm font-bold hover:bg-[#3d2b1f] transition-colors disabled:opacity-50"
          >
            {saving ? "등록 중..." : "게시글 등록"}
          </button>
        </div>
      </form>
    </div>
  );
}
