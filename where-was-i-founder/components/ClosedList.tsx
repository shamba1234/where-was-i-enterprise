"use client";

import { closedEntries } from "@/lib/derive";
import { reopenCommitment, useFounder } from "@/lib/state";
import { CheckIcon, ShieldCheck } from "./Icons";

/** Verified vs completed-by-you, side by side, so the difference is visible at a glance. */
export default function ClosedList({ hide }: { hide: Set<string> }) {
  const { state, update } = useFounder();
  const entries = closedEntries(state).filter((e) => !hide.has(e.c.id) || e.occurrence);

  if (!entries.length) return <p className="rounded-2xl border-2 border-dashed border-line px-5 py-6 text-soft">Nothing closed yet.</p>;

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
      {entries.map(({ c, closure, occurrence }) => {
        const verified = closure.kind === "verified";
        return (
          <li key={c.id + (occurrence ? "-occ" : "")} className="flex items-start gap-4 px-4 py-4 sm:px-5">
            <span
              className={[
                "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full",
                verified ? "bg-sage-soft text-sage-text" : "border border-line-strong text-mute",
              ].join(" ")}
            >
              {verified ? <ShieldCheck className="h-4 w-4" /> : <CheckIcon className="h-4 w-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="font-medium">{c.title}</p>
                {occurrence && <span className="text-xs text-mute">today's occurrence</span>}
                <span className={["rounded-full px-2 py-0.5 text-xs font-semibold", verified ? "bg-sage-soft text-sage-text" : "border border-line-strong text-soft"].join(" ")}>
                  {verified ? "Verified ✓" : "Completed by you"}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-soft">{closure.evidence}</p>
              <p className="text-xs text-mute">{closure.at}</p>
            </div>
            {closure.proof?.thumb && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={closure.proof.thumb} alt={`Proof: ${closure.proof.name}`} className="h-12 w-12 shrink-0 rounded-lg border border-line object-cover" />
            )}
            {!occurrence && c.origin !== "seed" && (
              <button onClick={() => update((s) => reopenCommitment(s, c.id))} className="shrink-0 rounded-full px-2.5 py-1 text-sm text-mute hover:bg-raised hover:text-text">
                Reopen
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
