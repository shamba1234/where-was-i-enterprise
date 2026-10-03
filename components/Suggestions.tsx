"use client";

import { agoLabel } from "@/lib/clock";
import { Breadcrumb, Commitment, PEOPLE } from "@/lib/model";
import { useStore } from "@/lib/store";
import { SparkIcon } from "./Icons";
import { useUI } from "./UIProvider";
import { btn } from "./ui";

/** A breadcrumb reconstructed from work context. Never shown as something the person wrote. */
export function AiCrumb({ c, b }: { c: Commitment; b: Breadcrumb }) {
  const { ws } = useStore();
  const ui = useUI();
  return (
    <div className="rise mt-3 rounded-xl border border-dashed border-line-strong p-3.5">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-mute">
        <SparkIcon className="h-3.5 w-3.5" /> AI reconstruction
      </p>
      <p className="text-xs text-mute">Suggested from work context, {agoLabel(b.at, ws.now)}. Not written by you.
      </p>
      <p className="mt-1 text-[15px] text-soft">{b.text}</p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <button onClick={() => ui.confirmAi(c.id, b.id)} className={btn.secondary + " py-1"}>Confirm</button>
        <button onClick={() => ui.open({ kind: "breadcrumb", id: c.id, prefillText: b.text.replace(/^You appeared to stop/, "I stopped").replace(/\bYou\b/g, "I"), replacesAi: b.id })} className={btn.quiet}>Edit</button>
        <button onClick={() => ui.ignoreAi(c.id, b.id)} className={btn.quiet}>Ignore</button>
      </div>
    </div>
  );
}

/** A breadcrumb that reads like a dependency becomes a suggestion. Only confirmation changes state. */
export function SuggestionPanel({ c, b }: { c: Commitment; b: Breadcrumb }) {
  const ui = useUI();
  const s = b.suggestion!;
  return (
    <div className="rise mt-3 rounded-xl border border-review/30 bg-review-soft/60 p-3.5" role="region" aria-label="Suggested change">
      <p className="text-xs font-semibold text-review">We found something that may affect this task</p>
      <dl className="mt-2 grid grid-cols-[132px_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-mute">Possible blocker</dt>
        <dd className="font-medium">Waiting on {PEOPLE[s.person].first}</dd>
        <dt className="text-mute">Needed</dt>
        <dd>{s.needed}</dd>
        <dt className="text-mute">Suggested next action</dt>
        <dd>{s.nextAction}</dd>
      </dl>
      <p className="mt-2 text-xs text-mute">From your breadcrumb. Nothing changes unless you confirm.</p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <button onClick={() => ui.confirmSuggestion(c.id, b.id)} className={btn.primary + " py-1.5"}>Confirm</button>
        <button onClick={() => ui.open({ kind: "blocker", id: c.id, prefill: { person: s.person, reason: s.needed }, fromBreadcrumb: b.id })} className={btn.secondary + " py-1.5"}>Edit</button>
        <button onClick={() => ui.ignoreSuggestion(c.id, b.id)} className={btn.quiet}>Ignore</button>
      </div>
    </div>
  );
}
