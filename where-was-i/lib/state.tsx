"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { When, addDays, todayKey, toDateKey, toTimeKey, fromKeys, DEMO_NOW } from "./clock";

/**
 * ONE shared local state for every demo app.
 * Demo Canvas, Demo Gmail, Demo Browser and Where Was I? all read and write
 * this object, which is persisted to localStorage and synced across tabs.
 */

export type TaskId = "homework" | "maya" | "caterpillar" | "presentation";

export type DemoState = {
  canvas: { submitted: boolean; submittedAt: string | null; fileName: string | null };
  gmail: { replied: boolean; repliedAt: string | null; replyBody: string | null };
  caterpillar: {
    submitted: boolean;
    submittedAt: string | null;
    whyAnswer: string;
    workAuth: "" | "yes" | "no";
    sponsorship: "" | "yes" | "no";
    startTerm: string;
  };
  presentation: { verified: boolean; verifiedAt: string | null; evidenceFile: string | null };
  /** Which completed tasks the dashboard has already announced. Drives the "detected" moment. */
  seen: Record<TaskId, boolean>;
  /** Human memory: commitments the user told Where Was I? directly. */
  manualTasks: ManualTask[];
};

export type Priority = "low" | "normal" | "high";

export type ManualTask = When & {
  id: string;
  title: string;
  notes: string;
  priority: Priority;
  raw: string; // what the user originally typed
  completed: boolean;
  createdOrder: number;
};

// Demo clock: the story takes place on a Friday evening.
export const DEMO_TIMES = {
  canvasSubmit: "10:42 PM",
  gmailReply: "10:47 PM",
  caterpillarSubmit: "10:55 PM",
  presentationVerify: "10:58 PM",
};

export const CATERPILLAR_PARTIAL_ANSWER =
  "I'm drawn to Caterpillar because the software teams work directly on machines that move real dirt and build real infrastructure. In my MATH 257 and CS 225 coursework I";

export const initialState: DemoState = {
  canvas: { submitted: false, submittedAt: null, fileName: null },
  gmail: { replied: false, repliedAt: null, replyBody: null },
  caterpillar: {
    submitted: false,
    submittedAt: null,
    whyAnswer: CATERPILLAR_PARTIAL_ANSWER,
    workAuth: "",
    sponsorship: "",
    startTerm: "Summer 2027",
  },
  presentation: { verified: false, verifiedAt: null, evidenceFile: null },
  seen: { homework: false, maya: false, caterpillar: false, presentation: false },
  manualTasks: [],
};

const KEY = "where-was-i:demo-state:v1";

function load(): DemoState {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as Partial<DemoState>;
    return {
      canvas: { ...initialState.canvas, ...parsed.canvas },
      gmail: { ...initialState.gmail, ...parsed.gmail },
      caterpillar: { ...initialState.caterpillar, ...parsed.caterpillar },
      presentation: { ...initialState.presentation, ...parsed.presentation },
      seen: { ...initialState.seen, ...parsed.seen },
      manualTasks: Array.isArray(parsed.manualTasks) ? parsed.manualTasks : [],
    };
  } catch {
    return initialState;
  }
}

function save(s: DemoState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable: state still lives in memory */
  }
}

type Ctx = {
  state: DemoState;
  hydrated: boolean;
  update: (fn: (s: DemoState) => DemoState) => void;
  reset: () => void;
};

const DemoContext = createContext<Ctx | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DemoState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    setState(load());
    setHydrated(true);
    // Another tab (e.g. Demo Canvas opened in a new tab) changed the shared state.
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setState(load());
    };
    const onFocus = () => setState(load());
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const update = useCallback((fn: (s: DemoState) => DemoState) => {
    const next = fn(stateRef.current);
    stateRef.current = next;
    save(next);
    setState(next);
  }, []);

  const reset = useCallback(() => {
    stateRef.current = initialState;
    save(initialState);
    setState(initialState);
  }, []);

  return <DemoContext.Provider value={{ state, hydrated, update, reset }}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used inside DemoProvider");
  return ctx;
}

/** Evidence-based task status, derived only from what the "connected" apps show. */
export function isDone(s: DemoState, id: TaskId): boolean {
  switch (id) {
    case "homework":
      return s.canvas.submitted;
    case "maya":
      return s.gmail.replied;
    case "caterpillar":
      return s.caterpillar.submitted;
    case "presentation":
      return s.presentation.verified;
  }
}

/* ---------- Manual task operations (pure: DemoState -> DemoState) ---------- */

export type TaskDraft = When & { title: string; notes: string; priority: Priority; raw: string };

export function addManualTask(s: DemoState, draft: TaskDraft): { state: DemoState; id: string } {
  const order = s.manualTasks.reduce((m, t) => Math.max(m, t.createdOrder), 0) + 1;
  const id = `m${order}-${Math.random().toString(36).slice(2, 7)}`;
  const task: ManualTask = { ...normalizeWhen(draft), title: draft.title, notes: draft.notes, priority: draft.priority, raw: draft.raw, id, completed: false, createdOrder: order };
  return { state: { ...s, manualTasks: [...s.manualTasks, task] }, id };
}

export function editManualTask(s: DemoState, id: string, patch: Partial<TaskDraft>): DemoState {
  return {
    ...s,
    manualTasks: s.manualTasks.map((t) => (t.id === id ? { ...t, ...patch, ...normalizeWhen({ ...t, ...patch }) } : t)),
  };
}

export function setManualCompleted(s: DemoState, id: string, completed: boolean): DemoState {
  return { ...s, manualTasks: s.manualTasks.map((t) => (t.id === id ? { ...t, completed } : t)) };
}

export function deleteManualTask(s: DemoState, id: string): DemoState {
  return { ...s, manualTasks: s.manualTasks.filter((t) => t.id !== id) };
}

export type PostponeBy = "hour" | "day" | "week";

export function postponeManualTask(s: DemoState, id: string, by: PostponeBy): DemoState {
  return {
    ...s,
    manualTasks: s.manualTasks.map((t) => {
      if (t.id !== id) return t;
      if (by === "hour") {
        // From the later of "now" and the current deadline.
        const base = t.date ? fromKeys(t.date, t.time ?? "23:59") : DEMO_NOW;
        const from = base < DEMO_NOW ? DEMO_NOW : base;
        const next = new Date(from.getTime() + 3_600_000);
        return { ...t, date: toDateKey(next), time: toTimeKey(next), timeKind: t.timeKind === "none" || t.timeKind === "approx" ? "exact" : t.timeKind, approxLabel: null };
      }
      const days = by === "day" ? 1 : 7;
      const start = t.date && t.date >= todayKey() ? t.date : todayKey();
      return { ...t, date: addDays(start, days) };
    }),
  };
}

/** Keep the When fields consistent after any edit. */
function normalizeWhen(w: When): When {
  let { date, time, timeKind, approxLabel } = w;
  if (time && !date) date = todayKey();
  if (!date) return { date: null, time: null, timeKind: "none", approxLabel: null };
  if (timeKind === "approx" && approxLabel) return { date, time, timeKind, approxLabel };
  if (!time) return { date, time: null, timeKind: "none", approxLabel: null };
  return { date, time, timeKind: timeKind === "none" ? "exact" : timeKind, approxLabel: null };
}
