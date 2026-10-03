"use client";

import { useMemo, useState } from "react";
import { TODAY, When, timeLabel, whenLabel } from "@/lib/clock";
import { Commitment, PEOPLE, PersonId } from "@/lib/model";
import { CaptureDraft } from "@/lib/ops";
import { parseCommitment } from "@/lib/parse";
import { Recurrence, recurrenceLabel } from "@/lib/recurrence";
import { useStore } from "@/lib/store";
import { DeadlineFields, RecurrenceField } from "./Fields";
import { ChevronDown } from "./Icons";
import { Field, Modal, btn, inputCls } from "./ui";

const EXAMPLES = ["Prepare launch notes tomorrow by 10 AM", "Finish onboarding email copy tomorrow by noon", "Review customer feedback every Friday", "Follow up with Alex next Wednesday"];

type F = When & { title: string; context: string; recurrence: Recurrence; owner: PersonId };

export default function CaptureModal({ edit, onClose, onSave }: { edit?: Commitment; onClose: () => void; onSave: (d: CaptureDraft) => void }) {
  const { me } = useStore();
  const [text, setText] = useState("");
  const [over, setOver] = useState<Partial<F>>({});
  const [details, setDetails] = useState(Boolean(edit));
  const parsed = useMemo(() => parseCommitment(text), [text]);
  const base: F = edit
    ? { title: edit.title, context: edit.context, recurrence: edit.recurrence, owner: edit.assignee, date: edit.date, time: edit.time, timeKind: edit.timeKind, approxLabel: edit.approxLabel }
    : { title: parsed.title, context: parsed.context, recurrence: parsed.recurrence, owner: me, date: parsed.date, time: parsed.time, timeKind: parsed.timeKind, approxLabel: parsed.approxLabel };
  const f: F = { ...base, ...over };
  const set = (p: Partial<F>) => setOver((o) => ({ ...o, ...p }));
  const show = Boolean(edit) || text.trim().length > 0;
  const recurring = f.recurrence.freq !== "none";

  const save = () => {
    if (!f.title.trim()) return;
    onSave({ ...f, title: f.title.trim(), context: f.context.trim(), raw: edit?.raw ?? text });
  };

  return (
    <Modal title={edit ? "Edit commitment" : "Capture work"} subtitle={edit ? undefined : "Commitments you create sit next to assigned work, clearly marked as yours."} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        {!edit && (
          <>
            <label htmlFor="capture-input" className="sr-only">
              What are you working on?
            </label>
            <textarea
              id="capture-input"
              autoFocus
              rows={1}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (!details) setOver({});
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  save();
                }
              }}
              placeholder="What are you working on?"
              className={inputCls + " resize-none py-3.5 font-display text-xl [field-sizing:content]"}
            />
            {!show && (
              <div className="mt-3 flex flex-wrap gap-2">
                {EXAMPLES.map((ex) => (
                  <button key={ex} type="button" onClick={() => setText(ex)} className="rounded-full border border-line px-3 py-1 text-sm text-soft hover:border-accent hover:text-text">
                    {ex}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {show && !edit && (
          <dl className="rise mt-4 grid grid-cols-[104px_1fr] gap-x-4 gap-y-2.5 rounded-2xl border border-line bg-raised/50 p-4 text-[15px]" aria-live="polite">
            <dt className="text-sm text-mute">Task</dt>
            <dd className="font-display text-lg font-semibold leading-snug">{f.title || <span className="text-mute">Add what you're working on</span>}</dd>
            {f.context && (
              <>
                <dt className="text-sm text-mute">Context</dt>
                <dd>{f.context}</dd>
              </>
            )}
            <dt className="text-sm text-mute">{recurring ? "Starts" : "Deadline"}</dt>
            <dd>{f.date ? (f.timeKind === "before" ? `${whenLabel(f, true)}` : whenLabel(f, true)) : <span className="text-mute">No deadline</span>}</dd>
            <dt className="text-sm text-mute">Repeats</dt>
            <dd>{recurring ? `${recurrenceLabel(f.recurrence, f.date ?? TODAY, f.time)}${f.time ? `, ${timeLabel(f)}` : ""}` : "Does not repeat"}</dd>
            <dt className="text-sm text-mute">Source</dt>
            <dd>Created by {PEOPLE[me].name}</dd>
            <dt className="text-sm text-mute">Next action</dt>
            <dd>{f.owner === me ? "You" : PEOPLE[f.owner].name}</dd>
            {parsed.understood.length > 0 && (
              <>
                <dt className="text-sm text-mute">Picked up</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {parsed.understood.map((u) => (
                    <span key={u.text} className="rounded-md bg-surface px-2 py-0.5 text-sm text-soft">
                      “{u.text}” <span className="text-mute">as {u.as}</span>
                    </span>
                  ))}
                </dd>
              </>
            )}
          </dl>
        )}

        {details && (
          <fieldset className="rise mt-4 grid gap-4 rounded-2xl border border-line p-4 sm:grid-cols-2">
            <legend className="px-1 text-sm font-semibold text-accent-text">Details</legend>
            <Field label="Task" htmlFor="cap-title" wide>
              <input id="cap-title" value={f.title} onChange={(e) => set({ title: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Context" htmlFor="cap-context" wide>
              <input id="cap-context" value={f.context} onChange={(e) => set({ context: e.target.value })} placeholder="What's it for?" className={inputCls} />
            </Field>
            <Field label={recurring ? "Starts" : "Deadline"} htmlFor="cap-dl-date" wide>
              <DeadlineFields prefix="cap-dl" value={f} onChange={(p) => set(p)} />
            </Field>
            <Field label="Repeats" htmlFor="cap-repeat">
              <RecurrenceField id="cap-repeat" value={f.recurrence} onChange={(r) => set({ recurrence: r })} />
            </Field>
            <Field label="Who acts next" htmlFor="cap-owner" hint={f.owner !== me ? `This becomes a request: you'll be waiting on ${PEOPLE[f.owner].first}.` : undefined}>
              <select id="cap-owner" value={f.owner} onChange={(e) => set({ owner: e.target.value as PersonId })} className={inputCls}>
                {(Object.keys(PEOPLE) as PersonId[]).map((p) => (
                  <option key={p} value={p}>
                    {p === me ? "Me" : PEOPLE[p].name}
                  </option>
                ))}
              </select>
            </Field>
          </fieldset>
        )}

        {show && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {!edit && (
              <button type="button" onClick={() => setDetails((d) => !d)} aria-expanded={details} className={btn.secondary}>
                Edit details <ChevronDown className={`h-4 w-4 transition-transform ${details ? "rotate-180" : ""}`} />
              </button>
            )}
            <button type="submit" disabled={!f.title.trim()} className={btn.primary + " ml-auto"}>
              {edit ? "Save changes" : "Capture work"}
            </button>
          </div>
        )}
      </form>
    </Modal>
  );
}
