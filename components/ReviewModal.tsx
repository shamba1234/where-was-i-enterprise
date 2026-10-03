"use client";

import { useState } from "react";
import { atLabel } from "@/lib/clock";
import { Commitment, PEOPLE } from "@/lib/model";
import { useStore } from "@/lib/store";
import DesignPreview from "./DesignPreview";
import { CheckIcon, LinkIcon } from "./Icons";
import { Avatar, Modal, btn, inputCls } from "./ui";

export default function ReviewModal({ c, onClose, onApprove, onChanges }: { c: Commitment; onClose: () => void; onApprove: () => void; onChanges: (feedback: string) => void }) {
  const { ws } = useStore();
  const [mode, setMode] = useState<"review" | "changes">("review");
  const [feedback, setFeedback] = useState("");
  const live = ws.commitments.find((x) => x.id === c.id) ?? c;
  const last = live.reviews[live.reviews.length - 1];
  const prior = live.reviews.slice(0, -1).filter((r) => r.feedback);
  const ev = live.evidence.find((e) => e.id === last?.evidenceId);
  const design = ws.design[live.id];
  const done = live.status === "verified";

  return (
    <Modal title={live.project ?? live.title} subtitle={live.project ? live.title : undefined} onClose={onClose} wide>
      <div className="grid gap-5 sm:grid-cols-[1fr_220px]">
        <div className="space-y-4">
          {design && (
            <div className="rounded-2xl border border-line bg-raised/50 p-4">
              <DesignPreview d={design} />
            </div>
          )}
          {last?.note && (
            <div>
              <p className="text-xs font-semibold text-mute">Employee note</p>
              <p className="mt-1 text-[15px]">“{last.note}”</p>
            </div>
          )}
          {prior.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-mute">Earlier feedback</p>
              {prior.map((r) => (
                <p key={r.round} className="mt-1 text-sm text-soft">Round {r.round}: “{r.feedback}”</p>
              ))}
            </div>
          )}
        </div>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-xs font-semibold text-mute">Submitted by</dt>
            <dd className="mt-1 flex items-center gap-2"><Avatar p={live.assignee} size={22} /> {PEOPLE[live.assignee].name}</dd>
          </div>
          {last && (
            <div>
              <dt className="text-xs font-semibold text-mute">Submitted</dt>
              <dd className="mt-0.5">{atLabel(last.submittedAt)}{last.round > 1 ? `, round ${last.round}` : ""}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-semibold text-mute">Evidence</dt>
            <dd className="mt-0.5 flex items-start gap-1.5"><LinkIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent-text" /> {ev?.name ?? "None attached"}</dd>
            {ev?.simulated && <dd className="text-xs text-mute">Demo link, no real file</dd>}
          </div>
          {live.evidenceRequirement && (
            <div>
              <dt className="text-xs font-semibold text-mute">Required</dt>
              <dd className="mt-0.5">{live.evidenceRequirement}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="mt-6 border-t border-line pt-5" aria-live="polite">
        {done ? (
          <div className="settle rounded-2xl bg-ok-soft p-4">
            <p className="flex items-center gap-2 font-display text-2xl font-semibold text-ok"><CheckIcon className="h-6 w-6" /> Verified</p>
            <p className="text-sm text-soft">Approved by {PEOPLE[live.verifiedBy as keyof typeof PEOPLE]?.name ?? "reviewer"}, {atLabel(live.verifiedAt!)}</p>
            <button onClick={onClose} className={btn.secondary + " mt-3"}>Done</button>
          </div>
        ) : live.status === "changes_requested" ? (
          <div className="rounded-2xl bg-warn-soft p-4">
            <p className="font-semibold text-warn">Changes requested. Back with {PEOPLE[live.assignee].first}.</p>
            <p className="text-sm text-soft">“{live.feedback}”</p>
            <button onClick={onClose} className={btn.secondary + " mt-3"}>Done</button>
          </div>
        ) : mode === "review" ? (
          <div className="flex flex-wrap justify-end gap-2">
            <button onClick={() => setMode("changes")} className={btn.secondary}>Request changes</button>
            <button onClick={onApprove} className={btn.primary}><CheckIcon className="h-4 w-4" /> Approve</button>
          </div>
        ) : (
          <div className="space-y-3">
            <label htmlFor="review-feedback" className="block text-sm font-medium text-soft">What needs to change?</label>
            <textarea id="review-feedback" autoFocus rows={2} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Use the new CTA copy." className={inputCls + " resize-none"} />
            {!feedback && (
              <button type="button" onClick={() => setFeedback("Use the new CTA copy.")} className="rounded-full border border-line px-3 py-1 text-sm text-soft hover:border-accent hover:text-text">
                Use example: Use the new CTA copy.
              </button>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setMode("review")} className={btn.secondary}>Back</button>
              <button onClick={() => onChanges(feedback.trim())} disabled={!feedback.trim()} className={btn.primary}>Send back to {PEOPLE[live.assignee].first}</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
