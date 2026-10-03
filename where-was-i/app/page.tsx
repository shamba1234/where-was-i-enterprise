"use client";

import { useCallback, useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import AskBox from "@/components/AskBox";
import CaptureModal from "@/components/CaptureModal";
import ManualTaskCard from "@/components/ManualTaskCard";
import ProofModal from "@/components/ProofModal";
import TaskCard, { TASKS } from "@/components/TaskCard";
import Toast, { ToastMsg } from "@/components/Toast";
import WhereWasIPanel from "@/components/WhereWasIPanel";
import { PlusIcon, RewindIcon } from "@/components/Icons";
import { sortKey } from "@/lib/clock";
import { ManualTask, TaskDraft, addManualTask, editManualTask, isDone, setManualCompleted, useDemo } from "@/lib/state";

type Capture = { mode: "new" } | { mode: "edit"; task: ManualTask } | null;

export default function Dashboard() {
  const { state, hydrated, update } = useDemo();
  const [panel, setPanel] = useState(false);
  const [proof, setProof] = useState(false);
  const [capture, setCapture] = useState<Capture>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const closePanel = useCallback(() => setPanel(false), []);
  const closeProof = useCallback(() => setProof(false), []);
  const closeCapture = useCallback(() => setCapture(null), []);
  const clearToast = useCallback(() => setToast(null), []);

  const manualOpen = state.manualTasks.filter((t) => !t.completed).sort((a, b) => sortKey(a) - sortKey(b) || a.createdOrder - b.createdOrder);
  const connectedOpen = TASKS.filter((t) => !isDone(state, t.id)).length;
  const open = connectedOpen + manualOpen.length;
  const total = TASKS.length + manualOpen.length;

  useEffect(() => {
    if (!justAdded) return;
    document.getElementById(`task-${justAdded}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => setJustAdded(null), 2500);
    return () => clearTimeout(t);
  }, [justAdded]);

  const save = (draft: TaskDraft) => {
    if (capture?.mode === "edit") {
      const id = capture.task.id;
      update((s) => editManualTask(s, id, draft));
      setToast({ id: Date.now(), text: "Changes saved." });
    } else {
      let newId = "";
      update((s) => {
        const r = addManualTask(s, draft);
        newId = r.id;
        return r.state;
      });
      setJustAdded(newId);
      setToast({ id: Date.now(), text: `Added “${draft.title}” to Open loops.` });
    }
    setCapture(null);
  };

  const complete = (task: ManualTask) => {
    update((s) => setManualCompleted(s, task.id, true));
    setToast({
      id: Date.now(),
      text: `“${task.title}” moved to Completed.`,
      undo: () => update((s) => setManualCompleted(s, task.id, false)),
      link: { href: "/tasks#completed", label: "View" },
    });
  };

  return (
    <div className="min-h-screen">
      <AppHeader
        onReset={() => {
          setPanel(false);
          setProof(false);
          setCapture(null);
          setToast(null);
        }}
      />

      <main className="mx-auto max-w-6xl px-5 pb-16 sm:px-8">
        <section className="grid items-end gap-8 pb-10 pt-12 md:grid-cols-[1fr_auto] md:pt-16">
          <div>
            <p className="text-mute">Friday, 10:38 PM</p>
            <h1 className="mt-1 font-display text-6xl font-bold tracking-tight sm:text-7xl md:text-8xl">Good evening.</h1>
            <p className="mt-4 max-w-xl text-xl text-ink-soft">
              {!hydrated
                ? "Here's what still needs your attention."
                : open === 0
                  ? "Everything you were tracking is done, and each one is backed by evidence."
                  : "Here's what still needs your attention."}
            </p>
          </div>

          <button
            onClick={() => setPanel(true)}
            className="group relative flex w-full items-center gap-5 overflow-hidden rounded-[28px] bg-dusk px-7 py-6 text-left text-white shadow-[0_18px_40px_-18px_rgba(59,51,112,.8)] hover:bg-[#443b80] md:w-[380px]"
          >
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-lamp text-ink transition-transform group-hover:-rotate-45 motion-reduce:transition-none">
              <RewindIcon className="h-8 w-8" />
            </span>
            <span>
              <span className="block font-display text-3xl font-bold leading-none">Where Was I?</span>
              <span className="mt-2 block text-sm text-white/75">Rebuild yesterday's session and pick up where you stopped</span>
            </span>
          </button>
        </section>

        <AskBox />

        <section className="mt-12" aria-labelledby="tasks-title">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="tasks-title" className="font-display text-2xl font-semibold">
                Open loops
              </h2>
              <p className="mt-0.5 text-sm text-mute">
                {hydrated ? `${open} of ${total} still open. ` : ""}From your connected apps and from what you've told me.
              </p>
            </div>
            <button
              onClick={() => setCapture({ mode: "new" })}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-dusk"
            >
              <PlusIcon className="h-4 w-4" /> Add task
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {TASKS.map((t) => (
              <TaskCard key={t.id} spec={t} onProof={() => setProof(true)} />
            ))}
            {hydrated &&
              manualOpen.map((t) => (
                <ManualTaskCard
                  key={t.id}
                  task={t}
                  justAdded={t.id === justAdded}
                  onEdit={() => setCapture({ mode: "edit", task: t })}
                  onComplete={() => complete(t)}
                />
              ))}
            <button
              onClick={() => setCapture({ mode: "new" })}
              className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line p-5 text-ink-soft hover:border-dusk hover:text-ink"
            >
              <PlusIcon className="h-5 w-5" />
              <span className="font-medium">Tell me something to remember</span>
              <span className="text-sm text-mute">“Call Mom tomorrow at 7 PM”</span>
            </button>
          </div>
        </section>

        <footer className="mt-14 border-t border-line pt-6 text-sm text-mute">
          <p>
            Sources in this prototype are mock apps running on this device: Demo Canvas, Demo Gmail and Demo Browser.
            Tasks only close when one of them shows evidence. Tasks you add yourself close when you mark them complete.
          </p>
        </footer>
      </main>

      {panel && <WhereWasIPanel onClose={closePanel} />}
      {proof && <ProofModal onClose={closeProof} />}
      {capture && <CaptureModal task={capture.mode === "edit" ? capture.task : undefined} onSave={save} onClose={closeCapture} />}
      <Toast toast={toast} onDone={clearToast} />
    </div>
  );
}
