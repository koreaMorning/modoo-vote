"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  createPoll,
  updatePoll,
  togglePollActive,
  toggleBreaking,
  togglePinned,
  publishPollNow,
  updatePublishAt,
  getPolls,
  logoutAdmin,
  getCategoriesWithRooms,
  createCategory,
  updateCategory,
  deleteCategory,
  createRoom,
  updateRoom,
  deleteRoom,
  getCategoryQuotas,
  upsertCategoryQuota,
  PollInput,
  CategoryRow,
  RoomRow,
  RoomInput,
} from "./actions";
import { formatPublishLabel, toKSTDatetimeLocal, fromKSTDatetimeLocal } from "@/lib/publishing";
import DraftsTab from "./DraftsTab";
import { Eye, PlayCircle } from "lucide-react";
import { Category } from "@/types";
import { RSS_FEEDS } from "@/lib/rss-feeds";

const CATEGORIES: Category[] = ["정치", "경제", "사회", "문화", "스포츠", "국제", "기술", "환경", "연예"];

const RSS_CATEGORIES = ["정치", "경제", "사회", "문화", "국제", "기술", "스포츠", "환경", "연예"];

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
  is_breaking: boolean;
  is_pinned: boolean;
  is_main_article: boolean;
  source_count: number;
  publish_status: string;
  publish_at: string | null;
  created_at: string;
  ends_at: string | null;
  total_votes: number;
  view_count: number;
}

type Tab = "news" | "posts" | "write" | "rooms" | "drafts";

type AutoStatus = "idle" | "running" | "done" | "error";

interface Props {
  initialPolls: PollRow[];
}

export default function AdminDashboard({ initialPolls }: Props) {
  const [tab, setTab] = useState<Tab>("news");
  const [polls, setPolls] = useState<PollRow[]>(initialPolls);
  const [autoStatus, setAutoStatus] = useState<AutoStatus>("idle");
  const [autoCreated, setAutoCreated] = useState<number | null>(null);
  const hasAutoRun = useRef(false);

  const refreshPolls = useCallback(async () => {
    const fresh = await getPolls();
    setPolls(fresh as PollRow[]);
  }, []);

  const handlePublishNow = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    const result = await publishPollNow(id);
    if (result.success) {
      setPolls(prev => prev.map(p =>
        p.id === id
          ? { ...p, publish_status: "published", publish_at: new Date().toISOString() }
          : p
      ));
    }
    return result;
  }, []);

  const runAutoRefresh = useCallback(async () => {
    setAutoStatus("running");
    setAutoCreated(null);
    try {
      const res = await fetch("/api/cron/refresh-drafts");
      const data = await res.json();
      setAutoCreated(data.created ?? 0);
      setAutoStatus("done");
    } catch {
      setAutoStatus("error");
    }
  }, []);

  useEffect(() => {
    if (hasAutoRun.current) return;
    hasAutoRun.current = true;
    runAutoRefresh();
  }, [runAutoRefresh]);

  const autoLabel =
    autoStatus === "running"
      ? "RSS 수집 · AI 후보 생성 중..."
      : autoStatus === "done"
      ? `자동 생성 완료 (+${autoCreated}개 후보)`
      : autoStatus === "error"
      ? "자동 생성 실패"
      : "";

  return (
    <div className="min-h-screen bg-[#f5f0e8] text-[#1c1712]">
      {/* Header */}
      <div className="bg-[#1c1712] text-[#f0e5c0] py-3 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-black font-serif text-lg tracking-tight">모두의 투표</span>
          <span className="text-[10px] tracking-widest text-[#c8b890] uppercase">Admin</span>
          {autoStatus !== "idle" && (
            <span
              className={`text-[10px] px-2 py-0.5 font-mono ${
                autoStatus === "running"
                  ? "text-[#f0d080] animate-pulse"
                  : autoStatus === "done"
                  ? "text-[#80c880]"
                  : "text-[#f08080]"
              }`}
            >
              {autoLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={runAutoRefresh}
            disabled={autoStatus === "running"}
            className="text-[10px] border border-[#c8b890] px-2 py-0.5 text-[#c8b890] hover:bg-[#c8b890] hover:text-[#1c1712] transition-colors disabled:opacity-40"
          >
            {autoStatus === "running" ? "실행 중..." : "전체 새로고침"}
          </button>
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
          {([["news", "뉴스 스크랩"], ["drafts", "AI 후보"], ["posts", "게시글 관리"], ["write", "직접 작성"], ["rooms", "토론방 관리"]] as [Tab, string][]).map(
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
        {tab === "drafts" && <DraftsTab onPollCreated={refreshPolls} />}
        {tab === "posts" && <PostsTab polls={polls} onRefresh={refreshPolls} onPublishNow={handlePublishNow} />}
        {tab === "write" && <WriteTab onCreated={refreshPolls} />}
        {tab === "rooms" && <RoomsManagementTab />}
      </div>
    </div>
  );
}

/* ─────────────────── 뉴스 스크랩 탭 ─────────────────── */
function NewsTab() {
  const [rssCategory, setRssCategory] = useState("정치");
  const [outlet, setOutlet] = useState<string>(() => RSS_FEEDS["정치"][0].name);
  const [items, setItems] = useState<RssItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<RssItem | null>(null);
  const [converted, setConverted] = useState<{ title: string; description: string; options: string[] } | null>(null);
  const [converting, setConverting] = useState(false);
  const [saveCategory, setSaveCategory] = useState<Category>("정치");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const availableOutlets = useMemo(() => RSS_FEEDS[rssCategory] ?? [], [rssCategory]);

  useEffect(() => {
    const first = (RSS_FEEDS[rssCategory] ?? [])[0]?.name ?? "";
    setOutlet(first);
    setItems([]);
    setSelected(null);
    setConverted(null);
  }, [rssCategory]);

  async function fetchRss() {
    setLoading(true);
    setItems([]);
    setSelected(null);
    setConverted(null);
    try {
      const res = await fetch(
        `/api/admin/rss?category=${encodeURIComponent(rssCategory)}&source=${encodeURIComponent(outlet)}`
      );
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
        body: JSON.stringify({ title: item.title, description: item.description, link: item.link }),
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
          <select
            value={outlet}
            onChange={(e) => setOutlet(e.target.value)}
            className="border-2 border-[#c8bfa8] bg-[#f5f0e8] px-3 py-2 text-sm flex-1"
          >
            {availableOutlets.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
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

/* ─────────────────── 카테고리 현황 패널 ─────────────────── */
const CAT_FILL: Record<string, string> = {
  정치: "#c9b99a", 경제: "#a8b8c4", 사회: "#a8c0a8", 문화: "#b8a8c4",
  스포츠: "#c4b08a", 국제: "#a0a8c0", 기술: "#90b8b8", 환경: "#98b898",
  연예: "#c8a0b4",
};

function CategoryStats({
  polls, quotas, onQuotaChange,
}: {
  polls: PollRow[];
  quotas: Record<string, number>;
  onQuotaChange: (cat: string, target: number) => void;
}) {
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editVal, setEditVal] = useState(10);

  const counts = Object.fromEntries(
    CATEGORIES.map((c) => [c, polls.filter((p) => p.category === c).length])
  );
  const total = polls.length;

  async function handleSave(cat: string) {
    await upsertCategoryQuota(cat, editVal);
    onQuotaChange(cat, editVal);
    setEditingCat(null);
  }

  return (
    <div className="border-2 border-[#1c1712] mb-6">
      <div className="border-b-2 border-[#1c1712] bg-[#1c1712] text-[#f0e5c0] px-4 py-2 flex items-center justify-between">
        <span className="text-[10px] font-black tracking-[0.25em] uppercase">카테고리 현황</span>
        <span className="text-[10px] text-[#c8b890]">전체 {total}개</span>
      </div>

      {/* 비율 분포 바 */}
      {total > 0 && (
        <div className="flex h-4 overflow-hidden border-b border-[#c8bfa8]">
          {CATEGORIES.map((cat) => {
            const cnt = counts[cat] ?? 0;
            if (cnt === 0) return null;
            const pct = (cnt / total) * 100;
            return (
              <div
                key={cat}
                style={{ width: `${pct}%`, backgroundColor: CAT_FILL[cat] }}
                className="h-full shrink-0 relative group"
                title={`${cat} ${cnt}개 (${pct.toFixed(1)}%)`}
              >
                {pct > 8 && (
                  <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-[#1c1712]/70 leading-none">
                    {cat}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 카테고리별 행 */}
      <div className="divide-y divide-[#e8e0d0]">
        {CATEGORIES.map((cat) => {
          const count = counts[cat] ?? 0;
          const target = quotas[cat] ?? 10;
          const pct = Math.min(100, target > 0 ? (count / target) * 100 : 0);
          const statusColor = pct >= 100 ? "text-green-700" : pct >= 70 ? "text-amber-600" : "text-red-600";
          const barColor = pct >= 100 ? "#16a34a" : pct >= 70 ? "#d97706" : "#dc2626";

          return (
            <div key={cat} className="px-4 py-2.5 flex items-center gap-3">
              {/* 카테고리 이름 */}
              <div
                className="text-[10px] font-black w-10 shrink-0 px-1.5 py-0.5 text-center"
                style={{ backgroundColor: CAT_FILL[cat] }}
              >
                {cat}
              </div>

              {/* 진행 바 */}
              <div className="flex-1 h-2.5 bg-[#e8e0d0] overflow-hidden">
                <div
                  style={{ width: `${pct}%`, backgroundColor: barColor }}
                  className="h-full transition-all duration-300"
                />
              </div>

              {/* 수치 */}
              <span className={`text-[11px] font-mono font-bold w-10 text-right shrink-0 ${statusColor}`}>
                {count}/{target}
              </span>

              {/* 인라인 편집 */}
              {editingCat === cat ? (
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    value={editVal}
                    onChange={(e) => setEditVal(Number(e.target.value))}
                    min={1} max={99}
                    className="w-10 border border-[#c8bfa8] bg-[#f5f0e8] text-center text-[11px] py-0.5"
                  />
                  <button
                    onClick={() => handleSave(cat)}
                    className="text-[9px] font-bold border border-green-600 text-green-700 px-1.5 py-0.5 hover:bg-green-50"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => setEditingCat(null)}
                    className="text-[9px] border border-[#c8bfa8] text-[#8c8070] px-1.5 py-0.5 hover:border-[#1c1712]"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setEditingCat(cat); setEditVal(target); }}
                  className="text-[9px] border border-[#c8bfa8] text-[#8c8070] px-2 py-0.5 hover:border-[#1c1712] hover:text-[#1c1712] shrink-0 transition-colors"
                >
                  목표 수정
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────── 게시글 관리 탭 ─────────────────── */
function PostsTab({ polls, onRefresh, onPublishNow }: { polls: PollRow[]; onRefresh: () => Promise<void>; onPublishNow: (id: string) => Promise<{ success: boolean; error?: string }> }) {
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ title: string; category: Category; ends_at: string }>({
    title: "",
    category: "정치",
    ends_at: "",
  });
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [quotas, setQuotas] = useState<Record<string, number>>({});
  const [showStats, setShowStats] = useState(true);
  const [publishEditId, setPublishEditId] = useState<string | null>(null);
  const [publishEditValue, setPublishEditValue] = useState("");

  useEffect(() => {
    getCategoryQuotas().then(setQuotas);
  }, []);

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

  async function handleBreaking(id: string, current: boolean) {
    setSaving(id);
    const result = await toggleBreaking(id, !current);
    setSaving(null);
    if (result.success) {
      await onRefresh();
    } else {
      setMsg({ type: "err", text: result.error ?? "실패" });
    }
  }

  async function handlePin(id: string, current: boolean) {
    setSaving(id);
    const result = await togglePinned(id, !current);
    setSaving(null);
    if (result.success) {
      await onRefresh();
    } else {
      setMsg({ type: "err", text: result.error ?? "실패" });
    }
  }

  async function handlePublishNow(id: string) {
    setSaving(id);
    const result = await onPublishNow(id);
    setSaving(null);
    if (result.success) {
      setMsg({ type: "ok", text: "즉시 발행되었습니다" });
    } else {
      setMsg({ type: "err", text: result.error ?? "실패" });
    }
  }

  async function handleUpdatePublishAt(id: string) {
    if (!publishEditValue) return;
    setSaving(id);
    const utcIso = fromKSTDatetimeLocal(publishEditValue);
    const result = await updatePublishAt(id, utcIso);
    setSaving(null);
    if (result.success) {
      setPublishEditId(null);
      await onRefresh();
      setMsg({ type: "ok", text: `발행 시간이 ${formatPublishLabel(utcIso)}로 변경되었습니다` });
    } else {
      setMsg({ type: "err", text: result.error ?? "실패" });
    }
  }

  const now = new Date();
  const scheduledPolls = polls.filter(
    (p) => p.publish_status === "scheduled" && p.publish_at && new Date(p.publish_at) > now && !p.is_breaking
  );
  const activePollList = polls.filter((p) => !scheduledPolls.includes(p));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-black uppercase tracking-widest">게시글 관리 ({polls.length}개)</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowStats((v) => !v)}
            className="text-xs border border-[#c8bfa8] px-3 py-1 hover:border-[#1c1712] transition-colors"
          >
            {showStats ? "현황 숨기기" : "카테고리 현황"}
          </button>
          <button
            onClick={onRefresh}
            className="text-xs border border-[#c8bfa8] px-3 py-1 hover:border-[#1c1712] transition-colors"
          >
            새로고침
          </button>
        </div>
      </div>

      {/* 카테고리 현황 패널 */}
      {showStats && (
        <CategoryStats
          polls={polls}
          quotas={quotas}
          onQuotaChange={(cat, target) => setQuotas((prev) => ({ ...prev, [cat]: target }))}
        />
      )}

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

      {/* 발행 예정 섹션 */}
      {scheduledPolls.length > 0 && (
        <div className="border-2 border-[#1a5c75] mb-6">
          <div className="border-b-2 border-[#1a5c75] bg-[#1a5c75] text-white px-4 py-2 flex items-center justify-between">
            <span className="text-[10px] font-black tracking-[0.25em] uppercase">발행 예정 ({scheduledPolls.length})</span>
            <span className="text-[10px] text-[#a8d8e8]">publish_at {">"} 현재 시각</span>
          </div>
          <div className="divide-y divide-[#c8e0e8]">
            {scheduledPolls.map((p) => (
              <div key={p.id} className="p-4 flex items-center gap-4 bg-[#f0f8fc]">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[10px] font-bold bg-[#1c1712] text-[#f0e5c0] px-2 py-0.5">{p.category}</span>
                    <span className="text-[10px] font-bold text-[#1a5c75] border border-[#1a5c75] px-2 py-0.5">
                      {p.publish_at ? formatPublishLabel(p.publish_at) : "발행 예정"} 발행
                    </span>
                    {p.publish_at && (
                      <span className="text-[10px] text-[#6b6356] font-mono">
                        {toKSTDatetimeLocal(p.publish_at).replace("T", " ")} KST
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold leading-snug truncate">{p.title}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  {publishEditId === p.id ? (
                    <>
                      <input
                        type="datetime-local"
                        value={publishEditValue}
                        onChange={(e) => setPublishEditValue(e.target.value)}
                        className="border border-[#c8bfa8] bg-white px-2 py-1 text-xs font-mono"
                      />
                      <button
                        onClick={() => handleUpdatePublishAt(p.id)}
                        disabled={saving === p.id}
                        className="text-xs border border-green-600 bg-green-600 text-white px-3 py-1 hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        {saving === p.id ? "..." : "저장"}
                      </button>
                      <button
                        onClick={() => setPublishEditId(null)}
                        className="text-xs border border-[#c8bfa8] px-3 py-1 hover:border-[#1c1712] transition-colors"
                      >
                        취소
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handlePublishNow(p.id)}
                        disabled={saving === p.id}
                        className="text-xs border border-[#1a5c75] bg-[#1a5c75] text-white px-3 py-1 hover:bg-[#0e4055] disabled:opacity-50 transition-colors"
                      >
                        {saving === p.id ? "..." : "즉시 발행"}
                      </button>
                      <button
                        onClick={() => {
                          setPublishEditId(p.id);
                          setPublishEditValue(p.publish_at ? toKSTDatetimeLocal(p.publish_at) : "");
                        }}
                        className="text-xs border border-[#c8bfa8] px-3 py-1 hover:border-[#1c1712] transition-colors"
                      >
                        시간 변경
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-2 border-[#1c1712] divide-y-2 divide-[#c8bfa8]">
        {activePollList.length === 0 && (
          <div className="py-12 text-center text-sm text-[#8c8070]">등록된 게시글이 없습니다</div>
        )}
        {activePollList.map((p) => (
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
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                    {p.is_pinned && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-[#1a5c75] text-white">고정</span>
                    )}
                    {p.is_main_article && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 border border-[#c4b08a] text-[#6b4e20]">메인</span>
                    )}
                    {p.source_count > 1 && (
                      <span className="text-[10px] text-[#8c8070]">🔗 {p.source_count}개 언론사</span>
                    )}
                    <span className="text-[10px] text-[#8c8070] flex items-center gap-0.5">
                      {p.total_votes.toLocaleString()}명 참여
                    </span>
                    <span className="text-[10px] text-[#8c8070] flex items-center gap-0.5">
                      <Eye size={9} />
                      {(p.view_count ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm font-bold leading-snug truncate">{p.title}</p>
                  <p className="text-[11px] text-[#8c8070] mt-0.5">
                    {new Date(p.created_at).toLocaleDateString("ko-KR")}
                    {p.ends_at && ` · 마감 ${new Date(p.ends_at).toLocaleDateString("ko-KR")}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
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
                    onClick={() => handlePin(p.id, p.is_pinned)}
                    disabled={saving === p.id}
                    className={`text-xs border px-3 py-1 transition-colors disabled:opacity-50 ${
                      p.is_pinned
                        ? "border-[#1a5c75] bg-[#1a5c75] text-white hover:bg-[#0e4055]"
                        : "border-[#a0b8c4] text-[#1a5c75] hover:bg-[#e8f4f8]"
                    }`}
                  >
                    {saving === p.id ? "..." : p.is_pinned ? "고정 해제" : "고정"}
                  </button>
                  <button
                    onClick={() => handleBreaking(p.id, p.is_breaking)}
                    disabled={saving === p.id}
                    className={`text-xs border px-3 py-1 transition-colors disabled:opacity-50 ${
                      p.is_breaking
                        ? "border-red-700 bg-red-700 text-white hover:bg-red-800"
                        : "border-red-300 text-red-500 hover:bg-red-50"
                    }`}
                  >
                    {saving === p.id ? "..." : p.is_breaking ? "속보 해제" : "속보 지정"}
                  </button>
                  <button
                    onClick={() => handleToggle(p.id, p.is_active)}
                    disabled={saving === p.id}
                    className={`text-xs border px-3 py-1 transition-colors disabled:opacity-50 ${
                      p.is_active
                        ? "border-gray-400 text-gray-600 hover:bg-gray-50"
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

/* ─────────────────── 토론방 관리 탭 ─────────────────── */
type CatWithRooms = CategoryRow & { rooms: RoomRow[] };

const EMPTY_ROOM: RoomInput = {
  category_id: "", title: "", description: "", slug: "", icon: "💬", sort_order: 0, post_title: "", post_content: "", youtube_url: "",
};

function isValidYouTubeUrl(url: string): boolean {
  if (!url.trim()) return true;
  return /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}/.test(url);
}

function RoomsManagementTab() {
  const [categories, setCategories] = useState<CatWithRooms[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [globalMsg, setGlobalMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [addingCat, setAddingCat] = useState(false);
  const [newCatForm, setNewCatForm] = useState({ name: "", sort_order: 1 });
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatForm, setEditCatForm] = useState({ name: "", sort_order: 0 });

  const [addingRoomCatId, setAddingRoomCatId] = useState<string | null>(null);
  const [newRoomForm, setNewRoomForm] = useState<RoomInput>(EMPTY_ROOM);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editRoomForm, setEditRoomForm] = useState<RoomInput>(EMPTY_ROOM);

  function flash(type: "ok" | "err", text: string) {
    setGlobalMsg({ type, text });
    setTimeout(() => setGlobalMsg(null), 3000);
  }

  async function reload() {
    const data = await getCategoriesWithRooms();
    setCategories(data);
  }

  useEffect(() => { reload().finally(() => setDataLoading(false)); }, []);

  async function handleAddCat() {
    if (!newCatForm.name.trim()) return;
    setSaving(true);
    const r = await createCategory({ name: newCatForm.name, sort_order: newCatForm.sort_order });
    setSaving(false);
    if (r.success) { flash("ok", "카테고리 추가됨"); setAddingCat(false); setNewCatForm({ name: "", sort_order: 1 }); await reload(); }
    else flash("err", r.error ?? "실패");
  }

  async function handleUpdateCat(id: string) {
    if (!editCatForm.name.trim()) return;
    setSaving(true);
    const r = await updateCategory(id, { name: editCatForm.name, sort_order: editCatForm.sort_order });
    setSaving(false);
    if (r.success) { flash("ok", "수정됨"); setEditingCatId(null); await reload(); }
    else flash("err", r.error ?? "실패");
  }

  async function handleDeleteCat(id: string, name: string) {
    if (!confirm(`"${name}" 카테고리를 삭제하면 하위 채팅방도 모두 삭제됩니다. 계속할까요?`)) return;
    setSaving(true);
    const r = await deleteCategory(id);
    setSaving(false);
    if (r.success) { flash("ok", "삭제됨"); await reload(); }
    else flash("err", r.error ?? "실패");
  }

  async function handleAddRoom(catId: string) {
    if (!newRoomForm.title.trim() || !newRoomForm.slug.trim()) return;
    setSaving(true);
    const r = await createRoom({ ...newRoomForm, category_id: catId });
    setSaving(false);
    if (r.success) { flash("ok", "방 추가됨"); setAddingRoomCatId(null); setNewRoomForm(EMPTY_ROOM); await reload(); }
    else flash("err", r.error ?? "실패");
  }

  async function handleUpdateRoom(id: string) {
    if (!editRoomForm.title.trim() || !editRoomForm.slug.trim()) return;
    setSaving(true);
    const r = await updateRoom(id, editRoomForm);
    setSaving(false);
    if (r.success) { flash("ok", "수정됨"); setEditingRoomId(null); await reload(); }
    else flash("err", r.error ?? "실패");
  }

  async function handleDeleteRoom(id: string, title: string) {
    if (!confirm(`"${title}" 채팅방을 삭제할까요? 기존 채팅 메시지는 유지됩니다.`)) return;
    setSaving(true);
    const r = await deleteRoom(id);
    setSaving(false);
    if (r.success) { flash("ok", "삭제됨"); await reload(); }
    else flash("err", r.error ?? "실패");
  }

  if (dataLoading) return <div className="py-16 text-center text-sm text-[#8c8070]">로딩 중...</div>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-black uppercase tracking-widest">토론방 관리</h2>
        <button
          onClick={() => { setAddingCat(true); setEditingCatId(null); }}
          disabled={addingCat}
          className="text-xs border-2 border-[#1c1712] bg-[#1c1712] text-[#f0e5c0] px-4 py-1.5 font-bold hover:bg-[#3d2b1f] transition-colors disabled:opacity-50"
        >
          + 카테고리 추가
        </button>
      </div>

      {globalMsg && (
        <div className={`border-2 p-3 mb-4 text-sm font-medium ${globalMsg.type === "ok" ? "border-green-700 bg-green-50 text-green-800" : "border-red-700 bg-red-50 text-red-800"}`}>
          {globalMsg.text}
        </div>
      )}

      {addingCat && (
        <div className="border-2 border-[#1c1712] p-4 mb-4 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#6b6356]">새 카테고리</p>
          <div className="flex gap-2">
            <input
              value={newCatForm.name}
              onChange={(e) => setNewCatForm({ ...newCatForm, name: e.target.value })}
              placeholder="카테고리 이름"
              className="flex-1 border-2 border-[#c8bfa8] bg-[#f5f0e8] px-3 py-2 text-sm font-bold"
            />
            <input
              type="number"
              value={newCatForm.sort_order}
              onChange={(e) => setNewCatForm({ ...newCatForm, sort_order: Number(e.target.value) })}
              placeholder="순서"
              className="w-20 border-2 border-[#c8bfa8] bg-[#f5f0e8] px-3 py-2 text-sm text-center"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddCat} disabled={saving} className="border-2 border-[#1c1712] bg-[#1c1712] text-[#f0e5c0] px-4 py-1.5 text-sm font-bold disabled:opacity-50">
              {saving ? "저장 중..." : "추가"}
            </button>
            <button onClick={() => setAddingCat(false)} className="border-2 border-[#c8bfa8] px-4 py-1.5 text-sm hover:border-[#1c1712]">취소</button>
          </div>
        </div>
      )}

      {categories.length === 0 && !addingCat && (
        <div className="border-2 border-[#c8bfa8] py-16 text-center text-sm text-[#8c8070]">
          카테고리가 없습니다. 마이그레이션 SQL을 실행하거나 카테고리를 추가해주세요.
        </div>
      )}

      <div className="space-y-4">
        {categories.map((cat) => {
          const accent = CAT_FILL[cat.name] ?? "#c8bfa8";
          return (
            <div key={cat.id} className="border-2 border-[#1c1712] overflow-hidden">
              {/* 카테고리 헤더 */}
              <div className="flex items-stretch">
                <div className="w-1.5 shrink-0" style={{ backgroundColor: accent }} />
                <div className="flex-1 bg-[#1c1712] text-[#f0e5c0] px-4 py-2.5 flex items-center justify-between">
                  {editingCatId === cat.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        value={editCatForm.name}
                        onChange={(e) => setEditCatForm({ ...editCatForm, name: e.target.value })}
                        className="flex-1 bg-[#3d2b1f] border border-[#c8b890] px-2 py-1 text-sm font-bold text-[#f0e5c0]"
                      />
                      <input
                        type="number"
                        value={editCatForm.sort_order}
                        onChange={(e) => setEditCatForm({ ...editCatForm, sort_order: Number(e.target.value) })}
                        className="w-16 bg-[#3d2b1f] border border-[#c8b890] px-2 py-1 text-sm text-center text-[#f0e5c0]"
                      />
                      <button onClick={() => handleUpdateCat(cat.id)} disabled={saving} className="text-xs border border-[#c8b890] px-3 py-1 hover:bg-[#3d2b1f] disabled:opacity-50">저장</button>
                      <button onClick={() => setEditingCatId(null)} className="text-xs border border-[#c8b890] px-3 py-1 hover:bg-[#3d2b1f]">취소</button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-base font-serif">{cat.name}</span>
                        <span className="text-[10px] text-[#c8b890]">{cat.rooms.length}개 방</span>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => { setAddingRoomCatId(cat.id); setNewRoomForm({ ...EMPTY_ROOM, category_id: cat.id }); setEditingRoomId(null); }}
                          disabled={addingRoomCatId === cat.id}
                          className="text-xs border border-[#c8b890] bg-[#c8b890] text-[#1c1712] px-3 py-1 font-bold hover:bg-[#f0e5c0] transition-colors disabled:opacity-50"
                        >
                          + 방 추가
                        </button>
                        <button
                          onClick={() => { setEditingCatId(cat.id); setEditCatForm({ name: cat.name, sort_order: cat.sort_order }); }}
                          className="text-xs border border-[#c8b890] px-3 py-1 hover:bg-[#3d2b1f] transition-colors"
                        >수정</button>
                        <button
                          onClick={() => handleDeleteCat(cat.id, cat.name)}
                          className="text-xs border border-red-400 text-red-300 px-3 py-1 hover:bg-red-900/30 transition-colors"
                        >삭제</button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 방 추가 폼 */}
              {addingRoomCatId === cat.id && (
                <div className="p-4 bg-[#faf6ee] border-b-2 border-[#c8bfa8]">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#6b6356] mb-3">새 채팅방 추가</p>
                  <RoomForm
                    form={{ ...newRoomForm, category_id: cat.id }}
                    onChange={setNewRoomForm}
                    categories={categories}
                    onSave={() => handleAddRoom(cat.id)}
                    onCancel={() => { setAddingRoomCatId(null); setNewRoomForm(EMPTY_ROOM); }}
                    saving={saving}
                    saveLabel="추가"
                  />
                </div>
              )}

              {/* 방 목록 */}
              <div className="divide-y divide-[#e8e0d0]">
                {cat.rooms.length === 0 && addingRoomCatId !== cat.id && (
                  <div className="px-4 py-6 text-center text-xs text-[#a09080]">
                    방이 없습니다. + 방 추가를 눌러 추가하세요.
                  </div>
                )}
                {cat.rooms.map((room) => (
                  <div key={room.id} className="p-4 bg-[#fdf8f0]">
                    {editingRoomId === room.id ? (
                      <RoomForm
                        form={editRoomForm}
                        onChange={setEditRoomForm}
                        categories={categories}
                        onSave={() => handleUpdateRoom(room.id)}
                        onCancel={() => setEditingRoomId(null)}
                        saving={saving}
                        saveLabel="저장"
                      />
                    ) : (
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xl shrink-0">{room.icon ?? "💬"}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-sm">{room.title}</span>
                              <span className="text-[10px] font-mono text-[#8c8070] bg-[#f0ece4] px-1.5 py-0.5">/{room.slug}</span>
                              {room.post_title && (
                                <span className="text-[9px] border border-[#4d9ab5] text-[#4d9ab5] px-1.5 py-0.5">게시글</span>
                              )}
                            </div>
                            {room.description && (
                              <p className="text-xs text-[#8c8070] mt-0.5 truncate max-w-xs">{room.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <a
                            href={`/rooms/${room.slug}`}
                            target="_blank"
                            className="text-xs border border-[#c8bfa8] px-3 py-1 hover:border-[#1c1712] transition-colors"
                          >보기</a>
                          <button
                            onClick={() => {
                              setEditingRoomId(room.id);
                              setEditRoomForm({
                                category_id: room.category_id,
                                title: room.title,
                                description: room.description ?? "",
                                slug: room.slug,
                                icon: room.icon ?? "💬",
                                sort_order: room.sort_order,
                                post_title: room.post_title ?? "",
                                post_content: room.post_content ?? "",
                                youtube_url: room.youtube_url ?? "",
                              });
                              setAddingRoomCatId(null);
                            }}
                            className="text-xs border border-[#c8bfa8] px-3 py-1 hover:border-[#1c1712] transition-colors"
                          >수정</button>
                          <button
                            onClick={() => handleDeleteRoom(room.id, room.title)}
                            className="text-xs border border-red-400 text-red-600 px-3 py-1 hover:bg-red-50 transition-colors"
                          >삭제</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function generateSlug(title: string): string {
  const ascii = title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  if (ascii.length > 0) return ascii.slice(0, 50);
  return `room-${Date.now()}`;
}

function RoomForm({
  form, onChange, categories, onSave, onCancel, saving, saveLabel,
}: {
  form: RoomInput;
  onChange: (v: RoomInput) => void;
  categories: CatWithRooms[];
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  saveLabel: string;
}) {
  const [showPost, setShowPost] = useState(!!(form.post_title || form.post_content));
  const [slugEdited, setSlugEdited] = useState(!!form.slug);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-[#6b6356] block mb-1">제목 *</label>
          <input
            value={form.title}
            onChange={(e) => {
              const title = e.target.value;
              onChange({ ...form, title, slug: slugEdited ? form.slug : generateSlug(title) });
            }}
            placeholder="주식"
            maxLength={50}
            className="w-full border-2 border-[#c8bfa8] bg-white px-3 py-2 text-sm font-bold"
          />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-[#6b6356] block mb-1">슬러그 * (URL)</label>
          <input
            value={form.slug}
            onChange={(e) => {
              setSlugEdited(true);
              onChange({ ...form, slug: e.target.value.replace(/[^a-z0-9-]/g, "") });
            }}
            placeholder="stocks"
            maxLength={50}
            className="w-full border-2 border-[#c8bfa8] bg-white px-3 py-2 text-sm font-mono"
          />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-[#6b6356] block mb-1">아이콘 (이모지)</label>
          <input
            value={form.icon ?? ""}
            onChange={(e) => onChange({ ...form, icon: e.target.value })}
            placeholder="📈"
            maxLength={4}
            className="w-full border-2 border-[#c8bfa8] bg-white px-3 py-2 text-sm text-center"
          />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-[#6b6356] block mb-1">순서</label>
          <input
            type="number"
            value={form.sort_order ?? 0}
            onChange={(e) => onChange({ ...form, sort_order: Number(e.target.value) })}
            className="w-full border-2 border-[#c8bfa8] bg-white px-3 py-2 text-sm text-center"
          />
        </div>
      </div>
      <div>
        <label className="text-[10px] font-black uppercase tracking-widest text-[#6b6356] block mb-1">설명 (선택)</label>
        <textarea
          value={form.description ?? ""}
          onChange={(e) => onChange({ ...form, description: e.target.value })}
          placeholder="방 설명"
          rows={2}
          maxLength={500}
          className="w-full border-2 border-[#c8bfa8] bg-white px-3 py-2 text-sm leading-relaxed resize-none"
        />
      </div>
      <div>
        <label className="text-[10px] font-black uppercase tracking-widest text-[#6b6356] block mb-1">카테고리</label>
        <select
          value={form.category_id}
          onChange={(e) => onChange({ ...form, category_id: e.target.value })}
          className="w-full border-2 border-[#c8bfa8] bg-white px-3 py-2 text-sm"
        >
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* 주제 게시글 */}
      <div className="border-t border-[#e8e0d0] pt-3">
        <button
          type="button"
          onClick={() => setShowPost((v) => !v)}
          className="text-[10px] font-black uppercase tracking-widest text-[#6b6356] flex items-center gap-1 hover:text-[#1c1712] transition-colors"
        >
          {showPost ? "▲" : "▼"} 주제 게시글 {showPost ? "접기" : "설정 (선택)"}
        </button>
        {showPost && (
          <div className="mt-3 space-y-2">
            <input
              value={form.post_title ?? ""}
              onChange={(e) => onChange({ ...form, post_title: e.target.value })}
              placeholder="게시글 제목"
              maxLength={200}
              className="w-full border-2 border-[#c8bfa8] bg-white px-3 py-2 text-sm font-bold"
            />
            <textarea
              value={form.post_content ?? ""}
              onChange={(e) => onChange({ ...form, post_content: e.target.value })}
              placeholder="게시글 내용"
              rows={6}
              maxLength={2000}
              className="w-full border-2 border-[#c8bfa8] bg-white px-3 py-2 text-sm leading-relaxed resize-none"
            />
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[#6b6356] block mb-1">유튜브 URL (선택)</label>
              <input
                value={form.youtube_url ?? ""}
                onChange={(e) => onChange({ ...form, youtube_url: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
                className={`w-full border-2 bg-white px-3 py-2 text-sm ${
                  form.youtube_url && !isValidYouTubeUrl(form.youtube_url)
                    ? "border-red-400"
                    : "border-[#c8bfa8]"
                }`}
              />
              {form.youtube_url && !isValidYouTubeUrl(form.youtube_url) && (
                <p className="text-[10px] text-red-600 mt-0.5">유효하지 않은 유튜브 URL입니다</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={onSave}
          disabled={saving || !form.title.trim() || !form.slug.trim()}
          className="border-2 border-[#1c1712] bg-[#1c1712] text-[#f0e5c0] px-5 py-2 text-sm font-bold hover:bg-[#3d2b1f] disabled:opacity-50 transition-colors"
        >
          {saving ? "저장 중..." : saveLabel}
        </button>
        <button
          onClick={onCancel}
          className="border-2 border-[#c8bfa8] px-4 py-2 text-sm hover:border-[#1c1712] transition-colors"
        >취소</button>
      </div>
    </div>
  );
}

/* ─────────────────── 직접 작성 탭 ─────────────────── */
function WriteTab({ onCreated }: { onCreated: () => Promise<void> }) {
  const empty = { title: "", description: "", category: "정치" as Category, ends_at: "", options: ["", ""], youtube_url: "" };
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
    if (!isValidYouTubeUrl(form.youtube_url))
      return setMsg({ type: "err", text: "유효하지 않은 유튜브 URL입니다" });

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

        <div className="p-5 space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-[#6b6356] block">
            유튜브 URL (선택)
          </label>
          <input
            value={form.youtube_url}
            onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
            placeholder="https://www.youtube.com/watch?v=... 또는 https://youtu.be/..."
            className={`w-full border-2 bg-[#f5f0e8] px-3 py-2 text-sm ${
              form.youtube_url && !isValidYouTubeUrl(form.youtube_url)
                ? "border-red-400"
                : "border-[#c8bfa8]"
            }`}
          />
          {form.youtube_url && !isValidYouTubeUrl(form.youtube_url) && (
            <p className="text-[10px] text-red-600">유효하지 않은 유튜브 URL입니다</p>
          )}
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
