"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { statusOf } from "@/lib/derive";
import { useFounder } from "@/lib/state";
import { CheckIcon, CircleIcon, CloseIcon } from "./Icons";
import { btnSecondary } from "./ui";

const HISTORY = [
  { time: "4:10 PM", label: "Opened Northstar Accelerator application", src: "Browser", kind: "work" },
  { time: "4:32 PM", label: "Sent final landing-page copy to Sarah", src: "Gmail", kind: "done" },
  { time: "5:14 PM", label: "Alex Chen asked for the latest investor deck", src: "Gmail", kind: "in" },
  { time: "5:20 PM", label: "Application: Steps 1–3 saved", src: "Browser", kind: "done" },
  { time: "5:41 PM", label: "Started Step 4: competitive advantage", src: "Browser", kind: "work" },
  { time: "6:02 PM", label: "Opened Founder_Deck.pdf, didn't send it", src: "Browser", kind: "work" },
  { time: "6:10 PM", label: "Sent pitch follow-up to Priya", src: "Gmail", kind: "done" },
  { time: "6:47 PM", label: "Activity stopped mid-sentence", src: "Browser", kind: "stop" },
] as const;

const STEPS = ["Reading yesterday's Demo Browser and Demo Gmail activity", "Grouping 8 events into one session", "Checking what was finished and what wasn't"];

export default function WhereWasIPanel({ onClose }: { onClose: () => void }) {
  const { state } = useFounder();
  const [step, setStep] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const ready = step >= STEPS.length;

  const deck = state.commitments.find((c) => c.id === "deck");
  const app = state.commitments.find((c) => c.id === "application");
  const deckDone = deck ? ["verified", "completed_by_you"].includes(statusOf(deck, state).key) : true;
  const appDone = state.app.submitted;

  useEffect(() => {
    closeRef.current?.focus();
    const timers = STEPS.map((_, i) => setTimeout(() => setStep(i + 1), 520 * (i + 1)));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 px-4 py-6 backdrop-blur-sm sm:py-12"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wwi-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="rise mx-auto max-w-4xl overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl">
        <div className="flex items-center justify-between bg-accent-deep px-6 py-4 sm:px-8">
          <h2 id="wwi-title" className="font-display text-2xl font-bold">Where Was I?</h2>
          <button ref={closeRef} onClick={onClose} className="rounded-full p-2 hover:bg-white/10" aria-label="Close">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {!ready ? (
          <div className="px-6 py-12 sm:px-8" aria-live="polite">
            <p className="font-display text-2xl font-semibold">Rebuilding your last session…</p>
            <ul className="mt-6 space-y-3">
              {STEPS.map((s, i) => (
                <li key={s} className={["flex items-center gap-3", i < step ? "text-text" : "text-mute"].join(" ")}>
                  {i < step ? <CheckIcon className="h-5 w-5 text-sage" /> : <CircleIcon className={["h-5 w-5", i === step ? "animate-pulse text-accent" : ""].join(" ")} />}
                  {s}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="grid md:grid-cols-[1fr_310px]">
            <div className="space-y-7 px-6 py-7 sm:px-8">
              <Block title="What you were doing">
                <p className="font-display text-[26px] font-semibold leading-tight">
                  You were filling out the Northstar Accelerator application, between investor follow-ups.
                </p>
                <p className="mt-2 text-soft">Yesterday, 4:10 to 6:47 PM.</p>
              </Block>
              <Block title="What you completed">
                <ul className="space-y-2">
                  {["Sent the landing-page copy to Sarah", "Saved Steps 1–3 of the application", "Sent the pitch follow-up to Priya"].map((t) => (
                    <Done key={t}>{t}</Done>
                  ))}
                  {deckDone && <Done strong>Sent Alex the investor deck (since then)</Done>}
                  {appDone && <Done strong>Submitted the application (since then)</Done>}
                </ul>
              </Block>
              <Block title="Where you stopped">
                {appDone && deckDone ? (
                  <p className="text-soft">Nothing from that session is still open on your side. Sarah still owes you a reply.</p>
                ) : (
                  <ul className="space-y-2">
                    {!appDone && (
                      <Open>Step 4 of 6, mid-sentence on “What is your company's competitive advantage?”</Open>
                    )}
                    {!deckDone && <Open>Alex's deck request is unanswered. You opened Founder_Deck.pdf at 6:02 PM but never sent it.</Open>}
                  </ul>
                )}
              </Block>
              <Block title="What to do next">
                {appDone && deckDone ? (
                  <p className="text-soft">You're caught up on yesterday.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {!deckDone && (
                      <Link href="/gmail?thread=alex&reply=1" className={btnSecondary}>
                        1. Reply to Alex with the deck
                      </Link>
                    )}
                    {!appDone && app && (
                      <Link href="/apply?resume=1" className="inline-flex items-center gap-2 rounded-full bg-lamp px-5 py-2 font-semibold text-bg hover:brightness-110">
                        {deckDone ? "" : "2. "}Resume exactly where I stopped →
                      </Link>
                    )}
                  </div>
                )}
              </Block>
            </div>
            <aside className="border-t border-line bg-bg/50 px-6 py-7 md:border-l md:border-t-0" aria-label="Yesterday's activity">
              <h3 className="text-sm font-semibold text-mute">Yesterday, from Demo Browser and Demo Gmail</h3>
              <ol className="relative mt-4 space-y-4 border-l-2 border-dashed border-line-strong pl-5">
                {HISTORY.map((h) => (
                  <li key={h.time} className="relative">
                    <span className={["absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-surface", h.kind === "stop" ? "bg-lamp ring-4 ring-lamp-soft" : h.kind === "done" ? "bg-sage" : h.kind === "in" ? "bg-sky" : "bg-accent"].join(" ")} />
                    <p className="text-xs tabular-nums text-mute">{h.time}, Demo {h.src}</p>
                    <p className={["text-sm", h.kind === "stop" ? "font-semibold" : ""].join(" ")}>{h.label}</p>
                    {h.kind === "stop" && !appDone && <p className="mt-1 text-xs font-medium text-lamp-text">You stopped here. No submission found.</p>}
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-accent">{title}</h3>
      {children}
    </section>
  );
}
function Done({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <li className={["flex items-center gap-3", strong ? "font-medium text-sage-text" : ""].join(" ")}>
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sage-soft text-sage-text">
        <CheckIcon className="h-4 w-4" />
      </span>
      {children}
    </li>
  );
}
function Open({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <CircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-lamp" />
      {children}
    </li>
  );
}
