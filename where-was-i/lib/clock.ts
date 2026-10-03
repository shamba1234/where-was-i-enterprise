/**
 * Demo clock. The whole prototype tells one story set on Friday, Oct 2 2026 at 10:38 PM
 * (the dashboard header, "due tonight", "yesterday's" browser history). Captured tasks are
 * interpreted against this same clock so "tomorrow" always means Saturday in the demo.
 */
export const DEMO_NOW = new Date(2026, 9, 2, 22, 38);

export type TimeKind = "exact" | "before" | "approx" | "none";

export type When = {
  date: string | null; // YYYY-MM-DD
  time: string | null; // HH:MM (24h)
  timeKind: TimeKind;
  approxLabel: string | null; // "Morning", "Tonight", "After class"…
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pad = (n: number) => String(n).padStart(2, "0");

export function toDateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function toTimeKey(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
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
export const todayKey = () => toDateKey(DEMO_NOW);

export function dayDiff(date: string) {
  const a = fromKeys(todayKey()).getTime();
  const b = fromKeys(date).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** "Today", "Tomorrow", "Monday", "Mon, Oct 12" */
export function dayLabel(date: string) {
  const diff = dayDiff(date);
  const d = fromKeys(date);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff < 7) return WEEKDAYS[d.getDay()];
  return `${WEEKDAYS[d.getDay()].slice(0, 3)}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "Saturday, Oct 3" */
export function fullDate(date: string) {
  const d = fromKeys(date);
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${suffix}`;
}

/** Time on its own: "3:00 PM", "Before 11:59 PM", "Tomorrow morning" style labels. */
export function timeLabel(w: When) {
  if (w.timeKind === "approx" && w.approxLabel) return w.approxLabel;
  if (!w.time) return "Any time";
  if (w.timeKind === "before") return `Before ${formatTime(w.time)}`;
  if (w.timeKind === "approx") return `Around ${formatTime(w.time)}`;
  return formatTime(w.time);
}

/** Compact label for cards: "Tomorrow, 3:00 PM", "Tonight", "Saturday, before 5:15 PM". */
export function whenLabel(w: When) {
  if (!w.date) return "No deadline";
  const day = dayLabel(w.date);
  if (w.timeKind === "approx" && w.approxLabel) {
    if (w.approxLabel === "This weekend") return "This weekend";
    if (w.approxLabel === "Tonight") return dayDiff(w.date) === 0 ? "Tonight" : `${day} night`;
    if (["Morning", "Afternoon", "Evening"].includes(w.approxLabel)) {
      if (dayDiff(w.date) === 0) return `This ${w.approxLabel.toLowerCase()}`;
      return `${day} ${w.approxLabel.toLowerCase()}`;
    }
    return `${day}, ${w.approxLabel.toLowerCase()}`;
  }
  if (!w.time) return day;
  if (w.timeKind === "before") return `${day}, before ${formatTime(w.time)}`;
  if (w.timeKind === "approx") return `${day}, around ${formatTime(w.time)}`;
  return `${day}, ${formatTime(w.time)}`;
}

/** Phrase that fits in a sentence: "tomorrow at 7:00 PM", "tonight", "on Monday before 5:00 PM". */
export function whenSentence(w: When) {
  if (!w.date) return "with no set deadline";
  const diff = dayDiff(w.date);
  const day = diff === 0 ? "today" : diff === 1 ? "tomorrow" : diff > 1 && diff < 7 ? `on ${dayLabel(w.date)}` : `on ${fullDate(w.date)}`;
  if (w.timeKind === "approx" && w.approxLabel) {
    const l = w.approxLabel.toLowerCase();
    if (l === "this weekend") return "this weekend";
    if (l === "tonight") return diff === 0 ? "tonight" : `${day} night`;
    if (["morning", "afternoon", "evening"].includes(l)) return diff === 0 ? `this ${l}` : `${day} ${l}`;
    return `${day} ${l}`;
  }
  if (!w.time) return day;
  if (w.timeKind === "before") return `${day} before ${formatTime(w.time)}`;
  if (w.timeKind === "approx") return `${day} around ${formatTime(w.time)}`;
  return `${day} at ${formatTime(w.time)}`;
}

const APPROX_END: Record<string, string> = {
  Morning: "12:00",
  Afternoon: "17:00",
  Evening: "21:00",
  Tonight: "23:59",
  "After class": "17:00",
  "After lunch": "15:00",
  "After dinner": "22:00",
  "After work": "21:00",
  "After school": "18:00",
  "This weekend": "23:59",
};

/** The moment the task is actually late. */
export function dueAt(w: When): Date | null {
  if (!w.date) return null;
  if (w.timeKind === "approx" && w.approxLabel) return fromKeys(w.date, APPROX_END[w.approxLabel] ?? "23:59");
  if (!w.time) return fromKeys(w.date, "23:59");
  return fromKeys(w.date, w.time);
}

/** For ordering: when the task starts mattering. */
export function sortKey(w: When) {
  if (!w.date) return Number.MAX_SAFE_INTEGER;
  return fromKeys(w.date, w.time ?? "23:59").getTime();
}

export type Urgency = "overdue" | "soon" | "today" | "tomorrow" | "later" | "none";

export function urgency(w: When): Urgency {
  const due = dueAt(w);
  if (!due) return "none";
  const ms = due.getTime() - DEMO_NOW.getTime();
  if (ms < 0) return "overdue";
  if (ms <= 3 * 3_600_000) return "soon";
  const diff = dayDiff(w.date!);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  return "later";
}
