/**
 * Demo clock. The workspace story happens on Thursday, Oct 8 2026 at Northstar Labs.
 * Time is stored as minutes relative to today's midnight (negative = earlier days), and
 * moves forward a deterministic amount with each meaningful work event, starting 9:00 AM.
 */
export const TODAY = "2026-10-08";
export const START_MIN = 9 * 60;

export type TimeKind = "exact" | "before" | "approx" | "none";
export type When = { date: string | null; time: string | null; timeKind: TimeKind; approxLabel: string | null };

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const pad = (n: number) => String(n).padStart(2, "0");

let nowMin = START_MIN;
/** The store keeps this in sync with the workspace's clock so parsing and labels agree. */
export function setNow(m: number) {
  nowMin = m;
}
export const getNow = () => nowMin;

export const toDateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const toTimeKey = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export function fromKeys(date: string, time?: string | null) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = (time ?? "00:00").split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm);
}
export function nowDate(): Date {
  const d = fromKeys(TODAY);
  d.setMinutes(nowMin);
  return d;
}
export function addDays(date: string, n: number) {
  const d = fromKeys(date);
  d.setDate(d.getDate() + n);
  return toDateKey(d);
}
export const todayKey = () => TODAY;
export const dow = (date: string) => fromKeys(date).getDay();
export function daysBetween(a: string, b: string) {
  return Math.round((fromKeys(b).getTime() - fromKeys(a).getTime()) / 86_400_000);
}
export const dayDiff = (date: string) => daysBetween(TODAY, date);

export function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(m)} ${h >= 12 ? "PM" : "AM"}`;
}
const minToTime = (m: number) => {
  const x = ((m % 1440) + 1440) % 1440;
  return `${pad(Math.floor(x / 60))}:${pad(x % 60)}`;
};

/** "9:02 AM", "Yesterday, 4:32 PM", "Tue, 3:10 PM" */
export function atLabel(at: number) {
  const day = Math.floor(at / 1440);
  const time = formatTime(minToTime(at));
  if (day === 0) return time;
  if (day === -1) return `Yesterday, ${time}`;
  const date = addDays(TODAY, day);
  return `${WEEKDAYS[dow(date)].slice(0, 3)}, ${time}`;
}
/** For sentences: "today at 9:02 AM", "yesterday at 4:32 PM", "on Tuesday at 3:10 PM" */
export function atSentence(at: number) {
  const day = Math.floor(at / 1440);
  const time = formatTime(minToTime(at));
  if (day === 0) return `today at ${time}`;
  if (day === -1) return `yesterday at ${time}`;
  return `on ${WEEKDAYS[dow(addDays(TODAY, day))]} at ${time}`;
}
/** "just now", "38 minutes ago", "2h ago", "yesterday" */
export function agoLabel(at: number, now = nowMin) {
  const diff = now - at;
  if (diff < 1) return "just now";
  if (diff < 60) return `${diff} minute${diff === 1 ? "" : "s"} ago`;
  if (Math.floor(at / 1440) === Math.floor(now / 1440)) {
    const h = Math.round(diff / 60);
    return `${h}h ago`;
  }
  return atLabel(at);
}
export const dayOfStamp = (at: number) => addDays(TODAY, Math.floor(at / 1440));

export function dayLabel(date: string) {
  const diff = dayDiff(date);
  const d = fromKeys(date);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff < 7) return WEEKDAYS[d.getDay()];
  return `${WEEKDAYS[d.getDay()].slice(0, 3)}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
export function fullDate(date: string) {
  const d = fromKeys(date);
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
export function longDate(date: string) {
  const d = fromKeys(date);
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS_LONG[d.getMonth()]} ${d.getDate()}`;
}
export function dayWithDate(date: string) {
  const diff = dayDiff(date);
  return diff >= -1 && diff <= 1 ? dayLabel(date) : fullDate(date);
}

export function timeLabel(w: When) {
  if (w.timeKind === "approx" && w.approxLabel) return w.approxLabel;
  if (!w.time) return "Any time";
  if (w.timeKind === "approx") return `Around ${formatTime(w.time)}`;
  return formatTime(w.time);
}
/** "Today, 5:00 PM", "Friday, 3:00 PM", "Friday afternoon", "No date" */
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
export function whenSentence(w: When) {
  if (!w.date) return "with no set date";
  const diff = dayDiff(w.date);
  const day = diff === 0 ? "today" : diff === 1 ? "tomorrow" : diff === -1 ? "yesterday" : diff > 1 && diff < 7 ? `on ${dayLabel(w.date)}` : `on ${fullDate(w.date)}`;
  if (w.timeKind === "approx" && w.approxLabel) return `${day} ${w.approxLabel.toLowerCase()}`;
  if (!w.time) return day;
  return `${day} ${w.timeKind === "before" ? "by" : "at"} ${formatTime(w.time)}`;
}

const APPROX_END: Record<string, string> = { Morning: "12:00", Afternoon: "17:00", Evening: "21:00", Night: "23:59", Tonight: "23:59" };
/** Deadline as a stamp (minutes relative to today), or null. */
export function dueStamp(w: When): number | null {
  if (!w.date) return null;
  const t = w.timeKind === "approx" && w.approxLabel ? APPROX_END[w.approxLabel] ?? "23:59" : w.time ?? "23:59";
  const [h, m] = t.split(":").map(Number);
  return daysBetween(TODAY, w.date) * 1440 + h * 60 + m;
}
export function sortKey(w: When) {
  return dueStamp(w) ?? Number.MAX_SAFE_INTEGER;
}
/** End of this work week (Sunday night) as a stamp. */
export function endOfWeek() {
  return (7 - dow(TODAY)) * 1440 + 1439;
}
