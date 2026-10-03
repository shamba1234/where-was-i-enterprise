"use client";

import { useEffect, useRef, useState } from "react";
import { DEMO_TIMES, useDemo } from "@/lib/state";
import { CheckIcon, CloseIcon, FileIcon, UploadIcon } from "./Icons";

type DemoFile = { name: string; detail: string; valid: boolean; reason?: string };

const FILES: DemoFile[] = [
  { name: "Team_Presentation_Final.pptx", detail: "PowerPoint, 9 slides, edited 10:31 PM", valid: true },
  { name: "slides_4-6_screenshot.png", detail: "Screenshot, 2.1 MB, 10:33 PM", valid: true },
  {
    name: "meeting_notes.docx",
    detail: "Word document, edited Tuesday",
    valid: false,
    reason: "No slides were found in meeting_notes.docx. Add the presentation file or a screenshot of slides 4–6.",
  },
];

const CHECKS = ["Opening file", "Looking for slides 4–6", "Matching it to the team presentation"];

type Phase = "pick" | "checking" | "verified" | "rejected";

export default function ProofModal({ onClose }: { onClose: () => void }) {
  const { update } = useDemo();
  const [file, setFile] = useState<DemoFile | null>(null);
  const [phase, setPhase] = useState<Phase>("pick");
  const [step, setStep] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const check = (f: DemoFile) => {
    setFile(f);
    setPhase("checking");
    setStep(0);
    CHECKS.forEach((_, i) => setTimeout(() => setStep(i + 1), 600 * (i + 1)));
    setTimeout(() => {
      if (f.valid) {
        setPhase("verified");
        update((s) => ({
          ...s,
          presentation: { verified: true, verifiedAt: DEMO_TIMES.presentationVerify, evidenceFile: f.name },
          seen: { ...s.seen, presentation: true },
        }));
      } else {
        setPhase("rejected");
      }
    }, 600 * CHECKS.length + 400);
  };

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const real = e.target.files?.[0];
    if (!real) return;
    const ok = /\.(pptx?|key|pdf|png|jpe?g|heic)$/i.test(real.name);
    check({
      name: real.name,
      detail: "Uploaded from this device",
      valid: ok,
      reason: `Slides 4–6 couldn't be found in ${real.name}. Use a presentation file or a screenshot of the slides.`,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="proof-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="rise w-full max-w-lg rounded-3xl bg-card p-6 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="proof-title" className="font-display text-2xl font-bold">
              Show it's done
            </h2>
            <p className="mt-1 text-ink-soft">
              Finish slides 4–6 for team presentation. Add the file or a screenshot and Where Was I? will check it.
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-paper" aria-label="Close">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {(phase === "pick" || phase === "rejected") && (
          <div className="mt-6">
            {phase === "rejected" && file && (
              <p className="rise mb-4 rounded-xl bg-lamp-soft px-4 py-3 text-sm" role="alert">
                {file.reason}
              </p>
            )}
            <p className="mb-2 text-sm font-semibold text-mute">Recent files</p>
            <ul className="space-y-2">
              {FILES.map((f) => (
                <li key={f.name}>
                  <button
                    onClick={() => check(f)}
                    className="flex w-full items-center gap-3 rounded-xl border border-line px-4 py-3 text-left hover:border-dusk hover:bg-paper/50"
                  >
                    <FileIcon className="h-5 w-5 shrink-0 text-dusk" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{f.name}</span>
                      <span className="block text-sm text-mute">{f.detail}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              onClick={() => inputRef.current?.click()}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line px-4 py-4 text-sm font-medium text-ink-soft hover:border-dusk"
            >
              <UploadIcon className="h-5 w-5" /> Upload a different file
            </button>
            <input ref={inputRef} type="file" className="hidden" onChange={onUpload} />
          </div>
        )}

        {phase === "checking" && file && (
          <div className="mt-6" aria-live="polite">
            <p className="font-display text-xl font-semibold">Checking evidence...</p>
            <p className="mt-1 text-sm text-mute">{file.name}</p>
            <div className="mt-4 h-1 overflow-hidden rounded-full bg-paper">
              <div className="scanbar h-full w-1/3 bg-dusk" />
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              {CHECKS.map((c, i) => (
                <li key={c} className={i < step ? "text-ink" : "text-mute"}>
                  {i < step ? "✓" : "○"} {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {phase === "verified" && file && (
          <div className="mt-6" aria-live="polite">
            <ul className="space-y-2">
              {["Slides 4–6 detected", "Presentation file detected"].map((t) => (
                <li key={t} className="rise flex items-center gap-3 font-medium">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-sage-soft text-sage">
                    <CheckIcon className="h-4 w-4" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <div className="settle mt-6 rounded-2xl bg-sage px-5 py-4 text-white">
              <p className="font-display text-3xl font-bold">VERIFIED</p>
              <p className="text-sm text-white/85">From {file.name} at {DEMO_TIMES.presentationVerify}</p>
            </div>
            <button onClick={onClose} className="mt-5 w-full rounded-full bg-ink py-3 font-semibold text-white hover:bg-dusk">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
