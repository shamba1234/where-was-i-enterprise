"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AiCrumb, SuggestionPanel } from "@/components/Suggestions";
import { useUI } from "@/components/UIProvider";
import { Pill, btn, inputCls } from "@/components/ui";
import { ArrowLeft, BlockIcon, CheckIcon, CrumbIcon, FlagIcon, MicIcon, RewindIcon } from "@/components/Icons";
import { agoLabel } from "@/lib/clock";
import { latestUserCrumb, pendingAi, pendingSuggestion, statusView } from "@/lib/derive";
import { APP_STEPS, PEOPLE } from "@/lib/model";
import { leaveWorkspace, patchApp, resume, submitApplication } from "@/lib/ops";
import { useStore } from "@/lib/store";

export default function ApplicationPage() {
  return (
    <Suspense fallback={null}>
      <Application />
    </Suspense>
  );
}

const SAVED: Record<number, [string, string][]> = {
  1: [["Company", "Northstar Labs"], ["Website", "northstar-demo.local"], ["Stage", "Seed"]],
  2: [["Product", "Launch tooling for product teams"], ["Customers", "40 teams"], ["Pricing", "Per-seat, from $29"]],
};

function Application() {
  const params = useSearchParams();
  const wantsResume = params.get("resume") === "1";
  const { ws, me, update, hydrated } = useStore();
  const ui = useUI();
  const router = useRouter();
  const resumed = useRef(false);
  const revenueRef = useRef<HTMLInputElement>(null);
  const [certify, setCertify] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);
  const c = ws.commitments.find((x) => x.id === "app");
  const a = ws.app;

  useEffect(() => {
    if (!hydrated || !c || resumed.current || !wantsResume || a.submitted) return;
    resumed.current = true;
    update((s) => resume(s, "app", me));
    setTimeout(() => revenueRef.current?.focus({ preventScroll: true }), 60);
  }, [hydrated, c, wantsResume, a.submitted, me, update]);

  if (!hydrated || !c) return null;
  const v = c.status === "in_progress" ? { label: "In progress", tone: "neutral" as const } : statusView(c, ws);
  const mine = c.assignee === me;
  const crumb = latestUserCrumb(c, me);
  const ai = pendingAi(c, me);
  const sug = pendingSuggestion(c, me);
  const step = viewing ?? a.step;
  const set = (p: Parameters<typeof patchApp>[1]) => update((s) => patchApp(s, p));
  const leave = () => {
    update((s) => leaveWorkspace(s, "app", me));
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-30 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-surface px-4 py-2.5">
        <button onClick={leave} className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-sm font-medium text-accent-text hover:brightness-95">
          <ArrowLeft className="h-4 w-4" /> Back to Where Was I?
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Brightwave Studio partner program</p>
          <p className="text-xs text-mute">Demo partner portal, simulated</p>
        </div>
        <Pill tone={v.tone}>{v.label}</Pill>
        {mine && !a.submitted && (
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <button onClick={() => ui.open({ kind: "breadcrumb", id: "app" })} className={btn.secondary + " py-1.5"}><CrumbIcon className="h-4 w-4" /> Leave a breadcrumb</button>
            <button onClick={() => ui.open({ kind: "breadcrumb", id: "app", voice: true })} aria-label="Leave a voice breadcrumb (simulated)" className="grid h-9 w-9 place-items-center rounded-full border border-line-strong text-soft hover:bg-raised"><MicIcon className="h-4 w-4" /></button>
            <button onClick={() => ui.open({ kind: "checkpoint", id: "app", suggestion: `${APP_STEPS[a.step - 1]} in progress` })} className={btn.secondary + " py-1.5"}><FlagIcon className="h-4 w-4" /> Save checkpoint</button>
            {c.status !== "blocked" && <button onClick={() => ui.open({ kind: "blocker", id: "app" })} className={btn.quiet}><BlockIcon className="h-4 w-4" /> I'm blocked</button>}
          </div>
        )}
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8">
        {wantsResume && !a.submitted && (
          <div className="rise mb-6 rounded-2xl border border-accent/30 bg-accent-soft/60 p-4" role="status">
            <p className="flex items-center gap-2 font-semibold"><RewindIcon className="h-4 w-4 text-accent-text" /> Restored by Where Was I?</p>
            <p className="mt-1 text-sm text-soft">You stopped at Company background, Step 3 of 5. Steps 1 and 2 are saved.</p>
            {crumb && (
              <blockquote className="mt-2 whitespace-pre-line border-l-2 border-accent pl-3 text-[15px]">“{crumb.text}”<span className="mt-1 block text-xs text-mute">Your breadcrumb, written by you, {agoLabel(crumb.at, ws.now)}</span></blockquote>
            )}
          </div>
        )}
        {c.status === "blocked" && c.blocker && (
          <div className="mb-6 rounded-2xl bg-blocked-soft px-4 py-3 text-sm"><span className="font-semibold text-blocked">Blocked: waiting on {PEOPLE[c.blocker.by].first}</span> for {c.blocker.reason.charAt(0).toLowerCase() + c.blocker.reason.slice(1)}.</div>
        )}
        {(sug || ai) && <div className="mb-6">{sug && <SuggestionPanel c={c} b={sug} />}{ai && <AiCrumb c={c} b={ai} />}</div>}

        <p className="text-sm font-medium text-accent-text">Partner program application</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Brightwave Studio partners, winter cohort</h1>

        {a.submitted ? (
          <div className="mt-8 rounded-3xl border border-ok/30 bg-ok-soft p-8 text-center">
            <CheckIcon className="mx-auto h-10 w-10 text-ok" />
            <p className="mt-3 font-display text-2xl font-semibold">Application submitted</p>
            <p className="text-soft">Confirmation {a.confirmation} (demo partner portal). Where Was I? verified the commitment from this confirmation.</p>
          </div>
        ) : (
          <>
            <ol className="mt-6 grid grid-cols-5 gap-2" aria-label="Application progress">
              {APP_STEPS.map((s, i) => {
                const n = i + 1;
                const done = n < a.step;
                return (
                  <li key={s}>
                    <button onClick={() => done && setViewing(n === viewing ? null : n)} disabled={!done && n !== a.step} aria-current={n === step ? "step" : undefined} className="w-full text-left">
                      <span className={`block h-1.5 rounded-full ${done ? "bg-ok" : n === a.step ? "bg-accent" : "bg-line"}`} />
                      <span className={`mt-1.5 block text-xs ${n === step ? "font-semibold text-text" : "text-mute"}`}>{done ? "✓ " : ""}{s}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className="mt-6 text-sm font-semibold text-mute">Step {step} of 5: {APP_STEPS[step - 1]}</p>

            {step <= 2 && (
              <div className="mt-4 rounded-2xl border border-line bg-surface p-5">
                {SAVED[step].map(([k, val]) => (
                  <p key={k} className="flex justify-between border-b border-line py-2 text-sm last:border-0"><span className="text-mute">{k}</span><span>{val}</span></p>
                ))}
                <button onClick={() => setViewing(null)} className={btn.secondary + " mt-4"}>Back to Step {a.step}</button>
              </div>
            )}

            {step === 3 && (
              <div className="mt-4 space-y-5 rounded-2xl border border-line bg-surface p-5">
                <div>
                  <label htmlFor="app-desc" className="mb-1.5 block text-sm font-medium">Describe your company *</label>
                  <textarea id="app-desc" rows={4} value={a.description} onChange={(e) => set({ description: e.target.value })} className={inputCls + " leading-relaxed"} />
                </div>
                <div>
                  <label htmlFor="app-revenue" className="mb-1.5 block text-sm font-medium">Annual revenue, most recent *</label>
                  <input id="app-revenue" ref={revenueRef} value={a.revenue} onChange={(e) => set({ revenue: e.target.value })} placeholder="e.g. $2.4M ARR" className={inputCls + (wantsResume && !a.revenue ? " border-warn ring-2 ring-warn/20" : "")} />
                  {!a.revenue && <p className="mt-1 text-xs text-warn">You stopped here: the updated number comes from Sarah.</p>}
                </div>
                <div>
                  <label htmlFor="app-deck" className="mb-1.5 block text-sm font-medium">Pitch deck</label>
                  <select id="app-deck" value={a.deck} onChange={(e) => set({ deck: e.target.value as "v2" | "v3" })} className={inputCls}>
                    <option value="v2">Northstar pitch deck v2 (Sep)</option>
                    <option value="v3">Northstar pitch deck v3 (Oct)</option>
                  </select>
                </div>
              </div>
            )}
            {step === 4 && (
              <div className="mt-4 rounded-2xl border border-line bg-surface p-5">
                <label htmlFor="app-lead" className="mb-1.5 block text-sm font-medium">Tell us about your leadership team *</label>
                <textarea id="app-lead" rows={5} value={a.leadership} onChange={(e) => set({ leadership: e.target.value })} className={inputCls} />
              </div>
            )}
            {step === 5 && (
              <div className="mt-4 space-y-3 rounded-2xl border border-line bg-surface p-5 text-sm">
                {[["Revenue", a.revenue], ["Pitch deck", a.deck === "v3" ? "v3 (Oct)" : "v2 (Sep)"], ["Leadership", a.leadership ? "Answered" : "Missing"]].map(([k, val]) => (
                  <p key={k} className="flex justify-between border-b border-line pb-2"><span className="text-mute">{k}</span><span>{val}</span></p>
                ))}
                <label className="flex items-start gap-2"><input type="checkbox" checked={certify} onChange={(e) => setCertify(e.target.checked)} className="mt-0.5" /> The information in this application is accurate.</label>
              </div>
            )}

            {step >= 3 && viewing === null && mine && (
              <div className="mt-6 flex gap-2">
                {a.step > 3 && <button onClick={() => set({ step: a.step - 1 })} className={btn.secondary}>Back</button>}
                {a.step < 5 ? (
                  <button onClick={() => set({ step: a.step + 1 })} disabled={(a.step === 3 && (!a.revenue.trim() || a.description.trim().length < 20)) || (a.step === 4 && a.leadership.trim().length < 10)} className={btn.primary}>Save and continue</button>
                ) : (
                  <button onClick={() => update((s) => submitApplication(s, me))} disabled={!certify} className={btn.primary}>Submit application</button>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
