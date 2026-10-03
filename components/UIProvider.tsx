"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PEOPLE, PersonId } from "@/lib/model";
import * as O from "@/lib/ops";
import { useStore } from "@/lib/store";
import AssignModal from "./AssignModal";
import CaptureModal from "./CaptureModal";
import CommitmentDrawer from "./CommitmentDrawer";
import ReviewModal from "./ReviewModal";
import { BlockerModal, BreadcrumbModal, CheckpointModal, SubmitModal } from "./WorkModals";

type Modal =
  | { kind: "assign" }
  | { kind: "capture"; editId?: string }
  | { kind: "drawer"; id: string }
  | { kind: "blocker"; id: string; prefill?: { person: PersonId; reason: string }; fromBreadcrumb?: string }
  | { kind: "breadcrumb"; id: string; prefillText?: string; replacesAi?: string; voice?: boolean }
  | { kind: "submit"; id: string }
  | { kind: "review"; id: string }
  | { kind: "checkpoint"; id: string; suggestion: string }
  | null;

type Toast = { id: number; text: string; tone?: "ok" | "neutral" };

type UI = {
  open: (m: NonNullable<Modal>) => void;
  close: () => void;
  toast: (text: string, tone?: Toast["tone"]) => void;
  justChanged: string | null;
  accept: (id: string) => void;
  start: (id: string, thenOpen?: boolean) => void;
  resolve: (depId: string) => void;
  confirmSuggestion: (cid: string, bid: string) => void;
  ignoreSuggestion: (cid: string, bid: string) => void;
  confirmAi: (cid: string, bid: string) => void;
  ignoreAi: (cid: string, bid: string) => void;
  completeOccurrence: (id: string) => void;
  markComplete: (id: string) => void;
  verify: (id: string) => void;
  remove: (id: string) => void;
};
const Ctx = createContext<UI | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const { ws, me, update } = useStore();
  const router = useRouter();
  const [modal, setModal] = useState<Modal>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [justChanged, setJustChanged] = useState<string | null>(null);
  const close = useCallback(() => setModal(null), []);
  const toast = useCallback((text: string, tone: Toast["tone"] = "neutral") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  const flash = (id: string) => {
    setJustChanged(id);
    setTimeout(() => setJustChanged((j) => (j === id ? null : j)), 2400);
  };
  useEffect(() => setModal(null), [me]);

  const c = (id: string) => ws.commitments.find((x) => x.id === id);
  const designReady = (id: string) => {
    const d = ws.design[id];
    if (!d) return { ok: true };
    const missing = (Object.keys(d.sections) as (keyof typeof d.sections)[]).filter((k) => d.sections[k] !== "done");
    return missing.length ? { ok: false, reason: `Finish the ${missing.map((m) => ({ desktopHero: "desktop hero", desktopPricing: "desktop pricing", mobileHero: "mobile hero" })[m]).join(" and ")} first.` } : { ok: true };
  };

  const ui: UI = {
    open: setModal,
    close,
    toast,
    justChanged,
    accept: (id) => {
      update((s) => O.accept(s, id, me));
      flash(id);
      toast(`Accepted. ${c(id)?.assignedBy ? `${PEOPLE[c(id)!.assignedBy!].first} can see it's yours.` : ""}`, "ok");
    },
    start: (id, thenOpen) => {
      update((s) => O.start(s, id, me));
      const x = c(id);
      if (thenOpen && x?.workspace) router.push(x.workspace === "design" ? `/workspace/design?c=${id}` : "/workspace/application");
      else toast("Work started.");
    },
    resolve: (depId) => {
      const dep = c(depId);
      update((s) => O.resolveDependency(s, depId));
      toast(dep ? `Demo event: ${PEOPLE[dep.assignee].first} attached the ${dep.title.toLowerCase()}.` : "Dependency resolved.", "ok");
    },
    confirmSuggestion: (cid, bid) => {
      const b = c(cid)?.breadcrumbs.find((x) => x.id === bid);
      if (!b?.suggestion) return;
      update((s) => O.block(s, cid, me, b.suggestion!.person, b.suggestion!.needed, bid));
      flash(cid);
      toast(`Blocked: waiting on ${PEOPLE[b.suggestion.person].first}. ${PEOPLE[b.suggestion.person].first} owns the next action.`);
    },
    ignoreSuggestion: (cid, bid) => update((s) => O.ignoreSuggestion(s, cid, bid)),
    confirmAi: (cid, bid) => {
      update((s) => O.confirmAi(s, cid, bid));
      toast("Confirmed. It now counts as your context.", "ok");
    },
    ignoreAi: (cid, bid) => update((s) => O.ignoreAi(s, cid, bid)),
    completeOccurrence: (id) => {
      update((s) => O.completeOccurrence(s, id, me));
      flash(id);
      toast("Done for this occurrence. The next one is scheduled.", "ok");
    },
    markComplete: (id) => {
      update((s) => O.markComplete(s, id, me));
      flash(id);
      const x = c(id);
      toast(x?.assignedBy && x.assignedBy !== me ? `Marked complete. Waiting for ${PEOPLE[x.assignedBy].first} to verify.` : "Marked complete by you. Nothing independent verified it.");
    },
    verify: (id) => {
      update((s) => O.verifyCompletion(s, id, me));
      flash(id);
      toast("Verified ✓", "ok");
    },
    remove: (id) => {
      update((s) => O.deleteCommitment(s, id));
      toast("Deleted.");
    },
  };

  const target = modal && "id" in modal ? c(modal.id) : undefined;

  return (
    <Ctx.Provider value={ui}>
      {children}

      {modal?.kind === "assign" && (
        <AssignModal
          onClose={close}
          onAssign={(d) => {
            let id = "";
            update((s) => {
              const r = O.assign(s, me, d);
              id = r.id;
              return r.state;
            });
            close();
            flash(id);
            toast(`Assigned to ${PEOPLE[d.assignee].first}. It's on ${PEOPLE[d.assignee].first}'s dashboard now.`, "ok");
          }}
        />
      )}
      {modal?.kind === "capture" && (
        <CaptureModal
          edit={modal.editId ? c(modal.editId) : undefined}
          onClose={close}
          onSave={(d) => {
            if (modal.editId) {
              const eid = modal.editId;
              update((s) => O.editCommitment(s, eid, d));
              toast("Changes saved.");
            } else {
              let id = "";
              update((s) => {
                const r = O.capture(s, me, d);
                id = r.id;
                return r.state;
              });
              flash(id);
              toast(`Captured “${d.title}”. Created by ${PEOPLE[me].first}.`, "ok");
            }
            close();
          }}
        />
      )}
      {modal?.kind === "drawer" && <CommitmentDrawer id={modal.id} onClose={close} />}
      {modal?.kind === "blocker" && target && (
        <BlockerModal
          c={target}
          prefill={modal.prefill}
          onClose={close}
          onConfirm={(person, reason) => {
            update((s) => O.block(s, target.id, me, person, reason, modal.fromBreadcrumb));
            close();
            flash(target.id);
            toast(`Blocked: waiting on ${PEOPLE[person].first}. No action needed from you until it lands.`);
          }}
        />
      )}
      {modal?.kind === "breadcrumb" && target && (
        <BreadcrumbModal
          c={target}
          prefillText={modal.prefillText}
          startWithVoice={modal.voice}
          onClose={close}
          onSave={(d) => {
            update((s) => O.saveBreadcrumb(s, target.id, me, d, modal.replacesAi).state);
            close();
            flash(target.id);
            toast(d.shared ? "Breadcrumb saved and shared as work context." : "Breadcrumb saved. Private to you.", "ok");
          }}
        />
      )}
      {modal?.kind === "submit" && target && (
        <SubmitModal
          c={target}
          ready={designReady(target.id)}
          onClose={close}
          onSubmit={(reviewer, note) => {
            update((s) => O.submitForReview(s, target.id, me, reviewer, note));
            close();
            flash(target.id);
            toast(`Your part is done. Next owner: ${PEOPLE[reviewer].name}.`, "ok");
          }}
        />
      )}
      {modal?.kind === "review" && target && (
        <ReviewModal
          c={target}
          onClose={close}
          onApprove={() => {
            update((s) => O.approve(s, target.id, me));
            flash(target.id);
          }}
          onChanges={(f) => {
            update((s) => O.requestChanges(s, target.id, me, f));
            flash(target.id);
          }}
        />
      )}
      {modal?.kind === "checkpoint" && target && (
        <CheckpointModal
          c={target}
          suggestion={modal.suggestion}
          onClose={close}
          onSave={(text) => {
            update((s) => O.saveCheckpoint(s, target.id, me, text));
            close();
            toast("Checkpoint saved.", "ok");
          }}
        />
      )}

      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} role="status" className={`rise pointer-events-auto max-w-lg rounded-2xl px-4 py-2.5 text-sm shadow-xl ${t.tone === "ok" ? "bg-ok text-surface" : "bg-text text-bg"}`}>
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useUI() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useUI must be used inside UIProvider");
  return c;
}
