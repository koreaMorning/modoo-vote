"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

const DAY_KO = ["일", "월", "화", "수", "목", "금", "토"];
const STORAGE_KEY = "modoo-vote-calendar-memos";

function toKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function CalendarClient() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<number | null>(today.getDate());
  const [memos, setMemos] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setMemos(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    if (selected !== null) {
      setDraft(memos[toKey(year, month, selected)] ?? "");
    }
  }, [selected, year, month, memos]);

  const saveMemo = useCallback(() => {
    if (selected === null) return;
    const key = toKey(year, month, selected);
    const updated = { ...memos };
    if (draft.trim()) {
      updated[key] = draft.trim();
    } else {
      delete updated[key];
    }
    setMemos(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
  }, [selected, year, month, draft, memos]);

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
    setSelected(null);
  }

  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
    setSelected(null);
  }

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <main className="flex-1 px-0 sm:px-4 py-4 max-w-3xl mx-auto w-full">
      {/* 월 헤더 */}
      <div className="flex items-stretch border-t-4 border-[#1c1712] bg-[#1c1712] text-[#F0EDE6]">
        <button
          onClick={prevMonth}
          className="px-5 hover:bg-white/10 transition-colors border-r border-white/20 flex items-center"
          aria-label="이전 달"
        >
          <ChevronLeft size={18} />
        </button>
        <h2 className="flex-1 text-center text-xl font-black font-serif tracking-widest py-3">
          {year}년 {month + 1}월
        </h2>
        <button
          onClick={nextMonth}
          className="px-5 hover:bg-white/10 transition-colors border-l border-white/20 flex items-center"
          aria-label="다음 달"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* 달력 */}
      <div className="border-l-2 border-r-2 border-b-2 border-[#1c1712]">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 border-b border-[#1c1712]/40 bg-[#f8f4ee]">
          {DAY_KO.map((d, i) => (
            <div
              key={d}
              className={`text-center text-xs font-black py-1.5 border-r border-[#1c1712]/20 last:border-r-0 ${
                i === 0 ? "text-[#8b1a1a]" : i === 6 ? "text-[#1a1a6b]" : "text-[#1c1712]"
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* 날짜 셀 — 7n번째 자식에서 border-r 제거 */}
        <div className="grid grid-cols-7 [&>*:nth-child(7n)]:border-r-0">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`b${i}`} className="h-14 sm:h-20 border-r border-b border-[#1c1712]/20" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dow = (firstDay + day - 1) % 7;
            const hasMemo = !!memos[toKey(year, month, day)];
            const todayCell = isToday(day);
            const sel = selected === day;
            return (
              <button
                key={day}
                onClick={() => setSelected(sel ? null : day)}
                className={`h-14 sm:h-20 border-r border-b border-[#1c1712]/20 p-1 sm:p-2 relative flex flex-col items-start transition-colors ${
                  sel ? "bg-[#1c1712] text-[#F0EDE6]" : "hover:bg-[#1c1712]/5"
                }`}
              >
                <span
                  className={`text-xs sm:text-sm font-serif font-bold leading-none ${
                    sel
                      ? "text-[#F0EDE6]"
                      : dow === 0
                      ? "text-[#8b1a1a]"
                      : dow === 6
                      ? "text-[#1a1a6b]"
                      : "text-[#1c1712]"
                  } ${todayCell && !sel ? "underline underline-offset-2 decoration-2" : ""}`}
                >
                  {day}
                </span>
                {hasMemo && (
                  <span
                    className={`absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${
                      sel ? "bg-[#F0EDE6]/70" : "bg-[#1c1712]/40"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 메모 패널 */}
      {selected !== null && (
        <div className="mt-3 border-2 border-[#1c1712]">
          <div className="flex items-center justify-between px-3 py-2 bg-[#1c1712] text-[#F0EDE6]">
            <span className="text-sm font-bold font-serif">
              {year}년 {month + 1}월 {selected}일&nbsp;
              <span className={`text-xs ${(firstDay + selected - 1) % 7 === 0 ? "text-[#f08080]" : (firstDay + selected - 1) % 7 === 6 ? "text-[#9090e0]" : "text-white/70"}`}>
                ({DAY_KO[(firstDay + selected - 1) % 7]})
              </span>
            </span>
            <button
              onClick={() => setSelected(null)}
              className="opacity-50 hover:opacity-100 transition-opacity"
              aria-label="닫기"
            >
              <X size={14} />
            </button>
          </div>
          <div className="p-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="이 날의 메모를 입력하세요..."
              rows={4}
              className="w-full bg-transparent resize-none text-sm font-serif leading-relaxed focus:outline-none placeholder:text-[#a8a090]"
            />
            <div className="flex justify-between items-center mt-1 pt-2 border-t border-[#1c1712]/20">
              <span className="text-[10px] text-[#8c8070]">
                {draft.length > 0 ? `${draft.length}자` : ""}
              </span>
              <div className="flex gap-2">
                {draft.trim() && (
                  <button
                    onClick={() => setDraft("")}
                    className="text-xs px-3 py-1 border border-[#1c1712]/30 text-[#6b6356] hover:bg-[#1c1712]/5 transition-colors"
                  >
                    지우기
                  </button>
                )}
                <button
                  onClick={saveMemo}
                  className="text-xs px-4 py-1 bg-[#1c1712] text-[#F0EDE6] hover:opacity-80 transition-opacity font-bold"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
