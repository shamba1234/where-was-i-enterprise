"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { dayWithDate, fullDate, timeLabel, todayKey } from "@/lib/clock";
import { parseCommitment } from "@/lib/parse";
import { Freq, NO_REPEAT, Recurrence, firstMatching, recurrenceLabel } from "@/lib/recurrence";
import { Commitment, Draft } from "@/lib/state";
import { ChevronDown, CloseIcon, RepeatIcon } from "./Icons";
import { btnPrimary, btnSecondary } from "./ui";

const EXAMPLES = [
  "Call accountant Thursday at 4 PM about quarterly taxes",
  "Run 5K every other morning at 7",
  "Review product metrics every Monday at 9 AM",
  "Team standup every Monday Wednesday and Friday at 9",
  "Journal every night at 10",
  "Call my parents every Sunday afternoon",
];

const FREQS: { value: Freq; label: string }[] = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "every_other_day", label: "Every other day" },
  { value: "weekly", label: "Weekly" },
  { value: "custom", label: "Custom" },
];
const DOW = ["S", "M", "T", "W", "T", "F", "S"];
const DOW_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Fields = Omit<Draft, "raw">;

export default function CaptureModal({ edit, onSave, onClose }: { edit?: Commitment; onSave: (d: Draft) => void; onClose: () => void }) {
  const [text, setText] = useState("");
  const [overrides, setOverrides] = useState<Partial<Fields>>({});
  const [details, setDetails] = useState(Boolean(edit));
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!edit) ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [edit, onClose]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [text]);

  const parsed = useMemo(() => parseCommitment(text), [text]);
  const baseFields: Fields = edit
    ? { title: edit.title, context: edit.context, date: edit.date, time: edit.time, timeKind: edit.timeKind, approxLabel: edit.approxLabel, recurrence: edit.recurrence, owner: edit.owner }
    : { title: parsed.title, context: parsed.context, date: parsed.date, time: parsed.time, timeKind: parsed.timeKind, approxLabel: parsed.approxLabel, recurrence: parsed.recurrence, owner: parsed.owner };
  const f: Fields = { ...baseFields, ...overrides };
  const set = (p: Partial<Fields>) => setOverrides((o) => ({ ...o, ...p }));
  const setRec = (p: Partial<Recurrence>) => {
    const r = { ...f.recurrence, ...p };
    set({ recurrence: r, ...(r.freq !== "none" ? { date: firstMatching(r, f.date && f.date >= todayKey() ? f.date : todayKey()) } : {}) });
  };
  const canSave = f.title.trim().length > 0;
  const showPreview = Boolean(edit) || text.trim().length > 0;

  const submit = () => {
    if (!canSave) return;
    let date = f.date;
    if (f.recurrence.freq !== "none") date = firstMatching(f.recurrence, date ?? todayKey());
    if (f.time && !date) date = todayKey();
    onSave({
      ...f,
      date,
      title: f.title.trim(),
      context: f.context.trim(),
      owner: f.owner.trim() || "you",
      timeKind: date && f.time ? (f.timeKind === "none" ? "exact" : f.timeKind) : "none",
      approxLabel: f.timeKind === "approx" ? f.approxLabel : null,
      raw: edit ? edit.raw : text.trim(),
    });
  };

  const rec = f.recurrence;
  const weekly = rec.freq === "weekly" || (rec.freq === "custom" && rec.unit === "weeks");

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 px-4 py-6 backdrop-blur-sm sm:py-14"
      role="dialog"
      aria-modal="true"
      aria-labelledby="capture-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="rise mx-auto w-full max-w-2xl rounded-3xl border border-line bg-surface p-6 shadow-2xl sm:p-8"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="capture-title" className="font-display text-2xl font-bold">
              {edit ? "Edit commitment" : "Capture a commitment"}
            </h2>
            <p className="mt-1 text-soft">
              {edit ? "Correct anything I got wrong." : "Say it once. I'll keep it open until it's done, and tell you who acts next."}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-mute hover:bg-raised hover:text-text" aria-label="Close">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {!edit && (
          <>
            <label htmlFor="capture-input" className="sr-only">What do you need to remember?</label>
            <textarea
              id="capture-input"
              ref={ref}
              rows={1}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (!details) setOverrides({});
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="What do you need to remember?"
              className="block w-full resize-none overflow-hidden rounded-2xl border border-line bg-bg/60 px-5 py-4 font-display text-2xl font-medium leading-snug outline-none placeholder:font-normal placeholder:text-mute focus:border-accent"
            />
            {!text.trim() && (
              <div className="mt-3">
                <p className="text-sm text-mute">Try one of these:</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => {
                        setText(ex);
                        setOverrides({});
                        ref.current?.focus();
                      }}
                      className="rounded-full border border-line px-3 py-1.5 text-left text-sm text-soft hover:border-accent hover:text-text"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {showPreview && !edit && (
          <div className="rise mt-4 rounded-2xl border border-line bg-raised/60 p-5" aria-live="polite">
            <dl className="grid grid-cols-[96px_1fr] gap-x-4 gap-y-3 text-[15px]">
              <dt className="text-sm text-mute">Task</dt>
              <dd className={["font-display text-lg font-semibold leading-snug", f.title ? "" : "text-mute"].join(" ")}>{f.title || "Add what needs doing"}</dd>
              {f.context && (
                <>
                  <dt className="text-sm text-mute">Context</dt>
                  <dd className="text-soft">{f.context}</dd>
                </>
              )}
              <dt className="text-sm text-mute">{rec.freq !== "none" ? "Starts" : "Date"}</dt>
              <dd>{f.date ? (rec.freq !== "none" ? fullDate(f.date) : dayWithDate(f.date)) : <span className="text-mute">No date</span>}</dd>
              <dt className="text-sm text-mute">{f.timeKind === "before" ? "Due by" : "Time"}</dt>
              <dd>
                {f.time ? timeLabel(f) : <span className="text-mute">Any time</span>}
                {f.time && <span className="ml-2 text-sm text-mute">{f.timeKind === "approx" ? "approximate" : "exact"}</span>}
              </dd>
              <dt className="text-sm text-mute">Recurrence</dt>
              <dd className="flex items-center gap-1.5">
                {rec.freq !== "none" && <RepeatIcon className="h-4 w-4 text-accent" />}
                {recurrenceLabel(rec, f.date, f.time)}
              </dd>
              {f.owner !== "you" && (
                <>
                  <dt className="text-sm text-mute">Next action</dt>
                  <dd>Waiting on {f.owner}</dd>
                </>
              )}
              <dt className="text-sm text-mute">Source</dt>
              <dd className="text-soft">Added by you</dd>
            </dl>
            {parsed.understood.length > 0 && (
              <p className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-line pt-3 text-sm text-mute">
                Picked up
                {parsed.understood.map((u) => (
                  <span key={u.text + u.as} className="rounded-md bg-surface px-2 py-0.5 text-soft">
                    “{u.text}” <span className="text-mute">as {u.as}</span>
                  </span>
                ))}
              </p>
            )}
          </div>
        )}

        {details && (
          <fieldset className="rise mt-4 grid gap-4 rounded-2xl border border-line p-5 sm:grid-cols-2">
            <legend className="px-1 text-sm font-semibold text-accent">Details</legend>
            <Field label="Task" id="f-title" wide>
              <input id="f-title" value={f.title} onChange={(e) => set({ title: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Context" id="f-context" wide>
              <input id="f-context" value={f.context} onChange={(e) => set({ context: e.target.value })} placeholder="What's it about?" className={inputCls} />
            </Field>
            <Field label={rec.freq !== "none" ? "Starts" : "Date"} id="f-date">
              <input id="f-date" type="date" value={f.date ?? ""} onChange={(e) => set({ date: e.target.value || null })} className={inputCls} />
            </Field>
            <Field label="Time" id="f-time">
              <div className="flex gap-2">
                <select aria-label="Time type" value={f.timeKind === "none" ? "exact" : f.timeKind} onChange={(e) => set({ timeKind: e.target.value as Fields["timeKind"] })} disabled={!f.time} className={inputCls + " w-auto"}>
                  <option value="exact">At</option>
                  <option value="before">By</option>
                  <option value="approx">Around</option>
                </select>
                <input
                  id="f-time"
                  type="time"
                  value={f.time ?? ""}
                  onChange={(e) => set({ time: e.target.value || null, approxLabel: null, timeKind: e.target.value ? (f.timeKind === "none" || f.timeKind === "approx" ? "exact" : f.timeKind) : "none" })}
                  className={inputCls}
                />
              </div>
            </Field>
            <Field label="Repeats" id="f-repeat">
              <select
                id="f-repeat"
                value={rec.freq}
                onChange={(e) => {
                  const freq = e.target.value as Freq;
                  if (freq === "none") set({ recurrence: NO_REPEAT });
                  else setRec({ freq, interval: freq === "every_other_day" ? 2 : freq === "custom" ? rec.interval || 2 : 1, unit: freq === "weekly" ? "weeks" : rec.unit });
                }}
                className={inputCls}
              >
                {FREQS.map((x) => (
                  <option key={x.value} value={x.value}>{x.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Who acts next" id="f-owner">
              <input id="f-owner" value={f.owner === "you" ? "" : f.owner} onChange={(e) => set({ owner: e.target.value || "you" })} placeholder="You (or type a name)" className={inputCls} />
            </Field>
            {rec.freq === "custom" && (
              <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                <span className="text-sm text-soft">Every</span>
                <input aria-label="Interval" type="number" min={1} max={30} value={rec.interval} onChange={(e) => setRec({ interval: Math.max(1, Number(e.target.value) || 1) })} className={inputCls + " w-20"} />
                <select aria-label="Unit" value={rec.unit} onChange={(e) => setRec({ unit: e.target.value as "days" | "weeks" })} className={inputCls + " w-auto"}>
                  <option value="days">days</option>
                  <option value="weeks">weeks</option>
                </select>
              </div>
            )}
            {weekly && (
              <div className="sm:col-span-2">
                <p className="mb-1.5 text-sm font-medium text-soft">On</p>
                <div className="flex gap-1.5">
                  {DOW.map((d, i) => {
                    const on = rec.days.includes(i);
                    return (
                      <button
                        key={i}
                        type="button"
                        aria-pressed={on}
                        aria-label={DOW_FULL[i]}
                        onClick={() => setRec({ days: on ? rec.days.filter((x) => x !== i) : [...rec.days, i] })}
                        className={["h-9 w-9 rounded-full text-sm font-semibold", on ? "bg-accent text-bg" : "border border-line text-soft hover:border-accent"].join(" ")}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </fieldset>
        )}

        {showPreview && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {!edit && (
              <button type="button" onClick={() => setDetails((o) => !o)} aria-expanded={details} className={btnSecondary}>
                Edit details <ChevronDown className={["h-4 w-4", details ? "rotate-180" : ""].join(" ")} />
              </button>
            )}
            {edit && (
              <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
            )}
            <button type="submit" disabled={!canSave} className={btnPrimary + " ml-auto"}>
              {edit ? "Save changes" : "Capture commitment"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-line bg-bg/60 px-3 py-2 text-[15px] text-text outline-none focus:border-accent disabled:opacity-50 [color-scheme:dark]";

function Field({ label, id, wide, children }: { label: string; id: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-soft">{label}</label>
      {children}
    </div>
  );
}
