"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDemo } from "@/lib/state";
import { RewindIcon } from "./Icons";

export default function AppHeader({ onReset }: { onReset?: () => void }) {
  const { state, hydrated, reset } = useDemo();
  const path = usePathname();
  const captured = state.manualTasks.filter((t) => !t.completed).length;

  const tabs = [
    { href: "/", label: "Overview" },
    { href: "/tasks", label: "Captured", count: hydrated ? captured : 0 },
  ];

  return (
    <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 pt-6 sm:px-8">
      <div className="flex items-center gap-5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-dusk text-white">
            <RewindIcon className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-bold">Where Was I?</span>
        </Link>
        <nav aria-label="Sections" className="flex rounded-full border border-line bg-card/70 p-1 text-sm">
          {tabs.map((t) => {
            const active = path === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1",
                  active ? "bg-ink font-semibold text-white" : "text-ink-soft hover:text-ink",
                ].join(" ")}
              >
                {t.label}
                {!!t.count && (
                  <span className={["rounded-full px-1.5 text-xs tabular-nums", active ? "bg-white/20" : "bg-paper"].join(" ")}>{t.count}</span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="hidden items-center gap-2 text-mute lg:flex">
          <span className="h-2 w-2 rounded-full bg-sage" /> 3 demo sources connected
        </span>
        <button
          onClick={() => {
            reset();
            onReset?.();
          }}
          className="rounded-full border border-line bg-card px-3 py-1.5 font-medium text-ink-soft hover:border-ink-soft"
        >
          Reset demo
        </button>
      </div>
    </header>
  );
}
