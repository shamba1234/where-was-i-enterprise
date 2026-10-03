"use client";

import { useEffect, useState } from "react";
import { Answer, answer } from "@/lib/answer";
import { PEOPLE } from "@/lib/model";
import { useStore } from "@/lib/store";
import { CheckIcon, CrumbIcon, SearchIcon, SparkIcon } from "./Icons";
import { useUI } from "./UIProvider";
import { ResumeLink, btn } from "./ui";

const MANAGER_Q = ["What is blocked?", "Who is waiting on me?", "What needs review?", "What changed today?", "What is due this week?", "Why hasn't the landing page been completed?", "What did Maya work on today?", "Where did Maya leave off?", "What breadcrumbs did Maya leave?"];
const EMPLOYEE_Q = ["Where was I?", "What needs me?", "What am I waiting on?", "What did I leave unfinished?", "What should I do next?", "What did I complete today?", "What is due tomorrow?", "What was I thinking when I stopped?"];

export default function AskBox() {
  const { ws, me } = useStore();
  const ui = useUI();
  const [q, setQ] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  const [a, setA] = useState<Answer | null>(null);
  const [thinking, setThinking] = useState(false);
  const manager = PEOPLE[me].manager;
  const suggestions = manager ? MANAGER_Q : EMPLOYEE_Q;

  useEffect(() => {
    setA(null);
    setAsked(null);
    setQ("");
  }, [me]);

  const ask = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setQ(t);
    setAsked(t);
    setThinking(true);
    setA(null);
    setTimeout(() => {
      setA(answer(t, ws, me));
      setThinking(false);
    }, 450);
  };

  return (
    <section aria-label="Ask Where Was I?">
      <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-2.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
        <SearchIcon className="h-5 w-5 shrink-0 text-mute" />
        <label htmlFor="ask" className="sr-only">Ask Where Was I?</label>
        <input id="ask" value={q} onChange={(e) => setQ(e.target.value)} placeholder={manager ? "Ask about your team's work…" : "Ask Where Was I?"} autoComplete="off" className="min-w-0 flex-1 bg-transparent py-1 text-[16px] outline-none placeholder:text-mute" />
        <button className={btn.primary + " py-1.5"}>Ask</button>
      </form>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {suggestions.map((s) => (
          <button key={s} onClick={() => ask(s)} className={`rounded-full border px-3 py-1 text-sm transition ${s === "Where was I?" ? "border-accent/50 font-medium text-accent-text hover:bg-accent-soft" : "border-line text-soft hover:border-line-strong hover:text-text"}`}>
            {s}
          </button>
        ))}
      </div>

      {(thinking || a) && (
        <div className="rise mt-4 rounded-2xl border border-line bg-surface p-5" aria-live="polite" data-testid="answer">
          <p className="text-sm text-mute">{asked}</p>
          {thinking ? (
            <p className="mt-2 text-soft">Checking the shared workspace…</p>
          ) : a?.where ? (
            <WhereAnswer a={a} />
          ) : (
            a && (
              <>
                <p className="mt-1.5 font-display text-xl font-semibold leading-snug">{a.text}</p>
                {a.items && (
                  <ul className="mt-3 space-y-2">
                    {a.items.map((it, i) => (
                      <li key={i} className="flex gap-2.5">
                        <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${it.tone === "blocked" ? "bg-blocked" : it.tone === "ok" ? "bg-ok" : it.tone === "review" ? "bg-review" : "bg-line-strong"}`} />
                        <span>
                          <span className="font-medium">{it.label}</span>
                          {it.meta && <span className="text-soft"> — {it.meta}</span>}
                          {it.note && <span className="block text-sm text-mute">{it.note}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 text-sm text-mute">{a.source}</p>
                {a.action && (
                  <div className="mt-3">
                    {a.action.href ? (
                      <ResumeLink href={a.action.href}>{a.action.label}</ResumeLink>
                    ) : (
                      <button onClick={() => a.action?.commitmentId && ui.open({ kind: a.action.label === "Review" ? "review" : "drawer", id: a.action.commitmentId })} className={btn.secondary}>{a.action.label}</button>
                    )}
                  </div>
                )}
              </>
            )
          )}
        </div>
      )}
    </section>
  );
}

function WhereAnswer({ a }: { a: Answer }) {
  const w = a.where!;
  return (
    <div className="mt-1.5">
      <p className="text-soft">{a.text}</p>
      <p className="font-display text-2xl font-semibold tracking-tight">{w.title}</p>
      {w.project && <p className="text-sm text-mute">{w.project}</p>}
      <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-[150px_1fr]">
        <dt className="text-sm font-semibold text-mute">Goal</dt>
        <dd>{w.goal}</dd>
        <dt className="text-sm font-semibold text-mute">Where you stopped</dt>
        <dd>
          {w.location}
          {w.completed.length > 0 && <span className="block text-sm text-mute">Done: {w.completed.join(", ")}</span>}
        </dd>
        {w.crumb && (
          <>
            <dt className="flex items-start gap-1.5 text-sm font-semibold text-mute">{w.crumb.type === "user" ? <CrumbIcon className="mt-0.5 h-4 w-4" /> : <SparkIcon className="mt-0.5 h-4 w-4" />} {w.crumb.type === "user" ? "Latest breadcrumb" : "AI reconstruction"}</dt>
            <dd>
              <blockquote className="whitespace-pre-line border-l-2 border-accent pl-3 font-display text-[17px] leading-snug">{w.crumb.type === "user" ? `“${w.crumb.text}”` : w.crumb.text}</blockquote>
              <span className="mt-1 block text-xs text-mute">{w.crumb.who}, {w.crumb.ago}</span>
            </dd>
          </>
        )}
        {w.dependency && (
          <>
            <dt className="text-sm font-semibold text-mute">Current dependency</dt>
            <dd className={`flex items-center gap-1.5 font-medium ${w.dependency.tone === "ok" ? "text-ok" : "text-blocked"}`}>{w.dependency.tone === "ok" && <CheckIcon className="h-4 w-4" />}{w.dependency.text}</dd>
          </>
        )}
        {w.feedback && (
          <>
            <dt className="text-sm font-semibold text-mute">Manager feedback</dt>
            <dd>{w.feedback}</dd>
          </>
        )}
        <dt className="text-sm font-semibold text-accent-text">Next action</dt>
        <dd className="font-medium">{w.nextAction}</dd>
      </dl>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <ResumeLink href={w.href} />
        <p className="text-sm text-mute">{a.source}</p>
      </div>
    </div>
  );
}
