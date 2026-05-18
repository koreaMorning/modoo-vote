"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getThemes,
  createTheme,
  updateTheme,
  deleteTheme,
  getThemeLinkedItems,
  addThemePoll,
  removeThemePoll,
  addThemeRoom,
  removeThemeRoom,
  getPolls,
  getCategoriesWithRooms,
  ThemeRow,
} from "./actions";

interface ThemeForm {
  title: string;
  description: string;
  end_date: string;
  is_active: boolean;
  sort_order: string;
}

interface MinPoll { id: string; title: string; category: string }
interface MinRoom { slug: string; title: string; category: string }

const EMPTY_FORM: ThemeForm = {
  title: "", description: "", end_date: "", is_active: true, sort_order: "0",
};

function themeToForm(t: ThemeRow): ThemeForm {
  return {
    title: t.title,
    description: t.description ?? "",
    end_date: t.end_date ?? "",
    is_active: t.is_active,
    sort_order: String(t.sort_order),
  };
}

function dday(endDate: string | null): string {
  if (!endDate) return "상시";
  const diff = Math.ceil(
    (new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (diff < 0) return "종료";
  if (diff === 0) return "오늘 마감";
  return `D-${diff}`;
}

export default function ThemesTab() {
  const [themes, setThemes] = useState<(ThemeRow & { poll_count: number })[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<ThemeForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [linkedPollIds, setLinkedPollIds] = useState<string[]>([]);
  const [linkedRoomSlugs, setLinkedRoomSlugs] = useState<string[]>([]);
  const [addPollId, setAddPollId] = useState("");
  const [addRoomSlug, setAddRoomSlug] = useState("");
  const [linkSaving, setLinkSaving] = useState(false);

  const [allPolls, setAllPolls] = useState<MinPoll[]>([]);
  const [allRooms, setAllRooms] = useState<MinRoom[]>([]);

  const flash = (type: "ok" | "err", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  };

  const loadThemes = useCallback(async () => {
    const data = await getThemes();
    setThemes(data);
  }, []);

  const loadLinked = useCallback(async (id: string) => {
    const { pollIds, roomSlugs } = await getThemeLinkedItems(id);
    setLinkedPollIds(pollIds);
    setLinkedRoomSlugs(roomSlugs);
    setAddPollId("");
    setAddRoomSlug("");
  }, []);

  useEffect(() => {
    loadThemes();
    getPolls().then((data) =>
      setAllPolls(
        (data as MinPoll[]).map((p) => ({ id: p.id, title: p.title, category: p.category }))
      )
    );
    getCategoriesWithRooms().then((cats) =>
      setAllRooms(
        cats.flatMap((c) =>
          c.rooms.map((r) => ({ slug: r.slug, title: r.title, category: c.name }))
        )
      )
    );
  }, [loadThemes]);

  useEffect(() => {
    if (selectedId) loadLinked(selectedId);
    else { setLinkedPollIds([]); setLinkedRoomSlugs([]); }
  }, [selectedId, loadLinked]);

  function selectTheme(t: ThemeRow) {
    setSelectedId(t.id);
    setIsCreating(false);
    setForm(themeToForm(t));
  }

  function startCreate() {
    setSelectedId(null);
    setIsCreating(true);
    setForm(EMPTY_FORM);
  }

  async function handleSave() {
    if (!form.title.trim()) return flash("err", "제목을 입력하세요");
    setSaving(true);
    const input = {
      title: form.title,
      description: form.description,
      end_date: form.end_date || undefined,
      is_active: form.is_active,
      sort_order: parseInt(form.sort_order) || 0,
    };
    if (isCreating) {
      const res = await createTheme(input);
      if (!res.success) { flash("err", res.error ?? "실패"); setSaving(false); return; }
      flash("ok", "테마가 생성되었습니다");
      setIsCreating(false);
      await loadThemes();
      if (res.id) {
        const updated = await getThemes();
        setThemes(updated);
        const created = updated.find((t) => t.id === res.id);
        if (created) selectTheme(created);
      }
    } else if (selectedId) {
      const res = await updateTheme(selectedId, input);
      if (!res.success) { flash("err", res.error ?? "실패"); setSaving(false); return; }
      flash("ok", "저장되었습니다");
      await loadThemes();
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!selectedId) return;
    if (!confirm("테마를 삭제하시겠습니까? 연결된 게시글/토론방 연결도 모두 삭제됩니다.")) return;
    setSaving(true);
    const res = await deleteTheme(selectedId);
    if (!res.success) { flash("err", res.error ?? "실패"); setSaving(false); return; }
    setSelectedId(null);
    setIsCreating(false);
    flash("ok", "삭제되었습니다");
    await loadThemes();
    setSaving(false);
  }

  async function handleAddPoll() {
    if (!selectedId || !addPollId) return;
    setLinkSaving(true);
    const res = await addThemePoll(selectedId, addPollId);
    if (!res.success) flash("err", res.error ?? "실패");
    else { await loadLinked(selectedId); await loadThemes(); }
    setLinkSaving(false);
  }

  async function handleRemovePoll(pollId: string) {
    if (!selectedId) return;
    setLinkSaving(true);
    const res = await removeThemePoll(selectedId, pollId);
    if (!res.success) flash("err", res.error ?? "실패");
    else { await loadLinked(selectedId); await loadThemes(); }
    setLinkSaving(false);
  }

  async function handleAddRoom() {
    if (!selectedId || !addRoomSlug) return;
    setLinkSaving(true);
    const res = await addThemeRoom(selectedId, addRoomSlug);
    if (!res.success) flash("err", res.error ?? "실패");
    else await loadLinked(selectedId);
    setLinkSaving(false);
  }

  async function handleRemoveRoom(slug: string) {
    if (!selectedId) return;
    setLinkSaving(true);
    const res = await removeThemeRoom(selectedId, slug);
    if (!res.success) flash("err", res.error ?? "실패");
    else await loadLinked(selectedId);
    setLinkSaving(false);
  }

  const linkedPollSet = new Set(linkedPollIds);
  const linkedRoomSet = new Set(linkedRoomSlugs);
  const availablePolls = allPolls.filter((p) => !linkedPollSet.has(p.id));
  const availableRooms = allRooms.filter((r) => !linkedRoomSet.has(r.slug));

  const linkedPollObjects = linkedPollIds
    .map((id) => allPolls.find((p) => p.id === id))
    .filter(Boolean) as MinPoll[];
  const linkedRoomObjects = linkedRoomSlugs
    .map((slug) => allRooms.find((r) => r.slug === slug))
    .filter(Boolean) as MinRoom[];

  const showDetail = isCreating || !!selectedId;

  return (
    <div className="text-sm text-[#1c1712]">
      {msg && (
        <div
          className={`mb-4 px-4 py-2 text-sm font-bold ${
            msg.type === "ok"
              ? "bg-[#d4ecd4] text-[#1a5c1a] border border-[#a8c8a8]"
              : "bg-[#f8d4d4] text-[#8b1a1a] border border-[#c8a8a8]"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* ── 좌측: 테마 목록 ── */}
        <div>
          <div className="border-t-[3px] border-[#1c1712] border-b border-[#c8bfa8] flex items-center justify-between py-1.5 mb-3">
            <span className="text-[11px] font-black tracking-widest uppercase">테마 목록</span>
            <button
              onClick={startCreate}
              className="text-[10px] font-bold px-2 py-0.5 bg-[#1c1712] text-white hover:bg-[#3d3326] transition-colors"
            >
              + 새 테마
            </button>
          </div>

          {themes.length === 0 ? (
            <p className="text-[11px] text-[#a09080] py-4 text-center">테마 없음</p>
          ) : (
            <div className="space-y-1">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectTheme(t)}
                  className={`w-full text-left px-3 py-2.5 border transition-colors ${
                    selectedId === t.id
                      ? "border-[#1c1712] bg-[#f5f0e8]"
                      : "border-[#c8bfa8] hover:bg-[#fdf8f0]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[12px] truncate">{t.title}</span>
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.5 shrink-0 ${
                        t.is_active
                          ? "bg-[#1c1712] text-white"
                          : "bg-[#c8bfa8] text-[#6b6356]"
                      }`}
                    >
                      {t.is_active ? "활성" : "비활성"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-[#8c8070]">{dday(t.end_date)}</span>
                    <span className="text-[10px] text-[#a09080]">투표 {t.poll_count}개</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── 우측: 상세/편집 ── */}
        {showDetail ? (
          <div>
            <div className="border-t-[3px] border-[#1c1712] border-b border-[#c8bfa8] py-1.5 mb-4">
              <span className="text-[11px] font-black tracking-widest uppercase">
                {isCreating ? "새 테마 생성" : "테마 편집"}
              </span>
            </div>

            {/* 편집 폼 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold tracking-widest uppercase text-[#6b6356] mb-1">제목 *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full border border-[#c8bfa8] px-3 py-1.5 text-sm focus:border-[#1c1712] outline-none"
                  placeholder="테마 제목"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold tracking-widest uppercase text-[#6b6356] mb-1">설명</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full border border-[#c8bfa8] px-3 py-1.5 text-sm focus:border-[#1c1712] outline-none resize-none"
                  placeholder="테마 설명 (선택)"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase text-[#6b6356] mb-1">종료일</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                  className="w-full border border-[#c8bfa8] px-3 py-1.5 text-sm focus:border-[#1c1712] outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase text-[#6b6356] mb-1">정렬 순서</label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                  className="w-full border border-[#c8bfa8] px-3 py-1.5 text-sm focus:border-[#1c1712] outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="w-4 h-4 accent-[#1c1712]"
                />
                <label htmlFor="is_active" className="text-sm font-bold">활성 테마</label>
              </div>
            </div>

            <div className="flex gap-2 mb-8">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 bg-[#1c1712] text-white text-sm font-bold hover:bg-[#3d3326] transition-colors disabled:opacity-50"
              >
                {saving ? "저장 중..." : isCreating ? "생성" : "저장"}
              </button>
              {!isCreating && (
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="px-4 py-1.5 border border-[#c8100a] text-[#c8100a] text-sm font-bold hover:bg-[#c8100a] hover:text-white transition-colors disabled:opacity-50"
                >
                  삭제
                </button>
              )}
              <button
                onClick={() => { setIsCreating(false); setSelectedId(null); }}
                className="px-4 py-1.5 border border-[#c8bfa8] text-[#6b6356] text-sm hover:bg-[#f5f0e8] transition-colors"
              >
                취소
              </button>
            </div>

            {/* 연결된 항목 (편집 모드에서만) */}
            {!isCreating && selectedId && (
              <div className="space-y-6">
                {/* 연결된 게시글 */}
                <div>
                  <div className="border-t-2 border-[#1c1712] pt-3 mb-3">
                    <span className="text-[11px] font-black tracking-widest uppercase">연결된 투표 게시글</span>
                  </div>
                  <div className="flex gap-2 mb-3">
                    <select
                      value={addPollId}
                      onChange={(e) => setAddPollId(e.target.value)}
                      className="flex-1 border border-[#c8bfa8] px-2 py-1.5 text-xs focus:border-[#1c1712] outline-none"
                    >
                      <option value="">게시글 선택...</option>
                      {availablePolls.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.category}] {p.title}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleAddPoll}
                      disabled={!addPollId || linkSaving}
                      className="px-3 py-1 text-xs font-bold bg-[#1c1712] text-white hover:bg-[#3d3326] disabled:opacity-40 transition-colors"
                    >
                      추가
                    </button>
                  </div>
                  {linkedPollObjects.length === 0 ? (
                    <p className="text-[11px] text-[#a09080]">연결된 게시글 없음</p>
                  ) : (
                    <div className="space-y-1">
                      {linkedPollObjects.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between px-3 py-1.5 bg-[#fdf8f0] border border-[#c8bfa8]"
                        >
                          <span className="text-[11px]">
                            <span className="font-bold text-[#6b6356]">[{p.category}]</span>{" "}
                            {p.title}
                          </span>
                          <button
                            onClick={() => handleRemovePoll(p.id)}
                            disabled={linkSaving}
                            className="text-[10px] text-[#c8100a] hover:underline disabled:opacity-40 ml-2 shrink-0"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 연결된 토론방 */}
                <div>
                  <div className="border-t-2 border-[#1c1712] pt-3 mb-3">
                    <span className="text-[11px] font-black tracking-widest uppercase">연결된 토론방</span>
                  </div>
                  <div className="flex gap-2 mb-3">
                    <select
                      value={addRoomSlug}
                      onChange={(e) => setAddRoomSlug(e.target.value)}
                      className="flex-1 border border-[#c8bfa8] px-2 py-1.5 text-xs focus:border-[#1c1712] outline-none"
                    >
                      <option value="">토론방 선택...</option>
                      {availableRooms.map((r) => (
                        <option key={r.slug} value={r.slug}>
                          [{r.category}] {r.title}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleAddRoom}
                      disabled={!addRoomSlug || linkSaving}
                      className="px-3 py-1 text-xs font-bold bg-[#1c1712] text-white hover:bg-[#3d3326] disabled:opacity-40 transition-colors"
                    >
                      추가
                    </button>
                  </div>
                  {linkedRoomObjects.length === 0 ? (
                    <p className="text-[11px] text-[#a09080]">연결된 토론방 없음</p>
                  ) : (
                    <div className="space-y-1">
                      {linkedRoomObjects.map((r) => (
                        <div
                          key={r.slug}
                          className="flex items-center justify-between px-3 py-1.5 bg-[#fdf8f0] border border-[#c8bfa8]"
                        >
                          <span className="text-[11px]">
                            <span className="font-bold text-[#6b6356]">[{r.category}]</span>{" "}
                            {r.title}
                          </span>
                          <button
                            onClick={() => handleRemoveRoom(r.slug)}
                            disabled={linkSaving}
                            className="text-[10px] text-[#c8100a] hover:underline disabled:opacity-40 ml-2 shrink-0"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-48 border-2 border-dashed border-[#c8bfa8] text-[#a09080] text-sm">
            테마를 선택하거나 새 테마를 생성하세요
          </div>
        )}
      </div>
    </div>
  );
}
