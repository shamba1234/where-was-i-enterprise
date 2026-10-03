"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useDemo } from "@/lib/state";
import { CheckIcon, CircleIcon, CloseIcon } from "./Icons";

export const HISTORY = [
  { time: "7:14 PM", label: "Caterpillar internship opened", kind: "view" },
  { time: "7:22 PM", label: "John Deere internship opened", kind: "view" },
  { time: "7:27 PM", label: "Capital One internship opened", kind: "view" },
  { time: "7:41 PM", label: "Returned to Caterpillar", kind: "view" },
  { time: "7:48 PM", label: "Started Caterpillar application", kind: "work" },
  { time: "8:16 PM", label: "Resume edited", kind: "work" },
  { time: "8:34 PM", label: "Returned to Caterpillar application", kind: "work" },
  { time: "9:02 PM", label: "Activity stopped", kind: "stop" },
] as const;

const STEPS = ["Reading yesterday's browser history", "Grouping 8 events into one session", "Looking for a submission"];

export default function WhereWasIPanel({ onClose }: { onClose: () => void }) {
  const { state } = useDemo();
  const [step, setStep] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const ready = step >= STEPS.length;
  const submitted = state.caterpillar.submitted;

  useEffect(() => {
    closeRef.current?.focus();
    const timers = STEPS.map((_, i) => setTimeout(() => setStep(i + 1), 550 * (i + 1)));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-ink/60 px-4 py-6 backdrop-blur-sm sm:py-12"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wwi-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="rise mx-auto max-w-4xl overflow-hidden rounded-3xl bg-card shadow-2xl">
        <div className="flex items-center justify-between bg-dusk px-6 py-4 text-white sm:px-8">
          <h2 id="wwi-title" className="font-display text-2xl font-bold">
            Where Was I?
          </h2>
          <button ref={closeRef} onClick={onClose} className="rounded-full p-2 hover:bg-white/15" aria-label="Close">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {!ready ? (
          <div className="px-6 py-12 sm:px-8" aria-live="polite">
            <p className="font-display text-2xl font-semibold">Rebuilding your last session…</p>
            <ul className="mt-6 space-y-3">
              {STEPS.map((s, i) => (
                <li key={s} className={["flex items-center gap-3", i < step ? "text-ink" : "text-mute"].join(" ")}>
                  {i < step ? (
                    <CheckIcon className="h-5 w-5 text-sage" />
                  ) : (
                    <CircleIcon className={["h-5 w-5", i === step ? "animate-pulse text-dusk" : ""].join(" ")} />
                  )}
                  {s}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="grid gap-0 md:grid-cols-[1fr_300px]">
            <div className="space-y-7 px-6 py-7 sm:px-8">
              <Section title="What you were doing">
                <p className="font-display text-[26px] font-semibold leading-tight">
                  You were applying for the Caterpillar Software Engineering Internship.
                </p>
                <p className="mt-2 text-ink-soft">Yesterday evening, 7:14 to 9:02 PM, in your browser.</p>
              </Section>

              <Section title="What you completed">
                <ul className="space-y-2">
                  {["Compared three internships", "Updated your resume", "Started the Caterpillar application"].map((t) => (
                    <li key={t} className="flex items-center gap-3">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-sage-soft text-sage">
                        <CheckIcon className="h-4 w-4" />
                      </span>
                      {t}
                    </li>
                  ))}
                  {submitted && (
                    <li className="flex items-center gap-3 font-medium text-sage">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-sage text-white">
                        <CheckIcon className="h-4 w-4" />
                      </span>
                      Submitted the Caterpillar application at {state.caterpillar.submittedAt}
                    </li>
                  )}
                </ul>
              </Section>

              <Section title="Where you stopped">
                {submitted ? (
                  <p className="text-ink-soft">Nothing is left from this session. The application has been submitted.</p>
                ) : (
                  <>
                    <p>
                      Application questions, step 3 of 4, at 9:02 PM. Your answer to “Why are you interested in this
                      role?” ends mid-sentence, and two required questions are blank.
                    </p>
                    <p className="mt-3 flex items-center gap-3 font-medium">
                      <CircleIcon className="h-5 w-5 text-lamp" />
                      Caterpillar application has not been submitted
                    </p>
                  </>
                )}
              </Section>

              <Section title="What to do next">
                {submitted ? (
                  <p className="text-ink-soft">You're all caught up on yesterday. Check tonight's other open items.</p>
                ) : (
                  <>
                    <p className="mb-4">Continue your Caterpillar application.</p>
                    <Link
                      href="/browser?resume=1"
                      className="inline-flex items-center gap-2 rounded-full bg-lamp px-6 py-3 font-display text-lg font-semibold text-ink hover:brightness-105"
                    >
                      Continue where I left off
                    </Link>
                  </>
                )}
              </Section>
            </div>

            <aside className="border-t border-line bg-paper/60 px-6 py-7 md:border-l md:border-t-0" aria-label="Yesterday's activity">
              <h3 className="text-sm font-semibold text-mute">Yesterday, from Demo Browser</h3>
              <ol className="relative mt-4 space-y-4 border-l-2 border-dashed border-line pl-5">
                {HISTORY.map((h) => (
                  <li key={h.time} className="relative">
                    <span
                      className={[
                        "absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-card",
                        h.kind === "stop" ? "bg-lamp ring-4 ring-lamp-soft" : h.kind === "work" ? "bg-dusk" : "bg-mute/50",
                      ].join(" ")}
                    />
                    <p className="text-xs tabular-nums text-mute">{h.time}</p>
                    <p className={["text-sm", h.kind === "stop" ? "font-semibold" : ""].join(" ")}>{h.label}</p>
                    {h.kind === "stop" && !submitted && (
                      <p className="mt-1 text-xs font-medium text-[#8a5410]">You stopped here. No submission found.</p>
                    )}
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-dusk">{title}</h3>
      {children}
    </section>
  );
}
