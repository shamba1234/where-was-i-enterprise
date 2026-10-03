"use client";

import { useMemo, useState } from "react";
import { TODAY, When, whenLabel } from "@/lib/clock";
import { isOpen } from "@/lib/derive";
import { PEOPLE, PersonId, Priority, TEAM } from "@/lib/model";
import { AssignDraft } from "@/lib/ops";
import { parseCommitment } from "@/lib/parse";
import { NO_REPEAT, Recurrence, recurrenceLabel } from "@/lib/recurrence";
import { useStore } from "@/lib/store";
import { DeadlineFields, RecurrenceField } from "./Fields";
import { Field, Modal, btn, inputCls } from "./ui";

export const EVIDENCE_OPTIONS = ["None", "Design submission (Figma link or uploaded design)", "Document", "File", "Link", "Screenshot"];
const EXAMPLE = "Finish mobile landing-page mockup by 5 PM today";

export default function AssignModal({ onClose, onAssign }: { onClose: () => void; onAssign: (d: AssignDraft) => void }) {
  const { ws, me } = useStore();
  const [assignee, setAssignee] = useState<PersonId>("maya");
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [context, setContext] = useState("");
  const [when, setWhen] = useState<When>({ date: null, time: null, timeKind: "none", approxLabel: null });
  const [whenTouched, setWhenTouched] = useState(false);
  const [priority, setPriority] = useState<Priority>("normal");
  const [evidence, setEvidence] = useState(EVIDENCE_OPTIONS[0]);
  const [rec, setRec] = useState<Recurrence>(NO_REPEAT);
  const [project, setProject] = useState<string>("");
  const [dependsOn, setDependsOn] = useState<string[]>([]);
  const [neededFor, setNeededFor] = useState<string>("");

  const parsed = useMemo(() => parseCommitment(text), [text]);
  const t = titleTouched ? title : parsed.title;
  const w: When = whenTouched ? when : { date: parsed.date, time: parsed.time, timeKind: parsed.timeKind, approxLabel: parsed.approxLabel };
  const r: Recurrence = rec.freq !== "none" ? rec : parsed.recurrence;

  const fillExample = () => {
    setText(EXAMPLE);
    setTitleTouched(false);
    setWhenTouched(false);
    setAssignee("maya");
    setContext("Needed for Friday launch review.");
    setPriority("high");
    setEvidence(EVIDENCE_OPTIONS[1]);
    setProject("Landing Page Redesign");
    setNeededFor("launch");
  };

  const openOthers = ws.commitments.filter((c) => isOpen(c));
  const mine = ws.commitments.filter((c) => c.assignee === me && isOpen(c));
  const canAssign = t.trim().length > 0;

  return (
    <Modal title="Assign a commitment" subtitle="It lands on their dashboard immediately, with the context and what will count as done." onClose={onClose} wide>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!canAssign) return;
          onAssign({ ...w, assignee, title: t.trim(), context: context.trim(), priority, evidenceRequirement: evidence === "None" ? null : evidence, recurrence: r, dependsOn, neededFor: neededFor || null, project: project || null, raw: text });
        }}
        className="space-y-5"
      >
        <div>
          <label htmlFor="assign-input" className="mb-1.5 block text-sm font-medium text-soft">
            What needs to happen?
          </label>
          <input
            id="assign-input"
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Finish mobile landing-page mockup by 5 PM today"
            className={inputCls + " py-3 font-display text-lg"}
            autoComplete="off"
          />
          <button type="button" onClick={fillExample} className="mt-2 rounded-full border border-line px-3 py-1 text-sm text-soft hover:border-accent hover:text-text">
            Use example: {EXAMPLE}
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Assign to" htmlFor="assign-to">
            <select id="assign-to" value={assignee} onChange={(e) => setAssignee(e.target.value as PersonId)} className={inputCls}>
              {TEAM.map((p) => (
                <option key={p} value={p}>
                  {PEOPLE[p].name}, {PEOPLE[p].role}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Task" htmlFor="assign-title">
            <input id="assign-title" value={t} onChange={(e) => { setTitle(e.target.value); setTitleTouched(true); }} className={inputCls} />
          </Field>
          <Field label="Context" htmlFor="assign-context" wide>
            <input id="assign-context" value={context} onChange={(e) => setContext(e.target.value)} placeholder="Why it matters, what it's for" className={inputCls} />
          </Field>
          <Field label="Deadline" htmlFor="assign-deadline-date" hint={w.date ? whenLabel(w, true) : "No deadline"}>
            <DeadlineFields prefix="assign-deadline" value={w} onChange={(p) => { setWhen({ ...w, ...p }); setWhenTouched(true); }} />
          </Field>
          <Field label="Priority" htmlFor="assign-priority">
            <div id="assign-priority" className="inline-flex rounded-full border border-line bg-bg p-1" role="radiogroup" aria-label="Priority">
              {(["low", "normal", "high"] as Priority[]).map((p) => (
                <button key={p} type="button" role="radio" aria-checked={priority === p} onClick={() => setPriority(p)} className={`rounded-full px-4 py-1 text-sm capitalize ${priority === p ? "bg-accent font-semibold text-accent-fg" : "text-soft hover:text-text"}`}>
                  {p}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Evidence required" htmlFor="assign-evidence">
            <select id="assign-evidence" value={evidence} onChange={(e) => setEvidence(e.target.value)} className={inputCls}>
              {EVIDENCE_OPTIONS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Field>
          <Field label="Recurring?" htmlFor="assign-repeat" hint={r.freq !== "none" ? recurrenceLabel(r, w.date ?? TODAY, w.time) : undefined}>
            <RecurrenceField id="assign-repeat" value={r} onChange={setRec} />
          </Field>
          <Field label="Project" htmlFor="assign-project">
            <select id="assign-project" value={project} onChange={(e) => setProject(e.target.value)} className={inputCls}>
              <option value="">None</option>
              <option>Landing Page Redesign</option>
            </select>
          </Field>
          <Field label="Needed for" htmlFor="assign-needed" hint="Your commitment that waits on this one.">
            <select id="assign-needed" value={neededFor} onChange={(e) => setNeededFor(e.target.value)} className={inputCls}>
              <option value="">Nothing</option>
              {mine.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Depends on" htmlFor="assign-deps" hint="Work that must land first." wide>
            <div id="assign-deps" className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
              {openOthers.filter((c) => c.assignee !== assignee).slice(0, 10).map((c) => {
                const on = dependsOn.includes(c.id);
                return (
                  <button key={c.id} type="button" aria-pressed={on} onClick={() => setDependsOn(on ? dependsOn.filter((x) => x !== c.id) : [...dependsOn, c.id])} className={`rounded-full border px-3 py-1 text-sm ${on ? "border-accent bg-accent-soft text-accent-text" : "border-line text-soft hover:border-line-strong"}`}>
                    {PEOPLE[c.assignee].first}: {c.title}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
          <p className="text-sm text-mute">Assigned by {PEOPLE[me].name}</p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={btn.secondary}>Cancel</button>
            <button type="submit" disabled={!canAssign} className={btn.primary}>Assign</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
