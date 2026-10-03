"use client";

import { useEffect, useRef, useState } from "react";
import { Check, verify } from "@/lib/derive";
import { Closure, Commitment, closeCommitment, useFounder } from "@/lib/state";

export type VerifyPhase = "idle" | "checking" | "failed" | "verified";

/**
 * "I already did this" never closes a loop by itself. It checks the simulated source and
 * either closes the loop as VERIFIED with the evidence it found, or explains why it couldn't.
 */
export function useVerify(c: Commitment, onClosed?: (closure: Closure) => void) {
  const { state, update } = useFounder();
  const stateRef = useRef(state);
  stateRef.current = state;
  const [phase, setPhase] = useState<VerifyPhase>("idle");
  const [reason, setReason] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const run = () => {
    setPhase("checking");
    timer.current = setTimeout(() => {
      const result: Check = verify(c, stateRef.current);
      if (result.ok) {
        onClosed?.(result.closure);
        update((s) => closeCommitment(s, c.id, result.closure));
        setPhase("verified");
      } else {
        setReason(result.reason);
        setPhase("failed");
      }
    }, 1400);
  };

  return { phase, reason, run, reset: () => setPhase("idle") };
}
