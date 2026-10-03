"use client";

import { CheckIcon, CloseIcon, LockIcon } from "@/components/Icons";
import { PEOPLE } from "@/lib/model";
import { useStore } from "@/lib/store";

const CAN = ["Work commitments", "Work status and ownership", "Checkpoints you explicitly save", "Work breadcrumbs you intentionally save and share", "Submitted work evidence", "Blockers", "Dependencies", "Handoffs and reviews", "Work timeline events"];
const CANNOT = ["Unrelated browsing", "Personal applications", "Keystrokes or mouse movement", "Private messages", "Passive screenshots", "Time spent in apps or “active time”", "Activity outside this workspace", "Breadcrumbs you keep private", "Any productivity score (there isn't one)"];

export default function PrivacyPage() {
  const { me } = useStore();
  return (
    <main className="mx-auto max-w-4xl px-5 pb-20 pt-10 sm:px-8">
      <p className="flex items-center gap-2 text-sm font-medium text-accent-text"><LockIcon className="h-4 w-4" /> Transparency</p>
      <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">What my company can see</h1>
      <p className="mt-3 max-w-2xl text-lg text-soft">Where Was I? records work state that you or your teammates deliberately create. It doesn't watch you work.</p>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <section className="rounded-3xl border border-line bg-surface p-6">
          <h2 className="font-display text-xl font-semibold">Your company can see</h2>
          <ul className="mt-4 space-y-2.5">
            {CAN.map((t) => <li key={t} className="flex gap-2.5"><CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-ok" /> {t}</li>)}
          </ul>
        </section>
        <section className="rounded-3xl border border-line bg-surface p-6">
          <h2 className="font-display text-xl font-semibold">Your company cannot see</h2>
          <ul className="mt-4 space-y-2.5">
            {CANNOT.map((t) => <li key={t} className="flex gap-2.5"><CloseIcon className="mt-0.5 h-4 w-4 shrink-0 text-blocked" /> {t}</li>)}
          </ul>
        </section>
      </div>
      <section className="mt-8 rounded-3xl border border-line bg-raised/50 p-6">
        <h2 className="font-display text-xl font-semibold">About breadcrumbs</h2>
        <p className="mt-2 leading-relaxed text-soft">A breadcrumb is a note you choose to write when you stop, so you can pick your train of thought back up. Nothing is captured unless you save it. Each breadcrumb has a “Share as work context” switch: shared ones appear on the commitment for your manager, private ones are visible only to you. AI reconstructions are suggestions, are always labeled as such, and never change a commitment unless you confirm them.</p>
        <p className="mt-3 text-sm text-mute">Viewing as {PEOPLE[me].name}. This is a prototype: all data lives in this browser.</p>
      </section>
    </main>
  );
}
