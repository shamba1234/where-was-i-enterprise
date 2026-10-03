/** Deterministic answers to questions about the founder demo state. No AI API. */
import { addDays, dayLabel, formatTime, fullDate, timeLabel, todayKey, whenLabel, whenSentence } from "./clock";
import { closedEntries, grouped, occurrence, statusOf } from "./derive";
import { isRecurring, occursOn, recurrenceLabel } from "./recurrence";
import { Commitment, FounderState } from "./state";

export type Item = { label: string; meta: string; note?: string; tone?: "verified" | "you" | "other" };
export type Answer = { text: string; source: string; tone: "yes" | "no" | "info"; items?: Item[]; action?: { label: string; href: string } };

const has = (q: string, re: RegExp) => re.test(q);
const STOP = new Set("a an the my i me to do did does have has need should when what whats is are was it at on for of in and with about be will by any still yet today tomorrow".split(" "));
const tokens = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w)).map((w) => (w.length > 4 ? w.replace(/(ing|ed|es|s)$/, "") : w));

function bestMatch(q: string, s: FounderState): Commitment | null {
  const qt = new Set(tokens(q));
  let best: { c: Commitment; score: number } | null = null;
  for (const c of s.commitments) {
    const score = tokens(`${c.title} ${c.context}`).filter((w) => qt.has(w)).length;
    if (score > 0 && (!best || score > best.score)) best = { c, score };
  }
  return best?.c ?? null;
}

/** Things on a given day: dated loops, meetings, and recurring occurrences. */
function agenda(s: FounderState, day: string): Item[] {
  const items: { at: string; item: Item }[] = [];
  for (const c of s.commitments) {
    if (isRecurring(c.recurrence)) {
      if (occursOn(c.recurrence, c.date ?? todayKey(), day)) {
        const done = c.occurrences[day];
        items.push({ at: c.time ?? "23:59", item: { label: c.title, meta: timeLabel(c), note: done ? (done.kind === "verified" ? "Verified" : "Done") : recurrenceLabel(c.recurrence, c.date, c.time), tone: done ? "verified" : "you" } });
      }
    } else if (c.date === day && !c.closed) {
      const st = statusOf(c, s);
      items.push({ at: c.time ?? "23:59", item: { label: c.title, meta: c.timeKind === "before" ? `by ${formatTime(c.time!)}` : timeLabel(c), note: st.key === "waiting_other" ? st.label : c.kind === "meeting" ? "Meeting" : undefined, tone: c.owner === "you" ? "you" : "other" } });
    }
  }
  return items.sort((a, b) => a.at.localeCompare(b.at)).map((x) => x.item);
}

/** Simple ranking: someone waiting on you > today's routines due earlier > interrupted work > the rest. */
function ranked(s: FounderState): { c: Commitment; why: string }[] {
  const g = grouped(s);
  const out: { c: Commitment; why: string; score: number }[] = [];
  for (const c of g.needs) {
    const someoneWaiting = c.kind === "deck" || /^Send [A-Z]/.test(c.title);
    out.push({ c, score: someoneWaiting ? 100 : 60, why: someoneWaiting ? `${c.title.match(/Send ([A-Z]\w+)/)?.[1] ?? "Someone"} is waiting on you, and it takes two minutes.` : "It's yours and it's due soon." });
  }
  for (const c of g.routines) if (!occurrence(c).todayClosure) out.push({ c, score: c.time && c.time < "12:00" ? 80 : 30, why: c.time && c.time < "12:00" ? `Today's ${c.title.toLowerCase()} was planned for ${formatTime(c.time)}.` : `It's tonight's routine, at ${c.time ? formatTime(c.time) : "night"}.` });
  for (const c of g.interrupted) out.push({ c, score: 70, why: "You stopped mid-sentence on Step 4, and applications close Friday." });
  return out.sort((a, b) => b.score - a.score);
}

const line = (c: Commitment): Item => ({ label: c.title, meta: c.kind === "application" ? "Step 4 of 6" : c.nextAction, tone: c.owner === "you" ? "you" : "other" });

export function answerQuestion(raw: string, s: FounderState): Answer {
  const q = raw.toLowerCase();
  const g = grouped(s);

  if (has(q, /\b(what should i do|do next|where should i start|what first|priorit)/)) {
    const r = ranked(s);
    if (!r.length) return { text: "Nothing is waiting on you. Everything open is either scheduled or someone else's move.", source: "Ranked by ownership, urgency and deadlines.", tone: "yes" };
    const [top, ...rest] = r;
    return {
      text: `Start with “${top.c.title}”. ${top.why}`,
      source: "Ranked by who's waiting, what's due earliest, and what you left half-done.",
      tone: "info",
      items: [{ label: "Next action", meta: top.c.nextAction, tone: "you" }, ...rest.slice(0, 2).map((x, i) => ({ label: i === 0 ? "Then" : "After that", meta: `${x.c.title}: ${x.c.nextAction}`, tone: "you" as const }))],
      action: top.c.kind === "deck" ? { label: "Continue", href: "/gmail?thread=alex&reply=1" } : top.c.kind === "application" ? { label: "Resume exactly where I stopped", href: "/apply?resume=1" } : undefined,
    };
  }

  if (has(q, /\b(waiting on|waiting for|who owes|blocked|others)\b/)) {
    if (!g.waiting.length) return { text: "You're not waiting on anyone right now.", source: "Checked loops where someone else owns the next action.", tone: "yes" };
    return {
      text: `You're waiting on ${g.waiting.length === 1 ? "one person" : `${g.waiting.length} people`}. No action needed from you.`,
      source: "Loops where someone else owns the next action.",
      tone: "info",
      items: g.waiting.map((c) => ({ label: c.title, meta: `waiting on ${c.owner}`, note: c.kind === "sarah" ? "since yesterday 4:32 PM" : undefined, tone: "other" })),
    };
  }

  if (has(q, /\b(unfinished|left off|interrupted|where (was|did) i (stop|leave)|half.?done|didn'?t finish)\b/)) {
    if (!g.interrupted.length) return { text: "Nothing is interrupted. Every workflow you started is finished or waiting on someone.", source: "Checked Demo Browser sessions.", tone: "yes" };
    return {
      text: "Startup Accelerator Application, Step 4 of 6. You stopped mid-sentence answering “What is your company's competitive advantage?”",
      source: "Reconstructed from Demo Browser: last edit yesterday at 6:47 PM, no submission.",
      tone: "info",
      action: { label: "Resume exactly where I stopped", href: "/apply?resume=1" },
    };
  }

  if (has(q, /\b(completed|finished|done|closed|actually)\b/) && !has(q, /\b(did i|have i (sent|sub))/)) {
    const e = closedEntries(s);
    const ver = e.filter((x) => x.closure.kind === "verified");
    const you = e.filter((x) => x.closure.kind === "completed_by_you");
    return {
      text: `${ver.length} verified by a source, ${you.length} completed on your word.`,
      source: "Verified means a source showed proof. Completed by you means you said so and nothing could check it.",
      tone: "info",
      items: [
        ...ver.map((x) => ({ label: x.c.title + (x.occurrence ? " (today)" : ""), meta: "Verified", note: x.closure.evidence, tone: "verified" as const })),
        ...you.map((x) => ({ label: x.c.title + (x.occurrence ? " (today)" : ""), meta: "Completed by you", note: x.closure.evidence, tone: "you" as const })),
      ],
    };
  }

  if (has(q, /\b(attention|needs me|need me|on me|my plate|what needs)\b/)) {
    const mine = [...g.needs, ...g.interrupted, ...g.routines.filter((c) => !occurrence(c).todayClosure)];
    if (!mine.length) return { text: "Nothing needs you right now.", source: "Loops where you own the next action.", tone: "yes" };
    return { text: `${mine.length} thing${mine.length === 1 ? "" : "s"} need${mine.length === 1 ? "s" : ""} you. Here's the next action for each:`, source: "Only loops where you own the next action. Waiting-on-others is left out on purpose.", tone: "info", items: mine.map(line) };
  }

  const dayAsk = q.match(/\b(today|tonight|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
  if (dayAsk && has(q, /\b(what|anything|have|schedule|plans|agenda|on)\b/) && !has(q, /\b(did i|when)\b/)) {
    const w = dayAsk[1];
    const names = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const t = todayKey();
    const day = w === "today" || w === "tonight" ? t : w === "tomorrow" ? addDays(t, 1) : addDays(t, (names.indexOf(w) - new Date(t + "T00:00").getDay() + 7) % 7);
    const items = agenda(s, day);
    return items.length
      ? { text: `${dayLabel(day)} you have ${items.length} thing${items.length === 1 ? "" : "s"}:`, source: `${fullDate(day)}, from Demo Calendar, your recurring commitments and loops with a date.`, tone: "info", items }
      : { text: `Nothing on ${dayLabel(day).toLowerCase() === "today" ? "today" : fullDate(day)}.`, source: "Checked meetings, recurring commitments and dated loops.", tone: "yes" };
  }

  // Specific loops: "Did I send Alex the deck?", "When is my meeting with Alex?"
  const c = bestMatch(q, s);
  if (c) {
    const st = statusOf(c, s);
    if (has(q, /\bwhen\b/)) {
      if (isRecurring(c.recurrence)) {
        const o = occurrence(c);
        return { text: `${c.title}: ${recurrenceLabel(c.recurrence, c.date, c.time).toLowerCase()}${c.time ? ` at ${formatTime(c.time)}` : ""}. ${o.todayClosure ? `Today's is done. Next is ${o.next ? fullDate(o.next) : "not scheduled"}.` : o.today ? "There's one today." : `Next is ${o.next ? fullDate(o.next) : "not scheduled"}.`}`, source: "From your recurring rule.", tone: "info" };
      }
      return { text: c.date ? `${c.title}: ${whenSentence(c)}.` : `${c.title} has no date.`, source: `${c.source}.`, tone: "info" };
    }
    if (st.key === "verified") return { text: `Yes, verified. ${c.closed?.evidence ?? occurrence(c).todayClosure?.evidence ?? ""}.`.replace("..", "."), source: "Checked against the source, not a checkbox.", tone: "yes" };
    if (st.key === "completed_by_you") return { text: `You marked it done, but nothing could verify it. ${c.closed?.evidence ?? ""}`, source: "Completed by you means no independent evidence.", tone: "info" };
    if (st.key === "needs_verification") return { text: `Possibly. ${c.source} shows new activity, but it hasn't been verified yet.`, source: "Open the card and verify it to close the loop.", tone: "info" };
    if (st.key === "waiting_other") return { text: `Not yet, and it's not on you. ${c.title} is waiting on ${c.owner}.`, source: c.why, tone: "info" };
    return {
      text: `Not yet. ${c.why}`,
      source: `Next action: ${c.nextAction}${c.date ? ` Due ${whenLabel(c, true)}.` : ""}`,
      tone: "no",
      action: c.kind === "deck" ? { label: "Continue", href: "/gmail?thread=alex&reply=1" } : c.kind === "application" ? { label: "Resume exactly where I stopped", href: "/apply?resume=1" } : undefined,
    };
  }

  return {
    text: "I can answer from your open loops and the demo sources. Try: what needs my attention, what am I waiting on, what did I leave unfinished, what do I have tomorrow, what have I actually completed, or what should I do next.",
    source: "Sources: Demo Gmail, Demo Browser, Demo Calendar, and what you've told me.",
    tone: "info",
  };
}
