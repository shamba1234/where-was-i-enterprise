"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { setNow } from "./clock";
import { PersonId, Workspace, seedWorkspace } from "./model";

/**
 * One shared Northstar Labs workspace in localStorage. Jordan and Maya are two users of the
 * same state: whatever one does, the other sees on their next render (and across tabs).
 * Theme and accent are personal preferences, stored separately so Reset Demo keeps them.
 */
const WS_KEY = "wwi-enterprise:workspace:v1";
const PREF_KEY = "wwi-enterprise:prefs";

export type ThemePref = "light" | "dark" | "system";
export type Accent = "blue" | "indigo" | "violet" | "emerald" | "orange";
export type Prefs = { theme: ThemePref; accent: Accent };
const DEFAULT_PREFS: Prefs = { theme: "system", accent: "indigo" };

function loadWs(): Workspace | null {
  try {
    const raw = localStorage.getItem(WS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Workspace;
    return p?.version === 1 && Array.isArray(p.commitments) ? p : null;
  } catch {
    return null;
  }
}
function saveWs(s: Workspace) {
  try {
    localStorage.setItem(WS_KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable: state still lives in memory */
  }
}
function loadPrefs(): Prefs {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREF_KEY) || "{}") };
  } catch {
    return DEFAULT_PREFS;
  }
}

function applyTheme(p: Prefs) {
  const dark = p.theme === "dark" || (p.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.dataset.accent = p.accent;
}

/** Runs before paint (inlined in <head>) so there's no flash of the wrong theme. */
export const THEME_BOOT = `try{var p=JSON.parse(localStorage.getItem('${PREF_KEY}')||'{}');var t=p.theme||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.dataset.accent=p.accent||'indigo';}catch(e){document.documentElement.dataset.theme='light';document.documentElement.dataset.accent='indigo';}`;

type Ctx = {
  ws: Workspace;
  hydrated: boolean;
  me: PersonId;
  update: (fn: (s: Workspace) => Workspace) => void;
  reset: () => void;
  prefs: Prefs;
  resolvedTheme: "light" | "dark";
  setPrefs: (p: Partial<Prefs>) => void;
};
const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ws, setWs] = useState<Workspace>(seedWorkspace);
  const [hydrated, setHydrated] = useState(false);
  const [prefs, setPrefsState] = useState<Prefs>(DEFAULT_PREFS);
  const [resolvedTheme, setResolved] = useState<"light" | "dark">("light");
  const ref = useRef(ws);
  ref.current = ws;
  setNow(ws.now);

  useEffect(() => {
    const loaded = loadWs() ?? seedWorkspace();
    saveWs(loaded);
    ref.current = loaded;
    setWs(loaded);
    const p = loadPrefs();
    setPrefsState(p);
    applyTheme(p);
    setResolved(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    setHydrated(true);

    const onStorage = (e: StorageEvent) => {
      if (e.key === WS_KEY) {
        const l = loadWs();
        if (l) {
          ref.current = l;
          setWs(l);
        }
      }
      if (e.key === PREF_KEY) {
        const np = loadPrefs();
        setPrefsState(np);
        applyTheme(np);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Follow the OS while the preference is "System".
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (prefs.theme === "system") {
        applyTheme(prefs);
        setResolved(mq.matches ? "dark" : "light");
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [prefs]);

  const update = useCallback((fn: (s: Workspace) => Workspace) => {
    const next = fn(ref.current);
    ref.current = next;
    setNow(next.now);
    saveWs(next);
    setWs(next);
  }, []);

  const reset = useCallback(() => {
    const fresh = seedWorkspace();
    ref.current = fresh;
    setNow(fresh.now);
    saveWs(fresh);
    setWs(fresh);
  }, []);

  const setPrefs = useCallback((p: Partial<Prefs>) => {
    setPrefsState((cur) => {
      const next = { ...cur, ...p };
      try {
        localStorage.setItem(PREF_KEY, JSON.stringify(next));
      } catch {
        /* keep in memory */
      }
      applyTheme(next);
      setResolved(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
      return next;
    });
  }, []);

  return (
    <StoreContext.Provider value={{ ws, hydrated, me: ws.viewer, update, reset, prefs, resolvedTheme, setPrefs }}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const c = useContext(StoreContext);
  if (!c) throw new Error("useStore must be used inside StoreProvider");
  return c;
}
