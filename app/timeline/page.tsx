"use client";

import { useState } from "react";
import { useUI } from "@/components/UIProvider";
import { Avatar, Empty } from "@/components/ui";
import { atLabel } from "@/lib/clock";
import { FILTERS, Filter, eventLabel, groupDay, timeline } from "@/lib/derive";
import { EventKind, PEOPLE, PersonId, TEAM } from "@/lib/model";
import { useStore } from "@/lib/store";

const DOT: Partial<Record<EventKind, string>> = {
  blocked: "bg-blocked",
  verified: "bg-ok",
  approved: "bg-ok",
  dependency_resolved: "bg-ok",
  unblocked: "bg-ok",
  changes_requested: "bg-warn",
  submitted: "bg-review",
  resubmitted: "bg-review",
  handoff: "bg-review",
  breadcrumb: "bg-accent",
  checkpoint: "bg-accent",
};

export default function TimelinePage() {
  const { ws, me, hydrated } = useStore();
  const ui = useUI();
  const manager = PEOPLE[me].manager;
  const [person, setPerson] = useState<PersonId | "all">(manager ? "maya" : me);
  const [filter, setFilter] = useState<Filter>("all");
  if (!hydrated) return null;
  const who = manager ? person : me;
  const events = timeline(ws, who === "all" ? null : who, filter);
  const groups: { day: string; items: typeof events }[] = [];
  for (const e of events) {
    const d = groupDay(e.at);
    const g = groups.find((x) => x.day === d);
    if (g) g.items.push(e);
    else groups.push({ day: d, items: [e] });
  }

  return (
    <main className="mx-auto max-w-4xl px-5 pb-20 pt-10 sm:px-8">
      <h1 className="font-display text-4xl font-semibold tracking-tight">{manager ? "Work timeline" : "My work timeline"}</h1>
      <p className="mt-2 max-w-2xl text-soft">Meaningful work events only: assignments, checkpoints, breadcrumbs, blockers, handoffs and reviews. No activity tracking, time-in-app or screenshots.</p>

      {manager && (
        <div className="mt-6 flex flex-wrap gap-2" role="radiogroup" aria-label="Person">
          {(["all", ...TEAM, "jordan"] as const).map((p) => (
            <button key={p} role="radio" aria-checked={person === p} onClick={() => setPerson(p)} className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${person === p ? "border-accent bg-accent-soft font-semibold text-accent-text" : "border-line text-soft hover:border-line-strong"}`}>
              {p !== "all" && <Avatar p={p} size={18} />} {p === "all" ? "Whole team" : PEOPLE[p].name}
            </button>
          ))}
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Filter">
        {FILTERS.map((f) => (
          <button key={f.key} role="radio" aria-checked={filter === f.key} onClick={() => setFilter(f.key)} className={`rounded-full px-3 py-1 text-sm ${filter === f.key ? "bg-text font-semibold text-bg" : "bg-raised text-soft hover:text-text"}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-8 space-y-8">
        {groups.length === 0 && <Empty>No events match this filter.</Empty>}
        {groups.map((g) => (
          <section key={g.day} aria-label={g.day}>
            <h2 className="mb-3 text-sm font-semibold text-mute">{who !== "all" ? `${PEOPLE[who].name}, ` : ""}{g.day}</h2>
            <ol className="relative space-y-4 border-l border-line pl-6">
              {g.items.map((e) => {
                const c = ws.commitments.find((x) => x.id === e.commitmentId);
                const hidden = e.private && e.actor !== me;
                return (
                  <li key={e.id} className="relative" data-kind={e.kind}>
                    <span className={`absolute -left-[29px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-bg ${DOT[e.kind] ?? "bg-line-strong"}`} />
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <span className="w-20 shrink-0 text-sm tabular-nums text-mute">{atLabel(e.at).replace(/^(Yesterday|\w{3}), /, "")}</span>
                      <span className={`text-xs font-semibold ${e.kind === "blocked" ? "text-blocked" : e.kind === "verified" ? "text-ok" : "text-soft"}`}>{eventLabel[e.kind]}</span>
                    </div>
                    <p className="mt-0.5 text-[15px]">{hidden ? "Breadcrumb saved (kept private)" : e.text}</p>
                    {e.quote && !hidden && <p className="mt-0.5 text-sm text-soft">“{e.quote}”</p>}
                    {c && <button onClick={() => ui.open({ kind: "drawer", id: c.id })} className="mt-0.5 text-xs text-mute hover:text-accent-text">{c.title}</button>}
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </main>
  );
}
