"use client";

import { useRef, useState } from "react";
import DemoBar from "@/components/DemoBar";
import { CheckIcon, FileIcon, UploadIcon } from "@/components/Icons";
import { DEMO_TIMES, useDemo } from "@/lib/state";

const COURSE_NAV = ["Home", "Announcements", "Assignments", "Discussions", "Grades", "Files", "Syllabus"];

export default function CanvasPage() {
  const { state, update } = useDemo();
  const { submitted, submittedAt, fileName } = state.canvas;
  const [mode, setMode] = useState<"view" | "upload">("view");
  const [picked, setPicked] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    if (!picked) return;
    setSending(true);
    setTimeout(() => {
      update((s) => ({
        ...s,
        canvas: { submitted: true, submittedAt: DEMO_TIMES.canvasSubmit, fileName: picked },
      }));
      setSending(false);
      setMode("view");
    }, 900);
  };

  return (
    <div className="min-h-screen bg-white text-[#2d3b45]" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <DemoBar app="Demo Canvas" />
      <div className="flex">
        {/* Global nav */}
        <nav className="hidden w-[84px] shrink-0 flex-col items-center gap-5 bg-[#394b58] py-5 text-[11px] text-white sm:flex" aria-label="Global">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-sm font-bold">LMS</div>
          {["Account", "Dashboard", "Courses", "Calendar", "Inbox"].map((n) => (
            <span key={n} className={n === "Courses" ? "font-semibold" : "text-white/75"}>
              {n}
            </span>
          ))}
        </nav>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 border-b border-[#c7cdd1] px-6 py-4 text-sm">
            <span className="font-semibold text-[#2b6cb0]">MATH 257</span>
            <span className="text-[#6b7780]">›</span>
            <span className="text-[#2b6cb0]">Assignments</span>
            <span className="text-[#6b7780]">›</span>
            <span>Homework 6</span>
            <span className="ml-auto rounded bg-[#eef1f3] px-2 py-0.5 text-xs font-semibold text-[#6b7780]">Demo Canvas</span>
          </div>

          <div className="flex">
            <aside className="hidden w-44 shrink-0 px-6 py-6 text-sm md:block" aria-label="Course">
              <p className="mb-3 text-xs text-[#6b7780]">Fall 2026</p>
              <ul className="space-y-2.5">
                {COURSE_NAV.map((n) => (
                  <li
                    key={n}
                    className={n === "Assignments" ? "border-l-2 border-[#2d3b45] pl-2 font-semibold" : "pl-2.5 text-[#2b6cb0]"}
                  >
                    {n}
                  </li>
                ))}
              </ul>
            </aside>

            <main className="min-w-0 flex-1 px-6 py-6">
              <div className="flex flex-col gap-6 lg:flex-row">
                <div className="min-w-0 flex-1">
                  <h1 className="text-3xl font-light">Homework 6</h1>
                  <p className="mt-1 text-sm text-[#6b7780]">MATH 257: Linear Algebra with Computational Applications</p>

                  <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 border-y border-[#c7cdd1] py-3 text-sm">
                    <div><dt className="inline font-semibold">Due </dt><dd className="inline">Tonight at 11:59 PM</dd></div>
                    <div><dt className="inline font-semibold">Points </dt><dd className="inline">30</dd></div>
                    <div><dt className="inline font-semibold">Submitting </dt><dd className="inline">a file upload</dd></div>
                  </dl>

                  <div className="mt-5 space-y-3 text-[15px] leading-relaxed">
                    <p>Complete the following problems from Chapter 6 (Eigenvalues and Eigenvectors). Show your work and upload a single PDF.</p>
                    <ol className="list-decimal space-y-1 pl-6">
                      <li>Find the eigenvalues and eigenvectors of the 3×3 matrix in problem 6.1.4.</li>
                      <li>Diagonalize matrix A from problem 6.2.7, or show it cannot be diagonalized.</li>
                      <li>Use the power method to estimate the dominant eigenvalue in 6.3.2 to three decimals.</li>
                      <li>Prove that similar matrices share a characteristic polynomial.</li>
                    </ol>
                  </div>

                  {!submitted && mode === "view" && (
                    <button
                      onClick={() => setMode("upload")}
                      className="mt-6 rounded bg-[#0374b5] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#02609a]"
                    >
                      Start Assignment
                    </button>
                  )}

                  {!submitted && mode === "upload" && (
                    <div className="mt-6 rounded border border-[#c7cdd1] p-5">
                      <h2 className="font-semibold">File Upload</h2>
                      <p className="mt-1 text-sm text-[#6b7780]">Upload a file, or choose your saved draft.</p>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <button
                          onClick={() => setPicked("HW6_Solutions.pdf")}
                          className={[
                            "flex items-center gap-3 rounded border px-4 py-3 text-left text-sm",
                            picked === "HW6_Solutions.pdf" ? "border-[#0374b5] bg-[#eaf4fb]" : "border-[#c7cdd1] hover:border-[#0374b5]",
                          ].join(" ")}
                        >
                          <FileIcon className="h-5 w-5 text-[#0374b5]" />
                          <span>
                            <span className="block font-semibold">HW6_Solutions.pdf</span>
                            <span className="text-[#6b7780]">4 pages, saved 10:39 PM</span>
                          </span>
                        </button>
                        <button
                          onClick={() => inputRef.current?.click()}
                          className="flex items-center justify-center gap-2 rounded border-2 border-dashed border-[#c7cdd1] px-4 py-3 text-sm text-[#2b6cb0] hover:border-[#0374b5]"
                        >
                          <UploadIcon className="h-5 w-5" /> Upload from this device
                        </button>
                        <input
                          ref={inputRef}
                          type="file"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && setPicked(e.target.files[0].name)}
                        />
                      </div>

                      {picked && <p className="mt-3 text-sm">Selected: <span className="font-semibold">{picked}</span></p>}

                      <div className="mt-5 flex gap-2">
                        <button
                          onClick={() => {
                            setMode("view");
                            setPicked(null);
                          }}
                          className="rounded border border-[#c7cdd1] bg-[#f5f5f5] px-4 py-2 text-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={submit}
                          disabled={!picked || sending}
                          className="rounded bg-[#0374b5] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          {sending ? "Submitting…" : "Submit Assignment"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <aside className="w-full shrink-0 lg:w-64" aria-label="Submission">
                  <div className="rounded border border-[#c7cdd1] p-4">
                    <h2 className="text-sm font-semibold">Submission</h2>
                    {submitted ? (
                      <div aria-live="polite">
                        <p className="mt-3 flex items-center gap-2 font-semibold text-[#0b874b]">
                          <CheckIcon className="h-5 w-5" /> Submitted!
                        </p>
                        <p className="mt-1 text-sm">Submitted at {submittedAt}</p>
                        <p className="mt-3 flex items-center gap-2 text-sm text-[#2b6cb0]">
                          <FileIcon className="h-4 w-4" /> {fileName}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-3 inline-block rounded bg-[#fbeaea] px-2 py-1 text-sm font-semibold text-[#c23c2d]">
                        NOT SUBMITTED
                      </p>
                    )}
                  </div>
                </aside>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
