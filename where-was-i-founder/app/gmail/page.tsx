"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import DemoBar from "@/components/DemoBar";
import { FileIcon } from "@/components/Icons";
import { nowLabel } from "@/lib/clock";
import { sendMail, useFounder } from "@/lib/state";

type Msg = { from: string; to?: string; time: string; body: string; attachments?: string[]; mine?: boolean };
type Thread = { id: string; subject: string; folder: "inbox" | "sent"; messages: Msg[]; unread?: boolean };

const FILES = [
  { name: "Founder_Deck.pdf", detail: "PDF, 2.4 MB, edited Monday" },
  { name: "Founder_Deck_v2_old.pdf", detail: "PDF, 2.1 MB, edited Sep 12" },
  { name: "Financial_Model_v4.xlsx", detail: "Spreadsheet, 380 KB, edited today" },
];

const ALEX_REQUEST: Msg = {
  from: "Alex Chen",
  time: "Yesterday, 5:14 PM",
  body: "Hi Sam,\n\nGreat chatting last week. Could you send over the latest investor deck before we meet Wednesday? I'd like to share it with my partner ahead of time.\n\nThanks,\nAlex\nBrightline Ventures",
};

function GmailInner() {
  const params = useSearchParams();
  const { state, update } = useFounder();
  const [folder, setFolder] = useState<"inbox" | "sent">("inbox");
  const [open, setOpen] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [body, setBody] = useState("Hi Alex,\n\nHere's the latest deck. Looking forward to Wednesday.\n\nSam");
  const [attached, setAttached] = useState<string[]>([]);
  const [picker, setPicker] = useState(false);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    const t = params.get("thread");
    if (t) setOpen(t);
    if (params.get("reply") === "1") setComposing(true);
    if (params.get("draft") === "model") setBody("Hi Alex,\n\nAs promised, here's the updated financial model from our meeting.\n\nSam");
  }, [params]);

  const alexReplies: Msg[] = state.gmail.sent
    .filter((m) => m.to.startsWith("Alex"))
    .map((m) => ({ from: "me", to: "Alex Chen", time: `Today, ${m.at}`, body: m.body, attachments: m.attachments, mine: true }));

  const sarahMsgs: Msg[] = [
    { from: "me", to: "Sarah Kim", time: "Yesterday, 4:32 PM", body: "Hi Sarah,\n\nFinal landing-page copy is attached. Can you approve it so we can ship Thursday?\n\nSam", attachments: ["Landing_copy_final.docx"], mine: true },
    ...(state.gmail.sarahReplied ? [{ from: "Sarah Kim", time: `Today, ${state.gmail.sarahRepliedAt}`, body: "Approved! Ship it. Nice work on the headline." }] : []),
  ];

  const threads: Thread[] = [
    { id: "alex", subject: "Latest investor deck?", folder: "inbox", messages: [ALEX_REQUEST, ...alexReplies], unread: alexReplies.length === 0 },
    ...(state.gmail.sarahReplied ? [{ id: "sarah", subject: "Re: Final landing page copy", folder: "inbox" as const, messages: sarahMsgs }] : []),
    { id: "northstar", subject: "Northstar Accelerator: applications close Friday", folder: "inbox", messages: [{ from: "Northstar Accelerator", time: "Yesterday, 9:00 AM", body: "A reminder that Winter 2027 applications close Friday at 11:59 PM PT. Drafts are saved automatically." }] },
    { id: "invite", subject: "Invitation: Kestrel / Brightline, Wed 2:30 PM", folder: "inbox", messages: [{ from: "Demo Calendar", time: "Thursday", body: "Alex Chen invited you to “Kestrel / Brightline” on Wednesday, Oct 7, 2:30–3:15 PM." }] },
    { id: "priya", subject: "Pitch follow-up", folder: "sent", messages: [{ from: "me", to: "Priya Shah", time: "Yesterday, 6:10 PM", body: "Hi Priya,\n\nThanks for the time on Friday. Attaching the one-pager we discussed.\n\nSam", attachments: ["Kestrel_one_pager.pdf"], mine: true }] },
    {
      id: "sarah",
      subject: "Final landing page copy",
      folder: "sent",
      messages: sarahMsgs,
    },
    ...alexReplies.map((m, i) => ({ id: `alex-sent-${i}`, subject: "Re: Latest investor deck?", folder: "sent" as const, messages: [m] })),
  ];

  const list = threads.filter((t) => t.folder === folder && t.messages.length);
  const thread = open ? threads.find((t) => t.id === open && t.messages.length) ?? threads.find((t) => t.id === open.replace(/-sent-\d+$/, "")) : null;

  const send = () => {
    update((s) => sendMail(s, { to: "Alex Chen", subject: "Re: Latest investor deck?", body: body.trim(), attachments: attached }));
    setComposing(false);
    setAttached([]);
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#17171a] text-[#e3e3e3]" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif", colorScheme: "dark" }}>
      <DemoBar app="Demo Gmail" />
      <div className="flex items-center gap-4 px-4 py-3">
        <span className="flex items-center gap-2 text-xl text-[#c4c7c5]">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#c5221f] text-sm font-bold text-white">M</span>
          Demo Gmail
        </span>
        <div className="hidden flex-1 rounded-full bg-[#2a2b30] px-5 py-2.5 text-sm text-[#9aa0a6] sm:block">Search mail</div>
      </div>

      <div className="flex gap-2 px-2 pb-6">
        <nav className="hidden w-52 shrink-0 md:block" aria-label="Folders">
          <div className="mb-4 ml-2 inline-flex items-center gap-3 rounded-2xl bg-[#004a77] px-5 py-4 text-sm font-medium">✎ Compose</div>
          {(["inbox", "sent"] as const).map((f) => (
            <button
              key={f}
              onClick={() => {
                setFolder(f);
                setOpen(null);
              }}
              className={["flex w-full items-center justify-between rounded-r-full py-1.5 pl-6 pr-4 text-sm capitalize", folder === f && !open ? "bg-[#004a77] font-semibold" : "hover:bg-[#2d2e33]"].join(" ")}
            >
              {f}
              {f === "inbox" && threads.some((t) => t.unread) && <span className="text-xs">1</span>}
            </button>
          ))}
        </nav>

        <main className="min-w-0 flex-1 overflow-hidden rounded-2xl bg-[#222226]">
          {!thread ? (
            <>
              <div className="flex gap-1 border-b px-2 pt-1 md:hidden">
                {(["inbox", "sent"] as const).map((f) => (
                  <button key={f} onClick={() => setFolder(f)} className={["px-4 py-2 text-sm capitalize", folder === f ? "border-b-2 border-[#a8c7fa] font-semibold" : ""].join(" ")}>{f}</button>
                ))}
              </div>
              <ul>
                {list.map((t) => {
                  const last = t.messages[t.messages.length - 1];
                  return (
                    <li key={t.id}>
                      <button
                        onClick={() => setOpen(t.id)}
                        className={["flex w-full items-center gap-4 border-b border-[#2c2c30] px-4 py-3 text-left text-sm hover:bg-[#2d2e33]", t.unread ? "font-semibold" : "bg-[#2a2a2e]"].join(" ")}
                      >
                        <span className="w-32 shrink-0 truncate sm:w-44">{t.folder === "sent" ? `To: ${last.to}` : t.messages.map((m) => (m.mine ? "me" : m.from)).join(", ")}</span>
                        <span className="min-w-0 flex-1 truncate">
                          {t.subject} <span className="font-normal text-[#9aa0a6]">– {last.body.replace(/\n+/g, " ")}</span>
                        </span>
                        {t.messages.some((m) => m.attachments?.length) && <FileIcon className="h-4 w-4 shrink-0 text-[#9aa0a6]" />}
                        <span className="shrink-0 text-xs">{last.time.replace("Yesterday, ", "")}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <div className="px-5 py-5 sm:px-8">
              <button onClick={() => setOpen(null)} className="mb-4 text-sm text-[#a8c7fa]">← Back to {folder}</button>
              <h1 className="text-2xl">{thread.subject}</h1>
              {thread.messages.map((m, i) => (
                <Message key={i} m={m} />
              ))}

              {thread.id === "sarah" && !state.gmail.sarahReplied && (
                <div className="mt-6 rounded-xl border border-dashed border-[#3c4043] p-4 text-sm text-[#9aa0a6]">
                  <p className="font-semibold text-[#e3e3e3]">Demo control</p>
                  <p className="mt-1">In a real inbox you'd just wait. For the demo, you can make Sarah reply now.</p>
                  <button
                    onClick={() => update((s) => ({ ...s, gmail: { ...s.gmail, sarahReplied: true, sarahRepliedAt: nowLabel() } }))}
                    className="mt-3 rounded-full border border-[#8e918f] px-4 py-1.5 font-medium text-[#e3e3e3] hover:bg-[#2d2e33]"
                  >
                    Simulate Sarah's reply
                  </button>
                </div>
              )}

              {thread.id === "alex" && !composing && (
                <button onClick={() => setComposing(true)} className="mt-6 rounded-full border border-[#8e918f] px-5 py-2 text-sm font-medium hover:bg-[#2d2e33]">↩ Reply</button>
              )}

              {thread.id === "alex" && composing && (
                <div className="mt-6 rounded-2xl border border-[#3c4043] p-4 shadow-sm">
                  <p className="text-sm text-[#9aa0a6]">To: Alex Chen</p>
                  <label htmlFor="reply" className="sr-only">Reply</label>
                  <textarea id="reply" value={body} onChange={(e) => setBody(e.target.value)} rows={5} className="mt-2 w-full resize-y rounded-lg p-2 text-sm outline-none focus:bg-[#2a2a2e]" />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {attached.map((a) => (
                      <span key={a} className="inline-flex items-center gap-2 rounded-lg border border-[#3c4043] bg-[#2a2a2e] px-3 py-2 text-sm">
                        <FileIcon className="h-4 w-4 text-[#f28b82]" /> {a}
                        <button onClick={() => setAttached((x) => x.filter((y) => y !== a))} aria-label={`Remove ${a}`} className="text-[#9aa0a6] hover:text-white">×</button>
                      </span>
                    ))}
                  </div>
                  <div className="relative mt-4 flex items-center gap-3">
                    <button onClick={send} disabled={!body.trim()} className="rounded-full bg-[#a8c7fa] px-6 py-2 text-sm font-semibold text-[#062e6f] hover:bg-[#c2d8fc] disabled:opacity-50">Send</button>
                    <button onClick={() => setPicker((p) => !p)} aria-expanded={picker} className="rounded-full px-3 py-2 text-sm text-[#c4c7c5] hover:bg-[#2d2e33]">📎 Attach file</button>
                    <button onClick={() => setComposing(false)} className="text-sm text-[#9aa0a6]">Discard</button>
                    {picker && (
                      <div className="absolute bottom-full left-20 z-10 mb-2 w-72 overflow-hidden rounded-xl border border-[#3c4043] bg-[#222226] py-1 shadow-xl">
                        <p className="px-4 py-2 text-xs font-semibold text-[#9aa0a6]">Recent files</p>
                        {FILES.map((f) => (
                          <button
                            key={f.name}
                            onClick={() => {
                              setAttached((x) => (x.includes(f.name) ? x : [...x, f.name]));
                              setPicker(false);
                            }}
                            className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-[#2d2e33]"
                          >
                            <FileIcon className="h-4 w-4 text-[#f28b82]" />
                            <span>
                              <span className="block font-medium">{f.name}</span>
                              <span className="text-xs text-[#9aa0a6]">{f.detail}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
      {toast && <div role="status" className="fixed bottom-6 left-6 rounded-lg bg-[#303030] px-5 py-3 text-sm text-white shadow-lg">Message sent</div>}
    </div>
  );
}

function Message({ m }: { m: Msg }) {
  return (
    <div className="mt-6 flex gap-3 border-t border-[#2c2c30] pt-5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white" style={{ background: m.mine ? "#0b57d0" : "#7b1fa2" }}>
        {m.mine ? "S" : m.from[0]}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm">
            <span className="font-semibold">{m.mine ? "me" : m.from}</span>
            {m.to && <span className="text-xs text-[#9aa0a6]"> to {m.to}</span>}
          </p>
          <p className="text-xs text-[#9aa0a6]">{m.time}</p>
        </div>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{m.body}</p>
        {!!m.attachments?.length && (
          <div className="mt-3 flex flex-wrap gap-2">
            {m.attachments.map((a) => (
              <span key={a} className="inline-flex items-center gap-2 rounded-lg border border-[#3c4043] px-3 py-2 text-sm">
                <FileIcon className="h-4 w-4 text-[#f28b82]" /> {a}
              </span>
            ))}
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
