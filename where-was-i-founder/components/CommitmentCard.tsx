"use client";

import Link from "next/link";
import { useEffect } from "react";
import { dayDiff, nowLabel, timeLabel, todayKey, whenLabel } from "@/lib/clock";
import { SOURCE_FOR, occurrence, statusOf } from "@/lib/derive";
import { isRecurring, nextLabel, recurrenceLabel } from "@/lib/recurrence";
import {
  Commitment,
  closeCommitment,
  closeOccurrence,
  deleteCommitment,
  setPrepDone,
  toggleCheck,
  useFounder,
} from "@/lib/state";
import { BrowserIcon, CalendarIcon, ChainIcon, CheckIcon, MailIcon, MoonIcon, RepeatIcon, RunIcon, ToldIcon } from "./Icons";
import { NextAction, StatusPill, WhyOpen, btnPrimary, btnQuiet, btnSecondary } from "./ui";
import { useVerify } from "./useVerify";

const SUCCESS: Record<string, string> = {
  deck: "Investor deck sent",
  sarah: "Sarah approved the landing page",
};

export function SourceIcon({ c, className = "h-5 w-5" }: { c: Commitment; className?: string }) {
  if (c.kind === "run") return <RunIcon className={className} />;
  if (c.kind === "routine") return <MoonIcon className={className} />;
  if (c.source === "Demo Gmail") return <MailIcon className={className} />;
  if (c.source === "Demo Browser") return <BrowserIcon className={className} />;
  if (c.source === "Demo Calendar") return <CalendarIcon className={className} />;
  if (c.source === "Meeting outcome") return <ChainIcon className={className} />;
  return <ToldIcon className={className} />;
}

export default function CommitmentCard({
  c,
  onEdit,
  onOutcome,
  onProof,
  onLinger,
  justAdded,
}: {
  c: Commitment;
  onEdit?: () => void;
  onOutcome?: () => void;
  onProof?: (date: string) => void;
  onLinger?: (id: string) => void;
  justAdded?: boolean;
}) {
  const { state, update } = useFounder();
  const status = statusOf(c, state);
  const recurring = isRecurring(c.recurrence);
  const occ = recurring ? occurrence(c) : null;
  const v = useVerify(c, () => onLinger?.(c.id));
  const youOwn = c.owner === "you";
  const closed = Boolean(c.closed) || Boolean(occ?.todayClosure);
  const parent = c.derivedFrom ? state.commitments.find((x) => x.id === c.derivedFrom) : null;
  const sourceName = SOURCE_FOR[c.verifier] || c.source;

  // Sources that report back on their own (a reply from Sarah) are checked automatically.
  useEffect(() => {
    if (c.kind === "sarah" && status.key === "needs_verification" && v.phase === "idle") {
      onLinger?.(c.id);
      v.run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.key]);

  const closeWithoutProof = () => {
    onLinger?.(c.id);
    update((s) => closeCommitment(s, c.id, { kind: "completed_by_you", at: nowLabel(), evidence: `You confirmed it. ${sourceName || "No source"} showed no matching evidence.` }));
  };
  const doneByYou = () => {
    onLinger?.(c.id);
    if (recurring) update((s) => closeOccurrence(s, c.id, todayKey(), { kind: "completed_by_you", at: nowLabel(), evidence: "You marked today's occurrence done" }));
    else update((s) => closeCommitment(s, c.id, { kind: "completed_by_you", at: nowLabel(), evidence: "You marked it done. No connected source to check." }));
  };

  const sub = recurring
    ? `${recurrenceLabel(c.recurrence, c.date, c.time)}${c.time ? `, ${timeLabel(c)}` : ""}`
    : c.kind === "deck" || c.kind === "sarah"
      ? `${c.source}, ${c.detected.replace(/^Yesterday/, "yesterday")}`
      : c.source;

  const checking = v.phase === "checking";
  const checksToday = c.checks[todayKey()] ?? [];
  const allChecked = c.checklist.length > 0 && c.checklist.every((i) => checksToday.includes(i));

  return (
    <article
      id={`loop-${c.id}`}
      className={[
        "relative flex flex-col overflow-hidden rounded-2xl border bg-surface p-5",
        closed || v.phase === "verified" ? "border-sage/40" : c.owner !== "you" ? "border-line" : status.key === "waiting_you" || status.key === "due_today" ? "border-line-strong" : "border-line",
        v.phase === "verified" || (occ?.todayClosure && justAdded) ? "settle" : "",
        justAdded ? "rise ring-2 ring-accent/40" : "",
      ].join(" ")}
    >
      {checking && (
        <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-accent-deep">
          <div className="scanbar h-full w-1/3 bg-accent" />
        </div>
      )}

      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={[
              "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
              closed ? "bg-sage-soft text-sage-text" : c.origin === "manual" ? "border border-dashed border-line-strong text-soft" : "bg-raised text-accent",
            ].join(" ")}
          >
            <SourceIcon c={c} />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold leading-tight">{c.title}</h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-mute">
              {recurring && <RepeatIcon className="h-3.5 w-3.5" />}
              {sub}
            </p>
          </div>
        </div>
        <StatusPill status={checking ? { key: "needs_verification", label: "Checking…" } : status} />
      </header>

      {c.context && !(c.kind === "routine") && <p className="mt-3 text-[15px] text-soft">{c.context}</p>}
      {parent && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-mute">
          <ChainIcon className="h-3.5 w-3.5" /> From: {parent.title}
        </p>
      )}
      {!recurring && c.date && !closed && (
        <p className="mt-2 text-sm text-mute">
          {c.kind === "meeting" ? "When" : c.timeKind === "before" ? "Due" : "When"}:{" "}
          <span className={c.timeKind === "before" && dayDiff(c.date) <= 1 ? "font-medium text-lamp-text" : "text-soft"}>{whenLabel(c, true)}</span>
        </p>
      )}

      {/* Recurring: today's occurrence closed → show it, and the next one. */}
      {occ?.todayClosure ? (
        <div className="mt-4 rounded-xl bg-sage-soft/50 p-4">
          <p className="flex items-center gap-2 font-semibold text-sage-text">
            <CheckIcon className="h-4 w-4" /> Completed today {occ.todayClosure.kind === "verified" ? "✓" : ""}
          </p>
          <div className="mt-2 flex items-center gap-3">
            {occ.todayClosure.proof?.thumb && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={occ.todayClosure.proof.thumb} alt="" className="h-12 w-12 rounded-lg border border-line object-cover" />
            )}
            <div className="text-sm">
              <p className="text-text">{occ.todayClosure.evidence}</p>
              <p className="text-mute">
                {occ.todayClosure.kind === "verified" ? "Verified" : "Completed by you"} at {occ.todayClosure.at}
              </p>
            </div>
          </div>
          {occ.next && (
            <p className="mt-3 border-t border-sage/20 pt-3 text-sm text-soft">
              Next: <span className="font-medium text-text">{nextLabel(occ.next, c.time, c.timeKind === "approx" ? c.approxLabel : null)}</span>
            </p>
          )}
          {occ.todayClosure.proof && <p className="mt-2 text-xs text-mute">Evidence analysis is simulated in this prototype.</p>}
        </div>
      ) : recurring && !occ?.today ? (
        <p className="mt-3 text-sm text-soft">
          Next: <span className="font-medium text-text">{occ?.next ? nextLabel(occ.next, c.time, c.timeKind === "approx" ? c.approxLabel : null) : "—"}</span>
        </p>
      ) : null}

      {/* Next action */}
      {!closed && v.phase !== "verified" && (recurring ? occ?.today : true) && (
        <div className="mt-4">
          {status.key === "needs_verification" && c.kind === "deck" ? (
            <NextAction owner="you" text="New email to Alex detected in Demo Gmail. Verify it to close this loop." />
          ) : (
            <NextAction owner={c.owner} text={c.kind === "meeting" && c.prepDone ? "Meet Alex tomorrow at 2:30 PM, then add the outcome." : c.nextAction} />
          )}
        </div>
      )}

      {/* Checklist (evening routine) */}
      {c.checklist.length > 0 && occ?.today && !occ.todayClosure && (
        <div className="mt-4">
          <p className="mb-2 text-sm text-mute">
            Tonight's checklist, {checksToday.length} of {c.checklist.length}
            <span className="ml-1 text-xs">(fictional demo items)</span>
          </p>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {c.checklist.map((item) => {
              const on = checksToday.includes(item);
              return (
                <li key={item}>
                  <label className={["flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm", on ? "border-sage/40 bg-sage-soft/40 text-text" : "border-line hover:border-line-strong"].join(" ")}>
                    <input type="checkbox" checked={on} onChange={() => update((s) => toggleCheck(s, c.id, todayKey(), item))} className="h-4 w-4 accent-[#4fae83]" />
                    {item}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Verification feedback */}
      <div aria-live="polite">
        {checking && <p className="mt-4 text-sm text-soft">Checking {sourceName}…</p>}
        {v.phase === "failed" && (
          <div className="rise mt-4 rounded-xl border border-lamp/30 bg-lamp-soft/60 p-4 text-sm">
            <p className="font-semibold text-lamp-text">Could not verify</p>
            <p className="mt-1 text-soft">{v.reason}</p>
            {c.kind !== "sarah" && (
              <div className="mt-3 flex flex-wrap gap-2">
                {c.verifier.startsWith("gmail") && (
                  <Link href={c.kind === "deck" ? "/gmail?thread=alex&reply=1" : "/gmail?thread=alex&reply=1&draft=model"} className={btnSecondary}>
                    Open Demo Gmail
                  </Link>
                )}
                <button onClick={closeWithoutProof} className={btnSecondary}>
                  Close without proof
                </button>
              </div>
            )}
          </div>
        )}
        {v.phase === "verified" && (
          <div className="rise mt-4 rounded-xl bg-sage-soft/60 p-4">
            <p className="font-display text-xl font-bold text-sage-text">Verified ✓</p>
            <p className="font-medium text-text">{SUCCESS[c.kind] ?? c.title.replace(/^Send (\w+) (.+)$/, (_m, who: string, what: string) => `${what[0].toUpperCase()}${what.slice(1)} sent to ${who}`)}</p>
            <p className="text-sm text-soft">Evidence found in {sourceName}</p>
          </div>
        )}
      </div>

      {c.closed && v.phase !== "verified" && (
        <div className={["rise mt-4 rounded-xl p-4", c.closed.kind === "verified" ? "bg-sage-soft/60" : "border border-line-strong"].join(" ")}>
          <p className={["font-semibold", c.closed.kind === "verified" ? "text-sage-text" : "text-text"].join(" ")}>
            {c.closed.kind === "verified" ? "Verified ✓" : "Completed by you"}
          </p>
          <p className="text-sm text-soft">{c.closed.evidence}</p>
        </div>
      )}

      {/* Actions */}
      {!closed && v.phase !== "verified" && (
        <footer className="mt-5 flex flex-wrap items-center gap-2">
          {c.kind === "deck" &&
            (status.key === "needs_verification" ? (
              <>
                <button onClick={v.run} disabled={checking} className={btnPrimary}>Verify now</button>
                <Link href="/gmail?thread=alex" className={btnSecondary}>Open Demo Gmail</Link>
              </>
            ) : (
              <>
                <Link href="/gmail?thread=alex&reply=1" className={btnPrimary}>Continue</Link>
                <button onClick={v.run} disabled={checking} className={btnSecondary}>I already did this</button>
              </>
            ))}
          {c.kind === "sarah" && (
            <>
              <button onClick={v.run} disabled={checking} className={btnSecondary}>Check for a reply</button>
              <Link href="/gmail?thread=sarah" className={btnQuiet}>View thread</Link>
            </>
          )}
          {c.kind === "meeting" && (
            <>
              <button onClick={onOutcome} className={btnPrimary}>Add meeting outcome</button>
              <button onClick={() => update((s) => setPrepDone(s, c.id, !c.prepDone))} className={btnSecondary}>
                {c.prepDone ? "Prep done ✓" : "Mark prep done"}
              </button>
            </>
          )}
          {c.verifier === "proof" && occ?.today && (
            <>
              {c.kind === "routine" ? (
                <>
                  <button onClick={() => onProof?.(todayKey())} disabled={!allChecked} className={btnPrimary}>Add photo proof</button>
                  <button onClick={doneByYou} disabled={!allChecked} className={btnSecondary}>Done, no photo</button>
                </>
              ) : (
                <>
                  <button onClick={() => onProof?.(todayKey())} className={btnPrimary}>Upload proof</button>
                  <button onClick={doneByYou} className={btnSecondary} title="Closes today's run without evidence">I did it, no proof</button>
                </>
              )}
            </>
          )}
          {(c.kind === "manual" || c.kind === "outcome") && youOwn && (recurring ? occ?.today : true) && (
            <>
              {c.verifier === "gmail_outcome" ? (
                <>
                  <Link href="/gmail?thread=alex&reply=1&draft=model" className={btnPrimary}>Continue</Link>
                  <button onClick={v.run} disabled={checking} className={btnSecondary}>I already did this</button>
                </>
              ) : (
                <button onClick={doneByYou} className={btnPrimary}>{recurring ? "Mark today's done" : "Mark done"}</button>
              )}
            </>
          )}
          {(c.kind === "manual" || c.kind === "outcome") && !youOwn && (
            <button onClick={doneByYou} className={btnSecondary}>They did it</button>
          )}
          {(c.kind === "manual" || c.kind === "outcome") && (
            <span className="ml-auto flex">
              <button onClick={onEdit} className={btnQuiet}>Edit</button>
              <button onClick={() => update((s) => deleteCommitment(s, c.id))} className={btnQuiet}>Delete</button>
            </span>
          )}
        </footer>
      )}

      {c.kind === "routine" && !closed && occ?.today && !allChecked && (
        <p className="mt-2 text-xs text-mute">Check all five to finish. A photo makes it verified; without one it's completed by you.</p>
      )}
      {c.kind === "sarah" && !closed && v.phase === "idle" && (
        <p className="mt-3 text-xs text-mute">If nothing arrives by Thursday, I'll move this to Needs you so you can nudge her.</p>
      )}

      <WhyOpen c={c} s={state} label={closed ? "Why was this open?" : "Why is this open?"} />
    </article>
  );
}
