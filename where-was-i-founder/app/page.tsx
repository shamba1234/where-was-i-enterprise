"use client";

import { useCallback, useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import AskBox from "@/components/AskBox";
import CaptureModal from "@/components/CaptureModal";
import ClosedList from "@/components/ClosedList";
import CommitmentCard from "@/components/CommitmentCard";
import OutcomeModal from "@/components/OutcomeModal";
import ProofModal from "@/components/ProofModal";
import ResumeFeature from "@/components/ResumeFeature";
import Toast, { ToastMsg } from "@/components/Toast";
import WhereWasIPanel from "@/components/WhereWasIPanel";
import { RewindIcon } from "@/components/Icons";
import { SectionHeader } from "@/components/ui";
import { longDate, nowLabel, todayKey } from "@/lib/clock";
import { SectionKey, counts, grouped, sectionOf } from "@/lib/derive";
import { Commitment, Draft, addManual, closeCommitment, editManual, recordOutcome, useFounder } from "@/lib/state";

type Modal =
  | { type: "capture" }
  | { type: "edit"; c: Commitment }
  | { type: "outcome"; c: Commitment }
  | { type: "proof"; c: Commitment; date: string }
  | { type: "panel" }
  | null;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export default function Dashboard() {
  const { state, hydrated, update } = useFounder();
  const [modal, setModal] = useState<Modal>(null);
  const [linger, setLinger] = useState<Set<string>>(new Set());
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const close = useCallback(() => setModal(null), []);
  const clearToast = useCallback(() => setToast(null), []);
  const addLinger = useCallback((id: string) => setLinger((l) => new Set(l).add(id)), []);

  // Loops closed in this view stay in place long enough to see VERIFIED, then move on the next visit.
  const g = grouped(state);
  for (const id of linger) {
    const c = state.commitments.find((x) => x.id === id);
    if (!c?.closed) continue;
    const home: SectionKey = sectionOf({ ...c, closed: null }, state);
    g.closed = g.closed.filter((x) => x.id !== id);
    if (!g[home].some((x) => x.id === id)) g[home].push(c);
  }
  const n = counts(state);

  useEffect(() => {
    if (!justAdded) return;
    document.getElementById(`loop-${justAdded}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => setJustAdded(null), 2600);
    return () => clearTimeout(t);
  }, [justAdded]);

  const SECTION_NAME: Record<SectionKey, string> = { needs: "Needs you", interrupted: "Pick up where you stopped", waiting: "Waiting on others", routines: "Today's routines", upcoming: "Upcoming", closed: "Verified & recently closed" };

  const saveCapture = (d: Draft) => {
    if (modal?.type === "edit") {
      const id = modal.c.id;
      update((s) => editManual(s, id, d));
      setToast({ id: Date.now(), text: "Changes saved." });
    } else {
      let id = "";
      update((s) => {
        const r = addManual(s, d);
        id = r.id;
        return r.state;
      });
      setJustAdded(id);
      setToast({ id: Date.now(), text: `Captured “${d.title}”.` });
    }
    setModal(null);
  };

  const saveOutcome = (meeting: Commitment, outcome: string, d: Draft) => {
    let id = "";
    update((s) => {
      const r = recordOutcome(s, meeting.id, outcome, d);
      id = r.id;
      return r.state;
    });
    setJustAdded(id);
    setToast({ id: Date.now(), text: `Meeting closed. New open loop: “${d.title}”.` });
    setModal(null);
  };

  const lines = [
    { href: "#needs", text: plural(n.needsYou, "thing needs you", "things need you"), dot: "bg-lamp" },
    { href: "#waiting", text: `${n.waiting} ${n.waiting === 1 ? "is" : "are"} waiting on someone else`, dot: "bg-sky" },
    { href: "#stopped", text: n.interrupted ? `${plural(n.interrupted, "workflow was", "workflows were")} interrupted` : "No interrupted workflows", dot: "bg-accent" },
    { href: "#routines", text: plural(n.recurringToday, "recurring commitment today", "recurring commitments today"), dot: "bg-soft" },
  ];

  const cards = (list: Commitment[]) =>
    list.map((c) => (
      <CommitmentCard
        key={c.id}
        c={c}
        justAdded={c.id === justAdded}
        onLinger={addLinger}
        onEdit={() => setModal({ type: "edit", c })}
        onOutcome={() => setModal({ type: "outcome", c })}
        onProof={(date) => setModal({ type: "proof", c, date })}
      />
    ));

  return (
    <div className="min-h-screen">
      <AppHeader onCapture={() => setModal({ type: "capture" })} onReset={() => { setModal(null); setLinger(new Set()); setToast(null); }} />

      <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <section className="grid items-end gap-8 pb-10 pt-12 md:grid-cols-[1fr_380px] md:pt-16">
          <div>
            <p className="text-mute">{longDate(todayKey())}</p>
            <h1 className="mt-1 font-display text-6xl font-bold tracking-tight sm:text-7xl md:text-8xl">Good morning.</h1>
            {hydrated && (
              <ul className="mt-6 space-y-1.5 text-xl">
                {lines.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} className="group inline-flex items-center gap-3 text-soft hover:text-text">
                      <span className={["h-2 w-2 rounded-full", l.dot].join(" ")} />
                      <span className="underline-offset-4 group-hover:underline">{l.text}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <aside className="rounded-[28px] border border-line bg-surface p-6" aria-labelledby="handoff-title">
            <h2 id="handoff-title" className="font-display text-lg font-semibold">Where you left off</h2>
            <p className="text-sm text-mute">Last session ended yesterday at 6:47 PM</p>
            {hydrated && (
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {[
                  [n.completed, "completed"],
                  [n.needsYou, "need you"],
                  [n.waiting, "waiting on someone"],
                  [n.interrupted, n.interrupted === 1 ? "interrupted workflow" : "interrupted workflows"],
                  [n.recurringToday, "recurring today"],
                  [n.verified, "verified by a source"],
                ].map(([v, label]) => (
                  <div key={label as string} className="flex items-baseline gap-2">
                    <dt className="order-2 text-soft">{label}</dt>
                    <dd className="order-1 font-display text-2xl font-bold tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
            <button
              onClick={() => setModal({ type: "panel" })}
              className="group mt-5 flex w-full items-center gap-4 rounded-2xl bg-accent-deep px-5 py-4 text-left hover:brightness-125"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-lamp text-bg transition-transform group-hover:-rotate-45 motion-reduce:transition-none">
                <RewindIcon className="h-6 w-6" />
              </span>
              <span>
                <span className="block font-display text-2xl font-bold leading-none">Where Was I?</span>
                <span className="mt-1 block text-sm text-soft">Rebuild yesterday's session</span>
              </span>
            </button>
          </aside>
        </section>

        <AskBox />

        {hydrated && (
          <div className="mt-14 space-y-14">
            <section aria-labelledby="needs">
              <SectionHeader id="needs" title="Needs you" count={g.needs.length} note="You own the next action on these." />
              {g.needs.length ? <div className="grid gap-4 md:grid-cols-2">{cards(g.needs)}</div> : <Empty>Nothing needs you right now.</Empty>}
            </section>

            <section aria-labelledby="stopped">
              <SectionHeader id="stopped" title="Pick up where you stopped" note="Work that was interrupted, restored to the exact point it stopped." />
              {g.interrupted.length ? (
                <div className="space-y-4">
                  {g.interrupted.map((c) => (
                    <ResumeFeature key={c.id} c={c} onLinger={addLinger} />
                  ))}
                </div>
              ) : (
                <Empty>Nothing interrupted. Every workflow you started is finished or waiting on someone.</Empty>
              )}
            </section>

            <section aria-labelledby="waiting">
              <SectionHeader id="waiting" title="Waiting on others" count={g.waiting.length} note="Someone else owns the next step. I'll tell you if it stalls." />
              {g.waiting.length ? <div className="grid gap-4 md:grid-cols-2">{cards(g.waiting)}</div> : <Empty>You're not waiting on anyone.</Empty>}
            </section>

            <section aria-labelledby="routines">
              <SectionHeader id="routines" title="Today's routines" count={g.routines.length} note="One occurrence of a recurring commitment. Finishing it schedules the next." />
              {g.routines.length ? <div className="grid gap-4 md:grid-cols-2">{cards(g.routines)}</div> : <Empty>No recurring commitments today.</Empty>}
            </section>

            <section aria-labelledby="upcoming">
              <SectionHeader id="upcoming" title="Upcoming" count={g.upcoming.length} note="Scheduled, not urgent yet." />
              {g.upcoming.length ? <div className="grid gap-4 md:grid-cols-2">{cards(g.upcoming)}</div> : <Empty>Nothing scheduled.</Empty>}
            </section>

            <section aria-labelledby="closed">
              <SectionHeader id="closed" title="Verified & recently closed" count={g.closed.length} note="Verified means a source showed proof. Completed by you means you said so and nothing could check it." />
              <ClosedList hide={linger} />
            </section>
          </div>
        )}

        <footer className="mt-16 border-t border-line pt-6 text-sm text-mute">
          <p>
            Every open loop moves through Detect, Understand, Resume, Verify and Close. Sources here are simulated: Demo Gmail, Demo Calendar and Demo Browser,
            with local data only. Proof-image analysis is simulated too.
          </p>
        </footer>
      </main>

      {modal?.type === "panel" && <WhereWasIPanel onClose={close} />}
      {(modal?.type === "capture" || modal?.type === "edit") && <CaptureModal edit={modal.type === "edit" ? modal.c : undefined} onSave={saveCapture} onClose={close} />}
      {modal?.type === "outcome" && (
        <OutcomeModal
          meeting={modal.c}
          onClose={close}
          onSave={(o, d) => saveOutcome(modal.c, o, d)}
          onNoFollowUp={() => {
            update((s) => closeCommitment(s, modal.c.id, { kind: "completed_by_you", at: nowLabel(), evidence: "Meeting held, no follow-ups recorded" }));
            setModal(null);
          }}
        />
      )}
      {modal?.type === "proof" && <ProofModal c={modal.c} date={modal.date} onClose={close} onDone={() => addLinger(modal.c.id)} />}
      <Toast toast={toast} onDone={clearToast} />
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border-2 border-dashed border-line px-5 py-6 text-soft">{children}</p>;
}
