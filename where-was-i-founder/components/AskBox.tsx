"use client";

import Link from "next/link";
import { useState } from "react";
import { Answer, answerQuestion } from "@/lib/answer";
import { useFounder } from "@/lib/state";
import { SearchIcon } from "./Icons";
import { btnPrimary } from "./ui";

const SUGGESTIONS = [
  "What needs my attention?",
  "What am I waiting on?",
  "What did I leave unfinished?",
  "What do I have tomorrow?",
  "What have I actually completed?",
  "What should I do next?",
];

const DOT: Record<string, string> = { verified: "bg-sage", you: "bg-lamp", other: "bg-sky" };

export default function AskBox() {
  const { state } = useFounder();
  const [q, setQ] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [thinking, setThinking] = useState(false);

  const ask = (question: string) => {
    const text = question.trim();
    if (!text) return;
    setQ(text);
    setAsked(text);
    setThinking(true);
    setAnswer(null);
    setTimeout(() => {
      setAnswer(answerQuestion(text, state));
      setThinking(false);
    }, 600);
  };

  return (
    <section aria-label="Ask Where Was I?">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
        className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 focus-within:border-accent"
      >
        <SearchIcon className="h-5 w-5 shrink-0 text-mute" />
        <label htmlFor="ask" className="sr-only">Ask Where Was I?</label>
        <input
          id="ask"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask what's unresolved…"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-mute"
        />
        <button className="rounded-full bg-text px-4 py-1.5 text-sm font-semibold text-bg hover:bg-white">Ask</button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => ask(s)} className="rounded-full border border-line px-3 py-1.5 text-sm text-soft hover:border-accent hover:text-text">
            {s}
          </button>
        ))}
      </div>

      {(thinking || answer) && (
        <div className="rise mt-4 rounded-2xl border border-line bg-surface p-5" aria-live="polite">
          <p className="text-sm text-mute">{asked}</p>
          {thinking ? (
            <p className="mt-2 text-soft">Checking your open loops and sources…</p>
          ) : (
            answer && (
              <>
                <p className="mt-2 flex items-start gap-3 font-display text-xl font-medium leading-snug">
                  <span className={["mt-2 h-2.5 w-2.5 shrink-0 rounded-full", answer.tone === "yes" ? "bg-sage" : answer.tone === "no" ? "bg-lamp" : "bg-accent"].join(" ")} />
                  {answer.text}
                </p>
                {answer.items && (
                  <ul className="mt-3 space-y-2 pl-5">
                    {answer.items.map((it, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className={["mt-2 h-1.5 w-1.5 shrink-0 rounded-full", DOT[it.tone ?? "you"]].join(" ")} />
                        <span>
                          <span className="font-medium">{it.label}</span>
                          <span className="text-soft"> — {it.meta}</span>
                          {it.note && <span className="block text-sm text-mute">{it.note}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 pl-5 text-sm text-mute">{answer.source}</p>
                {answer.action && (
                  <Link href={answer.action.href} className={btnPrimary + " ml-5 mt-4"}>
                    {answer.action.label}
                  </Link>
                )}
              </>
            )
          )}
        </div>
      )}
    </section>
  );
}
