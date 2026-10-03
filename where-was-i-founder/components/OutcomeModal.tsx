"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { whenLabel } from "@/lib/clock";
import { parseOutcome } from "@/lib/parse";
import { Commitment, Draft } from "@/lib/state";
import { ArrowRight, ChainIcon, CloseIcon } from "./Icons";
import { btnPrimary, btnSecondary } from "./ui";

const EXAMPLE = "Alex wants the updated financial model by Friday at 5 PM.";

/** Commitment chains: what came out of a meeting becomes the next open loop. */
export default function OutcomeModal({
  meeting,
  onSave,
  onNoFollowUp,
  onClose,
}: {
  meeting: Commitment;
  onSave: (outcome: string, d: Draft) => void;
  onNoFollowUp: () => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const p = useMemo(() => parseOutcome(text), [text]);
  const ready = text.trim().length > 0 && p.title.length > 0;

  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = () => ready && onSave(text, { title: p.title, context: p.context, date: p.date, time: p.time, timeKind: p.timeKind, approxLabel: p.approxLabel, recurrence: p.recurrence, owner: p.owner, raw: text.trim() });

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 px-4 py-6 backdrop-blur-sm sm:py-14"
      role="dialog"
      aria-modal="true"
      aria-labelledby="outcome-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="rise mx-auto w-full max-w-2xl rounded-3xl border border-line bg-surface p-6 shadow-2xl sm:p-8">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="outcome-title" className="font-display text-2xl font-bold">What came out of the meeting?</h2>
            <p className="mt-1 text-soft">{meeting.title}. Any follow-up becomes its own open loop.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-mute hover:bg-raised hover:text-text" aria-label="Close">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <label htmlFor="outcome-input" className="sr-only">Meeting outcome</label>
        <textarea
          id="outcome-input"
          ref={ref}
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              save();
            }
          }}
          placeholder="e.g. Alex wants the updated financial model by Friday at 5 PM."
          className="block w-full resize-none rounded-2xl border border-line bg-bg/60 px-5 py-4 font-display text-xl font-medium leading-snug outline-none placeholder:font-normal placeholder:text-mute focus:border-accent"
        />
        {!text && (
          <button type="button" onClick={() => setText(EXAMPLE)} className="mt-3 rounded-full border border-line px-3 py-1.5 text-sm text-soft hover:border-accent hover:text-text">
            {EXAMPLE}
          </button>
        )}

        {ready && (
          <div className="rise mt-5" aria-live="polite">
            <div className="flex flex-wrap items-center gap-2 text-sm text-mute">
              <span className="rounded-full bg-raised px-3 py-1 text-soft line-through decoration-sage/70">{meeting.title}</span>
              <ArrowRight className="h-4 w-4" />
              <span className="flex items-center gap-1.5 rounded-full bg-accent-deep px-3 py-1 font-medium text-accent">
                <ChainIcon className="h-3.5 w-3.5" /> New open loop
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-[96px_1fr] gap-x-4 gap-y-3 rounded-2xl border border-line bg-raised/60 p-5 text-[15px]">
              <dt className="text-sm text-mute">Task</dt>
              <dd className="font-display text-lg font-semibold">{p.title}</dd>
              <dt className="text-sm text-mute">Due</dt>
              <dd>{p.date ? whenLabel(p, true) : <span className="text-mute">No date</span>}</dd>
              <dt className="text-sm text-mute">Who acts</dt>
              <dd>{p.owner === "you" ? "You" : `${p.owner} (you'll be waiting on them)`}</dd>
              <dt className="text-sm text-mute">Source</dt>
              <dd className="text-soft">Meeting outcome</dd>
            </dl>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button onClick={onNoFollowUp} className={btnSecondary}>No follow-ups</button>
          <button onClick={save} disabled={!ready} className={btnPrimary + " ml-auto"}>
            Close meeting and create loop
          </button>
        </div>
      </div>
    </div>
  );
}
