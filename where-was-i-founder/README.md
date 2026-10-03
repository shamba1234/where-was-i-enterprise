# Where Was I? (founder demo)

Where Was I? understands what remains unresolved, who owns the next action, where interrupted work stopped, and whether a commitment was actually completed.

Every open loop moves through **Detect → Understand → Resume → Verify → Close**.

All sources are simulated and local: Demo Gmail, Demo Calendar and Demo Browser. No backend, no API keys, no real integrations. State lives in `localStorage` and survives refresh. **Reset demo** (top right) restores the starting story.

## Run

```bash
npm install
npm run dev
```

Open the URL printed in the terminal, usually http://localhost:3000. If port 3000 is busy (for example, another prototype is running), Next.js picks the next free port, such as http://localhost:3001, and prints it.

Production build: `npm run build && npm start` (`npm start -- -p 3001` to choose a port).

## The story

It's Tuesday, Oct 6, 8:12 AM. Dates like "tomorrow" and "Friday" are read against that day, so the demo is repeatable. Timestamps tick forward with real time from 8:12 AM.

| Open loop | Owner | How it closes |
|---|---|---|
| Send Alex investor deck | You | Verified: email to Alex with Founder_Deck.pdf in Demo Gmail |
| Landing page approval | Sarah | Verified: Sarah's reply (demo control in Gmail) |
| Startup Accelerator Application | You, interrupted on Step 4 of 6 | Verified: submission confirmation in Demo Browser |
| Investor meeting — Alex Chen | Scheduled | Add meeting outcome, which creates new loops |
| Run 5K (every other morning) | You | Verified with workout proof, next occurrence scheduled |
| Evening routine (every night) | You | Checklist, then photo (verified) or no photo (completed by you) |

**Verified** means a simulated source showed evidence. **Completed by you** means you confirmed it and nothing could check it.

## Map

- `lib/state.tsx`: the one persisted state and every operation
- `lib/derive.ts`: ownership, sections, counts, lifecycle, verification
- `lib/recurrence.ts`: recurrence rules and occurrences
- `lib/parse.ts`: local natural-language parser for commitments and meeting outcomes
- `lib/answer.ts`: Ask Where Was I? answers
- `app/gmail`, `app/apply`: Demo Gmail and the Demo Browser application portal
