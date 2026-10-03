/**
 * Demo clock. The founder story takes place on the morning of Tuesday, Oct 6 2026.
 * Dates ("tomorrow", "Friday") are always read against this day so the demo is repeatable.
 * Timestamps tick forward from 8:12 AM with real elapsed time, so a verification done
 * three minutes into the demo is stamped 8:15 AM.
 */
export const DEMO_START = new Date(2026, 9, 6, 8, 12);

export type TimeKind = "exact" | "before" | "approx" | "none";
export type When = { date: string | null; time: string | null; timeKind: TimeKind; approxLabel: string | null };

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");

let sessionStart: number | null = null;
export function setSessionStart(realMs: number) {
  sessionStart = realMs;
}
/** Current demo time: 8:12 AM plus real time elapsed since the demo started (capped at 3 hours). */
export function demoNow(): Date {
  const elapsed = sessionStart === null ? 0 : Math.min(Math.max(Date.now() - sessionStart, 0), 3 * 3_600_000);
  return new Date(DEMO_START.getTime() + elapsed);
}

export const toDateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const toTimeKey = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export function fromKeys(date: string, time?: string | null) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = (time ?? "00:00").split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm);
}
export function addDays(date: string, n: number) {
  const d = fromKeys(date);
  d.setDate(d.getDate() + n);
  return toDateKey(d);
}
export const todayKey = () => toDateKey(DEMO_START);
export const dow = (date: string) => fromKeys(date).getDay();
export function daysBetween(a: string, b: string) {
  return Math.round((fromKeys(b).getTime() - fromKeys(a).getTime()) / 86_400_000);
}
export const dayDiff = (date: string) => daysBetween(todayKey(), date);

export function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(m)} ${h >= 12 ? "PM" : "AM"}`;
}
export const nowLabel = () => formatTime(toTimeKey(demoNow()));

/** "Today", "Tomorrow", "Yesterday", "Friday", "Mon, Oct 12" */
export function dayLabel(date: string) {
  const diff = dayDiff(date);
  const d = fromKeys(date);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff < 7) return WEEKDAYS[d.getDay()];
  return `${WEEKDAYS[d.getDay()].slice(0, 3)}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
/** "Thursday, Oct 8" */
export function fullDate(date: string) {
  const d = fromKeys(date);
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
/** "Tomorrow" stays relative, anything further gets its date: "Thursday, Oct 8". */
export function dayWithDate(date: string) {
  const diff = dayDiff(date);
  return diff === 0 || diff === 1 || diff === -1 ? dayLabel(date) : fullDate(date);
}

export function timeLabel(w: When) {
  if (w.timeKind === "approx" && w.approxLabel) return w.approxLabel;
  if (!w.time) return "Any time";
  if (w.timeKind === "approx") return `Around ${formatTime(w.time)}`;
  return formatTime(w.time);
}

/** "Tomorrow, 2:30 PM", "Friday, 5:00 PM", "Sunday afternoon", "No date" */
export function whenLabel(w: When, withDate = false) {
  if (!w.date) return "No date";
  const day = withDate ? dayWithDate(w.date) : dayLabel(w.date);
  if (w.timeKind === "approx" && w.approxLabel) {
    const l = w.approxLabel.toLowerCase();
    if (dayDiff(w.date) === 0) return l === "night" || l === "tonight" ? "Tonight" : `This ${l}`;
    return `${day} ${l}`;
  }
  if (!w.time) return day;
  if (w.timeKind === "approx") return `${day}, around ${formatTime(w.time)}`;
  return `${day}, ${formatTime(w.time)}`;
}

/** For sentences: "tomorrow at 2:30 PM", "on Friday by 5:00 PM". */
export function whenSentence(w: When) {
  if (!w.date) return "with no set date";
  const diff = dayDiff(w.date);
  const day = diff === 0 ? "today" : diff === 1 ? "tomorrow" : diff > 1 && diff < 7 ? `on ${dayLabel(w.date)}` : `on ${fullDate(w.date)}`;
  if (w.timeKind === "approx" && w.approxLabel) return `${day} ${w.approxLabel.toLowerCase()}`;
  if (!w.time) return day;
  return `${day} ${w.timeKind === "before" ? "by" : "at"} ${formatTime(w.time)}`;
}

const APPROX_END: Record<string, string> = { Morning: "12:00", Afternoon: "17:00", Evening: "21:00", Night: "23:59", Tonight: "23:59" };
export function dueAt(w: When): Date | null {
  if (!w.date) return null;
  if (w.timeKind === "approx" && w.approxLabel) return fromKeys(w.date, APPROX_END[w.approxLabel] ?? "23:59");
  return fromKeys(w.date, w.time ?? "23:59");
}
export function sortKey(w: When) {
  return w.date ? fromKeys(w.date, w.time ?? "23:59").getTime() : Number.MAX_SAFE_INTEGER;
}

const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "Tuesday, October 6" */
export function longDate(date: string) {
  const d = fromKeys(date);
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS_LONG[d.getMonth()]} ${d.getDate()}`;
}
