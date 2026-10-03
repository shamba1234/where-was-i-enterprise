"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { Commitment, PEOPLE, PersonId, Workspace } from "@/lib/model";
import { Tone, isOpen, ownerOf, whyOpen } from "@/lib/derive";
import { atLabel } from "@/lib/clock";
import { ArrowRight, ChevronDown, CloseIcon } from "./Icons";

export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-full border border-line-strong bg-surface px-4 py-2 text-sm font-medium text-text transition hover:bg-raised disabled:cursor-not-allowed disabled:opacity-40",
  quiet: "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-mute transition hover:bg-raised hover:text-text",
  demo: "inline-flex items-center gap-2 rounded-full border border-dashed border-line-strong px-3.5 py-1.5 text-sm font-medium text-soft transition hover:border-accent hover:text-text",
};
export const inputCls =
  "w-full rounded-xl border border-line bg-bg px-3 py-2 text-[15px] text-text outline-none transition placeholder:text-mute focus:border-accent focus:ring-2 focus:ring-accent/20";

const TONE: Record<Tone, string> = {
  accent: "bg-accent-soft text-accent-text",
  neutral: "bg-raised text-soft",
  blocked: "bg-blocked-soft text-blocked",
  warn: "bg-warn-soft text-warn",
  ok: "bg-ok-soft text-ok",
  review: "bg-review-soft text-review",
};
export function Pill({ tone, children, className = "" }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[tone]} ${className}`}>{children}</span>;
}

const AVATAR: Record<PersonId, string> = { jordan: "#56648a", maya: "#9c5276", alex: "#3c7a80", sarah: "#8a6a2c" };
export function Avatar({ p, size = 28 }: { p: PersonId; size?: number }) {
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: AVATAR[p], fontSize: size * 0.38 }}
      aria-hidden
    >
      {PEOPLE[p].initials}
    </span>
  );
}

export function SectionTitle({ id, title, count, note, action }: { id?: string; title: string; count?: number; note?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 id={id} className="flex items-baseline gap-2 font-display text-xl font-semibold tracking-tight">
          {title}
          {count !== undefined && <span className="text-sm font-normal tabular-nums text-mute">{count}</span>}
        </h2>
        {note && <p className="mt-0.5 text-sm text-mute">{note}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-line-strong px-5 py-5 text-sm text-mute">{children}</p>;
}

/** The next action, from the viewer's side. Never nags someone about work another person owns. */
export function NextAction({ c, viewer }: { c: Commitment; viewer: PersonId }) {
  if (!isOpen(c)) return null;
  const owner = ownerOf(c);
  if (!owner) return null;
  if (owner === viewer)
    return (
      <div className="rounded-xl border-l-2 border-accent bg-accent-soft/50 px-3.5 py-2.5">
        <p className="text-xs font-semibold text-accent-text">Next action</p>
        <p className="mt-0.5 text-[15px] font-medium text-text">{c.status === "assigned" ? "Accept or ask for context." : c.nextAction}</p>
      </div>
    );
  return (
    <div className="rounded-xl border border-line bg-raised/60 px-3.5 py-2.5">
      <p className="text-sm font-medium text-soft">No action needed from you right now.</p>
      <p className="mt-0.5 text-sm text-mute">
        Next action owner: <span className="font-medium text-soft">{PEOPLE[owner].name}</span>
        {c.status === "blocked" && c.blocker ? ` (${c.blocker.reason.charAt(0).toLowerCase() + c.blocker.reason.slice(1)})` : c.status === "submitted" ? " (review)" : ""}
      </p>
    </div>
  );
}

export function WhyOpen({ c, ws, defaultOpen = false }: { c: Commitment; ws: Workspace; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const reasons = whyOpen(c, ws);
  return (
    <div className="mt-3 border-t border-line pt-2.5">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={id} className="inline-flex items-center gap-1 text-sm text-mute hover:text-text">
        {isOpen(c) ? "Why is this open?" : "Why was this open?"}
        <ChevronDown className={`h-4 w-4 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div id={id} className="rise mt-2 space-y-2 text-sm">
          <p className="leading-relaxed text-soft">{reasons.join(" ")}</p>
          {c.evidence.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-mute">Evidence</p>
              <ul className="mt-1 space-y-1">
                {c.evidence.map((e) => (
                  <li key={e.id} className="text-soft">
                    {e.name} <span className="text-mute">({PEOPLE[e.by].first}, {atLabel(e.at)}{e.simulated ? ", demo" : ""})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Modal({ title, subtitle, onClose, children, wide, labelledBy }: { title: string; subtitle?: React.ReactNode; onClose: () => void; children: React.ReactNode; wide?: boolean; labelledBy?: string }) {
  const id = useId();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/50 px-4 py-6 backdrop-blur-[2px] sm:py-14"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy ?? id}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`rise mx-auto w-full rounded-3xl border border-line bg-surface p-6 shadow-2xl sm:p-7 ${wide ? "max-w-3xl" : "max-w-xl"}`}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id={labelledBy ?? id} className="font-display text-2xl font-semibold tracking-tight">
              {title}
            </h2>
            {subtitle && <div className="mt-1 text-soft">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-mute hover:bg-raised hover:text-text" aria-label="Close">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, htmlFor, children, hint, wide }: { label: string; htmlFor: string; children: React.ReactNode; hint?: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-soft">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-mute">{hint}</p>}
    </div>
  );
}

export function ResumeLink({ href, onClick, children = "Resume exactly where I stopped" }: { href?: string; onClick?: () => void; children?: React.ReactNode }) {
  const cls = "group inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 font-display text-base font-semibold text-accent-fg hover:brightness-110";
  const inner = (
    <>
      {children}
      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
    </>
  );
  return href ? (
    <Link href={href} onClick={onClick} className={cls}>
      {inner}
    </Link>
  ) : (
    <button onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}
