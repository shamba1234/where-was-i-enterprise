"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import DemoBar from "@/components/DemoBar";
import { CheckIcon, RewindIcon } from "@/components/Icons";
import { nowLabel } from "@/lib/clock";
import { FounderState, useFounder } from "@/lib/state";

const STEPS = ["Company", "Founders", "Product & traction", "Market & competition", "Fundraising", "Review & submit"];

const SAVED: Record<number, [string, string][]> = {
  1: [["Company", "Kestrel"], ["One-liner", "Delivery-time predictions for mid-size freight shippers"], ["Founded", "2025, Chicago"]],
  2: [["Founders", "Sam Rivera (CEO), Dana Okafor (CTO)"], ["Full-time", "Both, since March 2025"]],
  3: [["Customers", "11 paying shippers"], ["MRR", "$38K, growing 18% month over month"], ["Retention", "100% logo retention to date"]],
};

function ApplyInner() {
  const params = useSearchParams();
  const resume = params.get("resume") === "1";
  const { state, update } = useFounder();
  const app = state.app;
  const [restored, setRestored] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [certify, setCertify] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null); // look back at a saved step without moving
  const ref = useRef<HTMLTextAreaElement>(null);

  const set = (p: Partial<FounderState["app"]>) => update((s) => ({ ...s, app: { ...s.app, ...p } }));
  const step = viewing ?? app.step;

  useEffect(() => {
    if (resume) setRestored(true);
  }, [resume]);

  // Land exactly where work stopped: cursor at the end of the half-written answer.
  useEffect(() => {
    if (restored && app.step === 4 && !viewing && ref.current) {
      const el = ref.current;
      el.focus({ preventScroll: true });
      el.setSelectionRange(el.value.length, el.value.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restored]);

  const next = () => {
    const e: string[] = [];
    if (app.step === 4) {
      const a = app.advantage.trim();
      if (a.length < 120) e.push("Your competitive-advantage answer needs a little more detail.");
      else if (!/[.!?]["”']?$/.test(a)) e.push("Your answer ends mid-sentence. Finish the thought before continuing.");
      if (!app.competitors.trim()) e.push("List at least one competitor.");
    }
    if (app.step === 5) {
      if (!app.raise) e.push("Choose how much you're raising.");
      if (!app.raisedBefore) e.push("Say whether you've raised before.");
    }
    setErrors(e);
    if (!e.length) {
      setRestored(false);
      set({ step: Math.min(6, app.step + 1) });
    }
  };

  const submit = () => {
    setSubmitting(true);
    setTimeout(() => {
      set({ submitted: true, submittedAt: nowLabel() });
      setSubmitting(false);
    }, 1100);
  };

  const url = app.submitted ? "apply.northstar-demo.local/winter-2027/confirmation" : `apply.northstar-demo.local/winter-2027/step-${step}`;

  return (
    <div className="min-h-screen bg-[#1b1825]" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <DemoBar app="Demo Browser" />
      <div className="px-2 pt-2">
        <div className="flex items-end gap-1">
          <span className="max-w-[240px] truncate rounded-t-lg bg-[#17181c] px-4 py-2 text-xs font-medium text-[#e8eaed]">Northstar Accelerator – Apply</span>
          <span className="hidden truncate px-4 py-2 text-xs text-[#9a95ad] sm:block">Kestrel metrics – Sheets</span>
        </div>
        <div className="flex items-center gap-3 rounded-t-lg bg-[#17181c] px-3 py-2">
          <span className="hidden gap-3 text-[#9aa0a6] sm:flex" aria-hidden>
            <span>←</span><span>→</span><span>↻</span>
          </span>
          <div className="min-w-0 flex-1 truncate rounded-full bg-[#2a2c33] px-4 py-1.5 text-sm text-[#c4c7c5]">{url}</div>
          <span className="hidden rounded bg-[#2a2c33] px-2 py-1 text-xs font-semibold text-[#9aa0a6] sm:inline">Demo Browser</span>
        </div>
      </div>

      <div className="mx-2 min-h-[calc(100vh-130px)] bg-[#17181c] text-[#e8e9ed]" style={{ colorScheme: "dark" }}>
        <div className="border-b border-[#2c2e35] px-5 py-5 sm:px-10">
          <p className="text-xs font-semibold text-[#a99bff]">Northstar Accelerator (demo portal)</p>
          <h1 className="mt-1 text-2xl font-semibold">Winter 2027 batch application</h1>
          <p className="text-sm text-[#9ba1ad]">Kestrel. Applications close Friday at 11:59 PM. Drafts save automatically.</p>
        </div>

        {app.submitted ? (
          <div className="mx-auto max-w-2xl px-5 py-16 text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#16302a] text-[#8fd6b1]">
              <CheckIcon className="h-8 w-8" />
            </span>
            <h2 className="mt-5 text-3xl font-semibold">Application submitted</h2>
            <p className="mt-2 text-[#9ba1ad]">Submitted at {app.submittedAt}. Confirmation #NS-W27-0412. We'll be in touch within two weeks.</p>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
            {restored && app.step === step && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl bg-[#2a2448] p-4 text-white" style={{ fontFamily: "var(--font-sans)" }} role="status">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e8a33d] text-[#121019]">
                  <RewindIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold">Restored by Where Was I?</p>
                  <p className="text-sm text-white/75">
                    {app.step === 4
                      ? "You stopped here yesterday at 6:47 PM, mid-sentence. Steps 1–3 are saved. Your cursor is where you left it."
                      : `You stopped on Step ${app.step} of 6. Everything before it is saved.`}
                  </p>
                </div>
              </div>
            )}

            <ol className="mb-8 grid grid-cols-6 gap-1.5" aria-label="Application progress">
              {STEPS.map((s, i) => {
                const n = i + 1;
                const done = n < app.step;
                const current = n === step;
                return (
                  <li key={s}>
                    <button onClick={() => done && setViewing(n === app.step ? null : n)} disabled={!done && n !== app.step} onFocus={() => undefined} className="w-full text-left" aria-current={current ? "step" : undefined}>
                      <span className={["block h-1.5 rounded-full", done ? "bg-[#1e8e5a]" : n === app.step ? "bg-[#e8a33d]" : "bg-[#33353d]"].join(" ")} />
                      <span className={["mt-2 hidden text-xs sm:block", current ? "font-semibold" : "text-[#9ba1ad]"].join(" ")}>
                        {done ? "✓ " : ""}{s}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className="mb-6 text-sm font-semibold text-[#9ba1ad]">Step {step} of 6: {STEPS[step - 1]}</p>

            {step <= 3 && (
              <section>
                <dl className="divide-y divide-[#2c2e35] rounded-xl border border-[#2c2e35] bg-[#1f2026]">
                  {SAVED[step].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 px-4 py-3 text-sm">
                      <dt className="text-[#9ba1ad]">{k}</dt>
                      <dd className="text-right">{v}</dd>
                    </div>
                  ))}
                </dl>
                <button onClick={() => setViewing(null)} className="mt-5 rounded-lg bg-[#e8e9ed] px-5 py-2.5 text-sm font-semibold text-[#17181c]">Back to Step {app.step}</button>
              </section>
            )}

            {step === 4 && (
              <section className="space-y-6">
                <div>
                  <label htmlFor="competitors" className="block text-sm font-semibold">Who are your main competitors? *</label>
                  <input id="competitors" value={app.competitors} onChange={(e) => set({ competitors: e.target.value })} className="mt-2 w-full rounded-lg border border-[#3a3d46] bg-[#1f2026] px-3 py-2 text-sm outline-none focus:border-[#a99bff]" />
                </div>
                <div>
                  <label htmlFor="advantage" className="block text-sm font-semibold">What is your company's competitive advantage? *</label>
                  <textarea
                    id="advantage"
                    ref={ref}
                    rows={7}
                    value={app.advantage}
                    onChange={(e) => set({ advantage: e.target.value })}
                    className={["mt-2 w-full rounded-lg border bg-[#1f2026] p-3 text-[15px] leading-relaxed outline-none focus:border-[#a99bff]", restored ? "border-[#e8a33d] ring-4 ring-[#e8a33d]/25" : "border-[#3a3d46]"].join(" ")}
                  />
                  <div className="mt-1 flex justify-between text-xs">
                    <span className="font-medium text-[#f3c785]">{restored ? "You stopped typing here." : ""}</span>
                    <span className="text-[#9ba1ad]">{app.advantage.length} / 1500</span>
                  </div>
                </div>
              </section>
            )}

            {step === 5 && (
              <section className="space-y-6">
                <fieldset>
                  <legend className="text-sm font-semibold">How much are you raising? *</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["Under $1M", "$1M–$2M", "$2M+"].map((v) => (
                      <label key={v} className={["cursor-pointer rounded-lg border px-4 py-2 text-sm", app.raise === v ? "border-[#a99bff] bg-[#1f2026] font-semibold" : "border-[#3a3d46]"].join(" ")}>
                        <input type="radio" name="raise" className="sr-only" checked={app.raise === v} onChange={() => set({ raise: v })} /> {v}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="text-sm font-semibold">Have you raised money before? *</legend>
                  <div className="mt-2 flex gap-5 text-sm">
                    {(["yes", "no"] as const).map((v) => (
                      <label key={v} className="flex items-center gap-2 capitalize">
                        <input type="radio" name="before" checked={app.raisedBefore === v} onChange={() => set({ raisedBefore: v })} /> {v}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </section>
            )}

            {step === 6 && (
              <section className="space-y-4">
                <dl className="divide-y divide-[#2c2e35] rounded-xl border border-[#2c2e35] bg-[#1f2026] text-sm">
                  {[["Company", "Kestrel"], ["Traction", "$38K MRR, 11 shippers"], ["Competitors", app.competitors], ["Raising", app.raise], ["Raised before", app.raisedBefore]].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 px-4 py-3">
                      <dt className="text-[#9ba1ad]">{k}</dt>
                      <dd className="text-right capitalize">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="rounded-xl bg-[#1f2026] p-4 text-sm leading-relaxed text-[#c9ccd3]">{app.advantage}</div>
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" checked={certify} onChange={(e) => setCertify(e.target.checked)} className="mt-1" />
                  I confirm this application is accurate and complete.
                </label>
              </section>
            )}

            {errors.length > 0 && (
              <ul className="mt-6 rounded-lg border border-[#6b2d27] bg-[#3a1f1c] p-3 text-sm text-[#f28b82]" role="alert">
                {errors.map((e) => <li key={e}>{e}</li>)}
              </ul>
            )}

            {step >= 4 && (
              <div className="mt-8 flex gap-2">
                {step > 4 && (
                  <button onClick={() => set({ step: step - 1 })} className="rounded-lg border border-[#3a3d46] px-5 py-2.5 text-sm">Back</button>
                )}
                {step < 6 ? (
                  <button onClick={next} className="rounded-lg bg-[#6b5bd6] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#5a4bc4]">Save and continue</button>
                ) : (
                  <button onClick={submit} disabled={!certify || submitting} className="rounded-lg bg-[#6b5bd6] px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                    {submitting ? "Submitting…" : "Submit application"}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ApplyPage() {
  return (
    <Suspense fallback={null}>
      <ApplyInner />
    </Suspense>
  );
}
