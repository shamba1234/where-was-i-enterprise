"use client";

import { useEffect } from "react";

export type ToastMsg = { id: number; text: string; undo?: () => void };

export default function Toast({ toast, onDone }: { toast: ToastMsg | null; onDone: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDone, 5000);
    return () => clearTimeout(t);
  }, [toast, onDone]);
  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      <div role="status" className="rise pointer-events-auto flex max-w-xl items-center gap-4 rounded-2xl border border-line-strong bg-raised px-5 py-3 text-sm shadow-2xl">
        <span>{toast.text}</span>
        {toast.undo && (
          <button onClick={() => { toast.undo?.(); onDone(); }} className="shrink-0 font-semibold text-lamp hover:underline">
            Undo
          </button>
        )}
      </div>
    </div>
  );
}
