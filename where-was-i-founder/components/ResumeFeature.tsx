"use client";

import Link from "next/link";
import { useEffect } from "react";
import { statusOf } from "@/lib/derive";
import { Commitment, useFounder } from "@/lib/state";
import { ArrowRight, BrowserIcon, CheckIcon } from "./Icons";
import { NextAction, StatusPill, WhyOpen } from "./ui";
import { useVerify } from "./useVerify";

const STEP_NAMES = ["Company", "Founders", "Product & traction", "Market & competition", "Fundraising", "Review & submit"];

/** Pick up where you stopped: the interrupted workflow, shown with exactly where it stopped. */
export default function ResumeFeature({ c, onLinger }: { c: Commitment; onLinger: (id: string) => void }) {
  const { state } = useFounder();
  const status = statusOf(c, state);
  const v = useVerify(c);
  const step = state.app.step;
  const answer = state.app.advantage;
  const tail = answer.length > 150 ? "…" + answer.slice(-150).replace(/^\S*\s/, "") : answer;

  // The application portal reports a submission on its own: detect it, then verify.
  useEffect(() => {
    if (status.key === "needs_verification" && v.phase === "idle") {
      onLinger(c.id);
      v.run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.key]);

  const done = v.phase === "verified" || Boolean(c.closed);
  const checking = v.phase === "checking";

  return (
    <article
      id={`loop-${c.id}`}
      className={[
        "relative overflow-hidden rounded-3xl border p-6 sm:p-8",
        done ? "settle border-sage/40 bg-surface" : "border-accent/30 bg-gradient-to-br from-accent-deep/70 via-surface to-surface",
      ].join(" ")}
    >
      {checking && (
        <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-accent-deep">
          <div className="scanbar h-full w-1/3 bg-accent" />
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-raised text-accent">
            <BrowserIcon className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-display text-2xl font-bold leading-tight">{c.title}</h3>
            <p className="text-sm text-mute">{done ? "Demo Browser" : `Interrupted yesterday at 6:47 PM in Demo Browser`}</p>
          </div>
        </div>
        <StatusPill status={checking ? { key: "needs_verification", label: "Checking Demo Browser…" } : status} />
      </div>

      {done ? (
        <div className="rise mt-6 rounded-2xl bg-sage-soft/60 p-5" aria-live="polite">
          <p className="flex items-center gap-2 font-display text-3xl font-bold text-sage-text">
            Verified <CheckIcon className="h-7 w-7" />
          </p>
          <p className="mt-1 text-lg font-medium">Application submitted</p>
          <p className="text-sm text-soft">{c.closed?.evidence ?? "Evidence found in Demo Browser"}</p>
        </div>
      ) : checking ? (
        <p className="mt-6 text-soft" aria-live="polite">
          Demo Browser shows a submission. Checking for the confirmation…
        </p>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_minmax(0,420px)]">
          <div className="space-y-5">
            <div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-semibold text-text">
                  Step {step} of 6: {STEP_NAMES[step - 1]}
                </span>
                <span className="text-mute">{c.context.split(".")[0]}</span>
              </div>
              <div className="mt-2 grid grid-cols-6 gap-1.5" aria-hidden>
                {STEP_NAMES.map((n, i) => (
                  <span
                    key={n}
                    className={["h-1.5 rounded-full", i + 1 < step ? "bg-sage" : i + 1 === step ? "bg-gradient-to-r from-lamp from-50% to-line-strong to-50%" : "bg-line-strong"].join(" ")}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-mute">{step === 4 ? "You were answering" : "You were on"}</p>
              <p className="mt-1 font-display text-xl font-semibold leading-snug">
                {step === 4 ? "“What is your company's competitive advantage?”" : `Step ${step}: ${STEP_NAMES[step - 1]}`}
              </p>
            </div>
            <NextAction owner="you" text={step === 4 ? "Finish this response, then complete Steps 5 and 6." : step === 5 ? "Answer the two fundraising questions." : "Review and submit."} />
          </div>

          <div className="flex flex-col justify-between gap-5">
            <div className="rounded-2xl border border-line-strong bg-bg/60 p-4 font-sans text-[15px] leading-relaxed text-soft">
              <p className="mb-2 text-xs font-semibold text-mute">Your draft, as you left it</p>
              {tail}
              <span className="caret ml-0.5 inline-block h-5 w-[2px] translate-y-1 bg-lamp" />
            </div>
            <Link
              href="/apply?resume=1"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-lamp px-6 py-3.5 font-display text-lg font-semibold text-bg hover:brightness-110"
            >
              Resume exactly where I stopped
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
            </Link>
          </div>
        </div>
      )}

      <WhyOpen c={c} s={state} label={done ? "Why was this open?" : "Why is this open?"} />
    </article>
  );
}
