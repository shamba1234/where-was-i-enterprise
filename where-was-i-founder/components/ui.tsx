"use client";

import { useState } from "react";
import { LIFECYCLE, Status, lifecycleStage } from "@/lib/derive";
import { Commitment, FounderState } from "@/lib/state";
import { ArrowRight, CheckIcon, ChevronDown, PauseIcon } from "./Icons";

const PILL: Record<Status["key"], string> = {
  waiting_you: "bg-lamp-soft text-lamp-text",
  due_today: "bg-lamp-soft text-lamp-text",
  interrupted: "bg-accent-deep text-accent",
  waiting_other: "bg-sky-soft text-sky",
  scheduled: "bg-raised text-soft",
  needs_verification: "border border-accent/50 text-accent",
  verified: "bg-sage-soft text-sage-text",
  completed_by_you: "border border-line-strong text-soft",
};

export function StatusPill({ status }: { status: Status }) {
  return (
    <span className={["inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", PILL[status.key]].join(" ")}>
      {status.label}
      {status.key === "verified" && <CheckIcon className="h-3.5 w-3.5" />}
    </span>
  );
}

/** The single most useful step forward, or an explicit "not your move". */
export function NextAction({ text, owner }: { text: string; owner: string }) {
  if (owner !== "you") {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-sky-soft/60 px-3.5 py-2.5">
        <PauseIcon className="mt-0.5 h-4 w-4 shrink-0 text-sky" />
        <div>
          <p className="text-sm font-semibold text-sky">No action needed from you right now.</p>
          <p className="text-sm text-soft">{text}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 border-l-2 border-accent pl-3.5">
      <div>
        <p className="flex items-center gap-1.5 text-xs font-semibold text-accent">
          Next action <ArrowRight className="h-3 w-3" />
        </p>
        <p className="mt-0.5 text-[15px] font-medium text-text">{text}</p>
      </div>
    </div>
  );
}

/** First-class explainability: why the loop exists, what supports it, what would close it. */
export function WhyOpen({ c, s, label = "Why is this open?" }: { c: Commitment; s: FounderState; label?: string }) {
  const [open, setOpen] = useState(false);
  const stage = lifecycleStage(c, s);
  return (
    <div className="mt-4 border-t border-line pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-mute hover:text-text"
      >
        {label}
        <ChevronDown className={["h-4 w-4 transition-transform motion-reduce:transition-none", open ? "rotate-180" : ""].join(" ")} />
      </button>
      {open && (
        <div className="rise mt-3 space-y-4 text-sm">
          <p className="text-[15px] leading-relaxed text-text">{c.why}</p>
          {c.evidence.length > 0 && (
            <div>
              <p className="mb-1.5 font-semibold text-soft">Evidence</p>
              <ul className="space-y-1.5">
                {c.evidence.map((e) => (
                  <li key={e.detail} className="flex gap-2">
                    <span className="shrink-0 rounded-md bg-raised px-1.5 py-0.5 text-xs text-mute">{e.label}</span>
                    <span className="text-soft">{e.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <p className="mb-1 font-semibold text-soft">Closes when</p>
            <p className="text-soft">{c.closesWhen}</p>
          </div>
          <ol className="flex flex-wrap items-center gap-1.5" aria-label="Lifecycle">
            {LIFECYCLE.map((name, i) => {
              const done = i < stage;
              const current = i === stage;
              return (
                <li key={name} className="flex items-center gap-1.5">
                  <span
                    className={[
                      "rounded-full px-2 py-0.5 text-xs",
                      done ? "bg-sage-soft text-sage-text" : current ? "bg-accent-deep font-semibold text-accent" : "bg-raised text-mute",
                    ].join(" ")}
                    aria-current={current ? "step" : undefined}
                  >
                    {done ? "✓ " : ""}
                    {name}
                    {current && c.owner !== "you" && i === 2 ? ` (${c.owner}'s move)` : ""}
                  </span>
                  {i < LIFECYCLE.length - 1 && <span className="text-line-strong">→</span>}
                </li>
              );
            })}
          </ol>
          <p className="text-xs text-mute">Detected {c.detected.toLowerCase().startsWith("recurring") ? "from your recurring rule" : c.detected} via {c.source}.</p>
        </div>
      )}
    </div>
  );
}

export function SectionHeader({ id, title, count, note, children }: { id: string; title: string; count?: number; note?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 id={id} className="flex items-baseline gap-2 font-display text-2xl font-semibold">
          {title}
          {count !== undefined && count > 0 && <span className="text-base font-normal tabular-nums text-mute">{count}</span>}
        </h2>
        {note && <p className="mt-0.5 text-sm text-mute">{note}</p>}
      </div>
      {children}
    </div>
  );
}

export const btnPrimary = "inline-flex items-center gap-2 rounded-full bg-text px-4 py-2 text-sm font-semibold text-bg hover:bg-white disabled:opacity-40";
export const btnSecondary = "inline-flex items-center gap-2 rounded-full border border-line-strong px-4 py-2 text-sm font-medium text-soft hover:border-soft hover:text-text disabled:opacity-50";
export const btnQuiet = "rounded-full px-2.5 py-1.5 text-sm font-medium text-mute hover:bg-raised hover:text-text";
