"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import AppHeader from "@/components/AppHeader";
import CaptureForm from "@/components/CaptureForm";
import CaptureModal from "@/components/CaptureModal";
import { BrowserIcon, CheckIcon, CourseIcon, MailIcon, ToldIcon } from "@/components/Icons";
import { DeleteConfirm, PostponeMenu, UrgencyPill, isPressing } from "@/components/ManualTaskBits";
import Toast, { ToastMsg } from "@/components/Toast";
import { dayLabel, fullDate, sortKey, timeLabel } from "@/lib/clock";
import {
  ManualTask,
  TaskDraft,
  addManualTask,
  deleteManualTask,
  editManualTask,
  postponeManualTask,
  setManualCompleted,
  useDemo,
} from "@/lib/state";

export default function CapturedPage() {
  const { state, hydrated, update } = useDemo();
  const [editing, setEditing] = useState<ManualTask | null>(null);
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const clearToast = useCallback(() => setToast(null), []);
  const closeEdit = useCallback(() => setEditing(null), []);

  const tasks = hydrated ? state.manualTasks : [];
  const byTime = (a: ManualTask, b: ManualTask) => sortKey(a) - sortKey(b) || a.createdOrder - b.createdOrder;
  const upcoming = tasks.filter((t) => !t.completed && t.date).sort(byTime);
  const undated = tasks.filter((t) => !t.completed && !t.date).sort((a, b) => a.createdOrder - b.createdOrder);
  const completed = tasks.filter((t) => t.completed).sort((a, b) => b.createdOrder - a.createdOrder);

  // Group upcoming by day so the list reads like a short agenda.
  const groups: { date: string; items: ManualTask[] }[] = [];
  for (const t of upcoming) {
    const g = groups.find((x) => x.date === t.date);
    if (g) g.items.push(t);
    else groups.push({ date: t.date!, items: [t] });
  }

  const add = (draft: TaskDraft) => {
    update((s) => addManualTask(s, draft).state);
    setToast({ id: Date.now(), text: `Added “${draft.title}”. It's in Open loops now.`, link: { href: "/", label: "See Open loops" } });
  };

  const complete = (t: ManualTask, done: boolean) => {
    update((s) => setManualCompleted(s, t.id, done));
    setToast({
      id: Date.now(),
      text: done ? `“${t.title}” moved to Completed.` : `“${t.title}” is back in Open loops.`,
      undo: () => update((s) => setManualCompleted(s, t.id, !done)),
    });
  };

  return (
    <div className="min-h-screen">
      <AppHeader onReset={() => { setEditing(null); setToast(null); }} />

      <main className="mx-auto max-w-6xl px-5 pb-16 sm:px-8">
        <section className="pb-8 pt-12 md:pt-16">
          <h1 className="font-display text-5xl font-bold tracking-tight sm:text-6xl">Captured</h1>
          <p className="mt-3 max-w-2xl text-xl text-ink-soft">
            Things you've told me to remember. They sit in Open loops right next to what I find in your apps.
          </p>
        </section>

        <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
          <div className="min-w-0 space-y-10">
            <section aria-labelledby="quick-title" className="rounded-3xl border border-line bg-card p-5 sm:p-6">
              <h2 id="quick-title" className="mb-4 font-display text-xl font-semibold">
                Quick capture
              </h2>
              <CaptureForm mode="new" onSubmit={add} autoFocus={false} />
            </section>

            <Section id="upcoming" title="Upcoming" count={upcoming.length}>
              {groups.length === 0 ? (
                <Empty>Nothing with a date yet. Try “Call Mom tomorrow at 7 PM” above.</Empty>
              ) : (
                <div className="space-y-6">
                  {groups.map((g) => (
                    <div key={g.date}>
                      <h3 className="mb-2 text-sm font-semibold text-dusk">
                        {dayLabel(g.date)}
                        <span className="ml-2 font-normal text-mute">{fullDate(g.date)}</span>
                      </h3>
                      <List>
                        {g.items.map((t) => (
                          <Row key={t.id} task={t} onToggle={() => complete(t, true)} onEdit={() => setEditing(t)} />
                        ))}
                      </List>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section id="no-deadline" title="No deadline" count={undated.length}>
              {undated.length === 0 ? (
                <Empty>Things without a date land here, like “Book flights home for break”.</Empty>
              ) : (
                <List>
                  {undated.map((t) => (
                    <Row key={t.id} task={t} onToggle={() => complete(t, true)} onEdit={() => setEditing(t)} />
                  ))}
                </List>
              )}
            </Section>

            <Section id="completed" title="Completed" count={completed.length}>
              {completed.length === 0 ? (
                <Empty>Tasks you mark complete move here.</Empty>
              ) : (
                <List>
                  {completed.map((t) => (
                    <Row key={t.id} task={t} onToggle={() => complete(t, false)} onEdit={() => setEditing(t)} />
                  ))}
                </List>
              )}
            </Section>
          </div>

          <aside className="h-fit space-y-5 rounded-3xl bg-dusk p-6 text-white lg:sticky lg:top-6" aria-label="Where open loops come from">
            <h2 className="font-display text-xl font-semibold">Two ways I remember</h2>
            <div>
              <p className="font-semibold">From your apps</p>
              <p className="mt-1 text-sm text-white/75">I watch connected sources for unfinished things and only close them when the app shows proof.</p>
              <div className="mt-3 flex gap-2 text-white/80">
                <CourseIcon className="h-5 w-5" />
                <MailIcon className="h-5 w-5" />
                <BrowserIcon className="h-5 w-5" />
              </div>
            </div>
            <div className="border-t border-white/15 pt-5">
              <p className="font-semibold">From you</p>
              <p className="mt-1 text-sm text-white/75">Anything that lives in your head, not in an app. Tell me once and I'll keep it with everything else.</p>
              <ToldIcon className="mt-3 h-5 w-5 text-lamp" />
            </div>
            <Link href="/" className="inline-block rounded-full bg-lamp px-4 py-2 text-sm font-semibold text-ink hover:brightness-105">
              Back to Open loops
            </Link>
          </aside>
        </div>
      </main>

      {editing && (
        <CaptureModal
          task={editing}
          onClose={closeEdit}
          onSave={(d) => {
            update((s) => editManualTask(s, editing.id, d));
            setEditing(null);
            setToast({ id: Date.now(), text: "Changes saved." });
          }}
        />
      )}
      <Toast toast={toast} onDone={clearToast} />
    </div>
  );
}

function Section({ id, title, count, children }: { id: string; title: string; count: number; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-6">
      <div className="mb-3 flex items-baseline gap-2">
        <h2 id={`${id}-title`} className="font-display text-2xl font-semibold">
          {title}
        </h2>
        {count > 0 && <span className="text-sm tabular-nums text-mute">{count}</span>}
      </div>
      {children}
    </section>
  );
}

function List({ children }: { children: React.ReactNode }) {
  return <ul className="divide-y divide-line rounded-2xl border border-line bg-card">{children}</ul>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border-2 border-dashed border-line px-5 py-6 text-ink-soft">{children}</p>;
}

function Row({ task, onToggle, onEdit }: { task: ManualTask; onToggle: () => void; onEdit: () => void }) {
  const { update } = useDemo();
  const [confirm, setConfirm] = useState(false);
  const done = task.completed;
  const pressing = !done && isPressing(task);

  return (
    <li className="flex gap-4 px-4 py-4 sm:px-5">
      <button
        onClick={onToggle}
        aria-label={done ? `Mark “${task.title}” not complete` : `Mark “${task.title}” complete`}
        className={[
          "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2",
          done ? "border-sage bg-sage text-white" : pressing ? "border-lamp hover:bg-lamp-soft" : "border-mute/60 hover:border-dusk",
        ].join(" ")}
      >
        {done && <CheckIcon className="h-3.5 w-3.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className={["font-medium", done ? "text-mute line-through" : ""].join(" ")}>{task.title}</p>
          {!done && <UrgencyPill task={task} />}
        </div>
        <p className={["mt-0.5 text-sm", pressing ? "font-medium text-[#8a5410]" : "text-mute"].join(" ")}>
          {done ? "Marked complete by you" : task.date ? timeLabel(task) : "Whenever you get to it"}
          {!done && task.priority === "high" ? ", high priority" : ""}
        </p>
        {task.notes && <p className="mt-1 text-sm text-ink-soft">{task.notes}</p>}
        <div className="mt-3">
          {confirm ? (
            <DeleteConfirm title={task.title} onConfirm={() => update((s) => deleteManualTask(s, task.id))} onCancel={() => setConfirm(false)} />
          ) : (
            <div className="flex flex-wrap items-center gap-1">
              {!done && <PostponeMenu compact onPick={(by) => update((s) => postponeManualTask(s, task.id, by))} onCustom={onEdit} />}
              {!done && (
                <button onClick={onEdit} className="rounded-full px-2.5 py-1 text-sm font-medium text-mute hover:bg-paper hover:text-ink">
                  Edit
                </button>
              )}
              {done && (
                <button onClick={onToggle} className="rounded-full px-2.5 py-1 text-sm font-medium text-mute hover:bg-paper hover:text-ink">
                  Reopen
                </button>
              )}
              <button onClick={() => setConfirm(true)} className="rounded-full px-2.5 py-1 text-sm font-medium text-mute hover:bg-paper hover:text-ink">
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
