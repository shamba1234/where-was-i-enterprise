"use client";

import AskBox from "@/components/AskBox";
import CommitmentCard from "@/components/CommitmentCard";
import { PersonHandoff, PrivacyNote, ReviewNeeded, Stats, TeamHandoff, Updates, sortByDue } from "@/components/Panels";
import PickUpCard from "@/components/PickUpCard";
import TeamMember from "@/components/TeamMember";
import { useUI } from "@/components/UIProvider";
import { Empty, SectionTitle, btn } from "@/components/ui";
import { PlusIcon } from "@/components/Icons";
import { TODAY, longDate } from "@/lib/clock";
import { employeeView, managerNeeds, managerSummary } from "@/lib/derive";
import { PEOPLE, TEAM } from "@/lib/model";
import { useStore } from "@/lib/store";

export default function Home() {
  const { ws, me, hydrated } = useStore();
  if (!hydrated) return <main className="mx-auto max-w-6xl px-5 py-16 sm:px-8" aria-busy="true" />;
  return PEOPLE[me].manager ? <ManagerHome /> : <EmployeeHome key={ws.viewer} />;
}

function greeting(now: number) {
  const h = Math.floor(((now % 1440) + 1440) % 1440 / 60);
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function ManagerHome() {
  const { ws, me } = useStore();
  const ui = useUI();
  const sum = managerSummary(ws);
  const needs = managerNeeds(ws, me);
  const verified = ws.commitments.filter((c) => c.status === "verified").sort((a, b) => (b.verifiedAt ?? 0) - (a.verifiedAt ?? 0)).slice(0, 4);

  return (
    <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
      <section className="pb-2 pt-10 md:pt-14">
        <p className="text-mute">{longDate(TODAY)}, Northstar Labs</p>
        <h1 className="mt-1 font-display text-5xl font-semibold tracking-tight sm:text-6xl">{greeting(ws.now)}, {PEOPLE[me].first}.</h1>
        <p className="mt-3 text-lg text-soft">Here's what needs attention across your team.</p>
        <Stats
          items={[
            { n: sum.active, label: "active commitments" },
            { n: sum.dueThisWeek, label: "due this week", tone: "warn" },
            { n: sum.blocked, label: "blocked", tone: "blocked", href: "/dependencies" },
            { n: sum.review, label: "waiting for review", tone: "review", href: "#needs" },
            { n: sum.verifiedThisWeek, label: "verified this week", tone: "ok" },
          ]}
        />
      </section>

      <Updates />

      <div className="mt-8"><TeamHandoff /></div>

      <div className="mt-8"><AskBox /></div>

      <section className="mt-12" aria-labelledby="needs">
        <SectionTitle id="needs" title="Needs you" count={needs.reviews.length + needs.verify.length + needs.own.length} note="Reviews, verifications and your own commitments. You own the next action on these." />
        <div className="grid gap-4 md:grid-cols-2">
          {needs.reviews.map((c) => <ReviewNeeded key={c.id} c={c} />)}
          {needs.verify.map((c) => <CommitmentCard key={c.id} c={c} showPerson />)}
          {needs.own.sort(sortByDue).map((c) => <CommitmentCard key={c.id} c={c} />)}
        </div>
      </section>

      <section className="mt-12" aria-labelledby="team">
        <SectionTitle
          id="team"
          title="Team overview"
          note="Work state, ownership and the latest context each person chose to share. No activity tracking or scores."
          action={<button onClick={() => ui.open({ kind: "assign" })} className={btn.secondary}><PlusIcon className="h-4 w-4" /> Assign commitment</button>}
        />
        <div className="space-y-4">
          {TEAM.map((p) => <TeamMember key={p} p={p} />)}
        </div>
      </section>

      <section className="mt-12" aria-labelledby="verified">
        <SectionTitle id="verified" title="Recently verified" note="Approved by a reviewer or confirmed by attached evidence." />
        <div className="grid gap-4 md:grid-cols-2">
          {verified.map((c) => <CommitmentCard key={c.id} c={c} showPerson compact />)}
        </div>
      </section>
    </main>
  );
}

function EmployeeHome() {
  const { ws, me } = useStore();
  const ui = useUI();
  const v = employeeView(ws, me);

  return (
    <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
      <section className="pb-2 pt-10 md:pt-14">
        <p className="text-mute">{longDate(TODAY)}, {PEOPLE[me].role}</p>
        <h1 className="mt-1 font-display text-5xl font-semibold tracking-tight sm:text-6xl">{greeting(ws.now)}, {PEOPLE[me].first}.</h1>
        <Stats
          items={[
            { n: v.counts.needsYou, label: "need you", href: "#assigned" },
            { n: v.counts.waiting, label: "waiting on others", tone: "review", href: "#waiting" },
            { n: v.counts.dueToday, label: "due today", tone: "warn" },
            { n: v.counts.recentlyVerified, label: "recently verified", tone: "ok", href: "#done" },
          ]}
        />
      </section>

      <Updates />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-12">
          <AskBox />

          {v.newAssignments.length > 0 && (
            <section aria-labelledby="new">
              <SectionTitle id="new" title="New assignment" count={v.newAssignments.length} note="Accept it to take ownership, or look at the context first." />
              <div className="grid gap-4 md:grid-cols-2">
                {v.newAssignments.map((c) => <CommitmentCard key={c.id} c={c} />)}
              </div>
            </section>
          )}

          <section aria-labelledby="stopped">
            <SectionTitle id="stopped" title="Pick up where you stopped" note="Where the work stopped, and what you were thinking when it did." />
            {v.pickup.length ? <div className="space-y-4">{v.pickup.map((c) => <PickUpCard key={c.id} c={c} />)}</div> : <Empty>Nothing interrupted. When you step away from a workspace, it shows up here.</Empty>}
          </section>

          <section aria-labelledby="assigned">
            <SectionTitle id="assigned" title="Assigned to you" count={v.assignedToYou.length} />
            {v.assignedToYou.length ? <div className="grid gap-4 md:grid-cols-2">{v.assignedToYou.sort(sortByDue).map((c) => <CommitmentCard key={c.id} c={c} />)}</div> : <Empty>Nothing else assigned that needs you right now.</Empty>}
          </section>

          <section aria-labelledby="yours">
            <SectionTitle id="yours" title="Your commitments" count={v.yourCommitments.length} note="Work you created yourself." action={<button onClick={() => ui.open({ kind: "capture" })} className={btn.secondary}><PlusIcon className="h-4 w-4" /> Capture work</button>} />
            {v.yourCommitments.length ? <div className="grid gap-4 md:grid-cols-2">{v.yourCommitments.sort(sortByDue).map((c) => <CommitmentCard key={c.id} c={c} />)}</div> : <Empty>Capture work you're doing that nobody assigned.</Empty>}
          </section>

          <section aria-labelledby="waiting">
            <SectionTitle id="waiting" title="Waiting on others" count={v.waiting.length} note="Someone else owns the next action. No action needed from you." />
            {v.waiting.length ? <div className="grid gap-4 md:grid-cols-2">{v.waiting.map((c) => <CommitmentCard key={c.id} c={c} />)}</div> : <Empty>You're not waiting on anyone.</Empty>}
          </section>

          <section aria-labelledby="upcoming">
            <SectionTitle id="upcoming" title="Upcoming" count={v.upcoming.length} />
            {v.upcoming.length ? <div className="grid gap-4 md:grid-cols-2">{v.upcoming.map((c) => <CommitmentCard key={c.id} c={c} compact />)}</div> : <Empty>Nothing scheduled.</Empty>}
          </section>

          <section aria-labelledby="done">
            <SectionTitle id="done" title="Recently completed" count={v.recentlyCompleted.length} note="Verified means approved or backed by evidence. Completed means you said so." />
            {v.recentlyCompleted.length ? <div className="grid gap-4 md:grid-cols-2">{v.recentlyCompleted.map((c) => <CommitmentCard key={c.id} c={c} compact />)}</div> : <Empty>Nothing completed this week yet.</Empty>}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <PersonHandoff p={me} />
          <PrivacyNote />
        </aside>
      </div>
    </main>
  );
}
