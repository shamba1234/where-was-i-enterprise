/**
 * Every state transition in the workspace. Pure functions: Workspace in, Workspace out.
 * Each meaningful transition records a work event, notifies whoever now owns the next
 * action, and moves the demo clock forward a fixed, realistic amount.
 */
import { When, todayKey } from "./clock";
import { detectDependency } from "./parse";
import { NO_REPEAT, Recurrence, isRecurring } from "./recurrence";
import {
  Breadcrumb,
  Commitment,
  DesignState,
  EventKind,
  Notice,
  PEOPLE,
  PersonId,
  Priority,
  SARAH_CTA,
  SECTION_NAMES,
  Workspace,
  WorkEvent,
  APP_STEPS,
  freshDesign,
} from "./model";

const first = (p: PersonId) => PEOPLE[p].first;
const q = (s: string) => `“${s}”`;

function tick(s: Workspace, minutes: number): Workspace {
  return { ...s, now: s.now + minutes };
}
function nextId(s: Workspace, prefix: string): [Workspace, string] {
  const seq = s.seq + 1;
  return [{ ...s, seq }, `${prefix}${seq}`];
}
function event(s: Workspace, e: Omit<WorkEvent, "id" | "at">): Workspace {
  const [s2, id] = nextId(s, "e");
  return { ...s2, events: [...s2.events, { ...e, id, at: s2.now }] };
}
function notify(s: Workspace, n: Omit<Notice, "id" | "at" | "read">): Workspace {
  const [s2, id] = nextId(s, "n");
  return { ...s2, notices: [...s2.notices, { ...n, id, at: s2.now, read: false }] };
}
function mapC(s: Workspace, id: string, fn: (c: Commitment) => Commitment): Workspace {
  return { ...s, commitments: s.commitments.map((c) => (c.id === id ? fn(c) : c)) };
}
export const getC = (s: Workspace, id: string) => s.commitments.find((c) => c.id === id);
const readNotices = (s: Workspace, to: PersonId, commitmentId: string, kinds?: Notice["kind"][]): Workspace => ({
  ...s,
  notices: s.notices.map((n) => (n.to === to && n.commitmentId === commitmentId && (!kinds || kinds.includes(n.kind)) ? { ...n, read: true } : n)),
});

export const setViewer = (s: Workspace, viewer: PersonId): Workspace => ({ ...s, viewer });
export const markNoticeRead = (s: Workspace, id: string): Workspace => ({ ...s, notices: s.notices.map((n) => (n.id === id ? { ...n, read: true } : n)) });

function blank(id: string, p: Partial<Commitment> & Pick<Commitment, "title" | "assignee" | "createdBy">, now: number): Commitment {
  return {
    id,
    project: null,
    context: "",
    goal: p.title,
    source: "created",
    assignedBy: null,
    reviewer: null,
    createdAt: now,
    acceptedAt: null,
    startedAt: null,
    priority: "normal",
    status: "accepted",
    nextAction: p.title,
    dependsOn: [],
    neededFor: null,
    blocker: null,
    lastBlocker: null,
    resolvedAt: null,
    evidenceRequirement: null,
    evidence: [],
    completedAt: null,
    verifiedAt: null,
    verifiedBy: null,
    recurrence: NO_REPEAT,
    occurrences: {},
    checkpoints: [],
    breadcrumbs: [],
    reviews: [],
    feedback: null,
    workspace: null,
    lastWorkedAt: null,
    raw: "",
    date: null,
    time: null,
    timeKind: "none",
    approxLabel: null,
    ...p,
  };
}

/* ---------------- Assignment and capture ---------------- */

export type AssignDraft = When & {
  assignee: PersonId;
  title: string;
  context: string;
  priority: Priority;
  evidenceRequirement: string | null;
  recurrence: Recurrence;
  dependsOn: string[];
  neededFor: string | null;
  project: string | null;
  raw: string;
};

/** Design work on the landing page opens in the demo design workspace. */
const isDesignWork = (d: { title: string; project: string | null }) => /mockup|design|hero|layout|landing/i.test(d.title) && (d.project === "Landing Page Redesign" || /landing/i.test(d.title));

export function assign(s: Workspace, by: PersonId, d: AssignDraft): { state: Workspace; id: string } {
  let [st, id] = nextId(tick(s, 2), "c");
  const design = isDesignWork(d);
  const c = blank(
    id,
    {
      ...d,
      title: d.title,
      goal: design ? "Complete launch-ready landing page" : d.title,
      source: "assigned",
      createdBy: by,
      assignedBy: by,
      reviewer: by,
      status: "assigned",
      nextAction: "Accept this assignment.",
      workspace: design ? "design" : null,
    },
    st.now,
  );
  st = { ...st, commitments: [...st.commitments, c], design: design ? { ...st.design, [id]: freshDesign() } : st.design };
  if (d.neededFor) st = mapC(st, d.neededFor, (x) => ({ ...x, dependsOn: Array.from(new Set([...x.dependsOn, id])) }));
  st = event(st, { actor: by, person: d.assignee, commitmentId: id, kind: "assigned", text: `${first(by)} assigned ${q(d.title)} to ${first(d.assignee)}` });
  st = notify(st, { to: d.assignee, kind: "assignment", commitmentId: id, text: `${PEOPLE[by].name} assigned you ${q(d.title)}.` });
  return { state: st, id };
}

export type CaptureDraft = When & { title: string; context: string; recurrence: Recurrence; owner: PersonId; raw: string };

export function capture(s: Workspace, by: PersonId, d: CaptureDraft): { state: Workspace; id: string } {
  let [st, id] = nextId(tick(s, 3), "c");
  const someoneElse = d.owner !== by;
  const c = blank(
    id,
    {
      title: d.title,
      context: d.context,
      raw: d.raw,
      date: d.date,
      time: d.time,
      timeKind: d.timeKind,
      approxLabel: d.approxLabel,
      recurrence: d.recurrence,
      createdBy: by,
      assignee: d.owner,
      source: someoneElse ? "requested" : "created",
      acceptedAt: st.now,
      status: someoneElse ? "in_progress" : "accepted",
      nextAction: someoneElse ? `${d.title}.` : `${d.title}.`,
    },
    st.now,
  );
  st = { ...st, commitments: [...st.commitments, c] };
  st = event(st, {
    actor: by,
    person: by,
    commitmentId: id,
    kind: someoneElse ? "requested" : "created",
    text: someoneElse ? `Requested ${q(d.title)} from ${first(d.owner)}` : `Created own commitment ${q(d.title)}`,
  });
  return { state: st, id };
}

export function editCommitment(s: Workspace, id: string, d: Partial<CaptureDraft>): Workspace {
  return mapC(s, id, (c) => ({ ...c, ...d, assignee: d.owner ?? c.assignee }));
}
export const deleteCommitment = (s: Workspace, id: string): Workspace => ({ ...s, commitments: s.commitments.filter((c) => c.id !== id) });

/* ---------------- Accept, start, work ---------------- */

export function accept(s: Workspace, id: string, by: PersonId): Workspace {
  const c = getC(s, id);
  if (!c) return s;
  let st = tick(s, 2);
  st = mapC(st, id, (x) => ({ ...x, status: "accepted", acceptedAt: st.now, nextAction: x.workspace === "design" ? "Start work: open the design file and finish the desktop hero." : "Start work." }));
  st = event(st, { actor: by, person: by, commitmentId: id, kind: "accepted", text: `Accepted ${q(c.title)}` });
  st = readNotices(st, by, id, ["assignment"]);
  if (c.assignedBy && c.assignedBy !== by) st = notify(st, { to: c.assignedBy, kind: "accepted", commitmentId: id, text: `${first(by)} accepted ${q(c.title)}.` });
  return st;
}

export function start(s: Workspace, id: string, by: PersonId): Workspace {
  const c = getC(s, id);
  if (!c) return s;
  let st = tick(s, 14);
  st = mapC(st, id, (x) => ({
    ...x,
    status: "in_progress",
    startedAt: st.now,
    lastWorkedAt: st.now,
    nextAction: x.workspace === "design" ? "Finish the desktop hero and pricing sections." : x.nextAction === "Start work." ? x.title + "." : x.nextAction,
  }));
  return event(st, { actor: by, person: by, commitmentId: id, kind: "started", text: `Started work on ${q(c.title)}` });
}

/** Work-state edits inside a workspace. Deliberately not timeline events: only meaningful transitions are. */
export function patchDesign(s: Workspace, id: string, patch: Partial<DesignState>): Workspace {
  const cur = s.design[id] ?? freshDesign();
  return { ...mapC(s, id, (c) => ({ ...c, lastWorkedAt: s.now })), design: { ...s.design, [id]: { ...cur, ...patch, sections: { ...cur.sections, ...(patch.sections ?? {}) } } } };
}
export function patchApp(s: Workspace, patch: Partial<Workspace["app"]>): Workspace {
  return { ...mapC(s, "app", (c) => ({ ...c, lastWorkedAt: s.now })), app: { ...s.app, ...patch } };
}

export function locationOf(s: Workspace, c: Commitment): string {
  if (c.workspace === "design") {
    const d = s.design[c.id];
    return d ? SECTION_NAMES[d.selected] : "Desktop hero";
  }
  if (c.workspace === "application") return `${APP_STEPS[s.app.step - 1]}, Step ${s.app.step} of 5`;
  return c.checkpoints[c.checkpoints.length - 1]?.location ?? "";
}

export function saveCheckpoint(s: Workspace, id: string, by: PersonId, text: string): Workspace {
  const c = getC(s, id);
  if (!c) return s;
  let st = tick(s, 40);
  let location = locationOf(st, c);
  // Design: a desktop checkpoint moves the work on to the mobile frame.
  const d = st.design[id];
  if (d && d.sections.desktopHero === "done" && d.sections.desktopPricing === "done" && d.sections.mobileHero === "todo") {
    st = patchDesign(st, id, { frame: "mobile", selected: "mobileHero", sections: { ...d.sections, mobileHero: "wip" } });
    location = "Mobile hero";
    st = mapC(st, id, (x) => ({ ...x, nextAction: "Finish mobile hero section." }));
  }
  const [st2, cpId] = nextId(st, "cp");
  st = mapC(st2, id, (x) => ({ ...x, lastWorkedAt: st2.now, checkpoints: [...x.checkpoints, { id: cpId, at: st2.now, by, text, location }] }));
  return event(st, { actor: by, person: by, commitmentId: id, kind: "checkpoint", text: "Checkpoint saved", quote: text });
}

/* ---------------- Breadcrumbs ---------------- */

export type CrumbDraft = { text: string; nextAction: string; shared: boolean; voice: boolean };

export function saveBreadcrumb(s: Workspace, id: string, by: PersonId, d: CrumbDraft, replacesAi?: string): { state: Workspace; breadcrumbId: string } {
  const c = getC(s, id);
  if (!c) return { state: s, breadcrumbId: "" };
  let st = tick(s, 2);
  const [st2, bid] = nextId(st, "bc");
  st = st2;
  // Suggest (never apply) a blocker if the breadcrumb describes waiting on a teammate.
  const dep = c.status === "blocked" ? null : detectDependency(d.text, by);
  const suggestion = dep?.person
    ? { person: dep.person, needed: dep.reason, nextAction: `Check whether ${first(dep.person)} delivered the ${dep.reason.charAt(0).toLowerCase() + dep.reason.slice(1)}` }
    : null;
  const lastCp = c.checkpoints[c.checkpoints.length - 1];
  const crumb: Breadcrumb = {
    id: bid,
    commitmentId: id,
    author: by,
    at: st.now,
    type: "user",
    goal: c.goal,
    location: locationOf(st, c),
    text: d.text.trim(),
    nextAction: d.nextAction.trim(),
    confirmed: true,
    dismissed: false,
    checkpointId: lastCp?.id ?? null,
    shared: d.shared,
    voice: d.voice,
    suggestion,
    suggestionState: suggestion ? "pending" : null,
  };
  st = mapC(st, id, (x) => ({
    ...x,
    lastWorkedAt: st.now,
    nextAction: d.nextAction.trim() || x.nextAction,
    breadcrumbs: [...x.breadcrumbs.map((b) => (b.id === replacesAi ? { ...b, dismissed: true } : b)), crumb],
  }));
  st = event(st, { actor: by, person: by, commitmentId: id, kind: "breadcrumb", text: d.voice ? "Breadcrumb saved (simulated voice)" : "Breadcrumb saved", quote: crumb.text.replace(/\n+/g, " "), private: !d.shared });
  return { state: st, breadcrumbId: bid };
}

export function confirmAi(s: Workspace, id: string, bid: string): Workspace {
  return mapC(s, id, (c) => ({ ...c, breadcrumbs: c.breadcrumbs.map((b) => (b.id === bid ? { ...b, confirmed: true } : b)) }));
}
export function ignoreAi(s: Workspace, id: string, bid: string): Workspace {
  return mapC(s, id, (c) => ({ ...c, breadcrumbs: c.breadcrumbs.map((b) => (b.id === bid ? { ...b, dismissed: true } : b)) }));
}
export function ignoreSuggestion(s: Workspace, id: string, bid: string): Workspace {
  return mapC(s, id, (c) => ({ ...c, breadcrumbs: c.breadcrumbs.map((b) => (b.id === bid ? { ...b, suggestionState: "ignored" } : b)) }));
}

/** When someone leaves a workspace mid-task without a breadcrumb, offer an AI reconstruction (unconfirmed). */
export function leaveWorkspace(s: Workspace, id: string, by: PersonId): Workspace {
  const c = getC(s, id);
  if (!c || c.status !== "in_progress") return s;
  const lastCp = c.checkpoints[c.checkpoints.length - 1]?.at ?? c.startedAt ?? 0;
  const recentUser = c.breadcrumbs.some((b) => b.type === "user" && b.at >= lastCp);
  const pendingAi = c.breadcrumbs.some((b) => b.type === "ai" && !b.dismissed && !b.confirmed);
  if (recentUser || pendingAi) return mapC(s, id, (x) => ({ ...x, lastWorkedAt: s.now }));
  const loc = locationOf(s, c);
  const d = s.design[id];
  const hint = d && !d.screenshots && d.selected === "mobileHero" ? " The mobile hero may depend on Alex's API screenshots." : "";
  const [st, bid] = nextId(s, "bc");
  const ai: Breadcrumb = {
    id: bid,
    commitmentId: id,
    author: by,
    at: st.now,
    type: "ai",
    goal: c.goal,
    location: loc,
    text: `You appeared to stop while editing the ${loc.toLowerCase()}.${hint}`,
    nextAction: c.nextAction,
    confirmed: false,
    dismissed: false,
    checkpointId: c.checkpoints[c.checkpoints.length - 1]?.id ?? null,
    shared: false,
    voice: false,
    suggestion: null,
    suggestionState: null,
  };
  return mapC(st, id, (x) => ({ ...x, lastWorkedAt: st.now, breadcrumbs: [...x.breadcrumbs, ai] }));
}

/* ---------------- Blockers and dependencies ---------------- */

/** Confirmed blocker: ownership moves to the person who must act. Links to an existing request when one fits. */
export function block(s: Workspace, id: string, by: PersonId, person: PersonId, reason: string, fromBreadcrumb?: string): Workspace {
  const c = getC(s, id);
  if (!c) return s;
  let st = tick(s, 3);
  const words = reason.toLowerCase().split(/\W+/).filter((w) => w.length > 3 && !["final", "new", "updated", "latest"].includes(w));
  const existing = st.commitments.find(
    (x) => x.id !== id && x.assignee === person && x.status !== "verified" && x.status !== "completed" && words.some((w) => x.title.toLowerCase().includes(w.replace(/s$/, ""))),
  );
  let depId = existing?.id ?? null;
  if (!depId) {
    const [st2, nid] = nextId(st, "c");
    st = st2;
    depId = nid;
    const dep = blank(nid, { title: reason, project: c.project, context: `${first(by)} needs this to continue ${q(c.title)}.`, source: "requested", createdBy: by, assignee: person, status: "in_progress", acceptedAt: st.now, nextAction: `Send ${first(by)} the ${reason.charAt(0).toLowerCase() + reason.slice(1)}.` }, st.now);
    st = { ...st, commitments: [...st.commitments, dep] };
    st = event(st, { actor: by, person: by, commitmentId: nid, kind: "requested", text: `Requested ${q(reason)} from ${first(person)}` });
  }
  const blocker = { by: person, reason, since: st.now, dependencyId: depId };
  st = mapC(st, id, (x) => ({
    ...x,
    status: "blocked",
    blocker,
    dependsOn: Array.from(new Set([...x.dependsOn, depId!])),
    breadcrumbs: x.breadcrumbs.map((b) => (b.id === fromBreadcrumb ? { ...b, suggestionState: "confirmed" } : b)),
  }));
  st = event(st, { actor: by, person: by, commitmentId: id, kind: "blocked", text: `Blocked: waiting on ${first(person)} for ${reason.charAt(0).toLowerCase() + reason.slice(1)}` });
  if (c.assignedBy && c.assignedBy !== by) st = notify(st, { to: c.assignedBy, kind: "blocked", commitmentId: id, text: `${first(by)} is blocked on ${q(c.title)}: waiting on ${first(person)}.` });
  return st;
}

function slugFile(title: string) {
  if (/api screenshot/i.test(title)) return "final-api-screenshots.zip";
  if (/signup/i.test(title)) return "launch-cohort-signups.csv";
  if (/revenue/i.test(title)) return "q3-revenue.pdf";
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".pdf";
}

/** Demo dependency event: the other person attaches the deliverable. Everything waiting on it becomes ready. */
export function resolveDependency(s: Workspace, depId: string): Workspace {
  const dep = getC(s, depId);
  if (!dep) return s;
  const owner = dep.assignee;
  const file = slugFile(dep.title);
  let st = tick(s, 25);
  const [st2, evId] = nextId(st, "ev");
  st = mapC(st2, depId, (x) => ({
    ...x,
    status: "verified",
    completedAt: st2.now,
    verifiedAt: st2.now,
    verifiedBy: "evidence",
    evidence: [...x.evidence, { id: evId, name: file, kind: "file", by: owner, at: st2.now, simulated: true }],
    nextAction: "",
  }));
  st = event(st, { actor: owner, person: owner, commitmentId: depId, kind: "evidence", text: `${first(owner)} attached ${file}`, quote: dep.title });
  st = event(st, { actor: owner, person: owner, commitmentId: depId, kind: "verified", text: `${q(dep.title)} delivered with ${file}` });
  if (/revenue/i.test(dep.title) && !st.app.revenue) st = { ...st, app: { ...st.app, revenue: "$2.4M ARR (Q3, from Sarah)" } };
  for (const w of st.commitments.filter((x) => x.blocker?.dependencyId === depId)) {
    st = tick(st, 1);
    st = mapC(st, w.id, (x) => ({
      ...x,
      status: "ready",
      lastBlocker: x.blocker,
      blocker: null,
      resolvedAt: st.now,
      nextAction: x.workspace === "design" ? "Open the new screenshots and finish the mobile hero." : x.nextAction,
    }));
    if (st.design[w.id]) st = { ...st, design: { ...st.design, [w.id]: { ...st.design[w.id], screenshots: true } } };
    st = event(st, { actor: owner, person: w.assignee, commitmentId: w.id, kind: "dependency_resolved", text: `Dependency resolved: ${first(owner)} attached ${file}` });
    st = event(st, { actor: w.assignee, person: w.assignee, commitmentId: w.id, kind: "unblocked", text: `Unblocked ${q(w.title)}. Ready to continue.` });
    st = notify(st, { to: w.assignee, kind: "resolved", commitmentId: w.id, text: `Dependency resolved: ${first(owner)} attached ${file}.` });
  }
  return st;
}

export function resume(s: Workspace, id: string, by: PersonId): Workspace {
  const c = getC(s, id);
  if (!c) return s;
  let st = tick(s, 5);
  st = mapC(st, id, (x) => ({ ...x, status: x.status === "ready" || x.status === "accepted" ? "in_progress" : x.status, lastWorkedAt: st.now }));
  if (st.design[id]) st = { ...st, design: { ...st.design, [id]: { ...st.design[id], restoredAt: st.now } } };
  st = readNotices(st, by, id, ["resolved"]);
  // "Resumed" marks a return from an interruption. Reopening to address review feedback isn't one.
  if (c.status === "changes_requested") return st;
  return event(st, { actor: by, person: by, commitmentId: id, kind: "resumed", text: `Resumed ${q(c.title)} at ${locationOf(st, c).toLowerCase()}` });
}

/* ---------------- Handoffs, review, verification ---------------- */

export function submitForReview(s: Workspace, id: string, by: PersonId, reviewer: PersonId, note: string): Workspace {
  const c = getC(s, id);
  if (!c) return s;
  const round = c.reviews.length + 1;
  let st = tick(s, round === 1 ? 45 : 25);
  const [st2, evId] = nextId(st, "ev");
  st = st2;
  const evName = c.workspace === "design" ? `Figma prototype: landing page v${round} (demo link)` : c.workspace === "application" ? "Application confirmation" : "Submitted work (demo)";
  st = mapC(st, id, (x) => ({
    ...x,
    status: "submitted",
    reviewer,
    completedAt: st.now,
    feedback: round > 1 ? x.feedback : null,
    nextAction: `Review ${first(by)}'s submitted ${x.workspace === "design" ? "design" : "work"}.`,
    evidence: [...x.evidence, { id: evId, name: evName, kind: "design", by, at: st.now, simulated: true }],
    reviews: [...x.reviews, { round, submittedAt: st.now, submittedBy: by, reviewer, note, evidenceId: evId, decision: null, feedback: null, decidedAt: null }],
  }));
  st = readNotices(st, by, id, ["changes"]);
  st = event(st, { actor: by, person: by, commitmentId: id, kind: round > 1 ? "resubmitted" : "submitted", text: round > 1 ? `Resubmitted ${q(c.title)} for review` : `Submitted ${q(c.title)} for review`, quote: note || undefined });
  st = tick(st, 1);
  st = event(st, { actor: by, person: by, commitmentId: id, kind: "handoff", text: `Handed off to ${first(reviewer)}: waiting on ${first(reviewer)}` });
  return notify(st, { to: reviewer, kind: "review", commitmentId: id, text: `${first(by)} submitted ${q(c.title)} for your review.` });
}

function decide(c: Commitment, decision: "approved" | "changes", feedback: string | null, at: number) {
  const reviews = [...c.reviews];
  const last = reviews[reviews.length - 1];
  if (last) reviews[reviews.length - 1] = { ...last, decision, feedback, decidedAt: at };
  return reviews;
}

export function requestChanges(s: Workspace, id: string, by: PersonId, feedback: string): Workspace {
  const c = getC(s, id);
  if (!c) return s;
  let st = tick(s, 20);
  const next = /cta/i.test(feedback) ? (c.workspace === "design" ? "Update mobile hero CTA." : "Update the CTA.") : `Address feedback: ${feedback.replace(/\.$/, "")}.`;
  st = mapC(st, id, (x) => ({ ...x, status: "changes_requested", feedback, completedAt: null, nextAction: next, reviews: decide(x, "changes", feedback, st.now) }));
  if (st.design[id]) st = patchDesign(st, id, { frame: "mobile", selected: "mobileHero", sections: { ...st.design[id].sections, mobileHero: "wip" } });
  st = readNotices(st, by, id, ["review"]);
  st = event(st, { actor: by, person: c.assignee, commitmentId: id, kind: "changes_requested", text: `${first(by)} requested changes`, quote: feedback });
  return notify(st, { to: c.assignee, kind: "changes", commitmentId: id, text: `${first(by)} requested changes on ${q(c.title)}: ${feedback}` });
}

export function approve(s: Workspace, id: string, by: PersonId): Workspace {
  const c = getC(s, id);
  if (!c) return s;
  let st = tick(s, 20);
  st = mapC(st, id, (x) => ({ ...x, status: "verified", verifiedAt: st.now, verifiedBy: by, nextAction: "", reviews: decide(x, "approved", null, st.now) }));
  st = readNotices(st, by, id, ["review", "verify"]);
  st = event(st, { actor: by, person: c.assignee, commitmentId: id, kind: "approved", text: `${first(by)} approved the submission` });
  st = event(st, { actor: by, person: c.assignee, commitmentId: id, kind: "verified", text: `Verified ✓ by ${PEOPLE[by].name}` });
  return notify(st, { to: c.assignee, kind: "approved", commitmentId: id, text: `${first(by)} approved ${q(c.title)}. Verified ✓` });
}

/** "I finished it." Completed on the person's word, which is not the same as verified. */
export function markComplete(s: Workspace, id: string, by: PersonId): Workspace {
  const c = getC(s, id);
  if (!c) return s;
  let st = tick(s, 5);
  st = mapC(st, id, (x) => ({ ...x, status: "completed", completedAt: st.now, nextAction: x.assignedBy && x.assignedBy !== by ? `Verify ${first(by)}'s completion.` : "" }));
  st = event(st, { actor: by, person: c.assignee, commitmentId: id, kind: "completed", text: `${first(by)} marked ${q(c.title)} complete` });
  if (c.assignedBy && c.assignedBy !== by) st = notify(st, { to: c.assignedBy, kind: "verify", commitmentId: id, text: `${first(by)} marked ${q(c.title)} complete. It needs your verification.` });
  return st;
}

export function verifyCompletion(s: Workspace, id: string, by: PersonId): Workspace {
  const c = getC(s, id);
  if (!c) return s;
  let st = tick(s, 3);
  st = mapC(st, id, (x) => ({ ...x, status: "verified", verifiedAt: st.now, verifiedBy: by, nextAction: "" }));
  st = readNotices(st, by, id, ["verify"]);
  return event(st, { actor: by, person: c.assignee, commitmentId: id, kind: "verified", text: `Verified ✓ by ${PEOPLE[by].name}` });
}

export function reopen(s: Workspace, id: string, by: PersonId): Workspace {
  const c = getC(s, id);
  if (!c) return s;
  let st = tick(s, 2);
  st = mapC(st, id, (x) => ({ ...x, status: "in_progress", completedAt: null, verifiedAt: null, verifiedBy: null, nextAction: x.title + "." }));
  return event(st, { actor: by, person: c.assignee, commitmentId: id, kind: "reopened", text: `Reopened ${q(c.title)}` });
}

/** One occurrence of a recurring commitment. The commitment itself stays open. */
export function completeOccurrence(s: Workspace, id: string, by: PersonId, date = todayKey()): Workspace {
  const c = getC(s, id);
  if (!c || !isRecurring(c.recurrence)) return s;
  let st = tick(s, 10);
  st = mapC(st, id, (x) => ({ ...x, occurrences: { ...x.occurrences, [date]: { by, at: st.now, kind: "completed" } } }));
  return event(st, { actor: by, person: c.assignee, commitmentId: id, kind: "completed", text: `Completed this week's ${q(c.title)}` });
}

/** The partnership application: submission produces a (simulated) confirmation, which verifies it. */
export function submitApplication(s: Workspace, by: PersonId): Workspace {
  let st = tick(s, 12);
  const conf = "BW-2214";
  const [st2, evId] = nextId(st, "ev");
  st = { ...st2, app: { ...st2.app, submitted: true, confirmation: conf } };
  st = mapC(st, "app", (x) => ({
    ...x,
    status: "verified",
    completedAt: st.now,
    verifiedAt: st.now,
    verifiedBy: "evidence",
    nextAction: "",
    evidence: [...x.evidence, { id: evId, name: `Confirmation ${conf} (demo partner portal)`, kind: "confirmation", by, at: st.now, simulated: true }],
  }));
  st = event(st, { actor: by, person: by, commitmentId: "app", kind: "submitted", text: "Submitted the Brightwave partnership application" });
  return event(st, { actor: by, person: by, commitmentId: "app", kind: "verified", text: `Verified ✓ by confirmation ${conf} (simulated evidence)` });
}

export const SARAH_CTA_COPY = SARAH_CTA;
export type { EventKind };
