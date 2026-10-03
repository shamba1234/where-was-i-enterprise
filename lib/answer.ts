/** Ask Where Was I?: deterministic answers derived from the shared workspace. No AI API. */
import { TODAY, addDays, agoLabel, atLabel, dayOfStamp, endOfWeek, fullDate, whenLabel } from "./clock";
import { employeeView, isOpen, managerNeeds, nextDue, occ, ownerLabel, ownerOf, personHandoff, statusView, visibleCrumbs, whyOpen, completedParts } from "./derive";
import { locationOf } from "./ops";
import { isRecurring, occursOn } from "./recurrence";
import { Commitment, PEOPLE, PersonId, Workspace } from "./model";

export type Item = { label: string; meta?: string; note?: string; tone?: "ok" | "blocked" | "review" | "warn" };
export type WhereWasI = {
  title: string;
  project: string | null;
  goal: string;
  location: string;
  completed: string[];
  crumb: { text: string; who: string; ago: string; type: "user" | "ai" } | null;
  dependency: { text: string; tone: "ok" | "blocked" } | null;
  feedback: string | null;
  nextAction: string;
  href: string;
  commitmentId: string;
};
export type Answer = { text: string; source: string; items?: Item[]; action?: { label: string; href?: string; commitmentId?: string }; where?: WhereWasI };

const first = (p: PersonId) => PEOPLE[p].first;
const has = (q: string, re: RegExp) => re.test(q);
const STOP = new Set("a an the my i me to do did does have has need should when what whats is are was it at on for of in and with about be will by any still yet today tomorrow been why hasnt hasn't completed done".split(" "));
const tokens = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w)).map((w) => (w.length > 4 ? w.replace(/(ing|ed|es|s)$/, "") : w));

export const workspaceHref = (c: Commitment) => (c.workspace === "design" ? `/workspace/design?c=${c.id}&resume=1` : c.workspace === "application" ? "/workspace/application?resume=1" : "");

function match(q: string, s: Workspace, pool?: Commitment[]) {
  const qt = new Set(tokens(q));
  let best: { c: Commitment; score: number } | null = null;
  for (const c of pool ?? s.commitments) {
    const hit = (t: string) => new Set(tokens(t)).size && [...new Set(tokens(t))].filter((w) => qt.has(w)).length;
    const score = hit(c.title) * 3 + hit(c.project ?? "") + hit(c.context) + (isOpen(c) ? 0.5 : 0);
    if (score >= 1 && (!best || score > best.score)) best = { c, score };
  }
  return best?.c ?? null;
}

/** The single most useful "where was I?" target for a person. */
export function whereWasI(s: Workspace, me: PersonId): WhereWasI | null {
  const ev = employeeView(s, me);
  const pool = [...ev.pickup, ...s.commitments.filter((c) => c.assignee === me && c.status === "blocked" && c.workspace)];
  const c = pool.find((x) => x.workspace === "design") ?? pool[0];
  if (!c) return null;
  const crumb = visibleCrumbs(c, me).find((b) => b.type === "user" || b.confirmed) ?? visibleCrumbs(c, me)[0] ?? null;
  const dependency =
    c.status === "blocked" && c.blocker
      ? { text: `Still waiting on ${first(c.blocker.by)} for ${c.blocker.reason.charAt(0).toLowerCase() + c.blocker.reason.slice(1)}.`, tone: "blocked" as const }
      : c.lastBlocker && c.resolvedAt !== null
        ? { text: `${first(c.lastBlocker.by)} has delivered the ${c.lastBlocker.reason.charAt(0).toLowerCase() + c.lastBlocker.reason.slice(1)}.`, tone: "ok" as const }
        : null;
  return {
    title: c.title,
    project: c.project,
    goal: c.goal,
    location: locationOf(s, c),
    completed: completedParts(c, s),
    crumb: crumb ? { text: crumb.text, who: crumb.type === "user" ? (crumb.author === me ? "Written by you" : `Written by ${first(crumb.author)}`) : crumb.confirmed ? `Confirmed by ${first(crumb.author)} ✓` : "Suggested from work context", ago: agoLabel(crumb.at, s.now), type: crumb.type } : null,
    dependency,
    feedback: c.status === "changes_requested" ? c.feedback : null,
    nextAction: c.nextAction,
    href: workspaceHref(c),
    commitmentId: c.id,
  };
}

export function answer(raw: string, s: Workspace, me: PersonId): Answer {
  const q = raw.toLowerCase().trim().replace(/[?!.]+$/, "");
  const manager = PEOPLE[me].manager;

  // The signature question.
  if (/^(so\s+)?where (was|were) (i|we)\b/.test(q) || /\bwhere did i (stop|leave off)\b/.test(q)) {
    const w = whereWasI(s, me);
    if (!w) return { text: "Nothing is interrupted. Every workflow you started is finished, handed off, or not started yet.", source: "Checked your commitments with saved work state." };
    return { text: "You were working on:", source: "From your saved checkpoints, breadcrumbs and the current state of its dependencies.", where: w };
  }

  // A teammate's state (manager).
  const who = (["maya", "alex", "sarah", "jordan"] as PersonId[]).find((p) => p !== me && new RegExp(`\\b${p}\\b`).test(q));
  if (who && has(q, /\b(leave off|left off|stop|stopped|where)\b/)) {
    const h = personHandoff(s, who, me);
    const items: Item[] = h.open.map(({ c, where }) => ({ label: c.title, meta: where ? `Stopped at ${where}` : c.nextAction, note: c.checkpoints.length ? `Latest checkpoint: ${c.checkpoints[c.checkpoints.length - 1].text}` : undefined }));
    for (const c of h.blocked) items.push({ label: c.title, meta: `Blocked: waiting on ${first(c.blocker!.by)}`, tone: "blocked" });
    return { text: `${first(who)}'s latest work state:`, source: h.crumb ? `Latest shared breadcrumb: “${h.crumb.text.replace(/\n+/g, " ")}”` : `${first(who)} hasn't shared a breadcrumb today. Only breadcrumbs ${first(who)} chooses to share are visible to you.`, items };
  }
  if (who && has(q, /\bbreadcrumb/)) {
    const crumbs = s.commitments.flatMap((c) => visibleCrumbs(c, me).filter((b) => b.author === who && b.type === "user").map((b) => ({ b, c }))).sort((a, b) => b.b.at - a.b.at);
    if (!crumbs.length) return { text: `${first(who)} hasn't shared any breadcrumbs.`, source: "You only see breadcrumbs a teammate explicitly shares as work context. Private ones stay private." };
    return { text: `Breadcrumbs ${first(who)} shared:`, source: "Only breadcrumbs shared as work context. Private breadcrumbs aren't shown.", items: crumbs.map(({ b, c }) => ({ label: `“${b.text.replace(/\n+/g, " ")}”`, meta: c.title, note: atLabel(b.at) })) };
  }
  if (who && has(q, /\b(work on|worked on|working on|do today|did .* today)\b/)) {
    const ev = s.events.filter((e) => (e.person === who || e.actor === who) && e.at >= 0).sort((a, b) => a.at - b.at);
    if (!ev.length) return { text: `No work events from ${first(who)} today yet.`, source: "From the work timeline: meaningful work events only, not activity." };
    const byC = new Map<string, string[]>();
    for (const e of ev) {
      const c = s.commitments.find((x) => x.id === e.commitmentId);
      if (!c) continue;
      byC.set(c.title, [...(byC.get(c.title) ?? []), e.private && me !== e.actor ? "Breadcrumb saved (private)" : e.text]);
    }
    return { text: `${first(who)} worked on ${byC.size} commitment${byC.size === 1 ? "" : "s"} today:`, source: "From the work timeline: assignments, checkpoints, handoffs and other work events. No activity tracking.", items: [...byC].map(([t, evs]) => ({ label: t, meta: evs[evs.length - 1], note: `${evs.length} event${evs.length === 1 ? "" : "s"}` })) };
  }

  if (has(q, /\b(blocked|stuck)\b/) && !has(q, /\bam i\b/)) {
    const b = s.commitments.filter((c) => c.status === "blocked" && (manager || c.assignee === me));
    if (!b.length) return { text: "Nothing is blocked right now.", source: "Checked every open commitment." };
    return { text: `${b.length} commitment${b.length === 1 ? " is" : "s are"} blocked:`, source: "Blocked means the next action belongs to someone else.", items: b.map((c) => ({ label: `${first(c.assignee)}: ${c.title}`, meta: `Waiting on ${first(c.blocker!.by)} for ${c.blocker!.reason.charAt(0).toLowerCase() + c.blocker!.reason.slice(1)}`, tone: "blocked" })) };
  }

  if (has(q, /\b(who is waiting on me|who'?s waiting on me|waiting on me)\b/)) {
    const w = s.commitments.filter((c) => isOpen(c) && ownerOf(c) === me && (c.assignee !== me || c.source === "requested"));
    if (!w.length) return { text: "Nobody is waiting on you.", source: "Commitments where you own the next action for someone else." };
    return { text: `${w.length} thing${w.length === 1 ? " is" : "s are"} waiting on you:`, source: "Someone else's work can't move until you act.", items: w.map((c) => ({ label: c.title, meta: c.status === "submitted" ? `${first(c.assignee)} is waiting for your review` : `${first(c.createdBy)} is waiting`, note: c.nextAction, tone: "review" })) };
  }

  if (has(q, /\b(need|needs) (review|reviewing)|to review|review\b/) && manager) {
    const { reviews, verify } = managerNeeds(s, me);
    const all = [...reviews, ...verify];
    if (!all.length) return { text: "Nothing needs your review.", source: "Submissions and completions waiting on you." };
    return { text: `${all.length} need${all.length === 1 ? "s" : ""} your review:`, source: "Submitted work waits on you until you approve or request changes.", items: all.map((c) => ({ label: c.title, meta: c.status === "submitted" ? `Submitted by ${first(c.assignee)} ${atLabel(c.reviews[c.reviews.length - 1].submittedAt)}` : `Completed by ${first(c.assignee)}, needs verification`, tone: "review" })), action: reviews[0] ? { label: "Review", commitmentId: reviews[0].id } : undefined };
  }

  if (has(q, /\bwhat changed|changed today|what happened|since yesterday\b/)) {
    const ev = s.events.filter((e) => e.at >= (has(q, /yesterday/) ? -1440 : 0)).sort((a, b) => b.at - a.at).slice(0, 10);
    if (!ev.length) return { text: "No work events yet today.", source: "From the shared work timeline." };
    return { text: `${ev.length} recent work event${ev.length === 1 ? "" : "s"}:`, source: "Meaningful work events only: assignments, checkpoints, blockers, handoffs, reviews.", items: ev.map((e) => ({ label: e.private && e.actor !== me ? "Breadcrumb saved (private)" : e.text, meta: `${first(e.actor)}, ${atLabel(e.at)}`, note: e.quote && !(e.private && e.actor !== me) ? `“${e.quote}”` : undefined })) };
  }

  if (has(q, /\bdue (this week|tomorrow|today)|this week\b/) || has(q, /\bwhat is due\b/)) {
    const day = has(q, /tomorrow/) ? addDays(TODAY, 1) : has(q, /today/) ? TODAY : null;
    const eow = endOfWeek();
    const pool = s.commitments.filter((c) => isOpen(c) && (manager || c.assignee === me));
    const list = pool
      .filter((c) => {
        if (day) return isRecurring(c.recurrence) ? occursOn(c.recurrence, c.date ?? TODAY, day) && !(day === TODAY && occ(c).doneToday) : c.date === day;
        return nextDue(c) <= eow;
      })
      .sort((a, b) => nextDue(a) - nextDue(b));
    const span = day ? (day === TODAY ? "today" : "tomorrow") : "this week";
    if (!list.length) return { text: `Nothing is due ${span}.`, source: "Open commitments with a deadline." };
    return { text: `${list.length} due ${span}:`, source: manager ? "Across the team." : "Your commitments.", items: list.map((c) => ({ label: manager ? `${first(c.assignee)}: ${c.title}` : c.title, meta: isRecurring(c.recurrence) ? `${occ(c).label}${occ(c).next ? `, next ${fullDate(occ(c).next!)}` : ""}` : whenLabel(c, true), note: ownerLabel(c, me) ?? undefined, tone: c.status === "blocked" ? "blocked" : undefined })) };
  }

  if (has(q, /\bwhy\b/)) {
    const c = match(q, s);
    if (c) {
      const v = statusView(c, s);
      return { text: `${c.title}: ${v.label}.`, source: "Why is this open?", items: whyOpen(c, s).map((t) => ({ label: t })), action: { label: "Open commitment", commitmentId: c.id } };
    }
  }

  // Employee questions.
  if (has(q, /\b(what needs me|needs me|need me|needs my attention|my attention|on my plate)\b/)) {
    const ev = employeeView(s, me);
    const list = [...ev.newAssignments, ...ev.pickup.filter((c) => ownerOf(c) === me), ...ev.assignedToYou, ...ev.yourCommitments];
    if (manager) {
      const n = managerNeeds(s, me);
      list.splice(0, list.length, ...n.reviews, ...n.verify, ...n.own);
    }
    if (!list.length) return { text: "Nothing needs you right now.", source: "Only commitments where you own the next action." };
    return { text: `${list.length} thing${list.length === 1 ? " needs" : "s need"} you:`, source: "Only commitments where you own the next action. Work waiting on others is left out on purpose.", items: list.map((c) => ({ label: c.title, meta: c.status === "assigned" ? "New assignment: accept it" : c.nextAction, note: c.date ? `Due ${whenLabel(c, true)}` : undefined })) };
  }
  if (has(q, /\b(waiting on|waiting for)\b/)) {
    const ev = employeeView(s, me);
    const list = manager ? s.commitments.filter((c) => c.createdBy === me && isOpen(c) && ownerOf(c) !== me && ownerOf(c) !== null) : ev.waiting;
    if (!list.length) return { text: "You're not waiting on anyone.", source: "Commitments where someone else owns the next action." };
    return { text: `You're waiting on ${list.length} thing${list.length === 1 ? "" : "s"}. No action needed from you.`, source: "Someone else owns the next action on these.", items: list.map((c) => ({ label: c.title, meta: ownerLabel(c, me) ?? "", note: c.status === "blocked" ? c.blocker?.reason : c.status === "submitted" ? "Submitted for review" : undefined, tone: c.status === "blocked" ? "blocked" : "review" })) };
  }
  if (has(q, /\b(unfinished|left off|interrupted|didn'?t finish|half.?done)\b/)) {
    const ev = employeeView(s, me);
    const list = [...ev.pickup, ...s.commitments.filter((c) => c.assignee === me && c.status === "blocked")];
    if (!list.length) return { text: "Nothing is unfinished mid-workflow.", source: "Checked your saved work state." };
    return { text: `${list.length} unfinished workflow${list.length === 1 ? "" : "s"}:`, source: "From your checkpoints and saved workspace state.", items: list.map((c) => ({ label: c.title, meta: c.workspace ? `Stopped at ${locationOf(s, c)}` : c.nextAction, note: c.status === "blocked" ? `Blocked: waiting on ${first(c.blocker!.by)}` : `Next: ${c.nextAction}`, tone: c.status === "blocked" ? "blocked" : undefined })), action: list[0]?.workspace ? { label: "Resume exactly where I stopped", href: workspaceHref(list[0]) } : undefined };
  }
  if (has(q, /\b(thinking|on my mind|my head)\b/)) {
    const crumbs = s.commitments.flatMap((c) => visibleCrumbs(c, me).filter((b) => b.author === me).map((b) => ({ b, c }))).sort((a, b) => b.b.at - a.b.at).slice(0, 4);
    if (!crumbs.length) return { text: "You haven't left any breadcrumbs yet.", source: "Breadcrumbs save what was on your mind when you stopped." };
    return {
      text: "Here's what you were thinking when you stopped:",
      source: "Your breadcrumbs are written by you. AI reconstructions are labeled and only count once you confirm them.",
      items: crumbs.map(({ b, c }) => ({ label: `“${b.text.replace(/\n+/g, " ")}”`, meta: `${c.title}, ${b.location}`, note: `${b.type === "user" ? "Written by you" : b.confirmed ? "AI reconstruction, confirmed by you" : "AI reconstruction (unconfirmed)"}, ${agoLabel(b.at, s.now)}` })),
    };
  }
  if (has(q, /\b(complete|completed|finish|finished|done)\b.*\btoday\b|\bwhat did i (complete|finish|do)\b/)) {
    const list = s.commitments.filter((c) => (manager || c.assignee === me) && ((!isOpen(c) && (c.verifiedAt ?? c.completedAt ?? -1) >= 0) || (isRecurring(c.recurrence) && occ(c).doneToday)));
    const cps = s.commitments.flatMap((c) => c.checkpoints.filter((cp) => cp.at >= 0 && (manager || cp.by === me)).map((cp) => ({ cp, c })));
    if (!list.length && !cps.length) return { text: "Nothing completed today yet.", source: "Completed and verified are tracked separately." };
    return {
      text: `${list.filter((c) => c.status === "verified").length} verified, ${list.filter((c) => c.status !== "verified").length} completed without verification, ${cps.length} checkpoint${cps.length === 1 ? "" : "s"} today.`,
      source: "Verified means a reviewer approved it or evidence confirmed it. Completed means someone said so.",
      items: [
        ...list.map((c) => ({ label: c.title, meta: c.status === "verified" ? "Verified ✓" : isRecurring(c.recurrence) ? "Completed this occurrence" : `Completed by ${first(c.assignee)}`, tone: c.status === "verified" ? ("ok" as const) : undefined })),
        ...cps.map(({ cp, c }) => ({ label: cp.text, meta: `Checkpoint on ${c.title}`, note: atLabel(cp.at) })),
      ],
    };
  }
  if (has(q, /\b(do next|should i do|what next|where should i start|what first)\b/)) {
    const ev = employeeView(s, me);
    const ranked = manager
      ? [...managerNeeds(s, me).reviews, ...managerNeeds(s, me).verify, ...managerNeeds(s, me).own]
      : [...ev.newAssignments, ...ev.pickup.filter((c) => c.status === "ready" || c.status === "changes_requested"), ...ev.pickup, ...ev.assignedToYou, ...ev.yourCommitments].filter((c, i, a) => a.indexOf(c) === i);
    const top = ranked.sort((a, b) => score(b) - score(a))[0];
    if (!top) return { text: "Nothing is waiting on you. Everything open is scheduled or someone else's move.", source: "Ranked by ownership, deadlines and what's unblocked." };
    const why =
      top.status === "assigned" ? "It's a new assignment waiting for you to accept." : top.status === "ready" ? "Its dependency just resolved, so you can finish it now." : top.status === "changes_requested" ? `${first(top.reviewer ?? "jordan")} requested changes and is waiting on you.` : top.status === "submitted" ? `${first(top.assignee)} is waiting on your review.` : top.date ? `It's due ${whenLabel(top, true).toLowerCase()}.` : "It's yours and it's open.";
    return { text: `Next: ${top.nextAction || top.title}`, source: `${top.title}. ${why}`, action: top.workspace ? { label: "Resume exactly where I stopped", href: workspaceHref(top) } : { label: "Open commitment", commitmentId: top.id } };
  }

  // A specific commitment.
  const c = match(q, s);
  if (c) {
    const v = statusView(c, s);
    return { text: `${c.title}: ${v.label}.`, source: whyOpen(c, s).join(" "), items: c.nextAction && isOpen(c) ? [{ label: "Next action", meta: c.nextAction }] : undefined, action: { label: "Open commitment", commitmentId: c.id } };
  }
  return {
    text: manager
      ? "Try: what is blocked, who is waiting on me, what needs review, what changed today, what is due this week, where did Maya leave off, or what breadcrumbs did Maya leave."
      : "Try: where was I, what needs me, what am I waiting on, what did I leave unfinished, what should I do next, what is due tomorrow, or what was I thinking when I stopped.",
    source: "Answers come from the shared workspace: commitments, checkpoints, breadcrumbs, blockers and handoffs.",
  };
}

function score(c: Commitment) {
  let s = 0;
  if (c.status === "submitted") s += 90;
  if (c.status === "changes_requested") s += 85;
  if (c.status === "ready") s += 80;
  if (c.status === "assigned") s += 70;
  if (c.priority === "high") s += 15;
  const due = nextDue(c);
  if (due < 1e9) s += Math.max(0, 60 - due / 60);
  return s;
}

export { dayOfStamp };
