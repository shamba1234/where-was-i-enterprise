"use client";

import { useEffect, useRef, useState } from "react";
import { nowLabel } from "@/lib/clock";
import { SAMPLE_ROUTINE, SAMPLE_RUN, makeThumb } from "@/lib/samples";
import { Commitment, Proof, closeOccurrence, useFounder } from "@/lib/state";
import { CheckIcon, CloseIcon, UploadIcon } from "./Icons";
import { btnPrimary } from "./ui";

type Phase = "pick" | "checking" | "verified" | "rejected";

/** Upload proof for one occurrence of a recurring commitment. Evidence analysis is simulated. */
export default function ProofModal({ c, date, onClose, onDone }: { c: Commitment; date: string; onClose: () => void; onDone: () => void }) {
  const { update } = useFounder();
  const run = c.kind === "run";
  const sample = run ? SAMPLE_RUN : SAMPLE_ROUTINE;
  const checks = run
    ? ["Reading the image", "Looking for today's date and a distance", "Matching it to today's 5K"]
    : ["Reading the photo", "Matching it to tonight's routine"];
  const results = run ? ["Workout proof attached", "Date matches today", "5K distance detected"] : ["Photo attached", "All five items checked"];

  const [phase, setPhase] = useState<Phase>("pick");
  const [proof, setProof] = useState<Proof | null>(null);
  const [step, setStep] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && phase !== "checking" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, phase]);

  const check = (p: Proof, isImage: boolean) => {
    setProof(p);
    setPhase("checking");
    setStep(0);
    checks.forEach((_, i) => setTimeout(() => setStep(i + 1), 550 * (i + 1)));
    setTimeout(() => {
      if (!isImage) return setPhase("rejected");
      setPhase("verified");
      onDone();
      update((s) =>
        closeOccurrence(s, c.id, date, {
          kind: "verified",
          at: nowLabel(),
          evidence: run ? "5K run completed, workout proof attached" : "Evening routine completed, photo attached",
          proof: p,
        }),
      );
    }, 550 * checks.length + 450);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const isImage = f.type.startsWith("image/");
    const thumb = isImage ? await makeThumb(f) : null;
    check({ name: f.name, size: f.size, type: f.type || "unknown", thumb }, isImage);
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="proof-title"
      onClick={(e) => e.target === e.currentTarget && phase !== "checking" && onClose()}
    >
      <div className="rise w-full max-w-lg rounded-3xl border border-line bg-surface p-6 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="proof-title" className="font-display text-2xl font-bold">{run ? "Upload workout proof" : "Add a photo"}</h2>
            <p className="mt-1 text-soft">{run ? "A screenshot from your running app or watch for today's 5K." : "A photo of tonight's routine, done."}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-mute hover:bg-raised hover:text-text" aria-label="Close">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {(phase === "pick" || phase === "rejected") && (
          <div className="mt-6">
            {phase === "rejected" && (
              <div className="rise mb-4 rounded-xl border border-lamp/30 bg-lamp-soft/60 p-3 text-sm" role="alert">
                <p className="font-semibold text-lamp-text">Could not verify</p>
                <p className="text-soft">{proof?.name} isn't an image. Upload a screenshot or photo.</p>
              </div>
            )}
            <button
              onClick={() => input.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line-strong px-4 py-8 text-soft hover:border-accent hover:text-text"
            >
              <UploadIcon className="h-6 w-6" />
              <span className="font-medium">Choose an image</span>
              <span className="text-sm text-mute">PNG, JPG or HEIC</span>
            </button>
            <input ref={input} type="file" accept="image/*" className="hidden" onChange={onFile} />
            <button onClick={() => check({ ...sample }, true)} className="mt-3 flex w-full items-center gap-3 rounded-xl border border-line px-4 py-3 text-left hover:border-accent">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sample.thumb} alt="" className="h-11 w-11 rounded-lg" />
              <span>
                <span className="block font-medium">Use sample: {sample.name}</span>
                <span className="text-sm text-mute">Handy for a live demo</span>
              </span>
            </button>
          </div>
        )}

        {phase === "checking" && proof && (
          <div className="mt-6" aria-live="polite">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {proof.thumb && <img src={proof.thumb} alt="" className="h-12 w-12 rounded-lg border border-line object-cover" />}
              <div>
                <p className="font-display text-xl font-semibold">Checking evidence...</p>
                <p className="text-sm text-mute">{proof.name}</p>
              </div>
            </div>
            <div className="mt-4 h-1 overflow-hidden rounded-full bg-raised">
              <div className="scanbar h-full w-1/3 bg-accent" />
            </div>
            <ul className="mt-4 space-y-1.5 text-sm">
              {checks.map((t, i) => (
                <li key={t} className={i < step ? "text-text" : "text-mute"}>
                  {i < step ? "✓" : "○"} {t}
                </li>
              ))}
            </ul>
          </div>
        )}

        {phase === "verified" && proof && (
          <div className="mt-6" aria-live="polite">
            <ul className="space-y-2">
              {results.map((t) => (
                <li key={t} className="rise flex items-center gap-3 font-medium">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-sage-soft text-sage-text">
                    <CheckIcon className="h-4 w-4" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <div className="settle mt-6 rounded-2xl bg-sage-soft p-5">
              <p className="font-display text-3xl font-bold text-sage-text">VERIFIED ✓</p>
              <p className="font-medium">{run ? "5K run completed" : "Evening routine completed"}</p>
              <p className="text-sm text-soft">{run ? "Workout proof attached" : "Photo attached"}</p>
            </div>
            <p className="mt-3 text-xs text-mute">Evidence analysis is simulated in this prototype. A real version would read the image; this one accepts any image.</p>
            <button onClick={onClose} className={btnPrimary + " mt-5 w-full justify-center py-3"}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
