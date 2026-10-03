"use client";

import { PersonHandoff } from "@/components/Panels";
import TeamMember from "@/components/TeamMember";
import { SectionTitle } from "@/components/ui";
import { PEOPLE, TEAM } from "@/lib/model";
import { useStore } from "@/lib/store";

export default function TeamPage() {
  const { hydrated, me } = useStore();
  if (!hydrated) return null;
  if (!PEOPLE[me].manager) return <main className="mx-auto max-w-6xl px-5 py-16 text-soft sm:px-8">The team view is for managers. Switch to Jordan Lee to see it.</main>;
  return (
    <main className="mx-auto max-w-6xl px-5 pb-20 pt-10 sm:px-8">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Team</h1>
      <p className="mt-2 max-w-2xl text-soft">What each person owns, what's progressing, what's blocked, and the work context they chose to share. Where Was I? tracks work state, not people: there are no scores, rankings or activity metrics.</p>
      <div className="mt-8 space-y-4">
        {TEAM.map((p) => <TeamMember key={p} p={p} defaultOpen />)}
      </div>
      <section className="mt-12">
        <SectionTitle title="Today's handoffs" note="Work-related handoff for each person. Private breadcrumbs stay private." />
        <div className="grid gap-4 md:grid-cols-3">
          {TEAM.map((p) => <PersonHandoff key={p} p={p} compact />)}
        </div>
      </section>
    </main>
  );
}
