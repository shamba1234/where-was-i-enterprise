"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { When, addDays, nowLabel, setSessionStart, todayKey } from "./clock";
import { NO_REPEAT, Recurrence } from "./recurrence";

/**
 * ONE local state for the whole founder demo: commitments (open loops), their occurrences and
 * closures, and the simulated sources (Demo Gmail, Demo Browser). Persisted to localStorage.
 */

export type Proof = { name: string; size: number; type: string; thumb: string | null };
/** How a loop (or one occurrence of a recurring loop) was closed. */
export type Closure = {
  kind: "verified" | "completed_by_you";
  at: string; // "8:16 AM" or "Yesterday, 6:10 PM"
  evidence: string;
  proof?: Proof;
};

export type Kind = "deck" | "sarah" | "application" | "meeting" | "run" | "routine" | "manual" | "outcome" | "history";
export type Verifier = "gmail_deck" | "gmail_sarah" | "gmail_outcome" | "browser_app" | "proof" | "none";

export type Commitment = When & {
  id: string;
  kind: Kind;
  title: string;
  context: string;
  /** Why is this open? One plain sentence. */
  why: string;
  nextAction: string;
  source: string;
  /** Who owns the next action: "you" or a person's first name. */
  owner: string;
  verifier: Verifier;
  /** Evidence that this loop exists and is still open. */
  evidence: { label: string; detail: string }[];
  /** What would count as proof that it's done. */
  closesWhen: string;
  detected: string;
  recurrence: Recurrence;
  closed: Closure | null; // one-off loops
  occurrences: Record<string, Closure>; // recurring loops, keyed by date
  checklist: string[];
  checks: Record<string, string[]>; // checked items per occurrence date
  origin: "seed" | "manual" | "outcome";
  derivedFrom: string | null; // commitment chains
  raw: string;
  order: number;
  prepDone?: boolean;
};

export type SentMail = { id: string; to: string; subject: string; body: string; attachments: string[]; at: string };

export type FounderState = {
  commitments: Commitment[];
  gmail: { sent: SentMail[]; sarahReplied: boolean; sarahRepliedAt: string | null };
  app: {
    step: number;
    competitors: string;
    advantage: string;
    raise: string;
    raisedBefore: "" | "yes" | "no";
    submitted: boolean;
    submittedAt: string | null;
  };
  sessionStartedAt: number;
};

export const ADVANTAGE_PARTIAL =
  "Kestrel's advantage is our data network. Every carrier that joins makes delivery-time predictions better for every shipper on the platform, so accuracy compounds with each new customer. After 14 months of live freight data we";

const today = todayKey();
const base = {
  timeKind: "none" as const,
  approxLabel: null,
  recurrence: NO_REPEAT,
  closed: null,
  occurrences: {},
  checklist: [],
  checks: {},
  origin: "seed" as const,
  derivedFrom: null,
  raw: "",
};

export function seedCommitments(): Commitment[] {
  return [
    {
      ...base,
      id: "deck",
      kind: "deck",
      order: 1,
      title: "Send Alex investor deck",
      context: "Alex Chen requested the latest investor deck yesterday, ahead of tomorrow's meeting.",
      why: "Alex requested the latest deck yesterday. No subsequent outgoing message containing Founder_Deck.pdf was detected.",
      nextAction: "Attach Founder_Deck.pdf and reply to Alex.",
      source: "Demo Gmail",
      owner: "you",
      verifier: "gmail_deck",
      evidence: [
        { label: "Demo Gmail", detail: "Incoming: “Latest investor deck?” from Alex Chen, yesterday 5:14 PM" },
        { label: "Demo Gmail", detail: "No message to Alex in Sent since then" },
        { label: "Demo Browser", detail: "You opened Founder_Deck.pdf at 6:02 PM but didn't attach it anywhere" },
      ],
      closesWhen: "An outgoing email to Alex Chen with Founder_Deck.pdf attached.",
      detected: "Yesterday, 5:14 PM",
      date: addDays(today, 1),
      time: "14:30",
      timeKind: "before",
    },
    {
      ...base,
      id: "sarah",
      kind: "sarah",
      order: 2,
      title: "Landing page approval",
      context: "You sent Sarah the final landing-page copy yesterday at 4:32 PM. No response has been detected.",
      why: "You requested Sarah's approval. No response has been detected.",
      nextAction: "Sarah reviews and approves the landing-page copy.",
      source: "Demo Gmail",
      owner: "Sarah",
      verifier: "gmail_sarah",
      evidence: [
        { label: "Demo Gmail", detail: "Sent: “Final landing page copy” to Sarah Kim, yesterday 4:32 PM" },
        { label: "Demo Gmail", detail: "No reply from Sarah in the thread" },
      ],
      closesWhen: "A reply from Sarah approving the copy.",
      detected: "Yesterday, 4:32 PM",
      date: null,
      time: null,
    },
    {
      ...base,
      id: "application",
      kind: "application",
      order: 3,
      title: "Startup Accelerator Application",
      context: "Northstar Accelerator, Winter 2027 batch. Applications close Friday at 11:59 PM.",
      why: "You started this application but stopped on Step 4 of 6.",
      nextAction: "Finish the competitive-advantage response on Step 4.",
      source: "Demo Browser",
      owner: "you",
      verifier: "browser_app",
      evidence: [
        { label: "Demo Browser", detail: "Steps 1–3 saved yesterday by 5:20 PM" },
        { label: "Demo Browser", detail: "Last edit on Step 4 at 6:47 PM, mid-sentence" },
        { label: "Demo Browser", detail: "No submission confirmation page was ever reached" },
      ],
      closesWhen: "A submission confirmation from the application portal.",
      detected: "Yesterday, 6:47 PM",
      date: addDays(today, 3),
      time: "23:59",
      timeKind: "before",
    },
    {
      ...base,
      id: "meeting",
      kind: "meeting",
      order: 4,
      title: "Investor meeting — Alex Chen",
      context: "Discuss seed-round metrics and product traction.",
      why: "This meeting is on your Demo Calendar. Meetings usually create follow-ups, so I'll ask what came out of it.",
      nextAction: "Review traction numbers before the meeting.",
      source: "Demo Calendar",
      owner: "you",
      verifier: "none",
      evidence: [{ label: "Demo Calendar", detail: "Wednesday 2:30–3:15 PM with Alex Chen, Brightline Ventures" }],
      closesWhen: "The meeting happens and you record its outcome.",
      detected: "Last Thursday",
      date: addDays(today, 1),
      time: "14:30",
      timeKind: "exact",
      prepDone: false,
    },
    {
      ...base,
      id: "run",
      kind: "run",
      order: 5,
      title: "Run 5K",
      context: "A commitment you set for yourself in September.",
      why: "This is today's occurrence of your recurring 5K commitment.",
      nextAction: "Complete today's 5K and upload workout proof.",
      source: "Added by you",
      owner: "you",
      verifier: "proof",
      evidence: [{ label: "Your rule", detail: "Every other morning at 7:00 AM, since Sep 1" }],
      closesWhen: "A workout screenshot or photo for today's run.",
      detected: "Recurring",
      date: today,
      time: "07:00",
      timeKind: "exact",
      recurrence: { freq: "every_other_day", interval: 2, unit: "days", days: [] },
    },
    {
      ...base,
      id: "routine",
      kind: "routine",
      order: 6,
      title: "Evening routine",
      context: "Fictional demo checklist.",
      why: "This is tonight's occurrence of your nightly routine.",
      nextAction: "Check off tonight's five items.",
      source: "Added by you",
      owner: "you",
      verifier: "proof",
      evidence: [{ label: "Your rule", detail: "Every night at 10:00 PM" }],
      closesWhen: "All five items checked. A photo makes it verified; without one it's completed by you.",
      detected: "Recurring",
      date: today,
      time: "22:00",
      timeKind: "exact",
      recurrence: { freq: "daily", interval: 1, unit: "days", days: [] },
      checklist: ["Vitamin D", "Vitamin B12", "Magnesium", "Omega-3", "Multivitamin"],
    },
    {
      ...base,
      id: "priya",
      kind: "history",
      order: 7,
      title: "Send pitch follow-up to Priya",
      context: "Promised after Friday's pitch.",
      why: "You told Priya you'd follow up after the pitch.",
      nextAction: "",
      source: "Demo Gmail",
      owner: "you",
      verifier: "none",
      evidence: [{ label: "Demo Gmail", detail: "Sent to Priya Shah with Kestrel_one_pager.pdf" }],
      closesWhen: "An outgoing email to Priya.",
      detected: "Friday",
      date: null,
      time: null,
      closed: { kind: "verified", at: "Yesterday, 6:10 PM", evidence: "Email to Priya Shah found in Demo Gmail Sent" },
    },
    {
      ...base,
      id: "flights",
      kind: "history",
      order: 8,
      title: "Book flights for demo day",
      context: "",
      why: "You asked Where Was I? to remember this.",
      nextAction: "",
      source: "Added by you",
      owner: "you",
      verifier: "none",
      evidence: [],
      closesWhen: "You confirm it's done.",
      detected: "Last week",
      date: null,
      time: null,
      closed: { kind: "completed_by_you", at: "Yesterday, 7:30 PM", evidence: "No connected source to check" },
    },
  ];
}

export function makeInitialState(): FounderState {
  return {
    commitments: seedCommitments(),
    gmail: { sent: [], sarahReplied: false, sarahRepliedAt: null },
    app: { step: 4, competitors: "Freightwise, ShipSight, in-house spreadsheets", advantage: ADVANTAGE_PARTIAL, raise: "", raisedBefore: "", submitted: false, submittedAt: null },
    sessionStartedAt: 0,
  };
}

const KEY = "where-was-i-founder:state:v1";

function load(): FounderState | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as FounderState;
    if (!Array.isArray(p.commitments) || !p.gmail || !p.app) return null;
    return p;
  } catch {
    return null;
  }
}
function save(s: FounderState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage full or blocked: state still lives in memory */
  }
}

type Ctx = { state: FounderState; hydrated: boolean; update: (fn: (s: FounderState) => FounderState) => void; reset: () => void };
const Context = createContext<Ctx | null>(null);

export function FounderProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FounderState>(makeInitialState);
  const [hydrated, setHydrated] = useState(false);
  const ref = useRef(state);
  ref.current = state;

  useEffect(() => {
    const loaded = load() ?? { ...makeInitialState(), sessionStartedAt: Date.now() };
    setSessionStart(loaded.sessionStartedAt);
    save(loaded);
    ref.current = loaded;
    setState(loaded);
    setHydrated(true);
    const sync = () => {
      const l = load();
      if (l) {
        ref.current = l;
        setState(l);
      }
    };
    const onStorage = (e: StorageEvent) => e.key === KEY && sync();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", sync);
    };
  }, []);

  const update = useCallback((fn: (s: FounderState) => FounderState) => {
    const next = fn(ref.current);
    ref.current = next;
    save(next);
    setState(next);
  }, []);

  const reset = useCallback(() => {
    const fresh = { ...makeInitialState(), sessionStartedAt: Date.now() };
    setSessionStart(fresh.sessionStartedAt);
    ref.current = fresh;
    save(fresh);
    setState(fresh);
  }, []);

  return <Context.Provider value={{ state, hydrated, update, reset }}>{children}</Context.Provider>;
}

export function useFounder() {
  const c = useContext(Context);
  if (!c) throw new Error("useFounder must be used inside FounderProvider");
  return c;
}

/* ---------------- Pure operations ---------------- */

const mapC = (s: FounderState, id: string, fn: (c: Commitment) => Commitment): FounderState => ({
  ...s,
  commitments: s.commitments.map((c) => (c.id === id ? fn(c) : c)),
});

export const closeCommitment = (s: FounderState, id: string, closure: Closure) => mapC(s, id, (c) => ({ ...c, closed: closure }));
export const reopenCommitment = (s: FounderState, id: string) => mapC(s, id, (c) => ({ ...c, closed: null }));
export const closeOccurrence = (s: FounderState, id: string, date: string, closure: Closure) =>
  mapC(s, id, (c) => ({ ...c, occurrences: { ...c.occurrences, [date]: closure } }));
export const setPrepDone = (s: FounderState, id: string, done: boolean) => mapC(s, id, (c) => ({ ...c, prepDone: done }));

export function toggleCheck(s: FounderState, id: string, date: string, item: string) {
  return mapC(s, id, (c) => {
    const cur = c.checks[date] ?? [];
    const next = cur.includes(item) ? cur.filter((x) => x !== item) : [...cur, item];
    return { ...c, checks: { ...c.checks, [date]: next } };
  });
}

export function sendMail(s: FounderState, mail: Omit<SentMail, "id" | "at">): FounderState {
  return { ...s, gmail: { ...s.gmail, sent: [...s.gmail.sent, { ...mail, id: `sent-${s.gmail.sent.length + 1}`, at: nowLabel() }] } };
}

export type Draft = When & { title: string; context: string; recurrence: Recurrence; owner: string; raw: string };

function nextOrder(s: FounderState) {
  return s.commitments.reduce((m, c) => Math.max(m, c.order), 0) + 1;
}

export function addManual(s: FounderState, d: Draft): { state: FounderState; id: string } {
  const order = nextOrder(s);
  const id = `c${order}`;
  const waiting = d.owner !== "you";
  const c: Commitment = {
    ...base,
    ...d,
    id,
    kind: "manual",
    order,
    origin: "manual",
    source: "Added by you",
    owner: d.owner || "you",
    verifier: "none",
    why: waiting ? `You noted that ${d.owner} owes you this. No update has been detected.` : "You asked Where Was I? to remember this.",
    nextAction: waiting ? `${d.owner} acts next.` : d.title,
    evidence: [{ label: "You said", detail: `“${d.raw || d.title}”` }],
    closesWhen: "You mark it done. There's no connected source to check, so it will show as completed by you.",
    detected: `Today, ${nowLabel()}`,
  };
  return { state: { ...s, commitments: [...s.commitments, c] }, id };
}

export function editManual(s: FounderState, id: string, d: Draft) {
  return mapC(s, id, (c) => ({
    ...c,
    ...d,
    owner: d.owner || "you",
    why: c.kind === "outcome" ? c.why : d.owner !== "you" ? `You noted that ${d.owner} owes you this. No update has been detected.` : "You asked Where Was I? to remember this.",
    nextAction: d.owner !== "you" ? `${d.owner} acts next.` : c.kind === "outcome" ? c.nextAction : d.title,
  }));
}

export const deleteCommitment = (s: FounderState, id: string) => ({ ...s, commitments: s.commitments.filter((c) => c.id !== id) });

/** Commitment chain: recording a meeting outcome closes the meeting and opens a new loop. */
export function recordOutcome(s: FounderState, meetingId: string, outcome: string, d: Draft): { state: FounderState; id: string } {
  const meeting = s.commitments.find((c) => c.id === meetingId);
  const closed = closeCommitment(s, meetingId, {
    kind: "completed_by_you",
    at: nowLabel(),
    evidence: `Outcome recorded: “${outcome.trim()}”`,
  });
  const order = nextOrder(closed);
  const id = `c${order}`;
  const waiting = d.owner !== "you";
  const c: Commitment = {
    ...base,
    ...d,
    id,
    kind: "outcome",
    order,
    origin: "outcome",
    source: "Meeting outcome",
    owner: d.owner || "you",
    derivedFrom: meetingId,
    verifier: !waiting && /^Send [A-Z]/.test(d.title) ? "gmail_outcome" : "none",
    why: `Created from your ${meeting?.title.replace(/\s—\s/, " with ") ?? "meeting"}: “${outcome.trim()}”`,
    nextAction: waiting ? `${d.owner} acts next.` : d.title.replace(/\.$/, "") + ".",
    evidence: [{ label: "Meeting outcome", detail: `“${outcome.trim()}”` }],
    closesWhen: !waiting && /^Send [A-Z]/.test(d.title) ? "An outgoing email in Demo Gmail with the file attached." : "You mark it done.",
    detected: `Today, ${nowLabel()}`,
  };
  return { state: { ...closed, commitments: [...closed.commitments, c] }, id };
}
