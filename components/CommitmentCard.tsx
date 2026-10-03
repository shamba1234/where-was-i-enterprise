"use client";

import Link from "next/link";
import { useState } from "react";
import { atLabel, dayDiff, timeLabel, whenLabel } from "@/lib/clock";
import { isOpen, latestUserCrumb, needsVerification, occ, originLabel, ownerLabel, ownerOf, pendingAi, pendingSuggestion, statusView } from "@/lib/derive";
import { Commitment, PEOPLE } from "@/lib/model";
import { isRecurring, nextLabel } from "@/lib/recurrence";
import { useStore } from "@/lib/store";
import { workspaceHref } from "@/lib/answer";
import { BlockIcon, CheckIcon, CrumbIcon, FlagIcon, RepeatIcon } from "./Icons";
import { AiCrumb, SuggestionPanel } from "./Suggestions";
import { useUI } from "./UIProvider";
import { Avatar, NextAction, Pill, WhyOpen, btn } from "./ui";

export default function CommitmentCard({ c, showPerson, compact }: { c: Commitment; showPerson?: boolean; compact?: boolean }) {
  const { ws, me } = useStore();
  const ui = useUI();
  const [context, setContext] = useState(false);
  const v = statusView(c, ws);
  const owner = ownerOf(c);
  const ownerText = ownerLabel(c, me);
  const recurring = isRecurring(c.recurrence);
  const o = recurring ? occ(c) : null;
  const iAmAssignee = c.assignee === me;
  const crumb = latestUserCrumb(c, me);
  const lastCp = c.checkpoints[c.checkpoints.length - 1];
  const ai = pendingAi(c, me);
  const sug = pendingSuggestion(c, me);
  const dep = c.blocker?.dependencyId ? ws.commitments.find((x) => x.id === c.blocker!.dependencyId) : null;
  const pressing = isOpen(c) && c.date && dayDiff(c.date) <= 0 && owner === me;

  return (
    <article
      id={`c-${c.id}`}
      className={[
        "flex flex-col rounded-2xl border bg-surface p-5 transition-colors",
        c.status === "blocked" ? "border-blocked/30" : c.status === "assigned" && iAmAssignee ? "border-accent/50" : "border-line",
        ui.justChanged === c.id ? "rise ring-2 ring-accent/40" : "",
        c.status === "verified" && ui.justChanged === c.id ? "settle" : "",
      ].join(" ")}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {c.project && <p className="mb-0.5 text-xs font-medium text-mute">{c.project}</p>}
          <button onClick={() => ui.open({ kind: "drawer", id: c.id })} className="text-left font-display text-lg font-semibold leading-snug tracking-tight hover:text-accent-text">
            {c.title}
          </button>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-mute">
            {showPerson && (
              <span className="mr-1 inline-flex items-center gap-1.5 text-soft">
                <Avatar p={c.assignee} size={18} /> {PEOPLE[c.assignee].first}
              </span>
            )}
            {recurring && <RepeatIcon className="h-3.5 w-3.5" />}
            <span>{recurring ? `${o!.label}${c.time ? `, ${timeLabel(c)}` : ""}` : originLabel(c)}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Pill tone={v.tone}>{v.label}</Pill>
          {ownerText && isOpen(c) && !v.label.startsWith("Blocked") && !v.label.startsWith("Waiting") && c.status !== "assigned" && (
            <span className={`text-xs font-medium ${owner === me ? "text-accent-text" : "text-mute"}`}>{ownerText}</span>
          )}
        </div>
      </header>

      {!recurring && c.date && isOpen(c) && (
        <p className="mt-2 text-sm text-mute">
          {c.timeKind === "before" ? "Due" : "When"} <span className={pressing ? "font-medium text-warn" : "text-soft"}>{whenLabel(c, true)}</span>
          {c.priority === "high" && <span className="ml-2 text-xs font-semibold text-warn">High priority</span>}
        </p>
      )}

      {/* Recurring: one occurrence closes, the commitment continues. */}
      {recurring && o && (o.doneToday ? (
        <div className="mt-3 rounded-xl bg-ok-soft/70 px-3.5 py-2.5 text-sm">
          <p className="flex items-center gap-1.5 font-semibold text-ok"><CheckIcon className="h-4 w-4" /> Completed {c.recurrence.unit === "weeks" || c.recurrence.freq === "weekly" ? "this week" : "today"}</p>
          <p className="mt-0.5 text-soft">Completed by {PEOPLE[c.occurrences[Object.keys(c.occurrences).sort().pop()!].by].first}, not independently verified</p>
          {o.next && <p className="mt-1 text-soft">Next: <span className="font-medium text-text">{nextLabel(o.next, c.time)}</span></p>}
        </div>
      ) : !o.today && o.next ? (
        <p className="mt-2 text-sm text-mute">Next: <span className="text-soft">{nextLabel(o.next, c.time)}</span></p>
      ) : null)}

      {c.status === "assigned" && iAmAssignee && (
        <p className="mt-2 text-sm text-soft">
          Assigned by {PEOPLE[c.assignedBy!].name}
          {c.date ? `, due ${whenLabel(c, true).toLowerCase()}` : ""}
        </p>
      )}

      {(context || (c.status === "assigned" && compact === false)) && (
        <dl className="rise mt-3 grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 rounded-xl border border-line bg-raised/40 p-3 text-sm">
          {c.context && (<><dt className="text-mute">Context</dt><dd>{c.context}</dd></>)}
          {c.evidenceRequirement && (<><dt className="text-mute">Evidence</dt><dd>{c.evidenceRequirement}</dd></>)}
          {c.priority !== "normal" && (<><dt className="text-mute">Priority</dt><dd className="capitalize">{c.priority}</dd></>)}
          {ws.commitments.some((x) => x.dependsOn.includes(c.id)) ? (<><dt className="text-mute">Needed for</dt><dd>{ws.commitments.filter((x) => x.dependsOn.includes(c.id)).map((x) => x.title).join(", ")}</dd></>) : null}
          {c.date && (<><dt className="text-mute">Due</dt><dd>{whenLabel(c, true)}</dd></>)}
        </dl>
      )}

      {!compact && c.context && c.status !== "assigned" && isOpen(c) && !recurring && <p className="mt-2 text-sm text-soft">{c.context}</p>}

      {c.status === "changes_requested" && c.feedback && (
        <div className="mt-3 rounded-xl bg-warn-soft px-3.5 py-2.5">
          <p className="text-xs font-semibold text-warn">Manager feedback</p>
          <p className="text-[15px]">{c.feedback}</p>
        </div>
      )}
      {c.status === "submitted" && iAmAssignee && (
        <p className="mt-3 text-sm text-soft">
          Your portion is complete. Next owner: <span className="font-medium text-text">{PEOPLE[c.reviewer!].name}</span>
        </p>
      )}
      {needsVerification(c) && (
        <p className="mt-3 text-sm text-soft">Completed by {PEOPLE[c.assignee].first}. Waiting for {iAmAssignee ? "manager" : "your"} verification.</p>
      )}
      {c.status === "verified" && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-ok">
          <CheckIcon className="h-4 w-4" />
          {c.verifiedBy === "evidence" ? `Verified by attached evidence, ${atLabel(c.verifiedAt!)}` : `Approved by ${PEOPLE[c.verifiedBy as keyof typeof PEOPLE]?.name}, ${atLabel(c.verifiedAt!)}`}
        </p>
      )}
      {c.status === "completed" && !needsVerification(c) && <p className="mt-2 text-sm text-mute">Completed by {PEOPLE[c.assignee].first}. No independent evidence, so not verified.</p>}

      {isOpen(c) && (!recurring || (o?.today && !o.doneToday)) && (
        <div className="mt-3">
          <NextAction c={c} viewer={me} />
        </div>
      )}

      {!compact && isOpen(c) && (lastCp || crumb) && (
        <div className="mt-3 space-y-1.5 text-sm">
          {lastCp && (
            <p className="flex gap-2 text-soft"><FlagIcon className="mt-0.5 h-4 w-4 shrink-0 text-mute" /><span><span className="text-mute">Latest checkpoint: </span>{lastCp.text}</span></p>
          )}
          {crumb && (
            <p className="flex gap-2 text-soft"><CrumbIcon className="mt-0.5 h-4 w-4 shrink-0 text-mute" /><span><span className="text-mute">Latest breadcrumb: </span>“{crumb.text.replace(/\n+/g, " ")}”</span></p>
          )}
        </div>
      )}

      {ai && <AiCrumb c={c} b={ai} />}
      {sug && <SuggestionPanel c={c} b={sug} />}

      <Actions c={c} setContext={setContext} context={context} dep={dep ?? null} />
      {!compact && <WhyOpen c={c} ws={ws} />}
    </article>
  );
}

function Actions({ c, context, setContext, dep }: { c: Commitment; context: boolean; setContext: (v: boolean) => void; dep: Commitment | null }) {
  const { me } = useStore();
  const ui = useUI();
  const iAmAssignee = c.assignee === me;
  const recurring = isRecurring(c.recurrence);
  const o = recurring ? occ(c) : null;
  const a: React.ReactNode[] = [];

  if (iAmAssignee) {
    if (c.status === "assigned") {
      a.push(<button key="acc" onClick={() => ui.accept(c.id)} className={btn.primary}>Accept</button>);
      a.push(<button key="ctx" onClick={() => setContext(!context)} className={btn.secondary} aria-expanded={context}>{context ? "Hide context" : "View context"}</button>);
    } else if (recurring) {
      if (o?.today && !o.doneToday) a.push(<button key="occ" onClick={() => ui.completeOccurrence(c.id)} className={btn.primary}>Mark {c.recurrence.unit === "weeks" || c.recurrence.freq === "weekly" ? "this week's" : "today's"} done</button>);
    } else if (c.status === "accepted") {
      a.push(<button key="start" onClick={() => ui.start(c.id, !!c.workspace)} className={btn.primary}>{c.workspace ? "Start work" : "Start"}</button>);
    } else if (c.status === "in_progress" || c.status === "ready" || c.status === "changes_requested") {
      if (c.workspace) a.push(<Link key="open" href={workspaceHref(c)} className={btn.primary}>{c.status === "ready" ? "Resume exactly where I stopped" : "Open workspace"}</Link>);
      else if (c.reviewer) a.push(<button key="sub" onClick={() => ui.open({ kind: "submit", id: c.id })} className={btn.primary}>Send for review</button>);
      else a.push(<button key="done" onClick={() => ui.markComplete(c.id)} className={btn.primary}>Mark complete</button>);
      if (!c.workspace) a.push(<button key="cp" onClick={() => ui.open({ kind: "checkpoint", id: c.id, suggestion: "" })} className={btn.secondary}>Save checkpoint</button>);
      a.push(<button key="crumb" onClick={() => ui.open({ kind: "breadcrumb", id: c.id })} className={btn.quiet}><CrumbIcon className="h-4 w-4" /> Leave a breadcrumb</button>);
      a.push(<button key="blk" onClick={() => ui.open({ kind: "blocker", id: c.id })} className={btn.quiet}><BlockIcon className="h-4 w-4" /> I'm blocked</button>);
    }
  }
  if (c.status === "submitted" && c.reviewer === me) a.push(<button key="rev" onClick={() => ui.open({ kind: "review", id: c.id })} className={btn.primary}>Review</button>);
  if (needsVerification(c) && c.assignedBy === me) a.push(<button key="ver" onClick={() => ui.verify(c.id)} className={btn.primary}>Verify</button>);

  // Demo dependency events: the other person delivers. Clearly labeled as simulated.
  const deliverable = c.status === "blocked" && dep && dep.status !== "verified" ? dep : c.source === "requested" && c.assignee !== me && isOpen(c) ? c : null;
  if (deliverable)
    a.push(
      <button key="demo" onClick={() => ui.resolve(deliverable.id)} className={btn.demo} title="Simulates the other person delivering">
        Demo event: {PEOPLE[deliverable.assignee].first} delivers
      </button>,
    );

  if (c.createdBy === me && c.source !== "assigned" && isOpen(c) && !c.workspace && c.status !== "blocked") {
    a.push(
      <span key="own" className="ml-auto flex">
        <button onClick={() => ui.open({ kind: "capture", editId: c.id })} className={btn.quiet}>Edit</button>
        <button onClick={() => ui.remove(c.id)} className={btn.quiet}>Delete</button>
      </span>,
    );
  }
  if (!a.length) return null;
  return <footer className="mt-4 flex flex-wrap items-center gap-2">{a}</footer>;
}
