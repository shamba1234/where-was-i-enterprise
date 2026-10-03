"use client";

import { useState } from "react";
import { whenLabel } from "@/lib/clock";
import { ManualTask, deleteManualTask, postponeManualTask, useDemo } from "@/lib/state";
import { CheckIcon, ToldIcon } from "./Icons";
import { DeleteConfirm, PostponeMenu, UrgencyPill, isPressing } from "./ManualTaskBits";

/**
 * Open-loops card for something the user told Where Was I? directly.
 * Deliberately not dressed as a connected source: dashed icon tile, "Added by you",
 * and completion is the user's word ("Marked complete by you"), not app evidence.
 */
export default function ManualTaskCard({
  task,
  justAdded,
  onEdit,
  onComplete,
}: {
  task: ManualTask;
  justAdded?: boolean;
  onEdit: () => void;
  onComplete: () => void;
}) {
  const { update } = useDemo();
  const [finishing, setFinishing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const pressing = isPressing(task);

  const complete = () => {
    setFinishing(true);
    setTimeout(onComplete, 750);
  };

  return (
    <article
      id={`task-${task.id}`}
      className={[
        "relative flex flex-col rounded-2xl border bg-card p-5 transition-colors",
        finishing ? "border-sage/40" : pressing ? "border-lamp/60" : "border-line",
        justAdded ? "rise ring-2 ring-dusk/30" : "",
      ].join(" ")}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={[
              "grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-dashed",
              finishing ? "border-sage/50 text-sage" : "border-mute/50 text-ink-soft",
            ].join(" ")}
          >
            <ToldIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className={["font-display text-lg font-semibold leading-tight", finishing ? "text-ink-soft line-through decoration-sage/60" : ""].join(" ")}>
              {task.title}
            </h3>
            <p className="text-sm text-mute">Added by you</p>
          </div>
        </div>
        <UrgencyPill task={task} done={finishing} />
      </header>

      <div className="mt-4 flex-1" aria-live="polite">
        {finishing ? (
          <p className="flex items-center gap-2 text-[15px] font-medium text-sage">
            <CheckIcon className="h-4 w-4" /> Marked complete by you
          </p>
        ) : (
          <>
            <p className={["text-[15px] font-medium", pressing ? "text-[#8a5410]" : ""].join(" ")}>{whenLabel(task)}</p>
            <p className="mt-1 text-sm text-mute">
              {task.timeKind === "approx" ? "Approximate time" : task.timeKind === "before" ? "Deadline" : task.date ? "Scheduled" : "Whenever you get to it"}
              {task.priority === "high" ? ", high priority" : task.priority === "low" ? ", low priority" : ""}
            </p>
            {task.notes && <p className="mt-3 text-sm text-ink-soft">{task.notes}</p>}
          </>
        )}
      </div>

      {!finishing && (
        <footer className="mt-5">
          {confirmDelete ? (
            <DeleteConfirm title={task.title} onConfirm={() => update((s) => deleteManualTask(s, task.id))} onCancel={() => setConfirmDelete(false)} />
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={complete} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-dusk">
                Mark complete
              </button>
              <PostponeMenu onPick={(by) => update((s) => postponeManualTask(s, task.id, by))} onCustom={onEdit} />
              <span className="ml-auto flex gap-1">
                <button onClick={onEdit} className="rounded-full px-2.5 py-1.5 text-sm font-medium text-mute hover:bg-paper hover:text-ink">
                  Edit
                </button>
                <button onClick={() => setConfirmDelete(true)} className="rounded-full px-2.5 py-1.5 text-sm font-medium text-mute hover:bg-paper hover:text-ink">
                  Delete
                </button>
              </span>
            </div>
          )}
        </footer>
      )}
    </article>
  );
}
