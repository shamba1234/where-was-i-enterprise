/**
 * Everything the UI shows is derived here from the one shared workspace: who owns the next
 * action, status labels, which section a commitment belongs in for each user, why it's open,
 * its lifecycle, handoffs, and dependency chains. No counts are hardcoded.
 */
import { TODAY, addDays, agoLabel, atSentence, dayDiff, dayOfStamp, dueStamp, endOfWeek, formatTime, fullDate, whenSentence } from "./clock";
import { locationOf } from "./ops";
import { isRecurring, nextOccurrence, occursOn, recurrenceLabel } from "./recurrence";
import { APP_STEPS, Breadcrumb, Commitment, EventKind, PEOPLE, PersonId, SECTION_NAMES, TEAM, WorkEvent, Workspace } from "./model";

const first = (p: PersonId) => PEOPLE[p].first;
const lower = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const q = (s: string) => `“${s}”`;

export const needsVerification = (c: Commitment) => c.status === "completed" && !!c.assignedBy && c.assignedBy !== c.assignee;
export function isOpen(c: Commitment) {
  if (c.status === "verified") return false;
  if (c.status === "completed" && !needsVerification(c)) return false;
  return true;
}

/* ---------------- Recurrence ---------------- */

export type Occ = { today: boolean; doneToday: boolean; next: string | null; label: string };
export function occ(c: Commitment): Occ {
  const anchor = c.date ?? TODAY;
  const today = occursOn(c.recurrence, anchor, TODAY);
  const doneToday = !!c.occurrences[TODAY];
  const next = nextOccurrence(c.recurrence, anchor, today && doneToday ? addDays(TODAY, 1) : TODAY);
  return { today, doneToday, next, label: recurrenceLabel(c.recurrence, c.date, c.time) };
}
const period = (c: Commitment) => (c.recurrence.freq === "weekly" || c.recurrence.unit === "weeks" ? "this week" : "today");

/* ---------------- Ownership and status ---------------- */

export function ownerOf(c: Commitment): PersonId | null {
  if (isRecurring(c.recurrence)) return occ(c).doneToday ? null : c.assignee;
  switch (c.status) {
    case "blocked":
      return c.blocker?.by ?? c.assignee;
    case "submitted":
      return c.reviewer ?? c.assignedBy ?? null;
    case "completed":
      return needsVerification(c) ? c.assignedBy : null;
    case "verified":
      return null;
    default:
      return c.assignee;
  }
}

export type Tone = "accent" | "neutral" | "blocked" | "warn" | "ok" | "review";
export type StatusView = { label: string; tone: Tone };

export function statusView(c: Commitment, s: Workspace): StatusView {
  if (isRecurring(c.recurrence)) {
    const o = occ(c);
    if (o.doneToday) return { label: `Completed ${period(c)} ✓`, tone: "ok" };
    if (o.today) return { label: "Due today", tone: "warn" };
    return { label: "Scheduled", tone: "neutral" };
  }
  switch (c.status) {
    case "assigned":
      return { label: "New assignment", tone: "accent" };
    case "accepted":
      return { label: c.date && dayDiff(c.date) > 1 ? "Scheduled" : "Accepted", tone: "neutral" };
    case "in_progress":
      return isInterrupted(c) ? { label: "Interrupted", tone: "warn" } : { label: "In progress", tone: "neutral" };
    case "blocked":
      return { label: `Blocked: waiting on ${first(c.blocker?.by ?? c.assignee)}`, tone: "blocked" };
    case "ready":
      return { label: "Ready to continue", tone: "ok" };
    case "submitted":
      return { label: "Submitted for review", tone: "review" };
    case "changes_requested":
      return { label: `Waiting on ${first(c.assignee)}`, tone: "warn" };
    case "completed":
      return needsVerification(c) ? { label: "Needs verification", tone: "review" } : { label: `Completed by ${first(c.assignee)}`, tone: "neutral" };
    case "verified":
      return { label: "Verified ✓", tone: "ok" };
  }
  void s;
}

/** "Waiting on you" / "Waiting on Alex" from the viewer's side. */
export function ownerLabel(c: Commitment, viewer: PersonId) {
  const o = ownerOf(c);
  if (!o) return null;
  return o === viewer ? "Waiting on you" : `Waiting on ${first(o)}`;
}

export const originLabel = (c: Commitment) =>
  c.source === "assigned" && c.assignedBy ? `Assigned by ${PEOPLE[c.assignedBy].name}` : c.source === "requested" ? `Requested by ${PEOPLE[c.createdBy].name}` : `Created by ${PEOPLE[c.createdBy].name}`;

export function isInterrupted(c: Commitment) {
  return !!c.workspace && c.lastWorkedAt !== null && (c.status === "in_progress" || c.status === "ready" || c.status === "changes_requested");
}

/* ---------------- Breadcrumbs ---------------- */

/** Authors see everything they wrote. Others only see work context the author chose to share. AI reconstructions stay private. */
export function visibleCrumbs(c: Commitment, viewer: PersonId): Breadcrumb[] {
  return c.breadcrumbs
    .filter((b) => !b.dismissed)
    .filter((b) => b.author === viewer || (b.type === "user" && b.shared))
    .sort((a, b) => b.at - a.at);
}
export const latestUserCrumb = (c: Commitment, viewer: PersonId) => visibleCrumbs(c, viewer).find((b) => b.type === "user" || b.confirmed) ?? null;
export const pendingAi = (c: Commitment, viewer: PersonId) => (viewer === c.assignee ? c.breadcrumbs.find((b) => b.type === "ai" && !b.confirmed && !b.dismissed) ?? null : null);
export const pendingSuggestion = (c: Commitment, viewer: PersonId) =>
  viewer === c.assignee && c.status !== "blocked" ? [...c.breadcrumbs].reverse().find((b) => b.suggestion && b.suggestionState === "pending") ?? null : null;

/* ---------------- Work completed so far (for resume cards) ---------------- */

export function completedParts(c: Commitment, s: Workspace): string[] {
  if (c.workspace === "design" && s.design[c.id]) {
    const d = s.design[c.id];
    return (Object.keys(d.sections) as (keyof typeof d.sections)[]).filter((k) => d.sections[k] === "done").map((k) => SECTION_NAMES[k]);
  }
  if (c.workspace === "application") return APP_STEPS.slice(0, s.app.step - 1).map((n, i) => `Step ${i + 1}: ${n}`);
  return c.checkpoints.map((cp) => cp.text);
}

/* ---------------- Why is this open? ---------------- */

export function whyOpen(c: Commitment, s: Workspace): string[] {
  const out: string[] = [];
  const a = first(c.assignee);
  if (!isOpen(c)) {
    if (c.status === "verified") {
      const by = c.verifiedBy === "evidence" ? "attached evidence" : c.verifiedBy ? PEOPLE[c.verifiedBy].name : "a reviewer";
      out.push(`Closed. Verified by ${by} ${c.verifiedAt !== null ? atSentence(c.verifiedAt) : ""}.`.replace(" .", "."));
    } else out.push(`${a} marked this complete ${c.completedAt !== null ? atSentence(c.completedAt) : ""}. There's no independent evidence, so it shows as completed by ${a}, not verified.`);
    return out;
  }
  if (isRecurring(c.recurrence)) {
    const o = occ(c);
    out.push(`This is a recurring commitment (${lower(o.label)}${c.time ? ` at ${formatTime(c.time)}` : ""}).`);
    out.push(o.today ? (o.doneToday ? `${period(c) === "today" ? "Today's" : "This week's"} occurrence is done. The commitment stays open for the next one.` : `${period(c) === "today" ? "Today's" : "This week's"} occurrence hasn't been completed yet.`) : `The next occurrence is ${o.next ? fullDate(o.next) : "not scheduled"}.`);
    return out;
  }
  if (c.source === "assigned" && c.assignedBy) out.push(`${first(c.assignedBy)} assigned this ${atSentence(c.createdAt)}.`);
  else if (c.source === "requested") {
    const waiter = s.commitments.find((x) => x.blocker?.dependencyId === c.id);
    out.push(
      waiter
        ? `This remains open because ${first(waiter.assignee)} reported that ${q(waiter.title)} depends on it from ${first(c.assignee)}.`
        : `${first(c.createdBy)} requested this from ${first(c.assignee)} ${atSentence(c.createdAt)}.`,
    );
  } else out.push(`${first(c.createdBy)} created this commitment ${atSentence(c.createdAt)}.`);
  if (c.date) out.push(`It is due ${whenSentence(c)}.`);
  if (c.status === "assigned") out.push(`${a} hasn't accepted it yet.`);
  else if (c.acceptedAt !== null && c.source === "assigned") out.push(`${a} accepted it.`);
  if (c.status === "blocked" && c.blocker) out.push(`It's blocked: ${a} reported it depends on ${first(c.blocker.by)} for ${lower(c.blocker.reason)}.`);
  if (c.status === "ready" && c.lastBlocker) out.push(`${first(c.lastBlocker.by)} delivered the ${lower(c.lastBlocker.reason)}, so it's ready to continue.`);
  const last = c.reviews[c.reviews.length - 1];
  if (c.status === "submitted" && last) out.push(`${first(last.submittedBy)} submitted it ${atSentence(last.submittedAt)}. It's waiting on ${first(last.reviewer)}'s review.`);
  else if (c.status === "changes_requested" && last) out.push(`${first(last.reviewer)} requested changes: “${last.feedback}”`);
  if (c.status === "completed") out.push(`${a} marked it complete, but ${first(c.assignedBy!)} hasn't verified it.`);
  if (c.reviewer && c.status !== "submitted" && c.status !== "completed") out.push(c.reviews.length ? "No approved submission exists yet." : "No submission exists yet.");
  else if (c.source !== "assigned" && c.status !== "submitted" && c.status !== "completed") out.push(c.source === "requested" ? "Nothing has been attached yet." : "No completion has been recorded.");
  return out;
}

/* ---------------- Lifecycle chain ---------------- */

const CHAIN: Partial<Record<EventKind, string>> = {
  assigned: "Assigned",
  created: "Created",
  requested: "Requested",
  accepted: "Accepted",
  started: "Started",
  checkpoint: "Checkpoint",
  breadcrumb: "Breadcrumb",
  blocked: "Blocked",
  dependency_resolved: "Dependency resolved",
  resumed: "Resumed",
  submitted: "Submitted",
  changes_requested: "Changes requested",
  resubmitted: "Resubmitted",
  completed: "Completed",
  verified: "Verified",
  reopened: "Reopened",
};
export function chain(c: Commitment, s: Workspace) {
  const out: { label: string; at: number; kind: EventKind }[] = [];
  for (const e of s.events.filter((x) => x.commitmentId === c.id).sort((a, b) => a.at - b.at)) {
    const label = CHAIN[e.kind];
    if (!label) continue;
    if (out.length && out[out.length - 1].label === label) continue;
    out.push({ label, at: e.at, kind: e.kind });
  }
  return out;
}

/* ---------------- Sections for an employee ---------------- */

const notRecurringOrToday = (c: Commitment) => !isRecurring(c.recurrence) || occ(c).today;

export function employeeView(s: Workspace, me: PersonId) {
  const mine = s.commitments.filter((c) => c.assignee === me || c.createdBy === me);
  const newAssignments = mine.filter((c) => c.status === "assigned" && c.assignee === me);
  const pickup = mine.filter((c) => c.assignee === me && isInterrupted(c)).sort((a, b) => (b.lastWorkedAt ?? 0) - (a.lastWorkedAt ?? 0));
  const taken = new Set([...newAssignments, ...pickup].map((c) => c.id));
  const isUpcoming = (c: Commitment) =>
    (isRecurring(c.recurrence) && !occ(c).today) || (!isRecurring(c.recurrence) && c.status === "accepted" && !!c.date && dayDiff(c.date) > 1);
  const ownedOpen = mine.filter((c) => !taken.has(c.id) && c.assignee === me && ownerOf(c) === me && isOpen(c));
  const upcoming = mine.filter((c) => c.assignee === me && !taken.has(c.id) && isOpen(c) && isUpcoming(c)).sort((a, b) => nextDue(a) - nextDue(b));
  const upSet = new Set(upcoming.map((c) => c.id));
  const assignedToYou = ownedOpen.filter((c) => c.source === "assigned" && !upSet.has(c.id));
  const yourCommitments = ownedOpen.filter((c) => c.source !== "assigned" && !upSet.has(c.id));
  const waiting = mine.filter((c) => isOpen(c) && ownerOf(c) !== null && ownerOf(c) !== me && notRecurringOrToday(c));
  const weekAgo = s.now - 7 * 1440;
  const recentlyCompleted = [
    ...mine.filter((c) => c.assignee === me && !isOpen(c) && (c.verifiedAt ?? c.completedAt ?? -1e9) >= weekAgo),
    ...mine.filter((c) => c.assignee === me && isRecurring(c.recurrence) && occ(c).doneToday),
  ].sort((a, b) => (b.verifiedAt ?? b.completedAt ?? b.occurrences[TODAY]?.at ?? 0) - (a.verifiedAt ?? a.completedAt ?? a.occurrences[TODAY]?.at ?? 0));
  const dueToday = mine.filter((c) => c.assignee === me && isOpen(c) && (isRecurring(c.recurrence) ? occ(c).today && !occ(c).doneToday : c.date === TODAY)).length;
  const needsYou = newAssignments.length + pickup.filter((c) => ownerOf(c) === me).length + assignedToYou.length + yourCommitments.length;
  const recentlyVerified = recentlyCompleted.filter((c) => c.status === "verified").length;
  return { newAssignments, pickup, assignedToYou, yourCommitments, waiting, upcoming, recentlyCompleted, counts: { needsYou, waiting: waiting.length, dueToday, recentlyVerified } };
}

export function nextDue(c: Commitment) {
  if (isRecurring(c.recurrence)) {
    const n = occ(c).next;
    return n ? dueStamp({ ...c, date: n }) ?? 1e9 : 1e9;
  }
  return dueStamp(c) ?? 1e9;
}

/* ---------------- Manager ---------------- */

const startOfWeek = () => -((new Date(TODAY + "T00:00").getDay() + 6) % 7) * 1440; // Monday 00:00

export function managerSummary(s: Workspace) {
  const open = s.commitments.filter(isOpen);
  const eow = endOfWeek();
  return {
    active: open.length,
    dueThisWeek: open.filter((c) => nextDue(c) <= eow).length,
    blocked: open.filter((c) => c.status === "blocked").length,
    review: open.filter((c) => c.status === "submitted" || needsVerification(c)).length,
    verifiedThisWeek: s.commitments.filter((c) => c.status === "verified" && (c.verifiedAt ?? -1e9) >= startOfWeek()).length,
  };
}

export function managerNeeds(s: Workspace, me: PersonId) {
  const reviews = s.commitments.filter((c) => c.status === "submitted" && c.reviewer === me);
  const verify = s.commitments.filter((c) => needsVerification(c) && c.assignedBy === me);
  const own = s.commitments.filter((c) => c.assignee === me && isOpen(c) && ownerOf(c) === me);
  return { reviews, verify, own };
}

export function personSummary(s: Workspace, p: PersonId) {
  const open = s.commitments.filter((c) => c.assignee === p && isOpen(c));
  return {
    open,
    active: open.length,
    blocked: open.filter((c) => c.status === "blocked").length,
    review: open.filter((c) => c.status === "submitted").length,
    requested: open.filter((c) => c.source === "requested" && c.createdBy !== p).length,
  };
}

export function teamHandoff(s: Workspace, me: PersonId) {
  const since = -1440;
  const ev = s.events.filter((e) => e.at >= since);
  const verifiedEv = ev.filter((e) => e.kind === "verified");
  const lines: string[] = [];
  for (const c of s.commitments.filter((x) => x.status === "blocked" && x.blocker)) lines.push(`${first(c.assignee)} is waiting on ${first(c.blocker!.by)} for ${lower(c.blocker!.reason)}.`);
  const linked = new Set(s.commitments.map((c) => c.blocker?.dependencyId).filter(Boolean));
  for (const c of s.commitments.filter((x) => x.source === "requested" && isOpen(x) && !linked.has(x.id))) lines.push(`${first(c.createdBy)} is waiting on ${first(c.assignee)} for ${q(c.title)}.`);
  for (const c of s.commitments.filter((x) => x.status === "submitted" && x.reviewer === me)) lines.push(`${first(c.reviews[c.reviews.length - 1]?.submittedBy ?? c.assignee)} submitted ${q(c.title)} for your review.`);
  for (const e of verifiedEv) {
    const c = s.commitments.find((x) => x.id === e.commitmentId);
    if (c) lines.push(c.verifiedBy && c.verifiedBy !== "evidence" ? `${first(c.assignee)}'s ${q(c.title)} was verified by ${c.verifiedBy === me ? "you" : first(c.verifiedBy)}.` : `${first(c.assignee)} delivered ${q(c.title)}, with evidence attached.`);
  }
  for (const e of ev.filter((x) => x.kind === "created" && x.actor !== me)) {
    const c = s.commitments.find((x) => x.id === e.commitmentId);
    if (c) lines.push(`${first(c.createdBy)} created ${q(c.title)}${c.date ? `, due ${whenSentence(c)}` : ""}.`);
  }
  const open = s.commitments.filter(isOpen);
  const dueToday = open.filter((c) => (isRecurring(c.recurrence) ? occ(c).today && !occ(c).doneToday : c.date === TODAY));
  const crumbs = s.commitments
    .flatMap((c) => visibleCrumbs(c, me).filter((b) => b.type === "user" && b.author !== me).map((b) => ({ b, c })))
    .sort((a, b) => b.b.at - a.b.at)
    .slice(0, 3);
  return {
    counts: { verified: verifiedEv.length, blockers: ev.filter((e) => e.kind === "blocked").length, reviews: s.commitments.filter((c) => c.status === "submitted" && c.reviewer === me).length, dueToday: dueToday.length },
    lines,
    completedToday: s.commitments.filter((c) => c.status === "verified" && (c.verifiedAt ?? -1e9) >= 0),
    stillOpen: open.filter((c) => c.status === "in_progress" || c.status === "ready" || c.status === "changes_requested" || c.status === "accepted"),
    blocked: open.filter((c) => c.status === "blocked"),
    waitingReview: open.filter((c) => c.status === "submitted" || needsVerification(c)),
    crumbs,
    upcoming: open.filter((c) => nextDue(c) <= 2 * 1440 + 1439 && nextDue(c) < 1e9).sort((a, b) => nextDue(a) - nextDue(b)).slice(0, 6),
  };
}

/** Today's handoff for one person. Managers only see breadcrumbs that person shared. */
export function personHandoff(s: Workspace, p: PersonId, viewer: PersonId) {
  const today = (at: number | null) => at !== null && at >= 0;
  const mine = s.commitments.filter((c) => c.assignee === p);
  const completed = [
    ...mine.flatMap((c) => c.checkpoints.filter((cp) => today(cp.at) && cp.by === p).map((cp) => cp.text)),
    ...mine.filter((c) => !isOpen(c) && today(c.verifiedAt ?? c.completedAt)).map((c) => `${c.title}${c.status === "verified" ? " (verified)" : ""}`),
    ...mine.filter((c) => isRecurring(c.recurrence) && occ(c).doneToday).map((c) => `${c.title} (${period(c)})`),
  ];
  const open = mine.filter((c) => isOpen(c) && ownerOf(c) === p && notRecurringOrToday(c));
  const blocked = mine.filter((c) => c.status === "blocked");
  const review = mine.filter((c) => c.status === "submitted");
  const crumb = mine
    .flatMap((c) => visibleCrumbs(c, viewer).filter((b) => b.author === p && b.type === "user"))
    .sort((a, b) => b.at - a.at)[0] ?? null;
  const ev = employeeView(s, p);
  const nextC = ev.pickup.find((c) => ownerOf(c) === p) ?? ev.assignedToYou[0] ?? ev.yourCommitments[0] ?? null;
  return {
    completed,
    open: open.map((c) => ({ c, where: c.workspace ? locationOf(s, c) : null })),
    blocked,
    review,
    crumb,
    next: nextC ? { c: nextC, action: nextC.nextAction } : null,
  };
}

/* ---------------- Dependencies ---------------- */

export type DepNode = { c: Commitment; owner: PersonId };
export function dependencyChains(s: Workspace): DepNode[][] {
  const open = s.commitments.filter(isOpen);
  const byId = new Map(open.map((c) => [c.id, c]));
  const edges = new Map<string, string[]>();
  for (const c of open) {
    const deps = new Set([...c.dependsOn, ...(c.blocker?.dependencyId ? [c.blocker.dependencyId] : [])].filter((d) => byId.has(d)));
    if (deps.size) edges.set(c.id, [...deps]);
  }
  const incoming = new Set([...edges.values()].flat());
  const chains: DepNode[][] = [];
  for (const id of edges.keys()) {
    if (incoming.has(id)) continue;
    const walk = (cid: string, path: DepNode[]) => {
      const c = byId.get(cid)!;
      const next = [...path, { c, owner: c.assignee }];
      const outs = edges.get(cid) ?? [];
      if (!outs.length || path.some((p) => p.c.id === cid)) chains.push(next);
      else for (const o of outs) walk(o, next);
    };
    walk(id, []);
  }
  return chains;
}

/* ---------------- Timeline ---------------- */

export type Filter = "all" | "assigned" | "created" | "checkpoints" | "breadcrumbs" | "blocked" | "handoffs" | "completed" | "verified";
export const FILTERS: { key: Filter; label: string; kinds: EventKind[] | null }[] = [
  { key: "all", label: "All activity", kinds: null },
  { key: "assigned", label: "Assigned", kinds: ["assigned", "accepted"] },
  { key: "created", label: "Employee-created", kinds: ["created", "requested"] },
  { key: "checkpoints", label: "Checkpoints", kinds: ["checkpoint"] },
  { key: "breadcrumbs", label: "Breadcrumbs", kinds: ["breadcrumb"] },
  { key: "blocked", label: "Blocked", kinds: ["blocked", "dependency_resolved", "unblocked"] },
  { key: "handoffs", label: "Handoffs", kinds: ["submitted", "resubmitted", "handoff", "changes_requested"] },
  { key: "completed", label: "Completed", kinds: ["completed", "approved"] },
  { key: "verified", label: "Verified", kinds: ["verified"] },
];

export function timeline(s: Workspace, person: PersonId | null, filter: Filter): WorkEvent[] {
  const f = FILTERS.find((x) => x.key === filter)!;
  return s.events
    .filter((e) => !person || e.person === person || e.actor === person)
    .filter((e) => !f.kinds || f.kinds.includes(e.kind))
    .sort((a, b) => b.at - a.at);
}

export const eventLabel: Record<EventKind, string> = {
  assigned: "Assigned",
  accepted: "Accepted",
  created: "Created",
  requested: "Requested",
  started: "Work started",
  checkpoint: "Checkpoint",
  breadcrumb: "Breadcrumb",
  update: "Update",
  blocked: "Blocked",
  evidence: "Evidence attached",
  dependency_resolved: "Dependency resolved",
  unblocked: "Unblocked",
  resumed: "Resumed",
  submitted: "Submitted",
  resubmitted: "Resubmitted",
  handoff: "Handoff",
  changes_requested: "Changes requested",
  approved: "Approved",
  completed: "Completed",
  verified: "Verified ✓",
  reopened: "Reopened",
};

export const groupDay = (at: number) => {
  const d = dayDiff(dayOfStamp(at));
  return d === 0 ? "Today" : d === -1 ? "Yesterday" : fullDate(dayOfStamp(at));
};

export { agoLabel, first, TEAM };
