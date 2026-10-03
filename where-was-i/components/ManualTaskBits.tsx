"use client";

import { useEffect, useRef, useState } from "react";
import { urgency } from "@/lib/clock";
import { ManualTask, PostponeBy } from "@/lib/state";
import { ChevronDown } from "./Icons";

const PILL: Record<string, { label: string; cls: string }> = {
  overdue: { label: "Overdue", cls: "bg-lamp text-ink" },
  soon: { label: "Due soon", cls: "bg-lamp-soft text-[#8a5410]" },
  today: { label: "Today", cls: "bg-paper text-dusk" },
  tomorrow: { label: "Tomorrow", cls: "bg-paper text-dusk" },
  later: { label: "Upcoming", cls: "bg-paper text-dusk" },
  none: { label: "No deadline", cls: "bg-paper text-mute" },
  important: { label: "Important", cls: "bg-lamp-soft text-[#8a5410]" },
  done: { label: "Completed", cls: "bg-sage text-white" },
};

export function isPressing(t: ManualTask) {
  const u = urgency(t);
  return u === "overdue" || u === "soon";
}

export function UrgencyPill({ task, done }: { task: ManualTask; done?: boolean }) {
  const u = urgency(task);
  const key = done ? "done" : task.priority === "high" && !isPressing(task) ? "important" : u;
  const p = PILL[key];
  return <span className={["shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", p.cls].join(" ")}>{p.label}</span>;
}

export function PostponeMenu({ onPick, onCustom, compact }: { onPick: (by: PostponeBy) => void; onCustom: () => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const choose = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={[
          "inline-flex items-center gap-1 rounded-full border border-line font-medium text-ink-soft hover:border-ink-soft",
          compact ? "px-3 py-1 text-sm" : "px-4 py-2 text-sm",
        ].join(" ")}
      >
        Postpone <ChevronDown className="h-4 w-4" />
      </button>
      {open && (
        <div role="menu" className="rise absolute left-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-xl border border-line bg-card py-1 shadow-xl">
          {(
            [
              ["hour", "1 hour later"],
              ["day", "1 day later"],
              ["week", "1 week later"],
            ] as const
          ).map(([by, label]) => (
            <button key={by} role="menuitem" onClick={() => choose(() => onPick(by))} className="block w-full px-4 py-2 text-left text-sm hover:bg-paper">
              {label}
            </button>
          ))}
          <button role="menuitem" onClick={() => choose(onCustom)} className="block w-full border-t border-line px-4 py-2 text-left text-sm hover:bg-paper">
            Pick a new time…
          </button>
        </div>
      )}
    </div>
  );
}

export function DeleteConfirm({ title, onConfirm, onCancel }: { title: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="rise flex flex-wrap items-center gap-2 text-sm" role="alertdialog" aria-label="Delete task">
      <span className="mr-1 text-ink-soft">Delete “{title}”? This can't be undone.</span>
      <button onClick={onConfirm} className="rounded-full bg-ink px-3 py-1.5 font-semibold text-white hover:bg-dusk">
        Delete
      </button>
      <button onClick={onCancel} className="rounded-full border border-line px-3 py-1.5 font-medium text-ink-soft hover:border-ink-soft">
        Keep it
      </button>
    </div>
  );
}
