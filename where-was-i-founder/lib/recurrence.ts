/**
 * Recurring commitments: a rule plus an anchor date. Each occurrence is a date; completing
 * one occurrence never completes the commitment itself, the next occurrence is computed.
 */
import { WEEKDAYS, addDays, daysBetween, dow, formatTime, fullDate, todayKey } from "./clock";

export type Freq = "none" | "daily" | "weekdays" | "every_other_day" | "weekly" | "custom";
export type Recurrence = { freq: Freq; interval: number; unit: "days" | "weeks"; days: number[] };

export const NO_REPEAT: Recurrence = { freq: "none", interval: 1, unit: "days", days: [] };
export const isRecurring = (r: Recurrence) => r.freq !== "none";

const startOfWeek = (date: string) => addDays(date, -dow(date));

/** Days of week a weekly-style rule fires on (falls back to the anchor's weekday). */
function ruleDays(r: Recurrence, anchor: string) {
  return r.days.length ? r.days : [dow(anchor)];
}

export function occursOn(r: Recurrence, anchor: string, date: string): boolean {
  if (date < anchor) return false;
  const diff = daysBetween(anchor, date);
  switch (r.freq) {
    case "none":
      return date === anchor;
    case "daily":
      return true;
    case "weekdays":
      return dow(date) >= 1 && dow(date) <= 5;
    case "every_other_day":
      return diff % 2 === 0;
    case "weekly":
      return ruleDays(r, anchor).includes(dow(date));
    case "custom": {
      const n = Math.max(1, r.interval);
      if (r.unit === "days") return diff % n === 0;
      const weeks = Math.round(daysBetween(startOfWeek(anchor), startOfWeek(date)) / 7);
      return weeks % n === 0 && ruleDays(r, anchor).includes(dow(date));
    }
  }
}

/** First occurrence on or after `from`. */
export function nextOccurrence(r: Recurrence, anchor: string, from: string): string | null {
  for (let i = 0; i < 800; i++) {
    const d = addDays(from, i);
    if (occursOn(r, anchor, d)) return d;
  }
  return null;
}

/** First date on or after `from` that the rule allows, used to pick an anchor for a new rule. */
export function firstMatching(r: Recurrence, from: string) {
  if (r.freq === "weekdays") return nextOccurrence({ ...r }, from, from) ?? from;
  if ((r.freq === "weekly" || (r.freq === "custom" && r.unit === "weeks")) && r.days.length) {
    for (let i = 0; i < 7; i++) {
      const d = addDays(from, i);
      if (r.days.includes(dow(d))) return d;
    }
  }
  return from;
}

const SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function listDays(days: number[]) {
  const names = [...days].sort((a, b) => a - b).map((d) => SHORT[d]);
  return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

/** "Every other day", "Every Monday", "Every Mon, Wed & Fri", "Every 2 weeks on Tue". */
export function recurrenceLabel(r: Recurrence, anchor?: string | null, time?: string | null): string {
  const a = anchor ?? todayKey();
  // Name the part of day when the time makes it obvious: "Every other morning", "Every night".
  const part = !time ? null : time < "12:00" && time >= "05:00" ? "morning" : time >= "20:00" ? "night" : null;
  switch (r.freq) {
    case "none":
      return "Does not repeat";
    case "daily":
      return part ? `Every ${part}` : "Every day";
    case "weekdays":
      return "Every weekday";
    case "every_other_day":
      return part ? `Every other ${part}` : "Every other day";
    case "weekly": {
      const d = ruleDays(r, a);
      return d.length === 1 ? `Every ${WEEKDAYS[d[0]]}` : `Every ${listDays(d)}`;
    }
    case "custom":
      if (r.unit === "days") return r.interval === 1 ? "Every day" : `Every ${r.interval} days`;
      if (r.interval === 1) return `Every ${listDays(ruleDays(r, a))}`;
      return `Every ${r.interval} weeks on ${listDays(ruleDays(r, a))}`;
  }
}

/** "Next: Thursday, Oct 8, 7:00 AM" */
export function nextLabel(date: string, time: string | null, approx?: string | null) {
  const diff = daysBetween(todayKey(), date);
  const day = diff === 1 ? "Tomorrow" : fullDate(date);
  if (approx) return `${day}, ${approx.toLowerCase()}`;
  return time ? `${day}, ${formatTime(time)}` : day;
}
