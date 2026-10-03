"use client";

import Link from "next/link";
import { useFounder } from "@/lib/state";
import { PlusIcon, RewindIcon } from "./Icons";

export default function AppHeader({ onCapture, onReset }: { onCapture: () => void; onReset?: () => void }) {
  const { reset } = useFounder();
  return (
    <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 pt-6 sm:px-8">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-deep text-accent">
          <RewindIcon className="h-5 w-5" />
        </span>
        <span className="font-display text-lg font-bold">Where Was I?</span>
      </Link>
      <div className="flex items-center gap-2 text-sm">
        <span className="mr-2 hidden items-center gap-2 text-mute lg:flex">
          <span className="h-2 w-2 rounded-full bg-sage" /> Demo Gmail, Demo Calendar, Demo Browser
        </span>
        <button
          onClick={() => {
            reset();
            onReset?.();
          }}
          className="rounded-full border border-line px-3 py-1.5 font-medium text-soft hover:border-line-strong hover:text-text"
        >
          Reset demo
        </button>
        <button onClick={onCapture} className="inline-flex items-center gap-1.5 rounded-full bg-text px-4 py-1.5 font-semibold text-bg hover:bg-white">
          <PlusIcon className="h-4 w-4" /> Capture commitment
        </button>
      </div>
    </header>
  );
}
