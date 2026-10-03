/**
 * Deterministic, local natural-language parser for captured tasks.
 * No AI API: a sequence of regex passes that each recognise a phrase, record what it
 * understood, and remove it from the text. Whatever is left becomes the task title.
 */
import { DEMO_NOW, TimeKind, When, addDays, toDateKey, toTimeKey, todayKey } from "./clock";
import type { Priority } from "./state";

export type Parsed = When & {
  title: string;
  notes: string;
  priority: Priority;
  /** Phrases the parser recognised, shown to the user as proof of interpretation. */
  understood: { text: string; as: string }[];
};

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, ten: 10,
  fifteen: 15, twenty: 20, thirty: 30, "forty-five": 45, "forty five": 45,
};
const DEADLINE_PREPS = ["before", "by", "until", "till", "due", "no later than"];

type Period = { label: string; start: string };
const PERIODS: Record<string, Period> = {
  morning: { label: "Morning", start: "09:00" },
  afternoon: { label: "Afternoon", start: "14:00" },
  evening: { label: "Evening", start: "18:00" },
  tonight: { label: "Tonight", start: "21:00" },
  "after class": { label: "After class", start: "12:00" },
  "after lunch": { label: "After lunch", start: "13:00" },
  "after dinner": { label: "After dinner", start: "19:30" },
  "after work": { label: "After work", start: "17:00" },
  "after school": { label: "After school", start: "15:00" },
  "this weekend": { label: "This weekend", start: "12:00" },
};

export function parseTask(input: string): Parsed {
  let text = ` ${input.trim()} `;
  const understood: Parsed["understood"] = [];
  const take = (re: RegExp): RegExpMatchArray | null => {
    const m = text.match(re);
    if (m && m.index !== undefined) {
      text = text.slice(0, m.index) + " " + text.slice(m.index + m[0].length);
    }
    return m;
  };

  let date: string | null = null;
  let time: string | null = null;
  let timeKind: TimeKind = "none";
  let period: Period | null = null;
  let dayIsDeadline = false;
  let priority: Priority = "normal";
  let notes = "";

  // Notes: anything in parentheses, or after a dash / semicolon.
  const paren = take(/\(([^)]+)\)/);
  if (paren) notes = paren[1].trim();
  const tail = take(/\s(?:—|–|-|;)\s+(.+)$/);
  if (tail) notes = [notes, tail[1].trim()].filter(Boolean).join(". ");

  // Relative: "in 2 hours", "in 30 minutes", "in half an hour".
  const rel = take(
    /\bin\s+(?:(half an hour)|(\d+|an?|one|two|three|four|five|six|ten|fifteen|twenty|thirty|forty[- ]five)\s*(minutes?|mins?|hours?|hrs?|h)\b)/i,
  );
  if (rel) {
    const minutes = rel[1]
      ? 30
      : (Number(rel[2]) || NUMBER_WORDS[rel[2].toLowerCase()] || 1) * (/^h/i.test(rel[3]) ? 60 : 1);
    const at = new Date(DEMO_NOW.getTime() + minutes * 60_000);
    date = toDateKey(at);
    time = toTimeKey(at);
    timeKind = "exact";
    understood.push({ text: rel[0].trim(), as: "time" });
  }

  // Clock times: "at 5 PM", "before 11:59 PM", "by 7pm", "around 3:30 p.m.", "noon", "midnight".
  if (!time) {
    const prep = "(?:\\b(at|by|before|until|till|around|about|due|no later than|@)\\s*)?";
    const clock = take(new RegExp(`${prep}\\b(\\d{1,2})(?::(\\d{2}))?\\s*(a\\.?m\\.?|p\\.?m\\.?)(?=\\W|$)`, "i"));
    const named = clock ? null : take(new RegExp(`${prep}\\b(noon|midnight)\\b`, "i"));
    const bare = clock || named ? null : take(/\b(at|by|before|until|around)\s+(\d{1,2})(?::(\d{2}))?\b(?!\s*(?:%|st|nd|rd|th|people|min|hour|days?))/i);

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
      if (/noon/i.test(named[2])) h = 12;
      else { h = 23; mins = 59; }
    } else if (bare) {
      p = bare[1];
      h = Number(bare[2]);
      mins = Number(bare[3] ?? 0);
      if (h === 12) h = 12;
      else if (h >= 1 && h <= 8) h += 12; // "at 7" → 7 PM
    }
    if (h !== null && h < 24 && mins < 60) {
      time = `${String(h).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
      const prepWord = (p ?? "").toLowerCase();
      timeKind = DEADLINE_PREPS.includes(prepWord) ? "before" : prepWord === "around" || prepWord === "about" ? "approx" : "exact";
      understood.push({ text: (clock ?? named ?? bare)![0].trim(), as: timeKind === "before" ? "deadline" : "time" });
    }
  }

  // Days: today, tonight, tomorrow, the day after tomorrow, weekdays, next Monday, next week, this weekend.
  if (!date) {
    const dayRe = new RegExp(
      `\\b(?:(on|by|before|due|for|until|this)\\s+)?(?:(next)\\s+)?(the day after tomorrow|today|tonight|tomorrow|tmrw|tmr|week|weekend|${WEEKDAYS.join("|")})\\b`,
      "i",
    );
    const day = take(dayRe);
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
      } else if (word === "tomorrow" || word === "tmrw" || word === "tmr") date = addDays(today, 1);
      else if (word === "the day after tomorrow") date = addDays(today, 2);
      else if (word === "week") date = isNext ? addDays(today, 7) : null;
      else if (word === "weekend") {
        date = addDays(today, (6 - DEMO_NOW.getDay() + 7) % 7 || (isNext ? 7 : 0));
        if (!time) period = PERIODS["this weekend"];
      } else {
        const target = WEEKDAYS.indexOf(word);
        let diff = (target - DEMO_NOW.getDay() + 7) % 7;
        // Same weekday: today if the time is still ahead, otherwise next week.
        if (diff === 0 && (isNext || (time !== null && time <= toTimeKey(DEMO_NOW)))) diff = 7;
        date = addDays(today, diff);
      }
      if (date) understood.push({ text: day[0].trim(), as: "date" });
      else text = text.replace(/\s+/g, " ") + " " + day[0]; // "this week": leave it in the title
    }
  }

  // Approximate parts of the day: "tomorrow morning", "in the afternoon", "after class".
  const per = take(/\b(?:in the |this )?(morning|afternoon|evening|tonight|after (?:class|lunch|dinner|work|school))\b/i);
  if (per) {
    const key = per[1].toLowerCase();
    if (!time) period = PERIODS[key] ?? period;
    if (!date) date = todayKey();
    understood.push({ text: per[0].trim(), as: "part of day" });
  }
  if (period && !time) {
    time = period.start;
    timeKind = "approx";
  }
  // "Sometime", "at some point": explicitly approximate, no information to keep.
  take(/\b(sometime|some time|at some point)\b/i);

  // A clock time with no day: today if it's still ahead, otherwise tomorrow.
  if (time && !date) date = time > toTimeKey(DEMO_NOW) ? todayKey() : addDays(todayKey(), 1);
  if (date && !time && dayIsDeadline) timeKind = "none";
  if (dayIsDeadline && timeKind === "exact") timeKind = "before";

  // Priority, only when clearly stated.
  const hi = take(/\b(urgent(?:ly)?|asap|a\.s\.a\.p\.|important|critical|high priority)\b|!{2,}/i);
  if (hi) {
    priority = "high";
    understood.push({ text: hi[0].trim(), as: "high priority" });
  } else {
    const lo = take(/\b(no rush|whenever|eventually|low priority|if i have time)\b/i);
    if (lo) {
      priority = "low";
      understood.push({ text: lo[0].trim(), as: "low priority" });
    }
  }

  return {
    title: cleanTitle(text),
    notes,
    priority,
    date,
    time: date ? time : null,
    timeKind: date ? (time ? timeKind : "none") : "none",
    approxLabel: timeKind === "approx" && period ? period.label : null,
    understood,
  };
}

function cleanTitle(raw: string) {
  let t = raw.replace(/\s+/g, " ").trim();
  const fillers =
    /^(?:please\s+|remind me to\s+|remember to\s+|don'?t forget to\s+|i need to\s+|i have to\s+|i've got to\s+|i gotta\s+|gotta\s+|need to\s+|have to\s+|i should\s+|i must\s+|must\s+|i will\s+|i'll\s+|i want to\s+|i'm going to\s+|make sure (?:to|i)\s+|to ?do:?\s+)/i;
  for (let i = 0; i < 3; i++) t = t.replace(fillers, "");

  // Dangling connectors left behind after removing dates and times.
  const dangling = /(?:\s|^)(?:on|at|by|before|due|for|this|next|around|until|in|and|is|,|-)\s*$/i;
  for (let i = 0; i < 4; i++) t = t.replace(dangling, "").trim();
  t = t.replace(/^[\s,.;:!\-]+/, "").replace(/^(?:on|at|by|for|and)\s+/i, "");
  t = t.replace(/\s+([,.;:!?])/g, "$1").replace(/[,.;:\s]+$/g, "").replace(/\s{2,}/g, " ").trim();

  // "call my mom" → "Call Mom"; "Submit my TAM homework" → "Submit TAM homework".
  t = t.replace(/\b(?:my\s+)?(mom|dad|mum)\b/gi, (_, w: string) => w[0].toUpperCase() + w.slice(1).toLowerCase());
  t = t.replace(/^(\S+)\s+(?:my|the)\s+/i, "$1 ");

  return t ? t[0].toUpperCase() + t.slice(1) : "";
}
