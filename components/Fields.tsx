"use client";

import { TimeKind, When } from "@/lib/clock";
import { Freq, NO_REPEAT, Recurrence } from "@/lib/recurrence";
import { inputCls } from "./ui";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function RecurrenceField({ value, onChange, id }: { value: Recurrence; onChange: (r: Recurrence) => void; id: string }) {
  const set = (freq: Freq) => {
    if (freq === "none") onChange(NO_REPEAT);
    else if (freq === "daily") onChange({ freq, interval: 1, unit: "days", days: [] });
    else if (freq === "weekdays") onChange({ freq, interval: 1, unit: "days", days: [] });
    else if (freq === "every_other_day") onChange({ freq, interval: 2, unit: "days", days: [] });
    else if (freq === "weekly") onChange({ freq, interval: 1, unit: "weeks", days: value.days });
    else onChange({ freq: "custom", interval: value.interval > 1 ? value.interval : 2, unit: value.unit, days: value.days });
  };
  return (
    <div className="space-y-2">
      <select id={id} value={value.freq} onChange={(e) => set(e.target.value as Freq)} className={inputCls}>
        <option value="none">Does not repeat</option>
        <option value="daily">Daily</option>
        <option value="weekdays">Weekdays</option>
        <option value="every_other_day">Every other day</option>
        <option value="weekly">Weekly</option>
        <option value="custom">Custom</option>
      </select>
      {value.freq === "custom" && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-soft">
          <span>Every</span>
          <input
            type="number"
            min={1}
            max={30}
            aria-label="Interval"
            value={value.interval}
            onChange={(e) => onChange({ ...value, interval: Math.max(1, Number(e.target.value) || 1) })}
            className={inputCls + " w-20"}
          />
          <select aria-label="Unit" value={value.unit} onChange={(e) => onChange({ ...value, unit: e.target.value as "days" | "weeks" })} className={inputCls + " w-auto"}>
            <option value="days">days</option>
            <option value="weeks">weeks</option>
          </select>
        </div>
      )}
      {(value.freq === "weekly" || (value.freq === "custom" && value.unit === "weeks")) && (
        <div className="flex gap-1" role="group" aria-label="Days of the week">
          {DAYS.map((d, i) => {
            const on = value.days.includes(i);
            return (
              <button
                key={i}
                type="button"
                aria-pressed={on}
                aria-label={DAY_NAMES[i]}
                onClick={() => onChange({ ...value, days: on ? value.days.filter((x) => x !== i) : [...value.days, i].sort() })}
                className={`h-8 w-8 rounded-full text-sm font-medium ${on ? "bg-accent text-accent-fg" : "border border-line text-soft hover:border-accent"}`}
              >
                {d}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function DeadlineFields({ value, onChange, prefix }: { value: When; onChange: (w: Partial<When>) => void; prefix: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] gap-2">
      <input
        id={`${prefix}-date`}
        aria-label="Date"
        type="date"
        value={value.date ?? ""}
        onChange={(e) => onChange({ date: e.target.value || null, ...(e.target.value ? {} : { time: null, timeKind: "none" as TimeKind }) })}
        className={inputCls}
      />
      <select
        aria-label="Time type"
        value={value.time ? (value.timeKind === "none" ? "exact" : value.timeKind) : "exact"}
        onChange={(e) => onChange({ timeKind: e.target.value as TimeKind, approxLabel: e.target.value === "approx" ? value.approxLabel : null })}
        className={inputCls + " w-auto"}
        disabled={!value.time}
      >
        <option value="before">By</option>
        <option value="exact">At</option>
        <option value="approx">Around</option>
      </select>
      <input
        id={`${prefix}-time`}
        aria-label="Time"
        type="time"
        value={value.time ?? ""}
        onChange={(e) => onChange({ time: e.target.value || null, approxLabel: null, timeKind: e.target.value ? (value.timeKind === "none" || value.timeKind === "approx" ? "before" : value.timeKind) : "none" })}
        className={inputCls}
      />
    </div>
  );
}
