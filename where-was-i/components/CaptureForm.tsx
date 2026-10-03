"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { dayDiff, dayLabel, fullDate, timeLabel } from "@/lib/clock";
import { parseTask } from "@/lib/parse";
import { ManualTask, Priority, TaskDraft } from "@/lib/state";
import { ChevronDown } from "./Icons";

const EXAMPLES = [
  "Meet Maya tomorrow at 3 PM to finish the presentation",
  "Call Mom tomorrow at 7 PM",
  "Submit hackathon project before 5:15 PM Saturday",
  "Buy toothpaste sometime tonight",
];

type Fields = Omit<TaskDraft, "raw">;

export default function CaptureForm({
  mode,
  task,
  onSubmit,
  onCancel,
  autoFocus = true,
}: {
  mode: "new" | "edit";
  task?: ManualTask;
  onSubmit: (draft: TaskDraft) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState("");
  const [overrides, setOverrides] = useState<Partial<Fields>>({});
  const [detailsOpen, setDetailsOpen] = useState(mode === "edit");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && mode === "new") inputRef.current?.focus();
  }, [autoFocus, mode]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [text]);

  const parsed = useMemo(() => parseTask(text), [text]);
  const base: Fields =
    mode === "edit" && task
      ? { title: task.title, notes: task.notes, priority: task.priority, date: task.date, time: task.time, timeKind: task.timeKind, approxLabel: task.approxLabel }
      : { title: parsed.title, notes: parsed.notes, priority: parsed.priority, date: parsed.date, time: parsed.time, timeKind: parsed.timeKind, approxLabel: parsed.approxLabel };
  const f: Fields = { ...base, ...overrides };

  const set = (patch: Partial<Fields>) => setOverrides((o) => ({ ...o, ...patch }));
  const canSave = f.title.trim().length > 0;
  const showPreview = mode === "new" && text.trim().length > 0;

  const submit = () => {
    if (!canSave) return;
    onSubmit({ ...f, title: f.title.trim(), notes: f.notes.trim(), raw: mode === "edit" && task ? task.raw : text.trim() });
    setText("");
    setOverrides({});
    setDetailsOpen(false);
  };

  const fillExample = (ex: string) => {
    setText(ex);
    setOverrides({});
    inputRef.current?.focus();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {mode === "new" && (
        <>
          <label htmlFor="capture-input" className="sr-only">
            What do you need to remember?
          </label>
          <textarea
            id="capture-input"
            ref={inputRef}
            rows={1}
            value={text}
            onKeyDown={(e) => {
              // Enter adds the task; the field wraps long sentences instead of taking newlines.
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            onChange={(e) => {
              setText(e.target.value);
              // A new sentence means a new interpretation; keep only fields the user typed by hand.
              if (!detailsOpen) setOverrides({});
            }}
            placeholder="What do you need to remember?"
            autoComplete="off"
            className="block w-full resize-none overflow-hidden rounded-2xl border border-line bg-paper/50 px-5 py-4 font-display text-2xl font-medium leading-snug outline-none [field-sizing:content] placeholder:font-normal placeholder:text-mute focus:border-dusk focus:bg-card"
          />

          {!showPreview && (
            <div className="mt-3">
              <p className="text-sm text-mute">Say it the way you'd say it to a friend. For example:</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => fillExample(ex)}
                    className="rounded-full border border-line bg-card/60 px-3 py-1.5 text-left text-sm text-ink-soft hover:border-dusk hover:text-ink"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {showPreview && (
        <div className="rise mt-4 rounded-2xl border border-line bg-paper/60 p-5" aria-live="polite">
          <dl className="grid grid-cols-[92px_1fr] gap-x-4 gap-y-3 text-[15px]">
            <dt className="text-sm text-mute">Task</dt>
            <dd className={["font-display text-lg font-semibold leading-snug", f.title ? "" : "text-mute"].join(" ")}>
              {f.title || "Add what you need to do"}
            </dd>
            <dt className="text-sm text-mute">Date</dt>
            <dd>{f.date ? dateText(f.date) : <span className="text-mute">No date. It'll go under No deadline.</span>}</dd>
            {f.date && (
              <>
                <dt className="text-sm text-mute">{f.timeKind === "before" ? "Deadline" : "Time"}</dt>
                <dd>
                  {timeLabel(f)}
                  {f.timeKind === "approx" && <span className="ml-2 text-sm text-mute">approximate</span>}
                  {f.timeKind === "exact" && <span className="ml-2 text-sm text-mute">exact</span>}
                </dd>
              </>
            )}
            {f.priority !== "normal" && (
              <>
                <dt className="text-sm text-mute">Priority</dt>
                <dd className="capitalize">{f.priority}</dd>
              </>
            )}
            {f.notes && (
              <>
                <dt className="text-sm text-mute">Notes</dt>
                <dd className="text-ink-soft">{f.notes}</dd>
              </>
            )}
            <dt className="text-sm text-mute">Source</dt>
            <dd className="text-ink-soft">Manually added</dd>
          </dl>

          {parsed.understood.length > 0 && (
            <p className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-line pt-3 text-sm text-mute">
              Picked up
              {parsed.understood.map((u) => (
                <span key={u.text} className="rounded-md bg-card px-2 py-0.5 text-ink-soft" title={`Read as ${u.as}`}>
                  “{u.text}” <span className="text-mute">as {u.as}</span>
                </span>
              ))}
            </p>
          )}
        </div>
      )}

      {detailsOpen && (
        <fieldset className="rise mt-4 grid gap-4 rounded-2xl border border-line p-5 sm:grid-cols-2">
          <legend className="px-1 text-sm font-semibold text-dusk">{mode === "edit" ? "Task details" : "Edit details"}</legend>
          <Field label="Task name" htmlFor="f-title" wide>
            <input id="f-title" value={f.title} onChange={(e) => set({ title: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Date" htmlFor="f-date">
            <input
              id="f-date"
              type="date"
              value={f.date ?? ""}
              onChange={(e) => set({ date: e.target.value || null, ...(e.target.value ? {} : { time: null, timeKind: "none", approxLabel: null }) })}
              className={inputCls}
            />
          </Field>
          <Field label="Time" htmlFor="f-time">
            <div className="flex gap-2">
              <select
                aria-label="Time type"
                value={f.time ? (f.timeKind === "none" ? "exact" : f.timeKind) : "exact"}
                onChange={(e) => set({ timeKind: e.target.value as Fields["timeKind"], ...(e.target.value === "approx" ? {} : { approxLabel: null }) })}
                className={inputCls + " w-auto"}
                disabled={!f.time}
              >
                <option value="exact">At</option>
                <option value="before">Before</option>
                <option value="approx">Around</option>
              </select>
              <input
                id="f-time"
                type="time"
                value={f.time ?? ""}
                onChange={(e) =>
                  set({
                    time: e.target.value || null,
                    approxLabel: null,
                    timeKind: e.target.value ? (f.timeKind === "none" || (f.timeKind === "approx" && f.approxLabel) ? "exact" : f.timeKind) : "none",
                  })
                }
                className={inputCls}
              />
            </div>
            {f.approxLabel && f.timeKind === "approx" && <p className="mt-1 text-xs text-mute">Read as “{f.approxLabel.toLowerCase()}”. Set a time to make it exact.</p>}
          </Field>
          <Field label="Notes" htmlFor="f-notes" wide>
            <textarea id="f-notes" rows={2} value={f.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Anything that'll help you pick this back up" className={inputCls + " resize-y"} />
          </Field>
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-sm font-medium text-ink-soft">Priority</p>
            <div className="inline-flex rounded-full border border-line bg-paper/60 p-1" role="radiogroup" aria-label="Priority">
              {(["low", "normal", "high"] as Priority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={f.priority === p}
                  onClick={() => set({ priority: p })}
                  className={["rounded-full px-4 py-1 text-sm capitalize", f.priority === p ? "bg-ink font-semibold text-white" : "text-ink-soft hover:text-ink"].join(" ")}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </fieldset>
      )}

      {(showPreview || mode === "edit") && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {mode === "new" && (
            <button
              type="button"
              onClick={() => setDetailsOpen((o) => !o)}
              aria-expanded={detailsOpen}
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink-soft hover:border-ink-soft"
            >
              Edit details <ChevronDown className={["h-4 w-4 transition-transform motion-reduce:transition-none", detailsOpen ? "rotate-180" : ""].join(" ")} />
            </button>
          )}
          {mode === "edit" && onCancel && (
            <button type="button" onClick={onCancel} className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink-soft hover:border-ink-soft">
              Cancel
            </button>
          )}
          <button type="submit" disabled={!canSave} className="ml-auto rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white hover:bg-dusk disabled:opacity-40">
            {mode === "edit" ? "Save changes" : "Add task"}
          </button>
        </div>
      )}
    </form>
  );
}

const inputCls = "w-full rounded-xl border border-line bg-card px-3 py-2 text-[15px] outline-none focus:border-dusk disabled:opacity-50";

function Field({ label, htmlFor, wide, children }: { label: string; htmlFor: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink-soft">
        {label}
      </label>
      {children}
    </div>
  );
}

function dateText(date: string) {
  const diff = dayDiff(date);
  return diff === 0 || diff === 1 ? `${dayLabel(date)} (${fullDate(date)})` : fullDate(date);
}
