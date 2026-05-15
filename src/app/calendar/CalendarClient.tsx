"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, Flag, Plus, Trash2 } from "lucide-react";
import KoreanLunarCalendar from "korean-lunar-calendar";

// ── 상수 ──────────────────────────────────────────────────────────────
const DAY_KO = ["일", "월", "화", "수", "목", "금", "토"];
const MONTH_NAMES = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

const MEMO_KEY  = "modoo-calendar-memos";
const DDAY_KEY  = "modoo-calendar-ddays";

// 양력 고정 공휴일 (월은 1-based)
const FIXED_HOLIDAYS: Array<{ month: number; day: number; name: string }> = [
  { month: 1,  day: 1,  name: "신정" },
  { month: 3,  day: 1,  name: "삼일절" },
  { month: 5,  day: 5,  name: "어린이날" },
  { month: 6,  day: 6,  name: "현충일" },
  { month: 8,  day: 15, name: "광복절" },
  { month: 10, day: 3,  name: "개천절" },
  { month: 10, day: 9,  name: "한글날" },
  { month: 12, day: 25, name: "성탄절" },
];

// 음력 공휴일 (음력 month/day)
const LUNAR_HOLIDAYS: Array<{ lMonth: number; lDay: number; name: string; range?: number[] }> = [
  { lMonth: 1, lDay: 1, name: "설날", range: [-1, 0, 1] },
  { lMonth: 4, lDay: 8, name: "부처님오신날", range: [0] },
  { lMonth: 8, lDay: 15, name: "추석", range: [-1, 0, 1] },
];

// ── 유틸 ──────────────────────────────────────────────────────────────
function toKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function solarToLunar(year: number, month: number, day: number) {
  const cal = new KoreanLunarCalendar();
  const ok = cal.setSolarDate(year, month, day);
  if (!ok) return null;
  return cal.getLunarCalendar() as { year: number; month: number; day: number; intercalation: boolean };
}

// 음력 날짜를 양력으로 변환 (brute-force: 해당 월의 날짜들 체크)
function lunarToSolar(year: number, lMonth: number, lDay: number): string | null {
  for (let m = 1; m <= 12; m++) {
    const daysInM = new Date(year, m, 0).getDate();
    for (let d = 1; d <= daysInM; d++) {
      const lunar = solarToLunar(year, m, d);
      if (lunar && lunar.month === lMonth && lunar.day === lDay && !lunar.intercalation) {
        return `${year}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      }
    }
  }
  return null;
}

// 특정 년도의 공휴일 Set 반환 (key: "YYYY-MM-DD")
function buildHolidayMap(year: number): Map<string, string> {
  const map = new Map<string, string>();

  // 양력 고정
  for (const { month, day, name } of FIXED_HOLIDAYS) {
    const key = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    map.set(key, name);
  }

  // 음력
  for (const { lMonth, lDay, name, range = [0] } of LUNAR_HOLIDAYS) {
    const base = lunarToSolar(year, lMonth, lDay);
    if (!base) continue;
    const baseDate = new Date(base);
    for (const offset of range) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + offset);
      const k = d.toISOString().slice(0, 10);
      if (!map.has(k)) {
        const label = offset === 0 ? name : offset < 0 ? `${name} 전날` : `${name} 다음날`;
        map.set(k, label);
      }
    }
  }

  return map;
}

// D-Day 계산
function calcDday(targetKey: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetKey);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function formatDday(n: number): string {
  if (n === 0) return "D-DAY";
  if (n > 0)  return `D-${n}`;
  return `D+${Math.abs(n)}`;
}

// ── 타입 ──────────────────────────────────────────────────────────────
interface DdayItem {
  key: string;   // YYYY-MM-DD
  label: string;
}

// ── 컴포넌트 ─────────────────────────────────────────────────────────
export default function CalendarClient() {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());   // 0-based
  const [selected, setSelected] = useState<number | null>(today.getDate());
  const [memos, setMemos] = useState<Record<string, string>>({});
  const [ddays, setDdays] = useState<DdayItem[]>([]);
  const [draft, setDraft] = useState("");
  const [ddayInput, setDdayInput] = useState("");
  const [tab, setTab] = useState<"memo" | "dday">("memo");

  const holidayMap = buildHolidayMap(year);

  // 스토리지 로드
  useEffect(() => {
    try {
      const sm = localStorage.getItem(MEMO_KEY);
      if (sm) setMemos(JSON.parse(sm));
      const sd = localStorage.getItem(DDAY_KEY);
      if (sd) setDdays(JSON.parse(sd));
    } catch {}
  }, []);

  useEffect(() => {
    if (selected !== null) setDraft(memos[toKey(year, month, selected)] ?? "");
  }, [selected, year, month, memos]);

  const saveMemo = useCallback(() => {
    if (selected === null) return;
    const key = toKey(year, month, selected);
    const updated = { ...memos };
    if (draft.trim()) updated[key] = draft.trim();
    else delete updated[key];
    setMemos(updated);
    try { localStorage.setItem(MEMO_KEY, JSON.stringify(updated)); } catch {}
  }, [selected, year, month, draft, memos]);

  const addDday = useCallback(() => {
    if (selected === null || !ddayInput.trim()) return;
    const key = toKey(year, month, selected);
    const updated = [...ddays.filter(d => d.key !== key), { key, label: ddayInput.trim() }];
    setDdays(updated);
    setDdayInput("");
    try { localStorage.setItem(DDAY_KEY, JSON.stringify(updated)); } catch {}
  }, [selected, year, month, ddayInput, ddays]);

  const removeDday = useCallback((key: string) => {
    const updated = ddays.filter(d => d.key !== key);
    setDdays(updated);
    try { localStorage.setItem(DDAY_KEY, JSON.stringify(updated)); } catch {}
  }, [ddays]);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelected(null);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelected(null);
  }

  const firstDay      = new Date(year, month, 1).getDay();
  const daysInMonth   = new Date(year, month + 1, 0).getDate();
  const trailingBlanks = (7 - (firstDay + daysInMonth) % 7) % 7;

  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  function dayColor(dow: number, dateKey: string) {
    if (holidayMap.has(dateKey) || dow === 0) return "text-[#9b1a1a]";
    if (dow === 6) return "text-[#1a1a8b]";
    return "text-[#1c1712]";
  }

  // D-Day 배지 색 (해당 달의 dday만 표시)
  const ddayOnMonth = ddays.filter(d => {
    const [dy, dm] = d.key.split("-").map(Number);
    return dy === year && dm === month + 1;
  });

  return (
    <main className="flex-1 px-0 sm:px-4 py-0 max-w-3xl mx-auto w-full">

      {/* ── 달력 헤더 ── */}
      <div className="border-b border-[#d4cfc4] text-[#1c1712]">
        <div className="flex items-center justify-between px-3 py-2">
          <button onClick={prevMonth} className="px-3 py-1 hover:bg-[#1c1712]/6 rounded transition-colors text-base font-black">◀</button>
          <div className="text-center">
            <div className="text-3xl font-black tracking-widest" style={{ fontFamily: "var(--font-serif)" }}>
              {MONTH_NAMES[month]}
            </div>
            <div className="text-xs tracking-[0.3em] font-bold text-[#8c8070]">{year}</div>
          </div>
          <button onClick={nextMonth} className="px-3 py-1 hover:bg-[#1c1712]/6 rounded transition-colors text-base font-black">▶</button>
        </div>
        {/* D-Day 목록 미니 배너 */}
        {ddayOnMonth.length > 0 && (
          <div className="border-t border-[#d4cfc4] px-3 py-1 flex gap-3 overflow-x-auto text-xs font-bold tracking-wide text-[#006644]">
            {ddayOnMonth.map(d => {
              const n = calcDday(d.key);
              return (
                <span key={d.key} className="shrink-0 flex items-center gap-1">
                  <Flag size={10} />
                  {d.label} <span className="opacity-70">{formatDday(n)}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 달력 그리드 + 선택 패널 (하나의 컨테이너) ── */}
      <div className="border border-[#d4cfc4]">

        {/* 요일 헤더 + 날짜 셀 통합 그리드 */}
        <div className="grid grid-cols-7 [&>*:nth-child(7n)]:border-r-0 [&>*:nth-last-child(-n+7)]:border-b-0">

          {/* 요일 헤더 */}
          {DAY_KO.map((d, i) => (
            <div
              key={d}
              className={`bg-[#f5f0e8] border-b border-r border-[#d4cfc4] text-center text-[11px] font-black py-1 tracking-widest ${
                i === 0 ? "text-[#9b1a1a]" : i === 6 ? "text-[#1a1a8b]" : "text-[#1c1712]"
              }`}
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {d}
            </div>
          ))}

          {/* 빈 셀 */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div
              key={`b${i}`}
              className="border-b border-r border-[#d4cfc4] bg-[#f5f0e8]"
              style={{ height: "68px" }}
            />
          ))}

          {/* 날짜 셀 */}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dow     = (firstDay + day - 1) % 7;
            const dateKey = toKey(year, month, day);
            const memoText = memos[dateKey];
            const hasMemo = !!memoText;
            const todayCell = isToday(day);
            const sel = selected === day;
            const holiday = holidayMap.get(dateKey);
            const ddayItem = ddays.find(d => d.key === dateKey);
            const lunar = solarToLunar(year, month + 1, day);

            return (
              <button
                key={day}
                onClick={() => setSelected(sel ? null : day)}
                className={`border-b border-r border-[#d4cfc4] p-0.5 relative flex flex-col items-start transition-colors text-left overflow-hidden ${
                  sel
                    ? "bg-[#1c1712]/10"
                    : todayCell
                    ? "bg-[#fff8dc]"
                    : "hover:bg-[#1c1712]/4"
                }`}
                style={{ height: "68px" }}
              >
                {/* 날짜 숫자 + 음력 */}
                <div className="flex items-baseline gap-0.5 px-0.5">
                  <span
                    className={`text-sm font-black leading-none ${dayColor(dow, dateKey)} ${todayCell ? "underline underline-offset-2 decoration-2" : ""}`}
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {day}
                  </span>
                  {lunar && (
                    <span className="text-[8px] leading-none text-[#8c7a60]">
                      {lunar.intercalation ? "윤" : ""}{lunar.month}/{lunar.day}
                    </span>
                  )}
                </div>

                {/* 공휴일 이름 */}
                {holiday && (
                  <span className="text-[7px] font-bold leading-none px-0.5 truncate w-full text-[#9b1a1a]">
                    {holiday}
                  </span>
                )}

                {/* D-Day */}
                {ddayItem && (
                  <span className="text-[7px] font-black leading-none px-0.5 truncate w-full text-[#006644]">
                    {formatDday(calcDday(dateKey))}
                  </span>
                )}

                {/* 메모 미리보기 */}
                {hasMemo && (
                  <span
                    className="text-[7px] leading-tight px-0.5 w-full overflow-hidden mt-auto text-[#5a5040]"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {memoText}
                  </span>
                )}
              </button>
            );
          })}
          {/* 트레일링 빈 셀 (마지막 행 채우기) */}
          {Array.from({ length: trailingBlanks }).map((_, i) => (
            <div
              key={`t${i}`}
              className="border-b border-r border-[#d4cfc4] bg-[#f5f0e8]"
              style={{ height: "68px" }}
            />
          ))}
        </div>

        {/* ── 선택 날짜 패널 ── */}
        {selected !== null && (() => {
          const dow = (firstDay + selected - 1) % 7;
          const dateKey = toKey(year, month, selected);
          const holiday = holidayMap.get(dateKey);
          const existingDday = ddays.find(d => d.key === dateKey);
          const ddayN = existingDday ? calcDday(dateKey) : null;
          return (
          <div className="border-t border-[#d4cfc4] bg-[#fdf8f0]">
            {/* 패널 헤더 */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#d4cfc4]">
              <span className="text-sm font-black text-[#1c1712]" style={{ fontFamily: "var(--font-serif)" }}>
                {year}.{String(month + 1).padStart(2,"0")}.{String(selected).padStart(2,"0")}
                <span className={`ml-1 text-xs font-bold ${dow === 0 ? "text-[#9b1a1a]" : dow === 6 ? "text-[#1a1a8b]" : "text-[#8c8070]"}`}>
                  ({DAY_KO[dow]})
                </span>
                {holiday && <span className="ml-2 text-[10px] text-[#9b1a1a] font-bold">{holiday}</span>}
                {ddayN !== null && (
                  <span className="ml-2 text-[10px] text-[#006644] font-black">{formatDday(ddayN)}</span>
                )}
              </span>
              <button onClick={() => setSelected(null)} className="text-[#8c8070] hover:text-[#1c1712] transition-colors">
                <X size={14} />
              </button>
            </div>

            {/* 탭 */}
            <div className="flex border-b border-[#1c1712]/20">
              <button
                onClick={() => setTab("memo")}
                className={`flex-1 py-1.5 text-xs font-bold border-r border-[#1c1712]/20 transition-colors ${tab === "memo" ? "bg-[#1c1712]/8 text-[#1c1712]" : "text-[#8c8070] hover:bg-[#1c1712]/4"}`}
              >
                메모
              </button>
              <button
                onClick={() => setTab("dday")}
                className={`flex-1 py-1.5 text-xs font-bold flex items-center justify-center gap-1 transition-colors ${tab === "dday" ? "bg-[#1c1712]/8 text-[#1c1712]" : "text-[#8c8070] hover:bg-[#1c1712]/4"}`}
              >
                <Flag size={10} /> D-Day
              </button>
            </div>

            {/* 메모 탭 */}
            {tab === "memo" && (
              <div className="p-3">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="이 날의 메모를 입력하세요..."
                  rows={4}
                  className="w-full bg-transparent resize-none text-sm leading-relaxed focus:outline-none placeholder:text-[#a8a090]"
                  style={{ fontFamily: "var(--font-serif)" }}
                />
                <div className="flex justify-between items-center mt-1 pt-2 border-t border-[#1c1712]/20">
                  <span className="text-[10px] text-[#8c8070]">{draft.length > 0 ? `${draft.length}자` : ""}</span>
                  <div className="flex gap-2">
                    {draft.trim() && (
                      <button
                        onClick={() => setDraft("")}
                        className="text-xs px-3 py-1 border border-[#1c1712]/30 text-[#6b6356] hover:bg-[#1c1712]/5"
                      >
                        지우기
                      </button>
                    )}
                    <button
                      onClick={saveMemo}
                      className="text-xs px-4 py-1 bg-[#1c1712] text-[#fdf8f0] hover:opacity-80 font-bold"
                    >
                      저장
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* D-Day 탭 */}
            {tab === "dday" && (
              <div className="p-3">
                {existingDday ? (
                  <div className="flex items-center justify-between bg-[#006644]/10 border border-[#006644]/30 px-3 py-2 mb-3">
                    <div>
                      <p className="text-xs font-bold text-[#1c1712]">{existingDday.label}</p>
                      <p className="text-lg font-black text-[#006644]" style={{ fontFamily: "var(--font-serif)" }}>
                        {formatDday(calcDday(dateKey))}
                      </p>
                    </div>
                    <button onClick={() => removeDday(dateKey)} className="text-[#9b1a1a] hover:opacity-70">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-[#8c8070] mb-3">이 날짜를 D-Day로 등록합니다.</p>
                )}
                {!existingDday && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={ddayInput}
                      onChange={(e) => setDdayInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addDday()}
                      placeholder="D-Day 이름 (예: 수능, 결혼기념일)"
                      className="flex-1 border border-[#1c1712]/30 bg-transparent px-2 py-1 text-xs focus:outline-none placeholder:text-[#a8a090]"
                    />
                    <button
                      onClick={addDday}
                      disabled={!ddayInput.trim()}
                      className="px-3 py-1 bg-[#1c1712] text-[#fdf8f0] text-xs font-bold hover:opacity-80 disabled:opacity-40 flex items-center gap-1"
                    >
                      <Plus size={12} /> 등록
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      </div>{/* border 컨테이너 닫기 */}

      {/* ── D-Day 전체 목록 ── */}
      {ddays.length > 0 && (
        <div className="mt-4 border border-[#d4cfc4]">
          <div className="border-b border-[#d4cfc4] px-3 py-2 flex items-center gap-2 text-[#1c1712]">
            <Flag size={12} />
            <span className="text-xs font-black tracking-widest">D-DAY 목록</span>
          </div>
          <ul className="divide-y divide-[#1c1712]/15">
            {[...ddays]
              .sort((a, b) => calcDday(a.key) - calcDday(b.key))
              .map((d) => {
                const n = calcDday(d.key);
                const [dy, dm, dd] = d.key.split("-");
                return (
                  <li key={d.key} className="flex items-center justify-between px-3 py-2 hover:bg-[#1c1712]/4">
                    <div>
                      <p className="text-xs font-bold text-[#1c1712]">{d.label}</p>
                      <p className="text-[10px] text-[#8c8070]">{dy}.{dm}.{dd}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-black ${n < 0 ? "text-[#8c8070]" : "text-[#006644]"}`} style={{ fontFamily: "var(--font-serif)" }}>
                        {formatDday(n)}
                      </span>
                      <button onClick={() => removeDday(d.key)} className="text-[#9b1a1a]/50 hover:text-[#9b1a1a] transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </li>
                );
              })}
          </ul>
        </div>
      )}

      <div className="h-4" />
    </main>
  );
}
