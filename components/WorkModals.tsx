"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Commitment, PEOPLE, PersonId, TEAM } from "@/lib/model";
import { locationOf } from "@/lib/ops";
import { detectDependency, parseBlocker } from "@/lib/parse";
import { useStore } from "@/lib/store";
import { CheckIcon, CrumbIcon, MicIcon } from "./Icons";
import { Field, Modal, btn, inputCls } from "./ui";

const lowerFirst = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/* ---------------- I'm blocked ---------------- */

export function BlockerModal({ c, prefill, onClose, onConfirm }: { c: Commitment; prefill?: { person: PersonId; reason: string }; onClose: () => void; onConfirm: (person: PersonId, reason: string) => void }) {
  const { ws, me } = useStore();
  const [text, setText] = useState(prefill ? `Waiting on ${PEOPLE[prefill.person].first} for ${lowerFirst(prefill.reason)}` : "");
  const parsed = useMemo(() => parseBlocker(text, me), [text, me]);
  const [person, setPerson] = useState<PersonId | null>(prefill?.person ?? null);
  const [reason, setReason] = useState<string | null>(prefill?.reason ?? null);
  const [step, setStep] = useState<"describe" | "confirm">("describe");
  const who = person ?? parsed.person;
  const why = reason ?? parsed.reason;
  const words = why.toLowerCase().split(/\W+/).filter((w) => w.length > 3 && !["final", "new", "updated", "latest"].includes(w));
  const existing = who ? ws.commitments.find((x) => x.id !== c.id && x.assignee === who && x.status !== "verified" && x.status !== "completed" && words.some((w) => x.title.toLowerCase().includes(w.replace(/s$/, "")))) : undefined;
  const manager = c.assignedBy && c.assignedBy !== me ? PEOPLE[c.assignedBy].first : null;

  return (
    <Modal title="I'm blocked" subtitle={<>On <span className="font-medium text-text">{c.title}</span></>} onClose={onClose}>
      {step === "describe" ? (
        <div className="space-y-4">
          <Field label="What are you blocked by?" htmlFor="blocker-text">
            <textarea id="blocker-text" autoFocus rows={2} value={text} onChange={(e) => { setText(e.target.value); setPerson(null); setReason(null); }} placeholder="Waiting for Alex to send the final API screenshots." className={inputCls + " resize-none"} />
          </Field>
          {!text && (
            <button type="button" onClick={() => setText("Waiting for Alex to send the final API screenshots.")} className="rounded-full border border-line px-3 py-1 text-sm text-soft hover:border-accent hover:text-text">
              Use example: Waiting for Alex to send the final API screenshots.
            </button>
          )}
          {text.trim() && (
            <div className="rise grid gap-4 rounded-2xl border border-line bg-raised/50 p-4 sm:grid-cols-2">
              <Field label="Blocked by" htmlFor="blocker-person">
                <select id="blocker-person" value={who ?? ""} onChange={(e) => setPerson((e.target.value || null) as PersonId | null)} className={inputCls}>
                  <option value="">Choose a teammate</option>
                  {[...TEAM, "jordan" as PersonId].filter((p) => p !== me).map((p) => (
                    <option key={p} value={p}>{PEOPLE[p].name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Reason" htmlFor="blocker-reason">
                <input id="blocker-reason" value={why} onChange={(e) => setReason(e.target.value)} className={inputCls} />
              </Field>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className={btn.secondary}>Cancel</button>
            <button onClick={() => setStep("confirm")} disabled={!who || !why.trim()} className={btn.primary}>Review change</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-soft">Confirming changes who owns the next action. Nothing changes until you confirm.</p>
          <ul className="space-y-2 rounded-2xl border border-line p-4 text-[15px]">
            <li className="flex gap-2"><span className="w-36 shrink-0 text-mute">Status</span><span className="font-semibold text-blocked">Blocked: waiting on {PEOPLE[who!].first}</span></li>
            <li className="flex gap-2"><span className="w-36 shrink-0 text-mute">Reason</span><span>{why}</span></li>
            <li className="flex gap-2"><span className="w-36 shrink-0 text-mute">Next action owner</span><span>{PEOPLE[who!].name}</span></li>
            <li className="flex gap-2"><span className="w-36 shrink-0 text-mute">Dependency</span><span>{existing ? <>Linked to {PEOPLE[who!].first}'s open request “{existing.title}”</> : <>A new request to {PEOPLE[who!].first}: “{why}”</>}</span></li>
            {manager && <li className="flex gap-2"><span className="w-36 shrink-0 text-mute">Visible to</span><span>{manager}, on the team view</span></li>}
          </ul>
          <div className="flex justify-end gap-2">
            <button onClick={() => setStep("describe")} className={btn.secondary}>Back</button>
            <button onClick={() => onConfirm(who!, why.trim())} className={btn.primary}>Confirm blocker</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ---------------- Leave a breadcrumb ---------------- */

function transcriptFor(c: Commitment, location: string) {
  if (c.workspace === "design") return "I have to leave for my meeting. Desktop is finished. Don't do the mobile hero until Alex sends the screenshots.";
  if (c.workspace === "application") return "Need the updated revenue number from Sarah. Use pitch deck version 3. Then answer the leadership question.";
  return `I'm stopping at ${lowerFirst(location || "this point")}. Next I'll ${lowerFirst(c.nextAction.replace(/\.$/, ""))}.`;
}

export function BreadcrumbModal({
  c,
  prefillText,
  startWithVoice,
  onClose,
  onSave,
}: {
  c: Commitment;
  prefillText?: string;
  startWithVoice?: boolean;
  onClose: () => void;
  onSave: (d: { text: string; nextAction: string; shared: boolean; voice: boolean }) => void;
}) {
  const { ws, me } = useStore();
  const location = locationOf(ws, c);
  const lastCp = c.checkpoints[c.checkpoints.length - 1];
  const [text, setText] = useState(prefillText ?? "");
  const [next, setNext] = useState(c.nextAction);
  const [shared, setShared] = useState(true);
  const [listening, setListening] = useState(false);
  const [voice, setVoice] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manager = PEOPLE[c.assignedBy && c.assignedBy !== me ? c.assignedBy : "jordan"].first;

  const dep = useMemo(() => detectDependency(text, me), [text, me]);
  const suggestedNext = dep?.person ? `Check for ${PEOPLE[dep.person].first}'s ${lowerFirst(dep.reason)}, then ${lowerFirst(c.nextAction.replace(/\.$/, ""))}.` : null;

  const simulate = () => {
    setListening(true);
    timer.current = setTimeout(() => {
      setListening(false);
      setVoice(true);
      setText(transcriptFor(c, location));
    }, 1600);
  };
  useEffect(() => {
    if (startWithVoice) simulate();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Modal title="Save where your head is at" subtitle="A breadcrumb keeps what you were thinking, which never shows up in any app's history." onClose={onClose} wide>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-raised/50 p-4">
          <p className="text-xs font-semibold text-mute">Goal</p>
          <p className="mt-0.5 font-medium">{c.goal}</p>
          <p className="mt-1 text-xs text-mute">Filled in from the commitment</p>
        </div>
        <div className="rounded-2xl border border-line bg-raised/50 p-4">
          <p className="text-xs font-semibold text-mute">Where you stopped</p>
          <p className="mt-0.5 font-medium">{location || "Not in a workspace"}</p>
          <p className="mt-1 text-xs text-mute">{lastCp ? `Last checkpoint: ${lastCp.text}` : "Filled in from your workspace"}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <label htmlFor="crumb-text" className="text-sm font-medium text-soft">What was on your mind?</label>
          <button type="button" onClick={simulate} disabled={listening} aria-label="Simulated voice breadcrumb" className={btn.demo + " py-1"}>
            <MicIcon className={`h-4 w-4 ${listening ? "listening text-blocked" : ""}`} />
            {listening ? "Listening (simulated)…" : "Speak a breadcrumb"}
          </button>
        </div>
        <textarea
          id="crumb-text"
          autoFocus={!startWithVoice}
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Decisions, things to remember, what you're waiting on, what you were about to try…"
          className={inputCls + " resize-y leading-relaxed"}
        />
        {voice && (
          <p className="mt-1.5 rounded-lg bg-warn-soft px-3 py-1.5 text-xs text-warn" role="status">
            Simulated voice capture: this demo inserts a sample transcript. No audio was recorded. Edit it before saving.
          </p>
        )}
        {!text && !listening && (
          <button
            type="button"
            onClick={() => setText(c.workspace === "design" ? "Use Sarah's new CTA copy.\nDon't finalize the mobile hero until Alex sends the new API screenshots." : transcriptFor(c, location))}
            className="mt-2 rounded-full border border-line px-3 py-1 text-left text-sm text-soft hover:border-accent hover:text-text"
          >
            Use example: {c.workspace === "design" ? "Use Sarah's new CTA copy. Don't finalize the mobile hero until Alex sends the new API screenshots." : transcriptFor(c, location)}
          </button>
        )}
      </div>

      <div className="mt-4">
        <Field label="Next action" htmlFor="crumb-next">
          <input id="crumb-next" value={next} onChange={(e) => setNext(e.target.value)} className={inputCls} />
        </Field>
        {suggestedNext && next !== suggestedNext && (
          <button type="button" onClick={() => setNext(suggestedNext)} className="mt-1.5 text-sm text-accent-text hover:underline">
            Use: {suggestedNext}
          </button>
        )}
      </div>

      <label className="mt-4 flex items-start gap-2.5 text-sm">
        <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} className="mt-0.5 h-4 w-4" />
        <span>
          <span className="font-medium">Share with {manager} as work context</span>
          <span className="block text-mute">Shared breadcrumbs appear on this commitment for your team. Unshared ones stay visible only to you.</span>
        </span>
      </label>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
        <p className="flex items-center gap-1.5 text-sm text-mute"><CrumbIcon className="h-4 w-4" /> Saved as written by {PEOPLE[me].first}</p>
        <div className="flex gap-2">
          <button onClick={onClose} className={btn.secondary}>Cancel</button>
          <button onClick={() => onSave({ text, nextAction: next, shared, voice })} disabled={!text.trim()} className={btn.primary}>Save breadcrumb</button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- Send for review ---------------- */

export function SubmitModal({ c, ready, onClose, onSubmit }: { c: Commitment; ready: { ok: boolean; reason?: string }; onClose: () => void; onSubmit: (reviewer: PersonId, note: string) => void }) {
  const { me } = useStore();
  const [reviewer, setReviewer] = useState<PersonId>(c.reviewer ?? c.assignedBy ?? "jordan");
  const round = c.reviews.length + 1;
  const [note, setNote] = useState(round === 1 ? (c.workspace === "design" ? "Desktop and mobile layouts are complete." : "") : c.workspace === "design" ? "Updated the mobile hero CTA to Sarah's new launch copy." : "");
  const evidence = c.workspace === "design" ? `Figma prototype: landing page v${round} (demo link)` : "Submitted work (demo)";
  return (
    <Modal title={round > 1 ? "Resubmit for review" : "Send for review"} subtitle={<>Hands off <span className="font-medium text-text">{c.title}</span>. Your part is done; the reviewer owns the next action.</>} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Reviewer" htmlFor="sub-reviewer">
          <select id="sub-reviewer" value={reviewer} onChange={(e) => setReviewer(e.target.value as PersonId)} className={inputCls}>
            {(Object.keys(PEOPLE) as PersonId[]).filter((p) => p !== me).map((p) => (
              <option key={p} value={p}>{PEOPLE[p].name}</option>
            ))}
          </select>
        </Field>
        <div>
          <p className="mb-1.5 text-sm font-medium text-soft">Evidence</p>
          <p className="rounded-xl border border-line bg-raised/50 px-3 py-2 text-sm">{evidence}</p>
          {c.evidenceRequirement && <p className="mt-1 text-xs text-mute">Required: {c.evidenceRequirement}</p>}
        </div>
        <Field label="Note for the reviewer" htmlFor="sub-note">
          <textarea id="sub-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls + " resize-none"} />
        </Field>
        {!ready.ok && <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">{ready.reason}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className={btn.secondary}>Cancel</button>
          <button onClick={() => onSubmit(reviewer, note.trim())} disabled={!ready.ok} className={btn.primary}>{round > 1 ? "Resubmit" : "Send for review"}</button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- Checkpoint ---------------- */

export function CheckpointModal({ c, suggestion, onClose, onSave }: { c: Commitment; suggestion: string; onClose: () => void; onSave: (text: string) => void }) {
  const [text, setText] = useState(suggestion);
  return (
    <Modal title="Save checkpoint" subtitle="A checkpoint records a meaningful step of progress you choose to save." onClose={onClose}>
      <Field label="What's done?" htmlFor="cp-text">
        <input id="cp-text" autoFocus value={text} onChange={(e) => setText(e.target.value)} className={inputCls} onKeyDown={(e) => e.key === "Enter" && text.trim() && onSave(text.trim())} />
      </Field>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className={btn.secondary}>Cancel</button>
        <button onClick={() => onSave(text.trim())} disabled={!text.trim()} className={btn.primary}>
          <CheckIcon className="h-4 w-4" /> Save checkpoint
        </button>
      </div>
      <p className="mt-3 text-xs text-mute">On {c.title}.</p>
    </Modal>
  );
}
