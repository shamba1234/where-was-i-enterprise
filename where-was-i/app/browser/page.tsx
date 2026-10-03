"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import DemoBar from "@/components/DemoBar";
import { CheckIcon, FileIcon, RewindIcon } from "@/components/Icons";
import { DEMO_TIMES, DemoState, useDemo } from "@/lib/state";

type View = "history" | "app";

const HISTORY_ROWS = [
  { time: "9:02 PM", title: "Activity stopped", url: "", stop: true },
  { time: "8:34 PM", title: "Application questions – Caterpillar Software Engineering Intern", url: "careers-demo.local/caterpillar/swe-intern/apply?step=3", app: true },
  { time: "8:16 PM", title: "Resume_v3 – Document editor", url: "docs-demo.local/resume_v3" },
  { time: "7:48 PM", title: "Start application – Caterpillar Software Engineering Intern", url: "careers-demo.local/caterpillar/swe-intern/apply?step=1", app: true },
  { time: "7:41 PM", title: "Software Engineering Intern, Summer 2027 – Caterpillar", url: "careers-demo.local/caterpillar/swe-intern" },
  { time: "7:27 PM", title: "Technology Internship Program – Capital One", url: "careers-demo.local/capital-one/tip" },
  { time: "7:22 PM", title: "Software Engineering Intern – John Deere", url: "careers-demo.local/john-deere/swe-intern" },
  { time: "7:14 PM", title: "Software Engineering Intern, Summer 2027 – Caterpillar", url: "careers-demo.local/caterpillar/swe-intern" },
];

const STEPS = ["Personal info", "Resume", "Application questions", "Review & submit"];

function BrowserInner() {
  const params = useSearchParams();
  const resume = params.get("resume") === "1";
  const { state } = useDemo();
  const [view, setView] = useState<View>("history");
  const [step, setStep] = useState(3);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    if (resume) {
      setView("app");
      setStep(3);
      setRestored(true);
    }
  }, [resume]);

  const url =
    view === "history"
      ? "demo://history"
      : state.caterpillar.submitted
        ? "careers-demo.local/caterpillar/swe-intern/apply/confirmation"
        : `careers-demo.local/caterpillar/swe-intern/apply?step=${step}`;

  return (
    <div className="min-h-screen bg-[#dfe1e5]" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <DemoBar app="Demo Browser" />
      {/* Browser chrome */}
      <div className="px-2 pt-2">
        <div className="flex items-end gap-1 overflow-x-auto">
          <Tab active={view === "history"} onClick={() => setView("history")}>History</Tab>
          <Tab active={view === "app"} onClick={() => setView("app")}>Caterpillar – Apply</Tab>
        </div>
        <div className="flex items-center gap-3 rounded-t-lg bg-white px-3 py-2">
          <span className="hidden gap-3 text-[#5f6368] sm:flex" aria-hidden>
            <span>←</span><span>→</span><span>↻</span>
          </span>
          <div className="min-w-0 flex-1 truncate rounded-full bg-[#f1f3f4] px-4 py-1.5 text-sm text-[#3c4043]">{url}</div>
          <span className="hidden rounded bg-[#f1f3f4] px-2 py-1 text-xs font-semibold text-[#5f6368] sm:inline">Demo Browser</span>
        </div>
      </div>

      <div className="mx-2 min-h-[calc(100vh-130px)] bg-white">
        {view === "history" ? (
          <HistoryView onOpenApp={() => { setView("app"); setStep(3); }} />
        ) : (
          <ApplicationView step={step} setStep={setStep} restored={restored} dismissRestored={() => setRestored(false)} />
        )}
      </div>
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={[
        "max-w-[220px] shrink-0 truncate rounded-t-lg px-4 py-2 text-left text-xs",
        active ? "bg-white font-medium text-[#202124]" : "text-[#3c4043] hover:bg-white/50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function HistoryView({ onOpenApp }: { onOpenApp: () => void }) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <h1 className="text-2xl text-[#202124]">History</h1>
      <div className="mt-6 overflow-hidden rounded-lg border border-[#dadce0]">
        <h2 className="border-b border-[#dadce0] px-5 py-3 text-sm font-semibold text-[#202124]">Yesterday, Thursday, October 1</h2>
        <ul>
          {HISTORY_ROWS.map((r, i) => (
            <li key={i} className="border-b border-[#f1f3f4] last:border-0">
              {r.stop ? (
                <p className="flex items-center gap-4 px-5 py-3 text-sm text-[#5f6368]">
                  <span className="w-16 shrink-0 tabular-nums">{r.time}</span>
                  <span className="italic">No more activity after this</span>
                </p>
              ) : (
                <button onClick={r.app ? onOpenApp : undefined} className={["flex w-full items-center gap-4 px-5 py-3 text-left text-sm", r.app ? "hover:bg-[#f8f9fa]" : "cursor-default"].join(" ")}>
                  <span className="w-16 shrink-0 tabular-nums text-[#5f6368]">{r.time}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[#202124]">{r.title}</span>
                    <span className="block truncate text-xs text-[#5f6368]">{r.url}</span>
                  </span>
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ApplicationView({
  step,
  setStep,
  restored,
  dismissRestored,
}: {
  step: number;
  setStep: (n: number) => void;
  restored: boolean;
  dismissRestored: () => void;
}) {
  const { state, update } = useDemo();
  const app = state.caterpillar;
  const whyRef = useRef<HTMLTextAreaElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [certify, setCertify] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Land exactly where the user stopped: cursor at the end of the half-written answer.
  useEffect(() => {
    if (restored && step === 3 && whyRef.current && !app.submitted) {
      const el = whyRef.current;
      el.focus({ preventScroll: true });
      el.setSelectionRange(el.value.length, el.value.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restored, step]);

  const set = (patch: Partial<DemoState["caterpillar"]>) =>
    update((s) => ({ ...s, caterpillar: { ...s.caterpillar, ...patch } }));

  const toReview = () => {
    const e: string[] = [];
    if (app.whyAnswer.trim().length < 40) e.push("Write a few sentences about why you're interested.");
    if (!app.workAuth) e.push("Answer whether you're authorized to work in the U.S.");
    if (!app.sponsorship) e.push("Answer whether you'll need sponsorship.");
    setErrors(e);
    if (e.length === 0) {
      dismissRestored();
      setStep(4);
    }
  };

  const submit = () => {
    setSubmitting(true);
    setTimeout(() => {
      set({ submitted: true, submittedAt: DEMO_TIMES.caterpillarSubmit });
      setSubmitting(false);
    }, 1000);
  };

  if (app.submitted) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#e6f4ea] text-[#137333]">
          <CheckIcon className="h-8 w-8" />
        </span>
        <h1 className="mt-5 text-3xl font-semibold text-[#1c2b36]">Application submitted</h1>
        <p className="mt-2 text-[#4b5b66]">
          Software Engineering Intern, Summer 2027. Submitted at {app.submittedAt}. Confirmation #CAT-2027-48113.
        </p>
      </div>
    );
  }

  return (
    <div className="text-[#1c2b36]">
      <div className="border-b border-[#e3e6e8] bg-[#fbfaf6] px-5 py-5 sm:px-10">
        <p className="text-xs font-semibold text-[#8a6d00]">Caterpillar careers (demo portal)</p>
        <h1 className="mt-1 text-2xl font-semibold">Software Engineering Intern, Summer 2027</h1>
        <p className="text-sm text-[#4b5b66]">Peoria, IL or Chicago, IL · Req 2027-SWE-114</p>
      </div>

      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        {restored && step === 3 && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl bg-[#3b3370] p-4 text-white" style={{ fontFamily: "var(--font-sans)" }} role="status">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e0952a] text-[#211c3f]">
              <RewindIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold">Restored by Where Was I?</p>
              <p className="text-sm text-white/80">
                You stopped here yesterday at 9:02 PM, partway through your answer. Personal info and resume are already done.
              </p>
            </div>
          </div>
        )}

        <ol className="mb-8 grid grid-cols-4 gap-2" aria-label="Application progress">
          {STEPS.map((s, i) => {
            const n = i + 1;
            const done = n < step;
            const current = n === step;
            return (
              <li key={s}>
                <button
                  onClick={() => n < step && setStep(n)}
                  className="w-full text-left"
                  disabled={n >= step}
                  aria-current={current ? "step" : undefined}
                >
                  <span className={["block h-1.5 rounded-full", done ? "bg-[#137333]" : current ? "bg-[#f2b600]" : "bg-[#e3e6e8]"].join(" ")} />
                  <span className={["mt-2 block text-xs sm:text-sm", current ? "font-semibold" : "text-[#4b5b66]"].join(" ")}>
                    {done ? "✓ " : ""}{s}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {step === 1 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Personal info</h2>
            {[["Name", "Jordan Lee"], ["Email", "jordan.lee@school.edu"], ["School", "University of Illinois Urbana-Champaign"], ["Major", "Computer Engineering, Class of 2028"]].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-[#eef0f1] py-2 text-sm"><span className="text-[#4b5b66]">{k}</span><span>{v}</span></div>
            ))}
            <button onClick={() => setStep(3)} className="mt-4 rounded bg-[#1c2b36] px-5 py-2 text-sm font-semibold text-white">Back to where I stopped</button>
          </section>
        )}

        {step === 2 && (
          <section>
            <h2 className="text-lg font-semibold">Resume</h2>
            <div className="mt-3 flex items-center gap-3 rounded border border-[#e3e6e8] p-4 text-sm">
              <FileIcon className="h-6 w-6 text-[#8a6d00]" />
              <div><p className="font-semibold">Resume_v3.pdf</p><p className="text-[#4b5b66]">Updated yesterday at 8:16 PM</p></div>
            </div>
            <button onClick={() => setStep(3)} className="mt-4 rounded bg-[#1c2b36] px-5 py-2 text-sm font-semibold text-white">Back to where I stopped</button>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-6">
            <h2 className="text-lg font-semibold">Application questions</h2>

            <div>
              <label htmlFor="why" className="block text-sm font-semibold">Why are you interested in this role? *</label>
              <textarea
                id="why"
                ref={whyRef}
                rows={6}
                value={app.whyAnswer}
                onChange={(e) => set({ whyAnswer: e.target.value })}
                className={[
                  "mt-2 w-full rounded border p-3 text-sm leading-relaxed outline-none focus:border-[#1c2b36]",
                  restored ? "border-[#e0952a] ring-4 ring-[#fbecd2]" : "border-[#c9cfd3]",
                ].join(" ")}
              />
              {restored && <p className="mt-1 text-xs font-medium text-[#8a5410]">You stopped typing here.</p>}
            </div>

            <fieldset>
              <legend className="text-sm font-semibold">Are you legally authorized to work in the United States? *</legend>
              <div className="mt-2 flex gap-5 text-sm">
                {(["yes", "no"] as const).map((v) => (
                  <label key={v} className="flex items-center gap-2 capitalize">
                    <input type="radio" name="auth" checked={app.workAuth === v} onChange={() => set({ workAuth: v })} /> {v}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-semibold">Will you now or in the future require visa sponsorship? *</legend>
              <div className="mt-2 flex gap-5 text-sm">
                {(["yes", "no"] as const).map((v) => (
                  <label key={v} className="flex items-center gap-2 capitalize">
                    <input type="radio" name="sponsor" checked={app.sponsorship === v} onChange={() => set({ sponsorship: v })} /> {v}
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="term" className="block text-sm font-semibold">Preferred start</label>
              <select id="term" value={app.startTerm} onChange={(e) => set({ startTerm: e.target.value })} className="mt-2 rounded border border-[#c9cfd3] px-3 py-2 text-sm">
                <option>Summer 2027</option>
                <option>Fall 2027 co-op</option>
              </select>
            </div>

            {errors.length > 0 && (
              <ul className="rounded border border-[#f2c4bd] bg-[#fdf1ef] p-3 text-sm text-[#a52714]" role="alert">
                {errors.map((e) => <li key={e}>{e}</li>)}
              </ul>
            )}

            <button onClick={toReview} className="rounded bg-[#f2b600] px-6 py-2.5 text-sm font-semibold text-[#1c2b36] hover:brightness-95">
              Save and continue
            </button>
          </section>
        )}

        {step === 4 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Review & submit</h2>
            <dl className="space-y-2 text-sm">
              {[["Name", "Jordan Lee"], ["Resume", "Resume_v3.pdf"], ["Work authorization", app.workAuth], ["Sponsorship needed", app.sponsorship], ["Start", app.startTerm]].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-[#eef0f1] py-2"><dt className="text-[#4b5b66]">{k}</dt><dd className="capitalize">{v}</dd></div>
              ))}
            </dl>
            <div className="rounded bg-[#f6f7f8] p-3 text-sm leading-relaxed text-[#4b5b66]">{app.whyAnswer}</div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={certify} onChange={(e) => setCertify(e.target.checked)} className="mt-1" />
              I certify that the information in this application is accurate.
            </label>
            <div className="flex gap-2">
              <button onClick={() => setStep(3)} className="rounded border border-[#c9cfd3] px-5 py-2.5 text-sm">Back</button>
              <button onClick={submit} disabled={!certify || submitting} className="rounded bg-[#f2b600] px-6 py-2.5 text-sm font-semibold text-[#1c2b36] disabled:opacity-50">
                {submitting ? "Submitting…" : "Submit application"}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default function BrowserPage() {
  return (
    <Suspense fallback={null}>
      <BrowserInner />
    </Suspense>
  );
}
