"use client";

import Link from "next/link";
import { useEffect } from "react";

export type ToastMsg = { id: number; text: string; undo?: () => void; link?: { href: string; label: string } };

export default function Toast({ toast, onDone }: { toast: ToastMsg | null; onDone: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDone, 5000);
    return () => clearTimeout(t);
  }, [toast, onDone]);

  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      <div role="status" className="rise pointer-events-auto flex max-w-xl items-center gap-4 rounded-2xl bg-ink px-5 py-3 text-sm text-white shadow-2xl">
        <span className="min-w-0">{toast.text}</span>
        {toast.undo && (
          <button
            onClick={() => {
              toast.undo?.();
              onDone();
            }}
            className="shrink-0 font-semibold text-lamp hover:underline"
          >
            Undo
          </button>
        )}
        {toast.link && (
          <Link href={toast.link.href} className="shrink-0 font-semibold text-white/80 hover:text-white hover:underline">
            {toast.link.label}
          </Link>
        )}
      </div>
    </div>
  );
}
