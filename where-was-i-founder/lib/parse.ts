/**
 * Deterministic, local natural-language parser. No AI API: ordered regex passes that each
 * recognise one phrase, record what was understood, and remove it. What remains is the task.
 */
import { DEMO_START, TimeKind, When, addDays, toDateKey, toTimeKey, todayKey } from "./clock";
import { NO_REPEAT, Recurrence, firstMatching } from "./recurrence";

export type Parsed = When & {
  title: string;
  context: string;
  recurrence: Recurrence;
  owner: string; // "you" or a person's name
  understood: { text: string; as: string }[];
};

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DAY_RE = "(?:sun|mon|tues?|wed(?:nes)?|thu(?:rs)?|fri|sat(?:ur)?)(?:day)?s?";
const NUMBER_WORDS: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, ten: 10, fifteen: 15, twenty: 20, thirty: 30, "forty-five": 45, "forty five": 45 };
const DEADLINE_PREPS = ["before", "by", "until", "till", "due", "no later than"];

type Period = { label: string; start: string; pm: boolean | null };
const PERIODS: Record<string, Period> = {
  morning: { label: "Morning", start: "08:00", pm: false },
  afternoon: { label: "Afternoon", start: "14:00", pm: true },
  evening: { label: "Evening", start: "18:00", pm: true },
  night: { label: "Night", start: "21:00", pm: true },
  tonight: { label: "Tonight", start: "21:00", pm: true },
};

function dayIndex(word: string) {
  const w = word.toLowerCase().replace(/s$/, "");
  return DAY_NAMES.findIndex((d) => d.startsWith(w.slice(0, 3)));
}
const num = (s: string) => Number(s) || NUMBER_WORDS[s.toLowerCase()] || 1;

export function parseCommitment(input: string): Parsed {
  let text = ` ${input.trim()} `;
  const understood: Parsed["understood"] = [];
  const take = (re: RegExp) => {
    const m = text.match(re);
    if (m && m.index !== undefined) text = text.slice(0, m.index) + " " + text.slice(m.index + m[0].length);
    return m;
  };

  let date: string | null = null;
  let time: string | null = null;
  let timeKind: TimeKind = "none";
  let period: Period | null = null;
  let dayIsDeadline = false;
  let recurrence: Recurrence = NO_REPEAT;
  let context = "";

  const paren = take(/\(([^)]+)\)/);
  if (paren) context = paren[1].trim();
  const tail = take(/\s(?:—|–|-|;)\s+(.+)$/);
  if (tail) context = [context, tail[1].trim()].filter(Boolean).join(". ");

  /* ---------- Recurrence ---------- */
  const other = take(/\bevery\s+other\s+(day|morning|afternoon|evening|night|week)\b/i);
  if (other) {
    const w = other[1].toLowerCase();
    recurrence = w === "week" ? { freq: "custom", interval: 2, unit: "weeks", days: [] } : { freq: "every_other_day", interval: 2, unit: "days", days: [] };
    if (PERIODS[w]) period = PERIODS[w];
    understood.push({ text: other[0].trim(), as: "repeats" });
  }
  if (recurrence.freq === "none") {
    const nEvery = take(/\bevery\s+(\d+|two|three|four|five|six|seven)\s+(days?|weeks?)\b/i);
    if (nEvery) {
      recurrence = { freq: "custom", interval: num(nEvery[1]), unit: /week/i.test(nEvery[2]) ? "weeks" : "days", days: [] };
      understood.push({ text: nEvery[0].trim(), as: "repeats" });
    }
  }
  if (recurrence.freq === "none") {
    const wk = take(/\b(?:every\s+weekday|every\s+work\s*day|weekdays|on weekdays)\b/i);
    if (wk) {
      recurrence = { freq: "weekdays", interval: 1, unit: "days", days: [] };
      understood.push({ text: wk[0].trim(), as: "repeats" });
    }
  }
  // "every Monday", "every Monday Wednesday and Friday", "on Mondays and Thursdays"
  const daysRe = new RegExp(`\\b(?:every|on|each)\\s+(${DAY_RE}(?:\\s*(?:,|and|&)?\\s*${DAY_RE})*)\\b`, "i");
  const dayList = recurrence.freq === "none" || recurrence.unit === "weeks" ? text.match(daysRe) : null;
  if (dayList && (/^\s*every|^\s*each/i.test(dayList[0]) || /s\b/i.test(dayList[1]) || recurrence.unit === "weeks")) {
    take(daysRe);
    const days = Array.from(new Set((dayList[1].match(new RegExp(DAY_RE, "gi")) ?? []).map(dayIndex).filter((d) => d >= 0)));
    if (recurrence.unit === "weeks") recurrence = { ...recurrence, days };
    else recurrence = days.length === 1 ? { freq: "weekly", interval: 1, unit: "weeks", days } : { freq: "custom", interval: 1, unit: "weeks", days };
    understood.push({ text: dayList[0].trim(), as: "repeats" });
  }
  if (recurrence.freq === "none") {
    const daily = take(/\b(?:every\s+(day|morning|afternoon|evening|night)|daily|nightly|each\s+(day|morning|night))\b/i);
    if (daily) {
      recurrence = { freq: "daily", interval: 1, unit: "days", days: [] };
      const w = (daily[1] ?? daily[2] ?? (/nightly/i.test(daily[0]) ? "night" : "")).toLowerCase();
      if (PERIODS[w]) period = PERIODS[w];
      understood.push({ text: daily[0].trim(), as: "repeats" });
    }
  }
  if (recurrence.freq === "none") {
    const weekly = take(/\b(?:every\s+week|weekly)\b/i);
    if (weekly) {
      recurrence = { freq: "weekly", interval: 1, unit: "weeks", days: [] };
      understood.push({ text: weekly[0].trim(), as: "repeats" });
    }
  }

  /* ---------- Parts of the day (affect AM/PM) ---------- */
  if (!period) {
    const per = text.match(/\b(?:in the |this |tomorrow |every )?(morning|afternoon|evening|night|tonight)\b/i);
    if (per) period = PERIODS[per[1].toLowerCase()];
  }

  /* ---------- Relative times ---------- */
  const rel = take(/\bin\s+(?:(half an hour)|(\d+|an?|one|two|three|four|five|six|ten|fifteen|twenty|thirty|forty[- ]five)\s*(minutes?|mins?|hours?|hrs?|h)\b)/i);
  if (rel) {
    const minutes = rel[1] ? 30 : num(rel[2]) * (/^h/i.test(rel[3]) ? 60 : 1);
    const at = new Date(DEMO_START.getTime() + minutes * 60_000);
    date = toDateKey(at);
    time = toTimeKey(at);
    timeKind = "exact";
    understood.push({ text: rel[0].trim(), as: "time" });
  }

  /* ---------- Clock times ---------- */
  if (!time) {
    const prep = "(?:\\b(at|by|before|until|till|around|about|due|no later than|@)\\s*)?";
    const clock = take(new RegExp(`${prep}\\b(\\d{1,2})(?::(\\d{2}))?\\s*(a\\.?m\\.?|p\\.?m\\.?)(?=\\W|$)`, "i"));
    const named = clock ? null : take(new RegExp(`${prep}\\b(noon|midnight)\\b`, "i"));
    const bare = clock || named ? null : take(/\b(at|by|before|until|around)\s+(\d{1,2})(?::(\d{2}))?\b(?!\s*(?:%|st|nd|rd|th|people|min|hour|days?|k\b))/i);
    let h: number | null = null;
    let mins = 0;
    let p: string | undefined;
    if (clock) {
      p = clock[1];
      h = Number(clock[2]) % 12;
      mins = Number(clock[3] ?? 0);
      if (/p/i.test(clock[4])) h += 12;
    } else if (named) {
      p = named[1];
      [h, mins] = /noon/i.test(named[2]) ? [12, 0] : [23, 59];
    } else if (bare) {
      p = bare[1];
      h = Number(bare[2]);
      mins = Number(bare[3] ?? 0);
      // Bare hours: the part of day decides; otherwise 1–7 means PM, 8–11 means AM.
      if (h < 12) {
        if (period?.pm === true || (period?.pm !== false && h >= 1 && h <= 7)) h += 12;
      }
    }
    if (h !== null && h < 24 && mins < 60) {
      time = `${String(h).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
      const w = (p ?? "").toLowerCase();
      timeKind = DEADLINE_PREPS.includes(w) ? "before" : w === "around" || w === "about" ? "approx" : "exact";
      understood.push({ text: (clock ?? named ?? bare)![0].trim().replace(/\.$/, ""), as: timeKind === "before" ? "deadline" : "time" });
    }
  }

  /* ---------- Days ---------- */
  if (!date) {
    const dayRe = new RegExp(`\\b(?:(on|by|before|due|for|until|this)\\s+)?(?:(next)\\s+)?(the day after tomorrow|today|tonight|tomorrow|tmrw|week|${DAY_NAMES.join("|")})\\b`, "i");
    const day = recurrence.freq === "none" ? take(dayRe) : null;
    if (day) {
      const prep = (day[1] ?? "").toLowerCase();
      const word = day[3].toLowerCase();
      const isNext = Boolean(day[2]);
      dayIsDeadline = DEADLINE_PREPS.includes(prep);
      const today = todayKey();
      if (word === "today") date = today;
      else if (word === "tonight") {
        date = today;
        period = PERIODS.tonight;
      } else if (word === "tomorrow" || word === "tmrw") date = addDays(today, 1);
      else if (word === "the day after tomorrow") date = addDays(today, 2);
      else if (word === "week") date = isNext ? addDays(today, 7) : null;
      else {
        let diff = (DAY_NAMES.indexOf(word) - DEMO_START.getDay() + 7) % 7;
        if (diff === 0 && (isNext || (time !== null && time <= toTimeKey(DEMO_START)))) diff = 7;
        date = addDays(today, diff);
      }
      if (date) understood.push({ text: day[0].trim(), as: "date" });
    }
  }

  // Remove the part-of-day word now that it has done its job.
  const per = take(/\b(?:in the |this )?(morning|afternoon|evening|night|tonight)\b/i);
  if (per && !understood.some((u) => u.as === "repeats" && u.text.toLowerCase().includes(per[1].toLowerCase()))) {
    understood.push({ text: per[0].trim(), as: "part of day" });
  }
  if (period && !time) {
    time = period.start;
    timeKind = "approx";
  }
  take(/\b(sometime|some time|at some point)\b/i);

  if (recurrence.freq !== "none") {
    // A recurring rule needs an anchor: its first occurrence on or after today.
    date = firstMatching(recurrence, date ?? todayKey());
    if (timeKind === "before") timeKind = "exact";
  }
  if (time && !date) date = time > toTimeKey(DEMO_START) ? todayKey() : addDays(todayKey(), 1);
  if (dayIsDeadline && timeKind === "exact") timeKind = "before";

  let title = cleanTitle(text);
  // "Call accountant about quarterly taxes" → task + context.
  const about = title.match(/^(.{3,}?)\s+(?:about|regarding|re:?)\s+(.+)$/i);
  if (about) {
    title = about[1];
    const ctx = about[2].replace(/^(?:the|our|my)\s+/i, "");
    context = [ctx[0].toUpperCase() + ctx.slice(1), context].filter(Boolean).join(". ");
  }

  return {
    title,
    context,
    recurrence,
    owner: "you",
    date,
    time: date ? time : null,
    timeKind: date && time ? timeKind : "none",
    approxLabel: timeKind === "approx" && period ? period.label : null,
    understood,
  };
}

/**
 * Meeting outcomes become new commitments. "Alex wants the updated financial model by Friday at 5 PM"
 * → "Send Alex updated financial model", due Friday 5:00 PM. "Sarah will send the term sheet" → waiting on Sarah.
 */
export function parseOutcome(input: string): Parsed {
  const p = parseCommitment(input);
  let title = p.title;
  let owner = "you";
  const wants = title.match(/^([A-Z][a-z]+)\s+(?:wants|needs|asked for|requested|would like|is waiting for)\s+(?:me to\s+(.+)|(?:the|an?|our)?\s*(.+))$/);
  const will = title.match(/^([A-Z][a-z]+)\s+(?:will|is going to|'ll)\s+(.+)$/);
  if (wants) {
    title = wants[2] ? cap(wants[2]) : `Send ${wants[1]} ${wants[3].replace(/^(?:the|an?|our)\s+/i, "")}`;
  } else if (will && will[1].toLowerCase() !== "i") {
    owner = will[1];
    title = `${will[1]} to ${will[2].replace(/^(\w+)\s+(?:the|my)\s+/i, "$1 ")}`;
  }
  return { ...p, title, owner };
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function cleanTitle(raw: string) {
  let t = raw.replace(/\s+/g, " ").trim();
  const fillers =
    /^(?:please\s+|remind me to\s+|remember to\s+|don'?t forget to\s+|i need to\s+|i have to\s+|i've got to\s+|i gotta\s+|gotta\s+|need to\s+|have to\s+|i should\s+|i must\s+|must\s+|i will\s+|i'll\s+|i want to\s+|i'm going to\s+|make sure (?:to|i)\s+)/i;
  for (let i = 0; i < 3; i++) t = t.replace(fillers, "");
  const dangling = /(?:\s|^)(?:on|at|by|before|due|for|this|next|around|until|in|and|is|every|,|-)\s*$/i;
  for (let i = 0; i < 4; i++) t = t.replace(dangling, "").trim();
  t = t.replace(/^[\s,.;:!\-]+/, "").replace(/^(?:on|at|by|for|and)\s+/i, "");
  t = t.replace(/\s+([,.;:!?])/g, "$1").replace(/[,.;:\s]+$/g, "").replace(/\s{2,}/g, " ").trim();
  t = t.replace(/^(\S+)\s+the\s+/i, "$1 ");
  return cap(t);
}
