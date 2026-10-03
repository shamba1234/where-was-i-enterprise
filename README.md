# Where Was I? Enterprise

Shared work continuity and accountability for a team. The core object is an **open loop**: a work commitment with an owner, a next action, evidence, checkpoints, breadcrumbs, dependencies and a history.

Where Was I? tracks **work state, not people**. No keystrokes, screenshots, browsing, time-in-app or productivity scores.

## Run

```bash
npm install
npm run dev
```

Open the URL the terminal prints, usually http://localhost:3000. If that port is busy (for example another Where Was I? prototype is running), Next.js picks the next free one (3001, 3002…) and prints it.

Production: `npm run build && npm start` (use `npm start -- -p 3002` to pick a port).

No backend, accounts, API keys or external services. Everything is deterministic and stored in this browser's `localStorage`.

## The demo company

Northstar Labs, Thursday, Oct 8 2026. The clock starts at 9:00 AM and moves forward a fixed amount with each work event, so timelines are repeatable.

- **Jordan Lee**, Product Manager (manager)
- **Maya Patel**, Product Designer (employee)
- Alex Chen, Software Engineer; Sarah Kim, Growth Lead (teammates; their deliveries are simulated "demo events")

Use **Switch user** (top right) to move between Jordan and Maya. They share one workspace: anything one does, the other sees.

**Reset demo** is in the same menu. It restores every commitment, timeline, breadcrumb, checkpoint, blocker, review and mock-workspace state. Theme and accent are kept as personal preferences.

**Appearance** (palette icon): Light, Dark or System theme; Blue, Indigo, Violet, Emerald or Orange accent. Status colors (blocked, waiting, review, verified) never change with the accent.

## What's simulated

- The design file and the partner-program portal are mock workspaces.
- "Demo event: Alex delivers" stands in for a teammate attaching their deliverable.
- Voice breadcrumbs insert a sample transcript. No audio is recorded.
- Evidence links (Figma prototype, docs, confirmation numbers) are demo placeholders.
- AI reconstructions are deterministic rules, not a model. They're always labeled and never change state without confirmation.

## Code map

- `lib/model.ts`: types and the seeded Northstar Labs workspace
- `lib/ops.ts`: every state transition (assign, accept, checkpoint, breadcrumb, block, resolve, resume, submit, review, verify, recurrence)
- `lib/derive.ts`: ownership, status, sections, why-open, lifecycle chain, handoffs, dependency chains, timeline filters
- `lib/answer.ts`: Ask Where Was I? (deterministic)
- `lib/parse.ts`, `lib/recurrence.ts`, `lib/clock.ts`: natural-language capture, recurrence rules, demo clock
- `lib/store.tsx`: shared localStorage workspace + theme/accent preferences
- `app/workspace/design`, `app/workspace/application`: the two mock workspaces
