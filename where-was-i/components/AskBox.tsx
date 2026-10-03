"use client";

import Link from "next/link";
import { useState } from "react";
import { Answer, answerQuestion } from "@/lib/answer";
import { useDemo } from "@/lib/state";
import { SearchIcon } from "./Icons";

const SUGGESTIONS = ["Did I submit my homework?", "Did I reply to Maya?", "What did I leave unfinished yesterday?", "What do I have tomorrow?"];

export default function AskBox() {
  const { state } = useDemo();
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
    }, 650);
  };

  return (
    <section aria-label="Ask a question">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
        className="flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 focus-within:border-dusk"
      >
        <SearchIcon className="h-5 w-5 shrink-0 text-mute" />
        <label htmlFor="ask" className="sr-only">
          Ask what you might have forgotten
        </label>
        <input
          id="ask"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask what you might have forgotten..."
          className="min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-mute"
          autoComplete="off"
        />
        <button className="rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-white hover:bg-dusk">Ask</button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => ask(s)}
            className="rounded-full border border-line bg-card/60 px-3 py-1.5 text-sm text-ink-soft hover:border-dusk hover:text-ink"
          >
            {s}
          </button>
        ))}
      </div>

      {(thinking || answer) && (
        <div className="rise mt-4 rounded-2xl border border-line bg-card p-5" aria-live="polite">
          <p className="text-sm text-mute">{asked}</p>
          {thinking ? (
            <p className="mt-2 text-ink-soft">Checking your connected sources…</p>
          ) : (
            answer && (
              <>
                <p className="mt-2 flex items-start gap-3 font-display text-xl font-medium leading-snug">
                  <span
                    className={[
                      "mt-2 h-2.5 w-2.5 shrink-0 rounded-full",
                      answer.tone === "yes" ? "bg-sage" : answer.tone === "no" ? "bg-lamp" : "bg-dusk",
                    ].join(" ")}
                  />
                  {answer.text}
                </p>
                {answer.items && (
                  <ul className="mt-3 space-y-1.5 pl-5">
                    {answer.items.map((it) => (
                      <li key={it.label + it.meta} className="flex flex-wrap items-baseline gap-x-2 text-[17px]">
                        <span className="font-medium">
                          {it.label} — {it.meta}
                        </span>
                        <span className="text-sm text-mute">{it.source}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 pl-5 text-sm text-mute">{answer.source}</p>
                {answer.related && (
                  <div className="ml-5 mt-3 rounded-xl bg-paper/70 px-3 py-2 text-sm">
                    <p className="text-mute">Also on your list</p>
                    {answer.related.map((it) => (
                      <p key={it.label} className="text-ink-soft">
                        {it.label} — {it.meta}
                      </p>
                    ))}
                  </div>
                )}
                {answer.action && (
                  <Link
                    href={answer.action.href}
                    className="ml-5 mt-4 inline-block rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-dusk"
                  >
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
