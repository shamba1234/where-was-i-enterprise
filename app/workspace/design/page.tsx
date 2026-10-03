"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DesignPreview from "@/components/DesignPreview";
import { AiCrumb, SuggestionPanel } from "@/components/Suggestions";
import { useUI } from "@/components/UIProvider";
import { Pill, btn, inputCls } from "@/components/ui";
import { ArrowLeft, BlockIcon, CheckIcon, CrumbIcon, FileIcon, FlagIcon, MicIcon, RewindIcon } from "@/components/Icons";
import { agoLabel } from "@/lib/clock";
import { latestUserCrumb, pendingAi, pendingSuggestion, statusView } from "@/lib/derive";
import { OLD_CTA, PEOPLE, SARAH_CTA, SECTION_NAMES, Section } from "@/lib/model";
import { leaveWorkspace, patchDesign, resume } from "@/lib/ops";
import { useStore } from "@/lib/store";

export default function DesignWorkspacePage() {
  return (
    <Suspense fallback={null}>
      <DesignWorkspace />
    </Suspense>
  );
}

function DesignWorkspace() {
  const params = useSearchParams();
  const id = params.get("c") ?? "";
  const wantsResume = params.get("resume") === "1";
  const { ws, me, update, hydrated } = useStore();
  const ui = useUI();
  const router = useRouter();
  const resumed = useRef(false);
  const ctaRef = useRef<HTMLInputElement>(null);
  const c = ws.commitments.find((x) => x.id === id);
  const d = ws.design[id];

  // Resume restores digital state (frame, section, draft) and records one "Resumed" event.
  useEffect(() => {
    if (!hydrated || !c || resumed.current || !wantsResume) return;
    if (c.status === "ready" || c.status === "in_progress" || c.status === "changes_requested") {
      resumed.current = true;
      update((s) => resume(s, id, me));
      setTimeout(() => ctaRef.current?.focus({ preventScroll: true }), 50);
    }
  }, [hydrated, c, wantsResume, id, me, update]);

  if (!hydrated) return null;
  if (!c || !d) {
    return (
      <main className="mx-auto max-w-xl px-6 py-20 text-center">
        <p className="text-soft">This design file isn't available. It opens from an assigned design commitment.</p>
        <button onClick={() => router.push("/")} className={btn.secondary + " mt-4"}>Back to Where Was I?</button>
      </main>
    );
  }

  const v = c.status === "in_progress" ? { label: "In progress", tone: "neutral" as const } : statusView(c, ws);
  const mine = c.assignee === me;
  const crumb = latestUserCrumb(c, me);
  const ai = pendingAi(c, me);
  const sug = pendingSuggestion(c, me);
  const sel = d.selected;
  const restored = wantsResume && d.restoredAt !== null && ws.now - d.restoredAt < 30;
  const allDone = Object.values(d.sections).every((x) => x === "done");
  const desktopDone = d.sections.desktopHero === "done" && d.sections.desktopPricing === "done";
  const set = (patch: Parameters<typeof patchDesign>[2]) => update((s) => patchDesign(s, id, patch));
  const select = (s: Section) => set({ selected: s, frame: s === "mobileHero" ? "mobile" : "desktop", sections: d.sections[s] === "todo" ? { ...d.sections, [s]: "wip" } : d.sections });
  const complete = (s: Section) => {
    const sections = { ...d.sections, [s]: "done" as const };
    const next = (["desktopHero", "desktopPricing"] as Section[]).find((k) => sections[k] !== "done");
    set({ sections: next && sections[next] === "todo" ? { ...sections, [next]: "wip" } : sections, selected: next ?? s });
  };
  const leave = () => {
    update((s) => leaveWorkspace(s, id, me));
    router.push("/");
  };
  const checkpointText = desktopDone && d.sections.mobileHero === "todo" ? "Desktop complete. Starting mobile." : allDone ? "Desktop and mobile complete." : `${SECTION_NAMES[sel]} in progress`;
  const locked = !mine || c.status === "assigned" || c.status === "submitted" || c.status === "verified";

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {/* Workspace chrome */}
      <header className="sticky top-0 z-30 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-surface px-4 py-2.5">
        <button onClick={leave} className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-sm font-medium text-accent-text hover:brightness-95">
          <ArrowLeft className="h-4 w-4" /> Back to Where Was I?
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">landing-page-redesign.fig</p>
          <p className="text-xs text-mute">Demo design file, simulated. Not a real Figma integration.</p>
        </div>
        <Pill tone={v.tone}>{v.label}</Pill>
        {mine && !locked && (
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <button onClick={() => ui.open({ kind: "breadcrumb", id })} className={btn.secondary + " py-1.5"}><CrumbIcon className="h-4 w-4" /> Leave a breadcrumb</button>
            <button onClick={() => ui.open({ kind: "breadcrumb", id, voice: true })} aria-label="Leave a voice breadcrumb (simulated)" title="Voice breadcrumb (simulated)" className="grid h-9 w-9 place-items-center rounded-full border border-line-strong text-soft hover:bg-raised hover:text-text"><MicIcon className="h-4 w-4" /></button>
            <button onClick={() => ui.open({ kind: "checkpoint", id, suggestion: checkpointText })} className={btn.secondary + " py-1.5"}><FlagIcon className="h-4 w-4" /> Save checkpoint</button>
            {c.status !== "blocked" && <button onClick={() => ui.open({ kind: "blocker", id })} className={btn.quiet}><BlockIcon className="h-4 w-4" /> I'm blocked</button>}
            <button onClick={() => ui.open({ kind: "submit", id })} disabled={!allDone || c.status === "blocked"} title={!allDone ? "Finish every section first" : undefined} className={btn.primary + " py-1.5"}>{c.reviews.length ? "Resubmit for review" : "Send for review"}</button>
          </div>
        )}
      </header>

      {restored && (
        <div className="rise flex flex-wrap items-start gap-3 border-b border-accent/20 bg-accent-soft/60 px-5 py-3" role="status">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-accent-fg"><RewindIcon className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold">Restored by Where Was I?</p>
            <p className="text-soft">
              Back at <span className="font-medium text-text">{SECTION_NAMES[sel]}</span>, with your draft and completed sections intact.
              {crumb && <> Your breadcrumb: “{crumb.text.replace(/\n+/g, " ")}”</>}
            </p>
          </div>
        </div>
      )}
      {c.status === "changes_requested" && c.feedback && (
        <div className="border-b border-warn/20 bg-warn-soft px-5 py-2.5 text-sm"><span className="font-semibold text-warn">{PEOPLE[c.reviewer ?? "jordan"].first}'s feedback: </span>{c.feedback}</div>
      )}
      {c.status === "blocked" && c.blocker && (
        <div className="border-b border-blocked/20 bg-blocked-soft px-5 py-2.5 text-sm"><span className="font-semibold text-blocked">Blocked: waiting on {PEOPLE[c.blocker.by].first}</span> for {c.blocker.reason.charAt(0).toLowerCase() + c.blocker.reason.slice(1)}. No action needed from you until it lands.</div>
      )}
      {c.status === "submitted" && (
        <div className="border-b border-review/20 bg-review-soft px-5 py-2.5 text-sm"><span className="font-semibold text-review">Submitted for review.</span> Your portion is complete. Next owner: {PEOPLE[c.reviewer!].name}.</div>
      )}
      {c.status === "verified" && (
        <div className="border-b border-ok/20 bg-ok-soft px-5 py-2.5 text-sm"><span className="font-semibold text-ok">Verified ✓</span> Approved by {PEOPLE[c.verifiedBy as keyof typeof PEOPLE]?.name}.</div>
      )}

      <div className="grid flex-1 gap-0 lg:grid-cols-[220px_1fr_300px]">
        {/* Layers */}
        <aside className="space-y-6 border-b border-line bg-surface p-4 lg:border-b-0 lg:border-r">
          <div>
            <p className="text-xs font-semibold text-mute">Sections</p>
            <ul className="mt-2 space-y-1">
              {(Object.keys(SECTION_NAMES) as Section[]).map((s) => (
                <li key={s}>
                  <button onClick={() => !locked && select(s)} disabled={locked} aria-current={sel === s} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm ${sel === s ? "bg-accent-soft font-semibold text-accent-text" : "hover:bg-raised"}`}>
                    <span className={`grid h-4 w-4 place-items-center rounded-full border ${d.sections[s] === "done" ? "border-ok bg-ok text-surface" : d.sections[s] === "wip" ? "border-warn" : "border-line-strong"}`}>{d.sections[s] === "done" && <CheckIcon className="h-3 w-3" />}</span>
                    {SECTION_NAMES[s]}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-mute">Assets</p>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li className="flex items-center gap-2 text-soft"><FileIcon className="h-4 w-4" /> brand-kit.zip</li>
              <li className={`flex items-center gap-2 ${d.screenshots ? "font-medium text-ok" : "text-mute"}`}><FileIcon className="h-4 w-4" /> {d.screenshots ? "final-api-screenshots.zip, from Alex" : "API screenshots: not delivered yet"}</li>
              <li className="text-soft"><span className="text-xs text-mute">Sarah's launch CTA copy</span><br />“{SARAH_CTA}”</li>
            </ul>
          </div>
        </aside>

        {/* Canvas */}
        <section className="min-w-0 bg-raised/50 p-5 sm:p-8" aria-label="Canvas">
          <div className="mx-auto max-w-3xl rounded-2xl border border-line bg-surface p-5 shadow-sm">
            <DesignPreview d={d} selected={sel} onSelect={locked ? undefined : select} size="lg" />
          </div>
          {!locked && !desktopDone && (
            <p className="mt-4 text-center text-sm text-mute">
              Select a section to edit it.{" "}
              <button onClick={() => set({ sections: { ...d.sections, desktopHero: "done", desktopPricing: "done" }, selected: "desktopPricing" })} className="font-medium text-accent-text hover:underline">Complete the desktop portion</button>
            </p>
          )}
        </section>

        {/* Inspector */}
        <aside className="space-y-5 border-t border-line bg-surface p-4 lg:border-l lg:border-t-0">
          <div>
            <p className="text-xs font-semibold text-mute">Selected</p>
            <p className="font-display text-lg font-semibold">{SECTION_NAMES[sel]}</p>
            <p className="text-sm text-soft">{d.sections[sel] === "done" ? "Complete" : d.sections[sel] === "wip" ? "In progress" : "Not started"}</p>
          </div>
          {(sel === "desktopHero" || sel === "mobileHero") && (
            <div className="space-y-3">
              <div>
                <label htmlFor="ws-headline" className="mb-1 block text-sm font-medium text-soft">Headline</label>
                <input id="ws-headline" value={d.headline} disabled={locked} onChange={(e) => set({ headline: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label htmlFor="ws-cta" className="mb-1 block text-sm font-medium text-soft">CTA button</label>
                <input id="ws-cta" ref={ctaRef} value={d.cta} disabled={locked} onChange={(e) => set({ cta: e.target.value })} className={inputCls} />
                {d.cta !== SARAH_CTA && !locked && (
                  <button onClick={() => set({ cta: SARAH_CTA })} className="mt-1.5 text-sm text-accent-text hover:underline">Use Sarah's new CTA copy</button>
                )}
                {d.cta === OLD_CTA && <p className="mt-1 text-xs text-mute">Old launch copy</p>}
              </div>
              {sel === "mobileHero" && !d.screenshots && <p className="rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn">Product image is a placeholder until the API screenshots arrive.</p>}
            </div>
          )}
          {!locked && d.sections[sel] !== "done" && (
            <button onClick={() => complete(sel)} className={btn.primary + " w-full"}><CheckIcon className="h-4 w-4" /> Mark {SECTION_NAMES[sel].toLowerCase()} complete</button>
          )}
          {!locked && d.sections[sel] === "done" && (
            <button onClick={() => set({ sections: { ...d.sections, [sel]: "wip" } })} className={btn.secondary + " w-full"}>Reopen section</button>
          )}

          {(sug || ai) && (
            <div>
              {sug && <SuggestionPanel c={c} b={sug} />}
              {ai && <AiCrumb c={c} b={ai} />}
            </div>
          )}

          <div className="border-t border-line pt-4 text-sm">
            <p className="text-xs font-semibold text-mute">Commitment</p>
            <p className="mt-1 font-medium">{c.title}</p>
            <p className="mt-2 text-xs font-semibold text-accent-text">Next action</p>
            <p>{c.status === "submitted" ? `${PEOPLE[c.reviewer!].first} reviews it.` : c.nextAction}</p>
            {crumb && (
              <>
                <p className="mt-3 flex items-center gap-1 text-xs font-semibold text-mute"><CrumbIcon className="h-3.5 w-3.5" /> Your latest breadcrumb, {agoLabel(crumb.at, ws.now)}</p>
                <p className="mt-0.5 whitespace-pre-line text-soft">“{crumb.text}”</p>
              </>
            )}
            {c.checkpoints.length > 0 && (
              <>
                <p className="mt-3 flex items-center gap-1 text-xs font-semibold text-mute"><FlagIcon className="h-3.5 w-3.5" /> Latest checkpoint</p>
                <p className="mt-0.5 text-soft">{c.checkpoints[c.checkpoints.length - 1].text}</p>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
