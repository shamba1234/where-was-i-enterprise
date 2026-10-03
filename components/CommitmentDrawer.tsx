"use client";

import { useEffect } from "react";
import { atLabel, whenLabel } from "@/lib/clock";
import { chain, eventLabel, isOpen, originLabel, ownerLabel, statusView, visibleCrumbs, whyOpen } from "@/lib/derive";
import { PEOPLE } from "@/lib/model";
import { isRecurring } from "@/lib/recurrence";
import { useStore } from "@/lib/store";
import { CloseIcon, CrumbIcon, FlagIcon, SparkIcon } from "./Icons";
import { Avatar, NextAction, Pill } from "./ui";

export default function CommitmentDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { ws, me } = useStore();
  const c = ws.commitments.find((x) => x.id === id);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (!c) return null;
  const v = statusView(c, ws);
  const owner = ownerLabel(c, me);
  const steps = chain(c, ws);
  const crumbs = visibleCrumbs(c, me);
  const hiddenCrumbs = c.breadcrumbs.filter((b) => !b.dismissed).length - crumbs.length;
  const events = ws.events.filter((e) => e.commitmentId === c.id).sort((a, b) => b.at - a.at);
  const deps = ws.commitments.filter((x) => c.dependsOn.includes(x.id));
  const neededBy = ws.commitments.filter((x) => x.dependsOn.includes(c.id));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onMouseDown={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <aside className="rise h-full w-full max-w-xl overflow-y-auto border-l border-line bg-surface p-6 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {c.project && <p className="text-sm text-mute">{c.project}</p>}
            <h2 id="drawer-title" className="font-display text-2xl font-semibold leading-tight tracking-tight">{c.title}</h2>
            <p className="mt-1 text-sm text-mute">{originLabel(c)}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-mute hover:bg-raised hover:text-text" aria-label="Close"><CloseIcon className="h-5 w-5" /></button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Pill tone={v.tone}>{v.label}</Pill>
          {owner && isOpen(c) && !v.label.startsWith("Waiting") && <Pill tone="neutral">{owner}</Pill>}
          <span className="flex items-center gap-1.5 text-sm text-soft"><Avatar p={c.assignee} size={20} /> {PEOPLE[c.assignee].name}</span>
        </div>
        {c.date && <p className="mt-2 text-sm text-soft">{isRecurring(c.recurrence) ? "Repeats, starting" : c.timeKind === "before" ? "Due" : "When"} {whenLabel(c, true)}</p>}
        {c.context && <p className="mt-3 text-[15px] text-soft">{c.context}</p>}

        <div className="mt-4"><NextAction c={c} viewer={me} /></div>
        {c.status === "changes_requested" && c.feedback && (
          <div className="mt-3 rounded-xl bg-warn-soft px-3.5 py-2.5">
            <p className="text-xs font-semibold text-warn">Manager feedback</p>
            <p className="text-[15px]">{c.feedback}</p>
          </div>
        )}

        <section className="mt-6">
          <h3 className="text-sm font-semibold text-mute">{isOpen(c) ? "Why is this open?" : "Why was this open?"}</h3>
          <p className="mt-1.5 leading-relaxed text-soft">{whyOpen(c, ws).join(" ")}</p>
        </section>

        {steps.length > 0 && (
          <section className="mt-6">
            <h3 className="text-sm font-semibold text-mute">Lifecycle</h3>
            <ol className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-2 text-xs font-semibold" aria-label="Lifecycle">
              {steps.map((s, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span title={atLabel(s.at)} className={`rounded-full px-2 py-0.5 ${s.kind === "verified" ? "bg-ok-soft text-ok" : s.kind === "blocked" ? "bg-blocked-soft text-blocked" : s.kind === "changes_requested" ? "bg-warn-soft text-warn" : "bg-raised text-soft"}`}>{s.label}</span>
                  {i < steps.length - 1 && <span className="text-mute" aria-hidden>→</span>}
                </li>
              ))}
            </ol>
          </section>
        )}

        {(deps.length > 0 || neededBy.length > 0) && (
          <section className="mt-6 text-sm">
            <h3 className="font-semibold text-mute">Dependencies</h3>
            {deps.map((d) => (
              <p key={d.id} className="mt-1 text-soft">Waits on <span className="font-medium text-text">{PEOPLE[d.assignee].first}: {d.title}</span> ({statusView(d, ws).label})</p>
            ))}
            {neededBy.map((d) => (
              <p key={d.id} className="mt-1 text-soft">Needed for <span className="font-medium text-text">{PEOPLE[d.assignee].first}: {d.title}</span></p>
            ))}
          </section>
        )}

        {c.checkpoints.length > 0 && (
          <section className="mt-6">
            <h3 className="text-sm font-semibold text-mute">Checkpoints</h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              {[...c.checkpoints].reverse().map((cp) => (
                <li key={cp.id} className="flex gap-2"><FlagIcon className="mt-0.5 h-4 w-4 shrink-0 text-mute" /><span><span className="font-medium">{cp.text}</span> <span className="text-mute">{cp.location ? `at ${cp.location}, ` : ""}{atLabel(cp.at)}</span></span></li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-6">
          <h3 className="text-sm font-semibold text-mute">Breadcrumbs</h3>
          {crumbs.length === 0 ? (
            <p className="mt-1.5 text-sm text-mute">{hiddenCrumbs > 0 ? `${PEOPLE[c.assignee].first} kept ${hiddenCrumbs === 1 ? "a breadcrumb" : "breadcrumbs"} private on this commitment.` : "None yet."}</p>
          ) : (
            <ul className="mt-2 space-y-3">
              {crumbs.map((b) => (
                <li key={b.id} className={`rounded-xl border p-3 ${b.type === "ai" ? "border-dashed border-line-strong" : "border-line bg-raised/40"}`}>
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-mute">
                    {b.type === "user" ? <CrumbIcon className="h-3.5 w-3.5" /> : <SparkIcon className="h-3.5 w-3.5" />}
                    {b.type === "user" ? `Written by ${b.author === me ? "you" : PEOPLE[b.author].first}` : b.confirmed ? `AI reconstruction, confirmed by ${PEOPLE[b.author].first} ✓` : "AI reconstruction, suggested from work context"}
                    <span className="font-normal">({atLabel(b.at)}{b.voice ? ", simulated voice" : ""}{b.author === me && !b.shared && b.type === "user" ? ", private" : ""})</span>
                  </p>
                  <p className="mt-1 whitespace-pre-line text-[15px]">{b.type === "user" ? `“${b.text}”` : b.text}</p>
                  {b.location && <p className="mt-1 text-xs text-mute">At {b.location}</p>}
                </li>
              ))}
            </ul>
          )}
          {hiddenCrumbs > 0 && crumbs.length > 0 && <p className="mt-2 text-xs text-mute">{hiddenCrumbs} private breadcrumb{hiddenCrumbs === 1 ? "" : "s"} not shown.</p>}
        </section>

        {c.reviews.length > 0 && (
          <section className="mt-6 text-sm">
            <h3 className="font-semibold text-mute">Reviews</h3>
            {c.reviews.map((r) => (
              <p key={r.round} className="mt-1 text-soft">
                Round {r.round}: submitted {atLabel(r.submittedAt)}
                {r.decision === "approved" ? `, approved ${atLabel(r.decidedAt!)}` : r.decision === "changes" ? `, changes requested: “${r.feedback}”` : `, waiting on ${PEOPLE[r.reviewer].first}`}
              </p>
            ))}
          </section>
        )}

        {c.evidence.length > 0 && (
          <section className="mt-6 text-sm">
            <h3 className="font-semibold text-mute">Evidence</h3>
            {c.evidence.map((e) => (
              <p key={e.id} className="mt-1 text-soft">{e.name} <span className="text-mute">({PEOPLE[e.by].first}, {atLabel(e.at)}{e.simulated ? ", demo" : ""})</span></p>
            ))}
          </section>
        )}

        <section className="mt-6">
          <h3 className="text-sm font-semibold text-mute">Commitment timeline</h3>
          <ol className="mt-2 space-y-2 border-l border-line pl-4">
            {events.map((e) => (
              <li key={e.id} className="relative text-sm">
                <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-line-strong" />
                <span className="text-mute">{atLabel(e.at)}</span> <span className="font-medium">{eventLabel[e.kind]}</span>
                <span className="block text-soft">{e.private && e.actor !== me ? "Breadcrumb saved (private)" : e.text}</span>
                {e.quote && !(e.private && e.actor !== me) && <span className="block text-mute">“{e.quote}”</span>}
              </li>
            ))}
          </ol>
        </section>
      </aside>
    </div>
  );
}
