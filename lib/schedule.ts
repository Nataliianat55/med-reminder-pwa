import type { Medication } from "@/lib/types";

export const WEEKDAYS_UK_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"] as const;

export function toLocalWeekdayIndex(date: Date): number {
  // JS: 0=Sun..6=Sat -> convert to 0=Mon..6=Sun
  return (date.getDay() + 6) % 7;
}

export function timeToMinutes(time: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(time);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

export function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function isDueNow(med: Medication, now: Date): boolean {
  const dayIdx = toLocalWeekdayIndex(now);
  if (!med.daysOfWeek.includes(dayIdx)) return false;
  const medMin = timeToMinutes(med.time);
  if (medMin === null) return false;
  return minutesSinceMidnight(now) === medMin;
}

export function isDueWithinWindow(med: Medication, now: Date, windowMinutes: number): boolean {
  const dayIdx = toLocalWeekdayIndex(now);
  if (!med.daysOfWeek.includes(dayIdx)) return false;
  const medMin = timeToMinutes(med.time);
  if (medMin === null) return false;
  const diff = minutesSinceMidnight(now) - medMin;
  return diff >= 0 && diff <= windowMinutes;
}

export function firedKey(med: Medication, date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${med.id}:${yyyy}-${mm}-${dd}:${med.time}`;
}

export function formatDays(daysOfWeek: number[]): string {
  const uniq = Array.from(new Set(daysOfWeek)).filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b);
  if (uniq.length === 7) return "щодня";
  if (uniq.length === 0) return "без днів";
  return uniq.map((d) => WEEKDAYS_UK_SHORT[d]).join(" ");
}

