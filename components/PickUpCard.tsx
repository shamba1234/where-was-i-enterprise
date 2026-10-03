"use client";

import { useState } from "react";
import { agoLabel, atLabel } from "@/lib/clock";
import { completedParts, pendingAi, pendingSuggestion, statusView, visibleCrumbs } from "@/lib/derive";
import { Commitment, PEOPLE } from "@/lib/model";
import { locationOf } from "@/lib/ops";
import { useStore } from "@/lib/store";
import { workspaceHref } from "@/lib/answer";
import { CheckIcon, ChevronDown, CrumbIcon, DesignIcon, FlagIcon, FormIcon, SparkIcon } from "./Icons";
import { AiCrumb, SuggestionPanel } from "./Suggestions";
import { useUI } from "./UIProvider";
import { Pill, ResumeLink, btn } from "./ui";

/**
 * Pick up where you stopped: DIGITAL state (where the work is) next to MENTAL state
 * (what you were thinking). Resume restores both.
 */
export default function PickUpCard({ c }: { c: Commitment }) {
  const { ws, me } = useStore();
  const ui = useUI();
  const [history, setHistory] = useState(false);
  const v = statusView(c, ws);
  const loc = locationOf(ws, c);
  const parts = completedParts(c, ws);
  const lastCp = c.checkpoints[c.checkpoints.length - 1];
  const crumbs = visibleCrumbs(c, me).filter((b) => b.type === "user" || b.confirmed);
  const latest = crumbs[0] ?? null;
  const ai = pendingAi(c, me);
  const sug = pendingSuggestion(c, me);
  const resolved = c.status === "ready" && c.lastBlocker;
  const app = c.workspace === "application";
  const href = workspaceHref(c);

  return (
    <article id={`c-${c.id}`} className={`overflow-hidden rounded-3xl border bg-surface ${resolved ? "border-ok/40" : "border-line"} ${ui.justChanged === c.id ? "rise" : ""}`}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent-text">
            {app ? <FormIcon className="h-5 w-5" /> : <DesignIcon className="h-5 w-5" />}
          </span>
          <div>
            {c.project && <p className="text-xs font-medium text-mute">{c.project}</p>}
            <button onClick={() => ui.open({ kind: "drawer", id: c.id })} className="text-left font-display text-xl font-semibold tracking-tight hover:text-accent-text">{c.title}</button>
            <p className="text-sm text-mute">Interrupted {agoLabel(c.lastWorkedAt ?? ws.now, ws.now)}</p>
          </div>
        </div>
        <Pill tone={v.tone}>{v.label}</Pill>
      </header>

      {resolved && (
        <div className="flex items-center gap-2 border-b border-ok/20 bg-ok-soft/60 px-6 py-2.5 text-sm" role="status">
          <CheckIcon className="h-4 w-4 text-ok" />
          <span><span className="font-semibold text-ok">Dependency resolved.</span> {PEOPLE[c.lastBlocker!.by].first} has now delivered the {c.lastBlocker!.reason.charAt(0).toLowerCase() + c.lastBlocker!.reason.slice(1)}.</span>
        </div>
      )}
      {c.status === "changes_requested" && c.feedback && (
        <div className="border-b border-warn/20 bg-warn-soft/70 px-6 py-2.5 text-sm">
          <span className="font-semibold text-warn">Manager feedback: </span>{c.feedback}
        </div>
      )}

      <div className="grid md:grid-cols-2">
        {/* Digital state */}
        <section className="space-y-3 px-6 py-5 md:border-r md:border-line" aria-label="Where the work stopped">
          <p className="text-xs font-semibold text-mute">Your goal</p>
          <p className="-mt-2 font-medium">{c.goal}</p>
          <div>
            <p className="text-xs font-semibold text-mute">Where you stopped</p>
            <p className="font-display text-lg font-semibold">{loc}</p>
            <p className="text-xs text-mute">{app ? "Demo partner portal" : "Demo design file"}{lastCp ? `, last checkpoint ${atLabel(lastCp.at)}` : ""}</p>
          </div>
          {parts.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-mute">Completed</p>
              <ul className="mt-1 space-y-0.5 text-sm">
                {parts.map((p) => (
                  <li key={p} className="flex items-center gap-1.5 text-soft"><CheckIcon className="h-3.5 w-3.5 text-ok" /> {p}</li>
                ))}
              </ul>
            </div>
          )}
          {lastCp && (
            <p className="flex gap-1.5 text-sm text-soft"><FlagIcon className="mt-0.5 h-4 w-4 shrink-0 text-mute" /> <span><span className="text-mute">Last checkpoint: </span>{lastCp.text}</span></p>
          )}
        </section>

        {/* Mental state */}
        <section className="space-y-3 bg-raised/40 px-6 py-5" aria-label="What was on your mind">
          {latest ? (
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-mute">
                {latest.type === "user" ? <CrumbIcon className="h-3.5 w-3.5" /> : <SparkIcon className="h-3.5 w-3.5" />}
                {latest.type === "user" ? "Your breadcrumb" : "AI reconstruction"}
              </p>
              <p className="text-xs text-mute">{latest.type === "user" ? "Written by you" : `Confirmed by ${PEOPLE[latest.author].first} ✓`}, {agoLabel(latest.at, ws.now)}</p>
              <blockquote className="mt-1.5 whitespace-pre-line border-l-2 border-accent pl-3 font-display text-[17px] leading-snug">{latest.type === "user" ? `“${latest.text}”` : latest.text}</blockquote>
              {crumbs.length > 1 && (
                <>
                  <button onClick={() => setHistory((h) => !h)} aria-expanded={history} className="mt-2 inline-flex items-center gap-1 text-sm text-mute hover:text-text">
                    {crumbs.length - 1} earlier breadcrumb{crumbs.length > 2 ? "s" : ""} <ChevronDown className={`h-4 w-4 ${history ? "rotate-180" : ""}`} />
                  </button>
                  {history && (
                    <ul className="rise mt-2 space-y-2 text-sm">
                      {crumbs.slice(1).map((b) => (
                        <li key={b.id}><span className="text-mute">{atLabel(b.at)}</span> <span className="text-soft">“{b.text.replace(/\n+/g, " ")}”</span></li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          ) : !ai ? (
            <p className="text-sm text-mute">No breadcrumb yet. Leave one before you switch away so you know what you were thinking.</p>
          ) : null}
          {ai && <AiCrumb c={c} b={ai} />}
          {sug && <SuggestionPanel c={c} b={sug} />}

          {(resolved || c.status === "blocked") && (
            <div>
              <p className="text-xs font-semibold text-mute">Current dependency</p>
              <p className={`text-sm font-medium ${resolved ? "text-ok" : "text-blocked"}`}>
                {resolved ? `${PEOPLE[c.lastBlocker!.by].first} has delivered the ${c.lastBlocker!.reason.charAt(0).toLowerCase() + c.lastBlocker!.reason.slice(1)}.` : `Waiting on ${PEOPLE[c.blocker!.by].first}.`}
              </p>
            </div>
          )}
        </section>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-line px-6 py-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-accent-text">Next action</p>
          <p className="font-medium">{c.nextAction}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => ui.open({ kind: "breadcrumb", id: c.id })} className={btn.quiet}><CrumbIcon className="h-4 w-4" /> Leave a breadcrumb</button>
          <ResumeLink href={href} />
        </div>
      </footer>
    </article>
  );
}
