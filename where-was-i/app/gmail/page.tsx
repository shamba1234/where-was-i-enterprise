"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import DemoBar from "@/components/DemoBar";
import { FileIcon } from "@/components/Icons";
import { DEMO_TIMES, useDemo } from "@/lib/state";

const MAYA_BODY =
  "Hey, can you send me the final slides tonight? I need to combine everything before tomorrow morning.";

const DEFAULT_REPLY =
  "Hi Maya,\n\nHere are the final slides. Let me know if anything needs changing before the morning.\n\nThanks!";

type Mail = { id: string; from: string; subject: string; preview: string; time: string; unread?: boolean };

const OTHER_MAIL: Mail[] = [
  { id: "liu", from: "Prof. Liu", subject: "HW6 office hours moved", preview: "Tonight's office hours are now 8–9 PM in Altgeld 173.", time: "4:05 PM" },
  { id: "acm", from: "ACM Student Chapter", subject: "Hack night this Saturday", preview: "Bring a laptop and a friend. Pizza at 6.", time: "2:48 PM" },
  { id: "career", from: "Career Center", subject: "Resume review slots open", preview: "Drop-in reviews run Monday through Thursday this month.", time: "11:20 AM" },
  { id: "lib", from: "University Library", subject: "Your item is due soon", preview: "Introduction to Linear Algebra is due Oct 9.", time: "Yesterday" },
];

function GmailInner() {
  const params = useSearchParams();
  const { state, update } = useDemo();
  const { replied, repliedAt, replyBody } = state.gmail;
  const [folder, setFolder] = useState<"inbox" | "sent">("inbox");
  const [openId, setOpenId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState(DEFAULT_REPLY);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    if (params.get("thread") === "maya") setOpenId("maya");
  }, [params]);

  const send = () => {
    update((s) => ({ ...s, gmail: { replied: true, repliedAt: DEMO_TIMES.gmailReply, replyBody: draft.trim() } }));
    setComposing(false);
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  };

  const mayaRow: Mail = {
    id: "maya",
    from: replied ? "Maya Patel, me" : "Maya Patel",
    subject: "Final presentation slides",
    preview: replied ? (replyBody ?? "").split("\n").join(" ") : MAYA_BODY,
    time: replied ? (repliedAt ?? "") : "6:12 PM",
    unread: !replied,
  };

  const inbox = [mayaRow, ...OTHER_MAIL];
  const sent: Mail[] = replied
    ? [{ id: "maya", from: "To: Maya Patel", subject: "Re: Final presentation slides", preview: (replyBody ?? "").split("\n").join(" "), time: repliedAt ?? "" }]
    : [];
  const list = folder === "inbox" ? inbox : sent;
  const other = OTHER_MAIL.find((m) => m.id === openId);

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-[#1f1f1f]" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <DemoBar app="Demo Gmail" />
      <div className="flex items-center gap-4 px-4 py-3">
        <span className="flex items-center gap-2 text-xl text-[#444]">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#c5221f] text-sm font-bold text-white">M</span>
          Demo Gmail
        </span>
        <div className="hidden flex-1 rounded-full bg-[#e9eef6] px-5 py-2.5 text-sm text-[#5f6368] sm:block">Search mail</div>
      </div>

      <div className="flex gap-2 px-2 pb-4">
        <nav className="hidden w-52 shrink-0 md:block" aria-label="Folders">
          <div className="mb-4 ml-2 inline-flex items-center gap-3 rounded-2xl bg-[#c2e7ff] px-5 py-4 text-sm font-medium">✎ Compose</div>
          {(
            [
              ["inbox", "Inbox", replied ? 0 : 1],
              ["sent", "Sent", 0],
            ] as const
          ).map(([id, label, count]) => (
            <button
              key={id}
              onClick={() => {
                setFolder(id);
                setOpenId(null);
              }}
              className={[
                "flex w-full items-center justify-between rounded-r-full py-1.5 pl-6 pr-4 text-sm",
                folder === id ? "bg-[#d3e3fd] font-semibold" : "hover:bg-[#e9eef6]",
              ].join(" ")}
            >
              {label}
              {count > 0 && <span className="text-xs">{count}</span>}
            </button>
          ))}
          {["Starred", "Snoozed", "Drafts"].map((l) => (
            <div key={l} className="py-1.5 pl-6 text-sm text-[#444]">{l}</div>
          ))}
        </nav>

        <main className="min-w-0 flex-1 overflow-hidden rounded-2xl bg-white">
          {!openId ? (
            <>
              <div className="flex gap-1 border-b px-2 pt-1 md:hidden">
                {(["inbox", "sent"] as const).map((f) => (
                  <button key={f} onClick={() => setFolder(f)} className={["px-4 py-2 text-sm capitalize", folder === f ? "border-b-2 border-[#0b57d0] font-semibold" : ""].join(" ")}>
                    {f}
                  </button>
                ))}
              </div>
              {list.length === 0 ? (
                <p className="px-6 py-10 text-sm text-[#5f6368]">No sent messages yet.</p>
              ) : (
                <ul>
                  {list.map((m) => (
                    <li key={m.id + folder}>
                      <button
                        onClick={() => setOpenId(m.id)}
                        className={[
                          "flex w-full items-center gap-4 border-b border-[#f1f3f4] px-4 py-3 text-left text-sm hover:shadow-[inset_1px_0_0_#dadce0,inset_-1px_0_0_#dadce0,0_1px_2px_rgba(60,64,67,.3)]",
                          m.unread ? "bg-white font-semibold" : "bg-[#f2f6fc]",
                        ].join(" ")}
                      >
                        <span className="w-32 shrink-0 truncate sm:w-44">{m.from}</span>
                        <span className="min-w-0 flex-1 truncate">
                          {m.subject} <span className="font-normal text-[#5f6368]">– {m.preview}</span>
                        </span>
                        <span className="shrink-0 text-xs">{m.time}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : openId === "maya" ? (
            <div className="px-5 py-5 sm:px-8">
              <button onClick={() => setOpenId(null)} className="mb-4 text-sm text-[#0b57d0]">← Back to {folder}</button>
              <h1 className="text-2xl">Final presentation slides</h1>

              <Message from="Maya Patel" email="maya.patel@school.edu" time="6:12 PM" body={MAYA_BODY} initial="M" color="#7b1fa2" />

              {replied && (
                <Message
                  from="me"
                  email="to Maya Patel"
                  time={repliedAt ?? ""}
                  body={replyBody ?? ""}
                  initial="Y"
                  color="#0b57d0"
                  attachment="Team_Presentation_Final.pptx"
                />
              )}

              {!replied && !composing && (
                <div className="mt-6 flex gap-2">
                  <button onClick={() => setComposing(true)} className="rounded-full border border-[#747775] px-5 py-2 text-sm font-medium hover:bg-[#f2f6fc]">
                    ↩ Reply
                  </button>
                </div>
              )}

              {!replied && composing && (
                <div className="mt-6 rounded-2xl border border-[#dadce0] p-4 shadow-sm">
                  <p className="text-sm text-[#5f6368]">To: Maya Patel</p>
                  <label htmlFor="reply" className="sr-only">Reply</label>
                  <textarea
                    id="reply"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={6}
                    className="mt-2 w-full resize-y rounded-lg p-2 text-sm outline-none focus:bg-[#f8fafd]"
                  />
                  <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-[#dadce0] bg-[#f8fafd] px-3 py-2 text-sm">
                    <FileIcon className="h-4 w-4 text-[#c5221f]" /> Team_Presentation_Final.pptx
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      onClick={send}
                      disabled={!draft.trim()}
                      className="rounded-full bg-[#0b57d0] px-6 py-2 text-sm font-semibold text-white hover:bg-[#0a4ab3] disabled:opacity-50"
                    >
                      Send
                    </button>
                    <button onClick={() => setComposing(false)} className="text-sm text-[#5f6368]">Discard</button>
                  </div>
                </div>
              )}
            </div>
          ) : other ? (
            <div className="px-5 py-5 sm:px-8">
              <button onClick={() => setOpenId(null)} className="mb-4 text-sm text-[#0b57d0]">← Back to inbox</button>
              <h1 className="text-2xl">{other.subject}</h1>
              <Message from={other.from} email="" time={other.time} body={other.preview} initial={other.from[0]} color="#5f6368" />
            </div>
          ) : null}
        </main>
      </div>

      {toast && (
        <div role="status" className="fixed bottom-6 left-6 rounded-lg bg-[#303030] px-5 py-3 text-sm text-white shadow-lg">
          Message sent
        </div>
      )}
    </div>
  );
}

function Message(props: { from: string; email: string; time: string; body: string; initial: string; color: string; attachment?: string }) {
  return (
    <div className="mt-6 flex gap-3 border-t border-[#f1f3f4] pt-5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white" style={{ background: props.color }}>
        {props.initial}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm">
            <span className="font-semibold">{props.from}</span> <span className="text-xs text-[#5f6368]">{props.email}</span>
          </p>
          <p className="text-xs text-[#5f6368]">{props.time}</p>
        </div>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{props.body}</p>
        {props.attachment && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#dadce0] px-3 py-2 text-sm">
            <FileIcon className="h-4 w-4 text-[#c5221f]" /> {props.attachment}
          </div>
        )}
      </div>
    </div>
  );
}

export default function GmailPage() {
  return (
    <Suspense fallback={null}>
      <GmailInner />
    </Suspense>
  );
}
