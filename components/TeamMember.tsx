"use client";

import { useState } from "react";
import { timeLabel, whenLabel } from "@/lib/clock";
import { latestUserCrumb, occ, originLabel, ownerOf, personSummary, statusView } from "@/lib/derive";
import { Commitment, PEOPLE, PersonId } from "@/lib/model";
import { isRecurring } from "@/lib/recurrence";
import { useStore } from "@/lib/store";
import { ChevronDown, CrumbIcon, FlagIcon } from "./Icons";
import { useUI } from "./UIProvider";
import { Avatar, Pill, btn } from "./ui";
import { sortByDue } from "./Panels";

/** One teammate's work state. Counts of commitments by state, never scores or activity. */
export default function TeamMember({ p, defaultOpen }: { p: PersonId; defaultOpen?: boolean }) {
  const { ws } = useStore();
  const s = personSummary(ws, p);
  const [open, setOpen] = useState(defaultOpen ?? p === "maya");
  const counts = [
    [s.active, "active"],
    [s.blocked, "blocked"],
    [s.review, "waiting for review"],
    [s.requested, s.requested === 1 ? "dependency requested" : "dependencies requested"],
  ].filter(([n], i) => i === 0 || (n as number) > 0);

  return (
    <section className="rounded-3xl border border-line bg-surface" aria-label={PEOPLE[p].name}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 text-left">
        <Avatar p={p} size={36} />
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg font-semibold tracking-tight">{PEOPLE[p].name}</span>
          <span className="block text-sm text-mute">{PEOPLE[p].role}</span>
        </span>
        <span className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {counts.map(([n, l]) => (
            <span key={l as string} className={l === "blocked" ? "font-semibold text-blocked" : l === "waiting for review" ? "text-review" : "text-soft"}>
              <span className="font-semibold tabular-nums">{n}</span> {l}
            </span>
          ))}
        </span>
        <ChevronDown className={`h-5 w-5 text-mute transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="divide-y divide-line border-t border-line">
          {s.open.sort(sortByDue).map((c) => <TeamRow key={c.id} c={c} />)}
          {s.open.length === 0 && <li className="px-5 py-4 text-sm text-mute">No open commitments.</li>}
        </ul>
      )}
    </section>
  );
}

export function TeamRow({ c }: { c: Commitment }) {
  const { ws, me } = useStore();
  const ui = useUI();
  const v = statusView(c, ws);
  const owner = ownerOf(c);
  const crumb = latestUserCrumb(c, me);
  const cp = c.checkpoints[c.checkpoints.length - 1];
  const recurring = isRecurring(c.recurrence);
  const dep = c.blocker?.dependencyId ? ws.commitments.find((x) => x.id === c.blocker!.dependencyId) : null;
  return (
    <li id={`row-${c.id}`} className={`grid gap-3 px-5 py-4 md:grid-cols-[1fr_260px] ${ui.justChanged === c.id ? "rise bg-accent-soft/30" : ""}`}>
      <div className="min-w-0">
        {c.project && <p className="text-xs font-medium text-mute">{c.project}</p>}
        <button onClick={() => ui.open({ kind: "drawer", id: c.id })} className="text-left font-semibold leading-snug hover:text-accent-text">{c.title}</button>
        <p className="mt-0.5 text-xs text-mute">{c.source === "assigned" ? originLabel(c) : <span className="font-medium text-soft">{originLabel(c)}</span>}</p>
        <div className="mt-2 space-y-1 text-sm">
          {owner && (
            <p>
              <span className="text-mute">Next action{owner !== c.assignee ? ` (${PEOPLE[owner].first})` : ""}: </span>
              {owner === me ? <span className="font-medium text-accent-text">{c.nextAction}</span> : c.status === "blocked" ? <span>Waiting on {PEOPLE[owner].first} for {c.blocker!.reason.charAt(0).toLowerCase() + c.blocker!.reason.slice(1)}</span> : c.status === "assigned" ? "Accept the assignment" : c.nextAction}
            </p>
          )}
          {cp && <p className="flex gap-1.5 text-soft"><FlagIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mute" /><span><span className="text-mute">Latest checkpoint: </span>{cp.text}</span></p>}
          {crumb && <p className="flex gap-1.5 text-soft"><CrumbIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mute" /><span><span className="text-mute">Latest breadcrumb: </span>“{crumb.text.replace(/\n+/g, " ")}”</span></p>}
          {c.status === "changes_requested" && c.feedback && <p className="text-warn">Your feedback: “{c.feedback}”</p>}
        </div>
      </div>
      <div className="flex flex-col items-start gap-1.5 md:items-end">
        <Pill tone={v.tone}>{v.label}</Pill>
        <p className="text-sm text-soft">{recurring ? `${occ(c).label}${c.time ? `, ${timeLabel(c)}` : ""}` : c.date ? `Due ${whenLabel(c, true)}` : "No deadline"}</p>
        <div className="mt-1 flex flex-wrap gap-1.5 md:justify-end">
          {c.status === "submitted" && c.reviewer === me && <button onClick={() => ui.open({ kind: "review", id: c.id })} className={btn.primary + " py-1"}>Review</button>}
          {c.status === "blocked" && dep && dep.status !== "verified" && (
            <button onClick={() => ui.resolve(dep.id)} className={btn.demo + " py-1"}>Demo event: {PEOPLE[dep.assignee].first} delivers</button>
          )}
        </div>
      </div>
    </li>
  );
}
