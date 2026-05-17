const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export type Edition = "조간" | "석간";

function toKSTDate(utcMs: number): Date {
  return new Date(utcMs + KST_OFFSET_MS);
}

export function getCurrentEdition(): { edition: Edition; label: string } {
  const kst = toKSTDate(Date.now());
  const hour = kst.getUTCHours();
  const edition: Edition = hour >= 7 && hour < 17 ? "조간" : "석간";
  const year = kst.getUTCFullYear();
  const month = kst.getUTCMonth() + 1;
  const day = kst.getUTCDate();
  return { edition, label: `${year}년 ${month}월 ${day}일 ${edition}` };
}

export function getNextPublishTime(): Date {
  const nowMs = Date.now();
  const kst = toKSTDate(nowMs);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth();
  const d = kst.getUTCDate();

  const morning = Date.UTC(y, m, d, 7, 0, 0) - KST_OFFSET_MS;
  const evening = Date.UTC(y, m, d, 17, 0, 0) - KST_OFFSET_MS;
  const tomorrowMorning = Date.UTC(y, m, d + 1, 7, 0, 0) - KST_OFFSET_MS;

  if (nowMs < morning) return new Date(morning);
  if (nowMs < evening) return new Date(evening);
  return new Date(tomorrowMorning);
}

export function formatPublishLabel(publishAtIso: string): string {
  const kst = toKSTDate(new Date(publishAtIso).getTime());
  const month = kst.getUTCMonth() + 1;
  const day = kst.getUTCDate();
  const hour = kst.getUTCHours();
  const edition: Edition = hour < 12 ? "조간" : "석간";
  return `${month}월 ${day}일 ${edition}`;
}

export function toKSTDatetimeLocal(publishAtIso: string): string {
  const kst = toKSTDate(new Date(publishAtIso).getTime());
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())}T${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())}`;
}

// "YYYY-MM-DDTHH:mm" in KST → UTC ISO string
export function fromKSTDatetimeLocal(kstLocal: string): string {
  const [datePart, timePart] = kstLocal.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = (timePart ?? "00:00").split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - KST_OFFSET_MS).toISOString();
}
