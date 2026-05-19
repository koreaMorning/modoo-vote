"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { createPoll, deleteYoutubeVideo, deleteAllYoutubeVideos } from "./actions";
import { Category } from "@/types";

const CATEGORIES: Category[] = ["정치", "경제", "사회", "국제", "문화", "스포츠", "연예"];

const CHANNEL_FILTERS = ["전체", "KBS", "MBC", "SBS", "JTBC", "YTN"];

function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ");
}

interface VideoRow {
  id: string;
  video_id: string;
  channel_name: string;
  title: string;
  description: string | null;
  published_at: string;
  thumbnail_url: string | null;
  view_count: number;
}

interface Converted {
  title: string;
  description: string;
  options: string[];
}

export default function VideoNewsTab() {
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [channelFilter, setChannelFilter] = useState("전체");
  const [selected, setSelected] = useState<VideoRow | null>(null);
  const [converted, setConverted] = useState<Converted | null>(null);
  const [converting, setConverting] = useState(false);
  const [saveCategory, setSaveCategory] = useState<Category>("정치");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function loadVideos() {
    const supabase = createClient();
    const { data } = await supabase
      .from("youtube_news")
      .select("*")
      .order("view_count", { ascending: false });
    setVideos((data as VideoRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { loadVideos(); }, []);

  async function handleCollect() {
    setCollecting(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/youtube-news");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMsg({ type: "ok", text: `${data.count}개 영상 수집 완료` });
      await loadVideos();
    } catch (e) {
      setMsg({ type: "err", text: "수집 실패: " + String(e) });
    } finally {
      setCollecting(false);
    }
  }

  async function handleConvert(video: VideoRow) {
    setSelected(video);
    setConverted(null);
    setConverting(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: decodeHtml(video.title),
          description: decodeHtml(video.description ?? ""),
          link: `https://www.youtube.com/watch?v=${video.video_id}`,
        }),
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

  async function handleDeleteOne(id: string) {
    setDeletingId(id);
    setMsg(null);
    const result = await deleteYoutubeVideo(id);
    setDeletingId(null);
    if (result.success) {
      await loadVideos();
      if (selected?.id === id) { setSelected(null); setConverted(null); }
    } else {
      setMsg({ type: "err", text: "삭제 실패: " + (result.error ?? "") });
    }
  }

  async function handleDeleteAll() {
    if (!confirm("youtube_news 테이블의 모든 영상을 삭제하시겠습니까?")) return;
    setDeletingAll(true);
    setMsg(null);
    const result = await deleteAllYoutubeVideos();
    setDeletingAll(false);
    if (result.success) {
      setSelected(null);
      setConverted(null);
      await loadVideos();
      setMsg({ type: "ok", text: "전체 삭제 완료" });
    } else {
      setMsg({ type: "err", text: "전체 삭제 실패: " + (result.error ?? "") });
    }
  }

  async function handleSave() {
    if (!converted) return;
    setSaving(true);
    setMsg(null);
    const result = await createPoll({
      title: converted.title,
      description: converted.description,
      category: saveCategory,
      options: converted.options,
      youtube_url: selected ? `https://www.youtube.com/watch?v=${selected.video_id}` : "",
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

  const filtered =
    channelFilter === "전체"
      ? videos
      : videos.filter((v) => v.channel_name.includes(channelFilter));

  const countByChannel = (ch: string) =>
    ch === "전체"
      ? videos.length
      : videos.filter((v) => v.channel_name.includes(ch)).length;

  return (
    <div>
      {/* 상단 툴바 */}
      <div className="flex items-center justify-between mb-4 gap-4">
        <h2 className="text-sm font-black uppercase tracking-widest shrink-0">영상 뉴스</h2>
        <div className="flex gap-2">
          <button
            onClick={handleDeleteAll}
            disabled={deletingAll || videos.length === 0}
            className="border-2 border-red-700 bg-red-700 text-white px-4 py-2 text-sm font-bold hover:bg-red-800 transition-colors disabled:opacity-50 shrink-0"
          >
            {deletingAll ? "삭제 중..." : "전체 삭제"}
          </button>
          <button
            onClick={handleCollect}
            disabled={collecting}
            className="border-2 border-[#1c1712] bg-[#1c1712] text-[#f0e5c0] px-4 py-2 text-sm font-bold hover:bg-[#3d2b1f] transition-colors disabled:opacity-50 shrink-0"
          >
            {collecting ? "수집 중..." : "영상 수집"}
          </button>
        </div>
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
        </div>
      )}

      {/* 채널 필터 탭 */}
      <div className="flex gap-0 border-b-2 border-[#1c1712] mb-6">
        {CHANNEL_FILTERS.map((ch) => (
          <button
            key={ch}
            onClick={() => setChannelFilter(ch)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold border-b-2 -mb-0.5 transition-colors ${
              channelFilter === ch
                ? "border-[#1c1712] text-[#1c1712] bg-[#f5f0e8]"
                : "border-transparent text-[#6b6356] hover:text-[#1c1712]"
            }`}
          >
            {ch}
            <span className="text-[10px] text-[#8c8070]">({countByChannel(ch)})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-[#8c8070]">로딩 중...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 영상 목록 */}
          <div className="space-y-3">
            {filtered.length === 0 && (
              <div className="border-2 border-[#c8bfa8] py-16 text-center text-sm text-[#8c8070]">
                영상이 없습니다. 영상 수집을 눌러주세요.
              </div>
            )}
            {filtered.map((video) => (
              <div
                key={video.id}
                className={`border-2 bg-[#fdf8f0] transition-colors ${
                  selected?.id === video.id
                    ? "border-[#1c1712]"
                    : "border-[#c8bfa8] hover:border-[#1c1712]"
                }`}
              >
                <div className="flex gap-3 p-3">
                  {/* 썸네일 */}
                  {video.thumbnail_url && (
                    <a
                      href={`https://www.youtube.com/watch?v=${video.video_id}`}
                      target="_blank"
                      className="shrink-0"
                    >
                      <img
                        src={video.thumbnail_url}
                        alt={video.title}
                        className="w-28 h-16 object-cover"
                      />
                    </a>
                  )}
                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="text-[10px] font-black bg-[#1c1712] text-[#f0e5c0] px-2 py-0.5">
                        {video.channel_name}
                      </span>
                      <span className="text-[10px] text-[#8c8070]">
                        조회 {video.view_count.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-[#8c8070]">
                        {new Date(video.published_at).toLocaleDateString("ko-KR", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-xs font-bold leading-snug line-clamp-2 mb-2">
                      {decodeHtml(video.title)}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleConvert(video)}
                        disabled={converting && selected?.id === video.id}
                        className="text-[11px] border-2 border-[#1c1712] bg-[#1c1712] text-[#f0e5c0] px-3 py-1 font-bold hover:bg-[#3d2b1f] transition-colors disabled:opacity-50"
                      >
                        {converting && selected?.id === video.id ? "변환 중..." : "AI 변환"}
                      </button>
                      <button
                        onClick={() => handleDeleteOne(video.id)}
                        disabled={deletingId === video.id}
                        className="text-[11px] border-2 border-red-600 text-red-600 px-3 py-1 font-bold hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {deletingId === video.id ? "..." : "삭제"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* AI 변환 결과 */}
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest mb-4">AI 변환 결과</h3>

            {converting && (
              <div className="border-2 border-[#c8bfa8] p-8 text-center text-sm text-[#8c8070]">
                AI가 변환 중입니다...
              </div>
            )}

            {!converting && !converted && (
              <div className="border-2 border-[#c8bfa8] p-8 text-center text-sm text-[#8c8070]">
                영상 카드의 AI 변환 버튼을 누르면 투표 형식으로 변환합니다
              </div>
            )}

            {converted && (
              <div className="border-2 border-[#1c1712] p-4 space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#6b6356] block mb-1">
                    투표 제목
                  </label>
                  <input
                    value={converted.title}
                    onChange={(e) => setConverted({ ...converted, title: e.target.value })}
                    className="w-full border-2 border-[#c8bfa8] bg-[#f5f0e8] px-3 py-2 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#6b6356] block mb-1">
                    배경 설명
                  </label>
                  <textarea
                    value={converted.description}
                    onChange={(e) => setConverted({ ...converted, description: e.target.value })}
                    rows={6}
                    className="w-full border-2 border-[#c8bfa8] bg-[#f5f0e8] px-3 py-2 text-sm leading-relaxed resize-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#6b6356] block mb-1">
                    선택지
                  </label>
                  <div className="space-y-2">
                    {converted.options.map((opt, i) => (
                      <input
                        key={i}
                        value={opt}
                        onChange={(e) => {
                          const opts = [...converted.options];
                          opts[i] = e.target.value;
                          setConverted({ ...converted, options: opts });
                        }}
                        className="w-full border-2 border-[#c8bfa8] bg-[#f5f0e8] px-3 py-2 text-sm"
                        placeholder={`선택지 ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#6b6356] block mb-1">
                    카테고리
                  </label>
                  <select
                    value={saveCategory}
                    onChange={(e) => setSaveCategory(e.target.value as Category)}
                    className="w-full border-2 border-[#c8bfa8] bg-[#f5f0e8] px-3 py-2 text-sm"
                  >
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full border-2 border-[#1c1712] bg-[#1c1712] text-[#f0e5c0] py-2.5 text-sm font-bold hover:bg-[#3d2b1f] transition-colors disabled:opacity-50"
                >
                  {saving ? "등록 중..." : "게시글 등록"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
