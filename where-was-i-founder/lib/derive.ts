/**
 * Everything the UI shows is derived here from the one stored state: ownership status,
 * which section a loop belongs to, recurring occurrences, the lifecycle stage, and counts.
 */
import { dayDiff, nowLabel, sortKey, todayKey } from "./clock";
import { isRecurring, nextOccurrence } from "./recurrence";
import { Closure, Commitment, FounderState } from "./state";

export type StatusKey =
  | "waiting_you"
  | "waiting_other"
  | "scheduled"
  | "interrupted"
  | "needs_verification"
  | "verified"
  | "completed_by_you"
  | "due_today";

export type Status = { key: StatusKey; label: string };

export type Occurrence = {
  /** Today's occurrence exists for this rule. */
  today: boolean;
  /** How today's occurrence was closed, if it was. */
  todayClosure: Closure | null;
  /** The occurrence that's open now (today, or the next future one). */
  current: string | null;
  /** The occurrence after today's (shown as "Next: …"). */
  next: string | null;
};

export function occurrence(c: Commitment): Occurrence {
  const t = todayKey();
  const anchor = c.date ?? t;
  const first = nextOccurrence(c.recurrence, anchor, t);
  const today = first === t;
  const todayClosure = today ? c.occurrences[t] ?? null : null;
  const after = nextOccurrence(c.recurrence, anchor, today ? addOne(t) : t);
  return { today, todayClosure, current: today && !todayClosure ? t : today ? after : first, next: today ? after : first };
}
const addOne = (d: string) => {
  const [y, m, dd] = d.split("-").map(Number);
  const x = new Date(y, m - 1, dd + 1);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

/** Has an email to Alex been sent since he asked? (Evidence may or may not satisfy the loop.) */
export const mailTo = (s: FounderState, name: string) => s.gmail.sent.filter((m) => m.to.toLowerCase().startsWith(name.toLowerCase()));

export function statusOf(c: Commitment, s: FounderState): Status {
  if (isRecurring(c.recurrence)) {
    const o = occurrence(c);
    if (o.todayClosure) return o.todayClosure.kind === "verified" ? { key: "verified", label: "Verified" } : { key: "completed_by_you", label: "Completed by you" };
    if (o.today) return { key: "due_today", label: "Due today" };
    return { key: "scheduled", label: "Scheduled" };
  }
  if (c.closed) return c.closed.kind === "verified" ? { key: "verified", label: "Verified" } : { key: "completed_by_you", label: "Completed by you" };

  switch (c.kind) {
    case "deck":
      return mailTo(s, "Alex").length ? { key: "needs_verification", label: "Needs verification" } : { key: "waiting_you", label: "Waiting on you" };
    case "sarah":
      return s.gmail.sarahReplied ? { key: "needs_verification", label: "Needs verification" } : { key: "waiting_other", label: "Waiting on Sarah" };
    case "application":
      return s.app.submitted ? { key: "needs_verification", label: "Needs verification" } : { key: "interrupted", label: "Interrupted" };
    case "meeting":
      return { key: "scheduled", label: "Scheduled" };
    default:
      if (c.owner !== "you") return { key: "waiting_other", label: `Waiting on ${c.owner}` };
      if (c.kind !== "outcome" && c.date && dayDiff(c.date) > 1) return { key: "scheduled", label: "Scheduled" };
      return { key: "waiting_you", label: "Waiting on you" };
  }
}

export type SectionKey = "needs" | "interrupted" | "waiting" | "routines" | "upcoming" | "closed";

export function sectionOf(c: Commitment, s: FounderState): SectionKey {
  if (isRecurring(c.recurrence)) return occurrence(c).today ? "routines" : "upcoming";
  if (c.closed) return "closed";
  const st = statusOf(c, s).key;
  if (c.kind === "application") return "interrupted";
  if (st === "waiting_other") return "waiting";
  if (st === "scheduled") return "upcoming";
  return "needs";
}

export function grouped(s: FounderState) {
  const g: Record<SectionKey, Commitment[]> = { needs: [], interrupted: [], waiting: [], routines: [], upcoming: [], closed: [] };
  for (const c of s.commitments) g[sectionOf(c, s)].push(c);
  const byTime = (a: Commitment, b: Commitment) => sortKey(a) - sortKey(b) || a.order - b.order;
  g.needs.sort((a, b) => a.order - b.order);
  g.routines.sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  g.upcoming.sort((a, b) => {
    const da = isRecurring(a.recurrence) ? occurrence(a).current : a.date;
    const db = isRecurring(b.recurrence) ? occurrence(b).current : b.date;
    return sortKey({ ...a, date: da }) - sortKey({ ...b, date: db }) || byTime(a, b);
  });
  return g;
}

/** Closed items, newest first, including today's closed occurrences of recurring loops. */
export function closedEntries(s: FounderState) {
  const out: { c: Commitment; closure: Closure; occurrence: boolean }[] = [];
  for (const c of s.commitments) {
    if (c.closed) out.push({ c, closure: c.closed, occurrence: false });
    for (const [date, closure] of Object.entries(c.occurrences)) {
      if (date === todayKey()) out.push({ c, closure, occurrence: true });
    }
  }
  const rank = (e: (typeof out)[number]) => (e.closure.at.startsWith("Yesterday") ? 0 : 1);
  return out.sort((a, b) => rank(b) - rank(a) || b.c.order - a.c.order);
}

export function counts(s: FounderState) {
  const g = grouped(s);
  const routinesPending = g.routines.filter((c) => !occurrence(c).todayClosure).length;
  return {
    needsYou: g.needs.length + g.interrupted.length + routinesPending,
    needsSection: g.needs.length,
    waiting: g.waiting.length,
    interrupted: g.interrupted.length,
    recurringToday: g.routines.length,
    routinesPending,
    upcoming: g.upcoming.length,
    completed: closedEntries(s).length,
    verified: closedEntries(s).filter((e) => e.closure.kind === "verified").length,
  };
}

/** DETECT → UNDERSTAND → RESUME → VERIFY → CLOSE. Returns the index of the current stage. */
export const LIFECYCLE = ["Detect", "Understand", "Resume", "Verify", "Close"] as const;
export function lifecycleStage(c: Commitment, s: FounderState): number {
  const st = statusOf(c, s).key;
  if (st === "verified" || st === "completed_by_you") return 5;
  if (st === "needs_verification") return 3;
  return 2;
}

/* ---------------- Verification against simulated sources ---------------- */

export type Check = { ok: true; closure: Closure } | { ok: false; reason: string };

export function verify(c: Commitment, s: FounderState): Check {
  if (c.verifier === "gmail_deck") {
    const toAlex = mailTo(s, "Alex");
    const withDeck = toAlex.find((m) => m.attachments.includes("Founder_Deck.pdf"));
    if (withDeck) return { ok: true, closure: { kind: "verified", at: nowLabel(), evidence: `Email to Alex Chen with Founder_Deck.pdf, sent ${withDeck.at}` } };
    if (toAlex.length) {
      const m = toAlex[toAlex.length - 1];
      const att = m.attachments.length ? `with ${m.attachments.join(", ")}` : "with no attachment";
      return { ok: false, reason: `An email to Alex was sent at ${m.at}, ${att}. Founder_Deck.pdf wasn't attached.` };
    }
    return { ok: false, reason: "No outgoing email containing Founder_Deck.pdf was detected." };
  }
  if (c.verifier === "gmail_sarah") {
    if (s.gmail.sarahReplied) return { ok: true, closure: { kind: "verified", at: nowLabel(), evidence: `Sarah replied “Approved” at ${s.gmail.sarahRepliedAt}` } };
    return { ok: false, reason: "Still no reply from Sarah in Demo Gmail." };
  }
  if (c.verifier === "browser_app") {
    if (s.app.submitted) return { ok: true, closure: { kind: "verified", at: nowLabel(), evidence: `Submission confirmation #NS-W27-0412 at ${s.app.submittedAt}` } };
    return { ok: false, reason: "No submission confirmation was found. The application is still on Step 4 of 6." };
  }
  if (c.verifier === "gmail_outcome") {
    const m = c.title.match(/^Send ([A-Z]\w+)\s+(.+)$/);
    const name = m?.[1] ?? "";
    const words = (m?.[2] ?? "").toLowerCase().split(/\W+/).filter((w) => w.length > 3 && w !== "updated");
    const hit = mailTo(s, name).find((mail) => {
      const hay = `${mail.subject} ${mail.body} ${mail.attachments.join(" ")}`.toLowerCase().replace(/_/g, " ");
      return words.some((w) => hay.includes(w));
    });
    if (hit) return { ok: true, closure: { kind: "verified", at: nowLabel(), evidence: `Email to ${name} found in Demo Gmail${hit.attachments.length ? ` with ${hit.attachments.join(", ")}` : ""}, sent ${hit.at}` } };
    return { ok: false, reason: `No outgoing email to ${name} mentioning the ${words.join(" ") || "file"} was found in Demo Gmail.` };
  }
  return { ok: false, reason: "There's no connected source for this one. You can mark it done yourself." };
}

export const SOURCE_FOR: Record<string, string> = {
  gmail_deck: "Demo Gmail",
  gmail_sarah: "Demo Gmail",
  gmail_outcome: "Demo Gmail",
  browser_app: "Demo Browser",
  proof: "your proof",
  none: "",
};
