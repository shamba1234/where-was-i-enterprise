/**
 * The shared Northstar Labs workspace. One object, persisted to localStorage, read by every
 * user. The core object is a commitment (an open loop). Everything else hangs off it.
 *
 * Privacy principle: this models WORK STATE only. There is no activity tracking, no time-in-app,
 * no keystrokes, no screenshots, no scores. Events are meaningful work transitions people make.
 */
import { TODAY, When, addDays } from "./clock";
import { NO_REPEAT, Recurrence } from "./recurrence";

export type PersonId = "jordan" | "maya" | "alex" | "sarah";
export type Person = { id: PersonId; name: string; first: string; role: string; initials: string; manager: boolean };

export const PEOPLE: Record<PersonId, Person> = {
  jordan: { id: "jordan", name: "Jordan Lee", first: "Jordan", role: "Product Manager", initials: "JL", manager: true },
  maya: { id: "maya", name: "Maya Patel", first: "Maya", role: "Product Designer", initials: "MP", manager: false },
  alex: { id: "alex", name: "Alex Chen", first: "Alex", role: "Software Engineer", initials: "AC", manager: false },
  sarah: { id: "sarah", name: "Sarah Kim", first: "Sarah", role: "Growth Lead", initials: "SK", manager: false },
};
export const TEAM: PersonId[] = ["maya", "alex", "sarah"];

export type Status =
  | "assigned" // waiting for the assignee to accept
  | "accepted"
  | "in_progress"
  | "blocked"
  | "ready" // a dependency resolved; ready to continue
  | "submitted" // handed to a reviewer
  | "changes_requested"
  | "completed" // done on the person's word; not independently verified
  | "verified";

export type Priority = "low" | "normal" | "high";
export type Source = "assigned" | "created" | "requested";

export type Evidence = { id: string; name: string; kind: "design" | "doc" | "file" | "link" | "confirmation"; by: PersonId; at: number; simulated: boolean };
export type Checkpoint = { id: string; at: number; by: PersonId; text: string; location: string };
export type Suggestion = { person: PersonId; needed: string; nextAction: string };
export type Breadcrumb = {
  id: string;
  commitmentId: string;
  author: PersonId;
  at: number;
  /** "user" = written by the person. "ai" = reconstructed from work context, never presented as theirs. */
  type: "user" | "ai";
  goal: string;
  location: string;
  text: string;
  nextAction: string;
  confirmed: boolean;
  dismissed: boolean;
  checkpointId: string | null;
  /** Work context the person chose to share with their manager. */
  shared: boolean;
  voice: boolean;
  suggestion: Suggestion | null;
  suggestionState: "pending" | "confirmed" | "ignored" | null;
};
export type Review = { round: number; submittedAt: number; submittedBy: PersonId; reviewer: PersonId; note: string; evidenceId: string | null; decision: "approved" | "changes" | null; feedback: string | null; decidedAt: number | null };
export type Blocker = { by: PersonId; reason: string; since: number; dependencyId: string | null };
export type Occurrence = { by: PersonId; at: number; kind: "verified" | "completed" };

export type Commitment = When & {
  id: string;
  title: string;
  project: string | null;
  context: string;
  goal: string;
  source: Source;
  createdBy: PersonId;
  assignedBy: PersonId | null;
  assignee: PersonId;
  reviewer: PersonId | null;
  createdAt: number;
  acceptedAt: number | null;
  startedAt: number | null;
  priority: Priority;
  status: Status;
  /** The smallest useful next action, for whoever owns it. */
  nextAction: string;
  dependsOn: string[];
  neededFor: string | null;
  blocker: Blocker | null;
  lastBlocker: Blocker | null;
  resolvedAt: number | null;
  evidenceRequirement: string | null;
  evidence: Evidence[];
  completedAt: number | null;
  verifiedAt: number | null;
  verifiedBy: PersonId | "evidence" | null;
  recurrence: Recurrence;
  occurrences: Record<string, Occurrence>;
  checkpoints: Checkpoint[];
  breadcrumbs: Breadcrumb[];
  reviews: Review[];
  feedback: string | null;
  workspace: "design" | "application" | null;
  lastWorkedAt: number | null;
  raw: string;
};

export type EventKind =
  | "assigned"
  | "accepted"
  | "created"
  | "requested"
  | "started"
  | "checkpoint"
  | "breadcrumb"
  | "update"
  | "blocked"
  | "evidence"
  | "dependency_resolved"
  | "unblocked"
  | "resumed"
  | "submitted"
  | "resubmitted"
  | "handoff"
  | "changes_requested"
  | "approved"
  | "completed"
  | "verified"
  | "reopened";

export type WorkEvent = {
  id: string;
  at: number;
  actor: PersonId;
  /** Whose work timeline this belongs on. */
  person: PersonId;
  commitmentId: string | null;
  kind: EventKind;
  text: string;
  quote?: string;
  /** Breadcrumb text the author kept private: the manager sees that one was saved, not what it says. */
  private?: boolean;
};

export type Notice = { id: string; to: PersonId; at: number; kind: "assignment" | "resolved" | "changes" | "review" | "approved" | "blocked" | "accepted" | "verify"; commitmentId: string; text: string; read: boolean };

export type Section = "desktopHero" | "desktopPricing" | "mobileHero";
export type DesignState = {
  frame: "desktop" | "mobile";
  selected: Section;
  sections: Record<Section, "todo" | "wip" | "done">;
  headline: string;
  cta: string;
  screenshots: boolean;
  restoredAt: number | null;
};
export type AppState = { step: number; description: string; revenue: string; deck: "v2" | "v3"; leadership: string; submitted: boolean; confirmation: string | null };

export type Workspace = {
  version: 1;
  now: number;
  seq: number;
  viewer: PersonId;
  commitments: Commitment[];
  events: WorkEvent[];
  notices: Notice[];
  design: Record<string, DesignState>;
  app: AppState;
};

export const OLD_CTA = "Get started";
export const SARAH_CTA = "Start free, launch in minutes";
export const SECTION_NAMES: Record<Section, string> = { desktopHero: "Desktop hero", desktopPricing: "Desktop pricing", mobileHero: "Mobile hero" };
export const APP_STEPS = ["Company basics", "Product", "Company background", "Leadership", "Review & submit"];

export const freshDesign = (): DesignState => ({
  frame: "desktop",
  selected: "desktopHero",
  sections: { desktopHero: "wip", desktopPricing: "todo", mobileHero: "todo" },
  headline: "Launch pages your whole team can ship",
  cta: OLD_CTA,
  screenshots: false,
  restoredAt: null,
});

/* ---------------- Seed ---------------- */

const T = TODAY;
const D = (n: number) => addDays(T, n); // n days from today
const at = (day: number, h: number, m = 0) => day * 1440 + h * 60 + m; // stamp

function c(p: Partial<Commitment> & Pick<Commitment, "id" | "title" | "assignee" | "createdBy">): Commitment {
  return {
    project: null,
    context: "",
    goal: p.title,
    source: p.assignedBy ? "assigned" : "created",
    assignedBy: null,
    reviewer: null,
    createdAt: at(-1, 9),
    acceptedAt: null,
    startedAt: null,
    priority: "normal",
    status: "in_progress",
    nextAction: p.title,
    dependsOn: [],
    neededFor: null,
    blocker: null,
    lastBlocker: null,
    resolvedAt: null,
    evidenceRequirement: null,
    evidence: [],
    completedAt: null,
    verifiedAt: null,
    verifiedBy: null,
    recurrence: NO_REPEAT,
    occurrences: {},
    checkpoints: [],
    breadcrumbs: [],
    reviews: [],
    feedback: null,
    workspace: null,
    lastWorkedAt: null,
    raw: "",
    date: null,
    time: null,
    timeKind: "none",
    approxLabel: null,
    ...p,
  };
}

const crumb = (p: Partial<Breadcrumb> & Pick<Breadcrumb, "id" | "commitmentId" | "author" | "at" | "text">): Breadcrumb => ({
  type: "user",
  goal: "",
  location: "",
  nextAction: "",
  confirmed: true,
  dismissed: false,
  checkpointId: null,
  shared: true,
  voice: false,
  suggestion: null,
  suggestionState: null,
  ...p,
});

export function seedWorkspace(): Workspace {
  const commitments: Commitment[] = [
    c({
      id: "email",
      title: "Launch email copy",
      project: "Landing Page Redesign",
      context: "The announcement email that goes out with Friday's launch.",
      assignee: "maya",
      createdBy: "jordan",
      assignedBy: "jordan",
      reviewer: "jordan",
      createdAt: at(-3, 10, 15),
      acceptedAt: at(-3, 10, 40),
      startedAt: at(-2, 9, 30),
      status: "submitted",
      nextAction: "Review Maya's launch email copy.",
      evidenceRequirement: "Document",
      evidence: [{ id: "ev-email", name: "Launch email v2 (Demo Docs)", kind: "doc", by: "maya", at: at(-1, 17, 40), simulated: true }],
      reviews: [{ round: 1, submittedAt: at(-1, 17, 40), submittedBy: "maya", reviewer: "jordan", note: "Two subject-line options at the top. Body is final.", evidenceId: "ev-email", decision: null, feedback: null, decidedAt: null }],
      date: D(1),
      time: "12:00",
      timeKind: "before",
    }),
    c({
      id: "api",
      title: "Final API screenshots",
      project: "Landing Page Redesign",
      context: "Product screenshots from the new API dashboard, for the landing-page hero.",
      source: "requested",
      assignee: "alex",
      createdBy: "maya",
      createdAt: at(-1, 15, 10),
      acceptedAt: at(-1, 15, 30),
      startedAt: at(-1, 15, 30),
      status: "in_progress",
      nextAction: "Send Maya the final API screenshots.",
      evidenceRequirement: "File",
      date: D(0),
      time: "12:00",
      timeKind: "before",
    }),
    c({
      id: "tokens",
      title: "Update design-system color tokens",
      context: "Align tokens with the new launch palette.",
      assignee: "maya",
      createdBy: "maya",
      createdAt: at(-2, 14, 5),
      acceptedAt: at(-2, 14, 5),
      startedAt: at(-2, 14, 20),
      nextAction: "Finish the dark-mode token set.",
      date: D(1),
      time: "17:00",
      timeKind: "before",
      checkpoints: [{ id: "cp-tokens", at: at(-1, 16, 50), by: "maya", text: "Light palette tokens updated", location: "Light palette" }],
      breadcrumbs: [
        crumb({
          id: "bc-tokens-ai",
          commitmentId: "tokens",
          author: "maya",
          at: at(-1, 16, 52),
          type: "ai",
          confirmed: false,
          goal: "Update design-system color tokens",
          location: "Dark-mode tokens",
          text: "You appeared to stop after updating the light palette. The dark-mode tokens look unfinished.",
          nextAction: "Finish the dark-mode token set.",
          checkpointId: "cp-tokens",
        }),
      ],
    }),
    c({
      id: "qa",
      title: "Weekly design QA",
      context: "Walk the staging build and log visual regressions.",
      assignee: "maya",
      createdBy: "jordan",
      assignedBy: "jordan",
      createdAt: at(-30, 9),
      acceptedAt: at(-30, 9, 30),
      startedAt: at(-30, 9, 30),
      status: "accepted",
      nextAction: "Run this week's QA pass on staging.",
      recurrence: { freq: "weekly", interval: 1, unit: "weeks", days: [4] },
      date: D(-7),
      time: "14:00",
      timeKind: "exact",
      occurrences: { [D(-7)]: { by: "maya", at: at(-7, 14, 40), kind: "completed" } },
    }),
    c({
      id: "app",
      title: "Brightwave partnership application",
      project: null,
      context: "Brightwave Studio's partner program. Applications close Friday.",
      goal: "Submit partnership application",
      assignee: "maya",
      createdBy: "maya",
      createdAt: at(-1, 16, 0),
      acceptedAt: at(-1, 16, 0),
      startedAt: at(-1, 16, 5),
      nextAction: "Get the updated revenue number, then continue Step 3.",
      workspace: "application",
      lastWorkedAt: at(-1, 18, 5),
      date: D(1),
      time: "17:00",
      timeKind: "before",
      checkpoints: [{ id: "cp-app", at: at(-1, 17, 58), by: "maya", text: "Steps 1 and 2 saved", location: "Company background, Step 3 of 5" }],
      breadcrumbs: [
        crumb({
          id: "bc-app",
          commitmentId: "app",
          author: "maya",
          at: at(-1, 18, 4),
          goal: "Submit partnership application",
          location: "Company background, Step 3 of 5",
          text: "Need the updated revenue number from Sarah.\nUse pitch deck version 3.\nThen answer the leadership question.",
          nextAction: "Get the updated revenue number, then continue Step 3.",
          checkpointId: "cp-app",
          shared: false,
        }),
      ],
    }),
    c({ id: "onboard", title: "Onboarding flow audit", assignee: "maya", createdBy: "jordan", assignedBy: "jordan", reviewer: "jordan", status: "verified", createdAt: at(-6, 10), completedAt: at(-2, 15, 0), verifiedAt: at(-2, 15, 20), verifiedBy: "jordan", nextAction: "", evidence: [{ id: "ev-ob", name: "Audit findings (Demo Docs)", kind: "doc", by: "maya", at: at(-2, 15, 0), simulated: true }] }),
    c({ id: "settings", title: "Settings page polish", assignee: "maya", createdBy: "jordan", assignedBy: "jordan", reviewer: "jordan", status: "verified", createdAt: at(-4, 11), completedAt: at(-1, 10, 40), verifiedAt: at(-1, 11, 5), verifiedBy: "jordan", nextAction: "", evidence: [{ id: "ev-set", name: "Settings prototype (demo link)", kind: "design", by: "maya", at: at(-1, 10, 40), simulated: true }] }),

    c({
      id: "cta",
      title: "Launch CTA copy",
      project: "Landing Page Redesign",
      context: "Final call-to-action copy for the landing page and email.",
      assignee: "sarah",
      createdBy: "jordan",
      assignedBy: "jordan",
      reviewer: "jordan",
      createdAt: at(-2, 9, 0),
      acceptedAt: at(-2, 9, 10),
      startedAt: at(-2, 10, 0),
      status: "submitted",
      nextAction: "Review Sarah's launch CTA copy.",
      evidence: [{ id: "ev-cta", name: "Launch CTA copy (Demo Docs)", kind: "doc", by: "sarah", at: at(0, 8, 40), simulated: true }],
      reviews: [{ round: 1, submittedAt: at(0, 8, 40), submittedBy: "sarah", reviewer: "jordan", note: `New primary CTA: “${SARAH_CTA}”. Already shared with Maya.`, evidenceId: "ev-cta", decision: null, feedback: null, decidedAt: null }],
      date: D(0),
      time: "17:00",
      timeKind: "before",
    }),
    c({
      id: "newsletter",
      title: "Partner newsletter",
      context: "October partner newsletter with launch-day numbers.",
      assignee: "sarah",
      createdBy: "sarah",
      createdAt: at(-3, 13, 0),
      acceptedAt: at(-3, 13, 0),
      startedAt: at(-2, 11, 0),
      status: "blocked",
      blocker: { by: "alex", reason: "Signup numbers for the launch cohort", since: at(-1, 14, 15), dependencyId: "signups" },
      nextAction: "Add the signup numbers, then send the newsletter for review.",
      dependsOn: ["signups"],
      date: D(5),
      time: "10:00",
      timeKind: "before",
    }),
    c({ id: "pricing", title: "Pricing page copy", assignee: "sarah", createdBy: "jordan", assignedBy: "jordan", reviewer: "jordan", status: "verified", createdAt: at(-5, 9), completedAt: at(-2, 11, 0), verifiedAt: at(-2, 12, 30), verifiedBy: "jordan", nextAction: "" }),

    c({ id: "analytics", title: "Analytics integration", assignee: "alex", createdBy: "jordan", assignedBy: "jordan", reviewer: "jordan", status: "verified", createdAt: at(-6, 10), completedAt: at(-1, 17, 30), verifiedAt: at(-1, 17, 55), verifiedBy: "jordan", nextAction: "", evidence: [{ id: "ev-an", name: "PR #482 merged (Demo Git)", kind: "link", by: "alex", at: at(-1, 17, 30), simulated: true }] }),
    c({
      id: "ratelimit",
      title: "Fix signup rate-limit bug",
      context: "Signups fail under burst load from the launch email.",
      assignee: "alex",
      createdBy: "jordan",
      assignedBy: "jordan",
      reviewer: "jordan",
      createdAt: at(-1, 9, 30),
      acceptedAt: at(-1, 9, 45),
      startedAt: at(-1, 10, 0),
      priority: "high",
      nextAction: "Add retry headers and ship the fix.",
      checkpoints: [{ id: "cp-rl", at: at(-1, 15, 40), by: "alex", text: "Reproduced in staging", location: "Signup API" }],
      date: D(1),
      time: "10:00",
      timeKind: "before",
    }),
    c({
      id: "signups",
      title: "Signup numbers for the launch cohort",
      context: "Sarah needs the cohort numbers for the partner newsletter.",
      source: "requested",
      assignee: "alex",
      createdBy: "sarah",
      createdAt: at(-1, 14, 15),
      acceptedAt: at(-1, 14, 30),
      startedAt: at(-1, 14, 30),
      nextAction: "Send Sarah the signup numbers for the launch cohort.",
      date: D(1),
      time: "12:00",
      timeKind: "before",
    }),

    c({
      id: "launch",
      title: "Launch approval",
      project: "Landing Page Redesign",
      context: "Go / no-go for Friday's launch review.",
      assignee: "jordan",
      createdBy: "jordan",
      createdAt: at(-5, 9),
      acceptedAt: at(-5, 9),
      startedAt: at(-5, 9),
      nextAction: "Approve the launch once every launch commitment is verified.",
      date: D(1),
      time: "12:00",
      timeKind: "before",
    }),
    c({
      id: "metrics",
      title: "Weekly metrics report",
      context: "Activation, retention and launch funnel for leadership.",
      assignee: "jordan",
      createdBy: "jordan",
      createdAt: at(-30, 9),
      acceptedAt: at(-30, 9),
      startedAt: at(-30, 9),
      status: "accepted",
      nextAction: "Pull this week's numbers and send the report.",
      recurrence: { freq: "weekly", interval: 1, unit: "weeks", days: [5] },
      date: D(-6),
      time: "15:00",
      timeKind: "exact",
      occurrences: { [D(-6)]: { by: "jordan", at: at(-6, 15, 10), kind: "completed" } },
    }),
  ];

  const E = (id: string, a: number, actor: PersonId, person: PersonId, commitmentId: string | null, kind: EventKind, text: string, quote?: string, priv?: boolean): WorkEvent => ({ id, at: a, actor, person, commitmentId, kind, text, quote, private: priv });
  const events: WorkEvent[] = [
    E("e1", at(-3, 10, 15), "jordan", "maya", "email", "assigned", "Jordan assigned “Launch email copy”"),
    E("e2", at(-3, 10, 40), "maya", "maya", "email", "accepted", "Accepted “Launch email copy”"),
    E("e3", at(-2, 9, 0), "jordan", "sarah", "cta", "assigned", "Jordan assigned “Launch CTA copy”"),
    E("e4", at(-2, 15, 20), "jordan", "maya", "onboard", "verified", "Jordan verified “Onboarding flow audit”"),
    E("e5", at(-2, 12, 30), "jordan", "sarah", "pricing", "verified", "Jordan verified “Pricing page copy”"),
    E("e6", at(-1, 11, 5), "jordan", "maya", "settings", "verified", "Jordan verified “Settings page polish”"),
    E("e7", at(-1, 14, 15), "sarah", "sarah", "newsletter", "blocked", "Blocked: waiting on Alex for signup numbers for the launch cohort"),
    E("e8", at(-1, 15, 10), "maya", "maya", "api", "requested", "Requested “Final API screenshots” from Alex"),
    E("e9", at(-1, 16, 50), "maya", "maya", "tokens", "checkpoint", "Checkpoint saved", "Light palette tokens updated"),
    E("e10", at(-1, 17, 40), "maya", "maya", "email", "submitted", "Submitted “Launch email copy” for Jordan's review"),
    E("e11", at(-1, 17, 55), "jordan", "alex", "analytics", "verified", "Jordan verified “Analytics integration”"),
    E("e12", at(-1, 17, 58), "maya", "maya", "app", "checkpoint", "Checkpoint saved", "Steps 1 and 2 saved"),
    E("e13", at(-1, 18, 4), "maya", "maya", "app", "breadcrumb", "Breadcrumb saved", "Need the updated revenue number from Sarah. Use pitch deck version 3. Then answer the leadership question.", true),
    E("e14", at(0, 8, 40), "sarah", "sarah", "cta", "submitted", "Submitted “Launch CTA copy” for Jordan's review"),
  ];

  return {
    version: 1,
    now: at(0, 9, 0),
    seq: 100,
    viewer: "jordan",
    commitments,
    events,
    notices: [
      { id: "n1", to: "jordan", at: at(0, 8, 40), kind: "review", commitmentId: "cta", text: "Sarah submitted “Launch CTA copy” for your review.", read: false },
    ],
    design: {},
    app: {
      step: 3,
      description: "Northstar Labs builds launch tooling for product teams. Since our seed round we've grown to 40 customers, and",
      revenue: "",
      deck: "v2",
      leadership: "",
      submitted: false,
      confirmation: null,
    },
  };
}
