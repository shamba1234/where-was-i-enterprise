"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PEOPLE, PersonId } from "@/lib/model";
import { setViewer } from "@/lib/ops";
import { Accent, ThemePref, useStore } from "@/lib/store";
import { CheckIcon, ChevronDown, MonitorIcon, MoonIcon, PaletteIcon, PlusIcon, ResetIcon, RewindIcon, SunIcon } from "./Icons";
import { useUI } from "./UIProvider";
import { Avatar, btn } from "./ui";

const ACCENTS: { key: Accent; label: string; swatch: string }[] = [
  { key: "blue", label: "Blue", swatch: "#2160d8" },
  { key: "indigo", label: "Indigo", swatch: "#4b47d6" },
  { key: "violet", label: "Violet", swatch: "#7a3fd4" },
  { key: "emerald", label: "Emerald", swatch: "#0b7d5c" },
  { key: "orange", label: "Orange", swatch: "#c4510f" },
];

function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return { open, setOpen, ref };
}

export default function AppHeader() {
  const { me, update, reset, prefs, setPrefs, hydrated } = useStore();
  const ui = useUI();
  const path = usePathname();
  const router = useRouter();
  const user = usePopover();
  const look = usePopover();
  const [confirmReset, setConfirmReset] = useState(false);
  const manager = PEOPLE[me].manager;

  const nav = manager
    ? [
        { href: "/", label: "Overview" },
        { href: "/team", label: "Team" },
        { href: "/dependencies", label: "Dependencies" },
        { href: "/timeline", label: "Timeline" },
      ]
    : [
        { href: "/", label: "Home" },
        { href: "/timeline", label: "My timeline" },
        { href: "/privacy", label: "What my company can see" },
      ];

  const switchTo = (p: PersonId) => {
    update((s) => setViewer(s, p));
    user.setOpen(false);
    if ((p === "jordan" && path === "/privacy") || (p !== "jordan" && (path === "/team" || path === "/dependencies"))) router.push("/");
    ui.toast(`Now viewing as ${PEOPLE[p].name}. Same shared workspace.`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3 sm:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-accent-fg"><RewindIcon className="h-4.5 w-4.5" /></span>
          <span className="font-display text-[17px] font-semibold tracking-tight">Where Was I?</span>
          <span className="hidden rounded-md border border-line px-1.5 py-0.5 text-[11px] font-medium text-mute sm:inline">Northstar Labs</span>
        </Link>

        <nav aria-label="Main" className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
          {nav.map((n) => {
            const active = path === n.href;
            return (
              <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${active ? "bg-accent-soft font-semibold text-accent-text" : "text-soft hover:bg-raised hover:text-text"}`}>
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          {hydrated && (
            <button onClick={() => ui.open(manager ? { kind: "assign" } : { kind: "capture" })} className={btn.primary + " hidden sm:inline-flex"}>
              <PlusIcon className="h-4 w-4" /> {manager ? "Assign commitment" : "Capture work"}
            </button>
          )}

          <div ref={look.ref} className="relative">
            <button onClick={() => look.setOpen(!look.open)} aria-expanded={look.open} aria-haspopup="dialog" aria-label="Appearance" className="grid h-9 w-9 place-items-center rounded-full text-soft hover:bg-raised hover:text-text">
              <PaletteIcon className="h-5 w-5" />
            </button>
            {look.open && (
              <div role="dialog" aria-label="Appearance" className="rise absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-line bg-surface p-4 shadow-2xl">
                <p className="text-sm font-semibold">Theme</p>
                <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-raised p-1" role="radiogroup" aria-label="Theme">
                  {([["light", "Light", SunIcon], ["dark", "Dark", MoonIcon], ["system", "System", MonitorIcon]] as const).map(([k, label, Icon]) => (
                    <button key={k} role="radio" aria-checked={prefs.theme === k} onClick={() => setPrefs({ theme: k as ThemePref })} className={`flex flex-col items-center gap-1 rounded-lg py-2 text-xs ${prefs.theme === k ? "bg-surface font-semibold text-text shadow-sm" : "text-soft hover:text-text"}`}>
                      <Icon className="h-4 w-4" /> {label}
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-sm font-semibold">Accent</p>
                <div className="mt-2 flex gap-2" role="radiogroup" aria-label="Accent color">
                  {ACCENTS.map((a) => (
                    <button key={a.key} role="radio" aria-checked={prefs.accent === a.key} aria-label={a.label} title={a.label} onClick={() => setPrefs({ accent: a.key })} className={`grid h-8 w-8 place-items-center rounded-full ring-offset-2 ring-offset-surface ${prefs.accent === a.key ? "ring-2 ring-text" : ""}`} style={{ background: a.swatch }}>
                      {prefs.accent === a.key && <CheckIcon className="h-4 w-4 text-white" />}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs text-mute">Status colors (blocked, waiting, verified) stay the same whatever accent you choose. Saved on this device.</p>
              </div>
            )}
          </div>

          <div ref={user.ref} className="relative">
            <button onClick={() => user.setOpen(!user.open)} aria-expanded={user.open} aria-haspopup="menu" className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-2.5 hover:border-line-strong">
              <Avatar p={me} size={28} />
              <span className="hidden text-left leading-tight md:block">
                <span className="block text-sm font-semibold">{PEOPLE[me].name}</span>
                <span className="block text-xs text-mute">{PEOPLE[me].role}</span>
              </span>
              <ChevronDown className="h-4 w-4 text-mute" />
            </button>
            {user.open && (
              <div role="menu" className="rise absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-line bg-surface py-2 shadow-2xl">
                <p className="px-4 pb-2 pt-1 text-xs font-semibold text-mute">Switch user</p>
                {(["jordan", "maya"] as PersonId[]).map((p) => (
                  <button key={p} role="menuitemradio" aria-checked={me === p} onClick={() => switchTo(p)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-raised">
                    <Avatar p={p} size={32} />
                    <span className="flex-1">
                      <span className="block text-sm font-semibold">{PEOPLE[p].name}</span>
                      <span className="block text-xs text-mute">{PEOPLE[p].role}, {PEOPLE[p].manager ? "manager" : "employee"}</span>
                    </span>
                    {me === p && <CheckIcon className="h-4 w-4 text-accent-text" />}
                  </button>
                ))}
                <p className="border-t border-line px-4 pt-2 text-xs text-mute">Both users share one Northstar Labs workspace on this device.</p>
                <div className="mt-2 border-t border-line px-2 pt-2">
                  {confirmReset ? (
                    <div className="px-2 pb-1">
                      <p className="text-sm">Reset every commitment, timeline, breadcrumb and review to the starting story?</p>
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => { reset(); setConfirmReset(false); user.setOpen(false); router.push("/"); ui.toast("Demo reset. Theme and accent kept."); }} className={btn.primary + " py-1.5"}>Reset demo</button>
                        <button onClick={() => setConfirmReset(false)} className={btn.quiet}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmReset(true)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-soft hover:bg-raised hover:text-text">
                      <ResetIcon className="h-4 w-4" /> Reset demo
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
