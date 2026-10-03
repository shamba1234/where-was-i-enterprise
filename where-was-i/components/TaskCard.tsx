"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DemoState, TaskId, isDone, useDemo } from "@/lib/state";
import { BrowserIcon, CheckIcon, CourseIcon, MailIcon, PromiseIcon } from "./Icons";

type Spec = {
  id: TaskId;
  title: string;
  source: string;
  sourceApp: string; // what we "check"
  Icon: (p: { className?: string }) => React.ReactElement;
  summary: string;
  meta: string;
  openLabel: string;
  openHref?: string;
  pendingPill: string;
  donePill: string;
  detail: string;
  evidence: (s: DemoState) => string;
  failCheck: string;
};

export const TASKS: Spec[] = [
  {
    id: "homework",
    title: "MATH 257 Homework",
    source: "Canvas",
    sourceApp: "Demo Canvas",
    Icon: CourseIcon,
    summary: "No submission found",
    meta: "Due tonight 11:59 PM",
    openLabel: "Open Canvas",
    openHref: "/canvas",
    pendingPill: "Needs attention",
    donePill: "Verified ✓",
    detail: "MATH 257 Homework 6 still needs attention.",
    evidence: (s) => `Canvas shows Homework 6 submitted at ${s.canvas.submittedAt}.`,
    failCheck: "Demo Canvas still shows no submission for Homework 6. This clears on its own once Canvas has one.",
  },
  {
    id: "maya",
    title: "Reply to Maya",
    source: "Gmail",
    sourceApp: "Demo Gmail",
    Icon: MailIcon,
    summary: "Maya is waiting for the presentation slides",
    meta: "Asked at 6:12 PM",
    openLabel: "Open Gmail",
    openHref: "/gmail?thread=maya",
    pendingPill: "Waiting on you",
    donePill: "Completed",
    detail: "Maya asked for the slides and no reply was found.",
    evidence: (s) => `Your reply is in Sent, ${s.gmail.repliedAt}.`,
    failCheck: "No reply to Maya in Demo Gmail's Sent folder. This clears on its own once you reply.",
  },
  {
    id: "caterpillar",
    title: "Caterpillar Application",
    source: "Browser",
    sourceApp: "Demo Browser",
    Icon: BrowserIcon,
    summary: "Application started but not submitted",
    meta: "Last open yesterday, 9:02 PM",
    openLabel: "Continue application",
    openHref: "/browser?resume=1",
    pendingPill: "Unfinished",
    donePill: "Verified ✓",
    detail: "You stopped on the application questions, step 3 of 4.",
    evidence: (s) => `Submission confirmation found at ${s.caterpillar.submittedAt}.`,
    failCheck: "Demo Browser has no submission confirmation for this application yet.",
  },
  {
    id: "presentation",
    title: "Team Presentation",
    source: "Manual",
    sourceApp: "your evidence",
    Icon: PromiseIcon,
    summary: "Slides 4–6 promised for tomorrow",
    meta: "Before tomorrow morning",
    openLabel: "Mark finished",
    pendingPill: "Pending",
    donePill: "Verified ✓",
    detail: "You said you'd finish these before tomorrow morning.",
    evidence: (s) => `Slides 4–6 found in ${s.presentation.evidenceFile}.`,
    failCheck: "",
  },
];

type Phase = "idle" | "checking" | "detected";

export default function TaskCard({ spec, onProof }: { spec: Spec; onProof: () => void }) {
  const { state, hydrated, update } = useDemo();
  const done = isDone(state, spec.id);
  const seen = state.seen[spec.id];
  const [phase, setPhase] = useState<Phase>("idle");
  const [manualCheck, setManualCheck] = useState<"idle" | "checking" | "failed">("idle");

  // The moment the shared state shows new evidence, announce it once.
  useEffect(() => {
    if (!hydrated || !done || seen) return;
    setPhase("checking");
    const t1 = setTimeout(() => setPhase("detected"), 1400);
    const t2 = setTimeout(() => {
      update((s) => ({ ...s, seen: { ...s.seen, [spec.id]: true } }));
    }, 1450);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [hydrated, done, seen, spec.id, update]);

  useEffect(() => {
    if (!done) {
      setPhase("idle");
    }
  }, [done]);

  // "I did it" never clears a connected task by itself; it only re-checks the source.
  const tryClaim = () => {
    setManualCheck("checking");
    setTimeout(() => setManualCheck("failed"), 1200);
  };

  const checking = phase === "checking" && !seen;
  const showDone = done && !checking;
  const { Icon } = spec;

  return (
    <article
      className={[
        "relative flex flex-col overflow-hidden rounded-2xl border bg-card p-5 transition-colors",
        showDone ? "border-sage/40" : "border-line",
        phase === "detected" ? "settle" : "",
      ].join(" ")}
    >
      {checking && (
        <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-sage-soft">
          <div className="scanbar h-full w-1/3 bg-sage" />
        </div>
      )}

      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={[
              "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
              showDone ? "bg-sage-soft text-sage" : "bg-paper text-dusk",
            ].join(" ")}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h3 className={["font-display text-lg font-semibold leading-tight", showDone ? "text-ink-soft" : ""].join(" ")}>
              {spec.title}
            </h3>
            <p className="text-sm text-mute">{spec.source}</p>
          </div>
        </div>
        <StatusPill done={showDone} checking={checking} label={showDone ? spec.donePill : spec.pendingPill} />
      </header>

      <div className="mt-4 flex-1" aria-live="polite">
        {checking ? (
          <p className="text-sm text-ink-soft">Checking {spec.sourceApp} for new activity…</p>
        ) : showDone ? (
          <>
            <p className="flex items-start gap-2 text-[15px] font-medium text-sage">
              <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" />
              {spec.evidence(state)}
            </p>
            <p className="mt-1 text-sm text-mute">Confirmed from {spec.sourceApp}, not from a checkbox.</p>
          </>
        ) : (
          <>
            <p className="text-[15px] font-medium">{spec.summary}</p>
            <p className="mt-1 text-sm text-mute">{spec.meta}</p>
            <p className="mt-3 text-sm text-ink-soft">{spec.detail}</p>
          </>
        )}
      </div>

      {!done && (
        <footer className="mt-5 flex flex-wrap items-center gap-2">
          {spec.openHref ? (
            <Link
              href={spec.openHref}
              className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-dusk"
            >
              {spec.openLabel}
            </Link>
          ) : (
            <button
              onClick={onProof}
              className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-dusk"
            >
              {spec.openLabel}
            </button>
          )}
          {spec.openHref && (
            <button
              onClick={tryClaim}
              disabled={manualCheck === "checking"}
              className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink-soft hover:border-ink-soft disabled:opacity-60"
            >
              {manualCheck === "checking" ? `Checking ${spec.sourceApp}…` : "I already did it"}
            </button>
          )}
        </footer>
      )}

      {!done && manualCheck === "failed" && (
        <p className="rise mt-3 rounded-xl bg-lamp-soft px-3 py-2 text-sm text-ink" role="status">
          {spec.failCheck}
        </p>
      )}
    </article>
  );
}

function StatusPill({ done, checking, label }: { done: boolean; checking: boolean; label: string }) {
  if (checking)
    return <span className="shrink-0 rounded-full bg-paper px-2.5 py-1 text-xs font-semibold text-mute">Syncing</span>;
  return (
    <span
      className={[
        "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
        done ? "bg-sage text-white" : "bg-lamp-soft text-[#8a5410]",
      ].join(" ")}
    >
      {label}
    </span>
  );
}
