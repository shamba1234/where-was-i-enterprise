"use client";

import { useEffect } from "react";
import { ManualTask, TaskDraft } from "@/lib/state";
import CaptureForm from "./CaptureForm";
import { CloseIcon } from "./Icons";

export default function CaptureModal({
  task,
  onSave,
  onClose,
}: {
  task?: ManualTask; // present = editing
  onSave: (draft: TaskDraft) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const editing = Boolean(task);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-ink/60 px-4 py-6 backdrop-blur-sm sm:py-16"
      role="dialog"
      aria-modal="true"
      aria-labelledby="capture-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="rise mx-auto w-full max-w-2xl rounded-3xl bg-card p-6 shadow-2xl sm:p-8">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="capture-title" className="font-display text-2xl font-bold">
              {editing ? "Edit task" : "Tell me what to remember"}
            </h2>
            <p className="mt-1 text-ink-soft">
              {editing
                ? "Change anything I got wrong. It stays in Open loops until you mark it complete."
                : "I'll keep it in Open loops next to what I find in your apps, and bring it up when you ask."}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-paper" aria-label="Close">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <CaptureForm mode={editing ? "edit" : "new"} task={task} onSubmit={onSave} onCancel={onClose} />
      </div>
    </div>
  );
}
