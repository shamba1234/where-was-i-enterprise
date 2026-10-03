"use client";

import Link from "next/link";
import { useState } from "react";
import { atLabel, whenLabel } from "@/lib/clock";
import { nextDue, occ, personHandoff, statusView, teamHandoff } from "@/lib/derive";
import { Commitment, PEOPLE, PersonId } from "@/lib/model";
import { markNoticeRead } from "@/lib/ops";
import { isRecurring } from "@/lib/recurrence";
import { useStore } from "@/lib/store";
import { CheckIcon, ChevronDown, CloseIcon, CrumbIcon, HandoffIcon, LockIcon } from "./Icons";
import { useUI } from "./UIProvider";
import { Avatar, Pill, btn } from "./ui";

export function Stats({ items }: { items: { n: number; label: string; href?: string; tone?: "blocked" | "review" | "ok" | "warn" }[] }) {
  return (
    <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-4">
      {items.map((it) => {
        const color = it.n === 0 ? "text-mute" : it.tone === "blocked" ? "text-blocked" : it.tone === "review" ? "text-review" : it.tone === "ok" ? "text-ok" : it.tone === "warn" ? "text-warn" : "text-text";
        const body = (
          <>
            <dd className={`order-1 font-display text-3xl font-semibold tabular-nums tracking-tight ${color}`}>{it.n}</dd>
            <dt className="order-2 text-sm text-soft">{it.label}</dt>
          </>
        );
        return (
          <div key={it.label} className="flex flex-col">
            {it.href ? <a href={it.href} className="flex flex-col hover:opacity-80">{body}</a> : body}
          </div>
        );
      })}
    </dl>
  );
}

/** Things that changed for this user since they last looked: assignments, resolved dependencies, feedback, approvals. */
export function Updates() {
  const { ws, me, update } = useStore();
  const ui = useUI();
  const notices = ws.notices.filter((n) => n.to === me && !n.read && n.kind !== "assignment").sort((a, b) => b.at - a.at).slice(0, 4);
  if (!notices.length) return null;
  const label: Record<string, string> = { resolved: "Dependency resolved", changes: "Changes requested", review: "Review needed", approved: "Verified ✓", blocked: "Blocked", accepted: "Accepted", verify: "Needs verification" };
  const tone: Record<string, string> = { resolved: "text-ok", approved: "text-ok", changes: "text-warn", review: "text-review", blocked: "text-blocked", verify: "text-review", accepted: "text-soft" };
  return (
    <section aria-label="Updates for you" className="mt-6 space-y-2">
      {notices.map((n) => (
        <div key={n.id} className="rise flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
          <span className={`text-xs font-semibold ${tone[n.kind]}`}>{label[n.kind]}</span>
          <button onClick={() => ui.open({ kind: n.kind === "review" ? "review" : "drawer", id: n.commitmentId })} className="min-w-0 flex-1 truncate text-left text-sm hover:text-accent-text">
            {n.text}
          </button>
          <span className="hidden text-xs text-mute sm:inline">{atLabel(n.at)}</span>
          <button onClick={() => update((s) => markNoticeRead(s, n.id))} aria-label="Dismiss" className="rounded-full p-1 text-mute hover:bg-raised hover:text-text"><CloseIcon className="h-4 w-4" /></button>
        </div>
      ))}
    </section>
  );
}

const Row = ({ c, children }: { c: Commitment; children?: React.ReactNode }) => {
  const ui = useUI();
  return (
    <li className="flex items-start gap-2 text-sm">
      <Avatar p={c.assignee} size={18} />
      <button onClick={() => ui.open({ kind: "drawer", id: c.id })} className="text-left hover:text-accent-text">
        <span className="font-medium">{c.title}</span>
        {children && <span className="text-soft"> — {children}</span>}
      </button>
    </li>
  );
};

/** Manager morning brief, computed from the workspace. */
export function TeamHandoff() {
  const { ws, me } = useStore();
  const [full, setFull] = useState(false);
  const h = teamHandoff(ws, me);
  return (
    <section aria-labelledby="team-handoff" className="rounded-3xl border border-line bg-surface p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="team-handoff" className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight"><HandoffIcon className="h-5 w-5 text-accent-text" /> Team handoff</h2>
        <p className="text-sm text-mute">Since yesterday</p>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [h.counts.verified, h.counts.verified === 1 ? "commitment verified" : "commitments verified", "text-ok"],
          [h.counts.blockers, h.counts.blockers === 1 ? "new blocker" : "new blockers", "text-blocked"],
          [h.counts.reviews, h.counts.reviews === 1 ? "review waiting on you" : "reviews waiting on you", "text-review"],
          [h.counts.dueToday, h.counts.dueToday === 1 ? "commitment due today" : "commitments due today", "text-warn"],
        ].map(([n, l, c]) => (
          <div key={l as string} className="rounded-2xl bg-raised/60 px-3.5 py-3">
            <dd className={`font-display text-2xl font-semibold tabular-nums ${n === 0 ? "text-mute" : c}`}>{n}</dd>
            <dt className="text-sm text-soft">{l}</dt>
          </div>
        ))}
      </dl>
      <ul className="mt-4 space-y-1.5 text-[15px]">
        {h.lines.map((l) => (
          <li key={l} className="flex gap-2.5"><span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-mute" /> {l}</li>
        ))}
      </ul>
      <button onClick={() => setFull((f) => !f)} aria-expanded={full} className="mt-3 inline-flex items-center gap-1 text-sm text-mute hover:text-text">
        Full handoff <ChevronDown className={`h-4 w-4 ${full ? "rotate-180" : ""}`} />
      </button>
      {full && (
        <div className="rise mt-4 grid gap-5 border-t border-line pt-4 sm:grid-cols-2">
          <Block title="Completed today" empty="Nothing verified yet today.">{h.completedToday.map((c) => <Row key={c.id} c={c}>verified{c.verifiedBy && c.verifiedBy !== "evidence" ? ` by ${PEOPLE[c.verifiedBy].first}` : " by evidence"}</Row>)}</Block>
          <Block title="Still open" empty="Nothing in progress.">{h.stillOpen.slice(0, 6).map((c) => <Row key={c.id} c={c}>{statusView(c, ws).label.toLowerCase()}</Row>)}</Block>
          <Block title="Blocked" empty="Nothing blocked.">{h.blocked.map((c) => <Row key={c.id} c={c}>waiting on {PEOPLE[c.blocker!.by].first}</Row>)}</Block>
          <Block title="Waiting for review" empty="No reviews pending.">{h.waitingReview.map((c) => <Row key={c.id} c={c}>{c.status === "submitted" ? `waiting on ${PEOPLE[c.reviewer!].first}` : "needs verification"}</Row>)}</Block>
          <Block title="Latest relevant breadcrumbs" empty="No shared breadcrumbs.">{h.crumbs.map(({ b, c }) => (
            <li key={b.id} className="text-sm"><span className="font-medium">{PEOPLE[b.author].first}</span> <span className="text-mute">on {c.title}, {atLabel(b.at)}</span><span className="block text-soft">“{b.text.replace(/\n+/g, " ")}”</span></li>
          ))}</Block>
          <Block title="Upcoming deadlines" empty="Nothing due soon.">{h.upcoming.map((c) => <Row key={c.id} c={c}>{isRecurring(c.recurrence) ? `next ${occ(c).next ? whenLabel({ ...c, date: occ(c).next }, true).toLowerCase() : ""}` : `due ${whenLabel(c, true).toLowerCase()}`}</Row>)}</Block>
        </div>
      )}
    </section>
  );
}

function Block({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-mute">{title}</h3>
      {children.length ? <ul className="mt-2 space-y-1.5">{children}</ul> : <p className="mt-2 text-sm text-mute">{empty}</p>}
    </div>
  );
}

/** Today's handoff for one person. Managers see only what the person shared. */
export function PersonHandoff({ p, compact }: { p: PersonId; compact?: boolean }) {
  const { ws, me } = useStore();
  const ui = useUI();
  const h = personHandoff(ws, p, me);
  const mine = p === me;
  return (
    <section aria-label={`${PEOPLE[p].first}'s handoff`} className="rounded-3xl border border-line bg-surface p-5">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight"><HandoffIcon className="h-5 w-5 text-accent-text" /> {mine ? "Today's handoff" : `${PEOPLE[p].first}'s handoff`}</h2>
      <dl className="mt-3 space-y-3 text-sm">
        <div>
          <dt className="text-xs font-semibold text-mute">Completed</dt>
          {h.completed.length ? h.completed.map((t) => <dd key={t} className="mt-0.5 flex gap-1.5"><CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok" /> {t}</dd>) : <dd className="text-mute">Nothing yet today</dd>}
        </div>
        <div>
          <dt className="text-xs font-semibold text-mute">Still open</dt>
          {h.open.length ? h.open.slice(0, compact ? 3 : 6).map(({ c, where }) => <dd key={c.id} className="mt-0.5"><button onClick={() => ui.open({ kind: "drawer", id: c.id })} className="text-left hover:text-accent-text">{c.title}{where ? <span className="text-mute"> (stopped at {where})</span> : null}</button></dd>) : <dd className="text-mute">Nothing</dd>}
        </div>
        {h.blocked.length > 0 && (
          <div>
            <dt className="text-xs font-semibold text-blocked">Blocked</dt>
            {h.blocked.map((c) => <dd key={c.id} className="mt-0.5">Waiting for {PEOPLE[c.blocker!.by].first}'s {c.blocker!.reason.charAt(0).toLowerCase() + c.blocker!.reason.slice(1)}</dd>)}
          </div>
        )}
        {h.review.length > 0 && (
          <div>
            <dt className="text-xs font-semibold text-review">Waiting for review</dt>
            {h.review.map((c) => <dd key={c.id} className="mt-0.5">{c.title}</dd>)}
          </div>
        )}
        <div>
          <dt className="flex items-center gap-1 text-xs font-semibold text-mute"><CrumbIcon className="h-3.5 w-3.5" /> Latest breadcrumb</dt>
          {h.crumb ? <dd className="mt-0.5 text-soft">“{h.crumb.text.replace(/\n+/g, " ")}”</dd> : <dd className="text-mute">{mine ? "None yet" : `None shared. ${PEOPLE[p].first}'s private breadcrumbs aren't shown.`}</dd>}
        </div>
        {h.next && (
          <div>
            <dt className="text-xs font-semibold text-accent-text">Next session</dt>
            <dd className="mt-0.5 font-medium">{h.next.action}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}

/** "Review needed" card for the reviewer. */
export function ReviewNeeded({ c }: { c: Commitment }) {
  const ui = useUI();
  const last = c.reviews[c.reviews.length - 1];
  return (
    <article id={`c-${c.id}`} className={`flex flex-col rounded-2xl border border-review/40 bg-surface p-5 ${ui.justChanged === c.id ? "rise ring-2 ring-accent/40" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold text-review">Review needed{last && last.round > 1 ? `, round ${last.round}` : ""}</p>
        <Pill tone="review">Waiting on you</Pill>
      </div>
      {c.project && <p className="mt-2 text-xs font-medium text-mute">{c.project}</p>}
      <p className="font-display text-lg font-semibold leading-snug tracking-tight">{c.title}</p>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-soft"><Avatar p={c.assignee} size={18} /> Submitted by {PEOPLE[c.assignee].first}{last ? `, ${atLabel(last.submittedAt)}` : ""}</p>
      {last?.note && <p className="mt-2 text-sm text-soft">“{last.note}”</p>}
      <div className="mt-4 flex gap-2">
        <button onClick={() => ui.open({ kind: "review", id: c.id })} className={btn.primary}>Review</button>
        <button onClick={() => ui.open({ kind: "drawer", id: c.id })} className={btn.quiet}>Details</button>
      </div>
    </article>
  );
}

export function PrivacyNote() {
  return (
    <Link href="/privacy" className="flex items-start gap-2.5 rounded-2xl border border-line px-4 py-3 text-sm text-soft hover:border-line-strong hover:text-text">
      <LockIcon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>Work state only. No activity tracking, screenshots or scores. <span className="font-medium text-accent-text">What my company can see</span></span>
    </Link>
  );
}

export const sortByDue = (a: Commitment, b: Commitment) => nextDue(a) - nextDue(b);
