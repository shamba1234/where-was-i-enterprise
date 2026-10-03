import { DEMO_NOW, addDays, dayLabel, fullDate, sortKey, timeLabel, todayKey, whenLabel, whenSentence } from "./clock";
import { DemoState, ManualTask } from "./state";

export type AnswerItem = { label: string; meta: string; source: string };

export type Answer = {
  text: string;
  source: string;
  tone: "yes" | "no" | "info";
  action?: { label: string; href: string };
  /** Agenda lines, e.g. "Call Mom — 7:00 PM". */
  items?: AnswerItem[];
  /** Captured tasks related to the question, shown under the main answer. */
  related?: AnswerItem[];
};

const has = (q: string, ...words: string[]) => words.some((w) => q.includes(w));

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const STOP = new Set(
  "a an the my i me to do did does have has had need should when what whats what's time is are was it at on for of in and with about be am will by before after due get go any anything still yet today tonight tomorrow".split(" "),
);

function tokens(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w))
    .map((w) => (w.length > 4 ? w.replace(/(ing|ed|es|s)$/, "") : w));
}

/** Best captured task for a question, by shared meaningful words. */
function matchManual(q: string, tasks: ManualTask[]): { task: ManualTask; score: number } | null {
  const qt = new Set(tokens(q));
  let best: { task: ManualTask; score: number } | null = null;
  for (const t of tasks) {
    const score = tokens(`${t.title} ${t.notes}`).filter((w) => qt.has(w)).length;
    if (score > 0 && (!best || score > best.score || (score === best.score && !t.completed && best.task.completed))) best = { task: t, score };
  }
  return best;
}

const item = (t: ManualTask): AnswerItem => ({ label: t.title, meta: whenLabel(t), source: "Added by you" });

/** Which day an agenda question is about, if any. */
function agendaDay(q: string): string | "upcoming" | null {
  if (has(q, "yesterday", "unfinished", "left off")) return null;
  const asksAgenda = /\b(what|anything|do i have|have i got|need to do|on my plate|schedule|plans|agenda|going on|due|coming up|upcoming)\b/.test(q);
  if (!asksAgenda) return null;
  if (/\b(tomorrow|tmrw)\b/.test(q)) return addDays(todayKey(), 1);
  if (/\b(today|tonight)\b/.test(q)) return todayKey();
  const wd = WEEKDAYS.find((d) => q.includes(d));
  if (wd) {
    const diff = (WEEKDAYS.indexOf(wd) - DEMO_NOW.getDay() + 7) % 7;
    return addDays(todayKey(), diff);
  }
  if (/\b(this week|coming up|upcoming|next few days)\b/.test(q)) return "upcoming";
  return null;
}

function agendaAnswer(day: string, s: DemoState, q: string): Answer {
  const open = s.manualTasks.filter((t) => !t.completed);
  const items: AnswerItem[] = [];

  if (day === "upcoming") {
    open
      .filter((t) => t.date)
      .sort((a, b) => sortKey(a) - sortKey(b))
      .forEach((t) => items.push(item(t)));
    return items.length
      ? { text: `You have ${items.length} thing${items.length === 1 ? "" : "s"} coming up:`, source: "From what you've told me, in order.", tone: "info", items }
      : { text: "Nothing with a date is coming up. Add something with Add task.", source: "Checked the tasks you've added.", tone: "info" };
  }

  // Connected sources contribute too: one memory, two inputs.
  if (day === todayKey()) {
    if (!s.canvas.submitted) items.push({ label: "MATH 257 Homework 6", meta: "Due 11:59 PM", source: "Demo Canvas" });
    if (!s.gmail.replied) items.push({ label: "Reply to Maya with the slides", meta: "Tonight", source: "Demo Gmail" });
  }
  if (day === addDays(todayKey(), 1) && !s.presentation.verified) {
    items.push({ label: "Finish slides 4–6 for team presentation", meta: "Before morning", source: "Your commitment" });
  }
  open
    .filter((t) => t.date === day)
    .sort((a, b) => sortKey(a) - sortKey(b))
    .forEach((t) => items.push({ label: t.title, meta: timeLabel(t), source: "Added by you" }));

  const when = day === todayKey() ? (q.includes("tonight") ? "Tonight" : "Today") : dayLabel(day);
  const done = s.manualTasks.filter((t) => t.completed && t.date === day);
  if (!items.length) {
    return {
      text: `Nothing on your list for ${when.toLowerCase() === "today" || when === "Tonight" ? when.toLowerCase() : when}.${done.length ? ` You already finished ${done.map((t) => `“${t.title}”`).join(", ")}.` : ""}`,
      source: `Checked your connected sources and the tasks you've added for ${fullDate(day)}.`,
      tone: "yes",
    };
  }
  return {
    text: `${when} you have ${items.length} thing${items.length === 1 ? "" : "s"}:`,
    source: `${fullDate(day)}, from your connected sources and the tasks you've added.`,
    tone: "info",
    items,
  };
}

const lowerFirst = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);
const keepCaps = (s: string) => (/^[A-Z]{2,}/.test(s) ? s : lowerFirst(s));

function manualStatus(t: ManualTask, asking: "when" | "status"): Answer {
  if (t.completed) {
    return {
      text: asking === "when" ? `You already did it. You marked “${t.title}” complete.` : `Yes. You marked “${t.title}” complete.`,
      source: "From a task you added. Completed on your word, not checked against an app.",
      tone: "yes",
    };
  }
  if (asking === "when") {
    return {
      text: t.date ? `You need to ${keepCaps(t.title)} ${whenSentence(t)}.` : `You didn't give “${t.title}” a deadline. It's on your list for whenever you get to it.`,
      source: t.date ? `From a task you added: ${fullDate(t.date)}${t.time ? `, ${timeLabel(t)}` : ""}.` : "From a task you added.",
      tone: "info",
      action: { label: "See captured tasks", href: "/tasks" },
    };
  }
  return {
    text: t.date ? `Not yet. “${t.title}” is still open, ${whenSentence(t)}.` : `Not yet. “${t.title}” is still open, with no deadline.`,
    source: "From a task you added. I'll keep it in Open loops until you mark it complete.",
    tone: "no",
  };
}

export function answerQuestion(raw: string, s: DemoState): Answer {
  const q = raw.toLowerCase();
  const manual = matchManual(q, s.manualTasks);
  const related = (exclude?: (t: ManualTask) => boolean) => {
    const qt = new Set(tokens(q));
    const r = s.manualTasks.filter((t) => !t.completed && !exclude?.(t) && tokens(`${t.title} ${t.notes}`).some((w) => qt.has(w))).map(item);
    return r.length ? r : undefined;
  };

  // 1. "What do I have tomorrow?" — an agenda across connected sources and captured tasks.
  const day = agendaDay(q);
  if (day) return agendaAnswer(day, s, q);

  // 2. "When do I need to call Mom?" — answer from the captured task.
  if (manual && /\b(when|what time|which day)\b/.test(q)) return manualStatus(manual.task, "when");

  // 3. Connected-source questions (unchanged answers), plus related captured tasks.
  // A captured task wins only when the question names something Canvas doesn't know about
  // ("Did I finish my TAM homework?"). "Did I submit my homework?" always checks Canvas.
  const CANVAS_WORDS = new Set(["homework", "hw", "submit", "submitt", "assignment", "finish", "turn", "done"]);
  const namesOther = manual && tokens(q).some((w) => !CANVAS_WORDS.has(w) && tokens(`${manual.task.title} ${manual.task.notes}`).includes(w));
  if (has(q, "homework", "hw", "canvas", "math", "257", "assignment") && !(namesOther && !has(q, "canvas", "math", "257"))) {
    const base: Answer = s.canvas.submitted
      ? {
          text: `Yes. Canvas shows Homework 6 submitted at ${s.canvas.submittedAt}.`,
          source: `Checked Demo Canvas: ${s.canvas.fileName ?? "file"} is on record for MATH 257.`,
          tone: "yes",
        }
      : {
          text: "Not yet. Canvas shows no submission for Homework 6.",
          source: "Checked Demo Canvas: MATH 257 Homework 6 is due tonight at 11:59 PM.",
          tone: "no",
          action: { label: "Open Canvas", href: "/canvas" },
        };
    return { ...base, related: related() };
  }

  const mayaAsBeingMet = has(q, "maya") && !has(q, "reply", "email", "replied", "gmail", "respond", "wrote") && manual && tokens(manual.task.title).includes("maya");
  if (has(q, "maya", "reply", "email", "replied", "gmail") && !mayaAsBeingMet) {
    const base: Answer = s.gmail.replied
      ? {
          text: `Yes. You replied to Maya at ${s.gmail.repliedAt}.`,
          source: "Checked Demo Gmail: your reply is in Sent, in the “Final presentation slides” thread.",
          tone: "yes",
        }
      : {
          text: "No. Maya's email is still waiting for a response.",
          source: "Checked Demo Gmail: no reply in Sent since Maya asked for the slides at 6:12 PM.",
          tone: "no",
          action: { label: "Open Gmail", href: "/gmail?thread=maya" },
        };
    return { ...base, related: related() };
  }

  if (has(q, "unfinished", "yesterday", "left", "forgot", "forget", "caterpillar", "internship", "application")) {
    return s.caterpillar.submitted
      ? {
          text: `Yesterday you were applying for the Caterpillar Software Engineering Internship. You've since finished it: the application was submitted at ${s.caterpillar.submittedAt}.`,
          source: "Reconstructed from Demo Browser history.",
          tone: "yes",
        }
      : {
          text: "Your Caterpillar Software Engineering Internship application. Yesterday you compared Caterpillar, John Deere and Capital One, updated your resume, and started the Caterpillar application, but activity stopped at 9:02 PM on the application questions. No submission was found.",
          source: "Reconstructed from Demo Browser history, 7:14 PM to 9:02 PM yesterday.",
          tone: "info",
          action: { label: "Continue where I left off", href: "/browser?resume=1" },
        };
  }

  // 4. "Did I call Mom?" — status of a captured task.
  if (manual) return manualStatus(manual.task, "status");

  if (has(q, "slide", "presentation", "team", "deck")) {
    return s.presentation.verified
      ? {
          text: `Yes. Slides 4–6 were verified at ${s.presentation.verifiedAt} from ${s.presentation.evidenceFile}.`,
          source: "Verified from the evidence file you provided.",
          tone: "yes",
        }
      : {
          text: "Not verified yet. You said you'd finish slides 4–6 before tomorrow morning, and no proof has been provided.",
          source: "Manual commitment you added on Wednesday.",
          tone: "no",
        };
  }

  return {
    text: "I can only check what your connected sources show and what you've told me. Try asking about your homework, Maya's email, your team slides, what you have tomorrow, or what you left unfinished yesterday.",
    source: "Connected: Demo Canvas, Demo Gmail, Demo Browser. Plus the tasks you've added.",
    tone: "info",
  };
}
