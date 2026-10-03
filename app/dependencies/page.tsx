"use client";

import { useUI } from "@/components/UIProvider";
import { Avatar, Empty, Pill, btn } from "@/components/ui";
import { ArrowDown } from "@/components/Icons";
import { dependencyChains, statusView } from "@/lib/derive";
import { PEOPLE } from "@/lib/model";
import { useStore } from "@/lib/store";

export default function DependenciesPage() {
  const { ws, hydrated } = useStore();
  const ui = useUI();
  if (!hydrated) return null;
  const chains = dependencyChains(ws);
  return (
    <main className="mx-auto max-w-6xl px-5 pb-20 pt-10 sm:px-8">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Dependencies</h1>
      <p className="mt-2 max-w-2xl text-soft">Why work is stuck: each chain reads top to bottom as “waiting for”. The last item is where the next action actually sits.</p>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {chains.length === 0 && <Empty>Nothing is waiting on anything else right now.</Empty>}
        {chains.map((chain, i) => (
          <ol key={i} className="rounded-3xl border border-line bg-surface p-5" aria-label="Dependency chain">
            {chain.map((n, j) => {
              const v = statusView(n.c, ws);
              const last = j === chain.length - 1;
              return (
                <li key={n.c.id}>
                  <div className={`flex items-start gap-3 rounded-2xl p-3 ${last ? "bg-raised/70" : ""}`}>
                    <Avatar p={n.owner} size={30} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-mute">{PEOPLE[n.owner].first}</p>
                      <button onClick={() => ui.open({ kind: "drawer", id: n.c.id })} className="text-left font-semibold hover:text-accent-text">{n.c.title}</button>
                      <div className="mt-1"><Pill tone={v.tone}>{v.label}</Pill></div>
                      {last && n.c.source === "requested" && (
                        <button onClick={() => ui.resolve(n.c.id)} className={btn.demo + " mt-2 py-1"}>Demo event: {PEOPLE[n.c.assignee].first} delivers</button>
                      )}
                    </div>
                  </div>
                  {!last && (
                    <p className="my-1 flex items-center gap-2 pl-6 text-xs font-medium text-mute"><ArrowDown className="h-4 w-4" /> waiting for</p>
                  )}
                </li>
              );
            })}
          </ol>
        ))}
      </div>
    </main>
  );
}
