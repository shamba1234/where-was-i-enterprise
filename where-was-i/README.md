# Where Was I? (hackathon prototype)

Remembers unfinished digital tasks, restores context after interruptions, and verifies that important tasks actually got done.

All integrations are **mock apps** (Demo Gmail, Demo Canvas, Demo Browser) running locally. They share one state object in `localStorage` (`lib/state.tsx`), so an action in a mock app is immediately "detected" by the dashboard.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
# or
npm run build && npm start
```

## Demo script

1. Ask "Did I submit my homework?" → Not yet.
2. (Optional) Click "I already did it" on the homework card: it re-checks Demo Canvas and refuses to clear.
3. Open Canvas → Start Assignment → HW6_Solutions.pdf → Submit. Shows "Submitted at 10:42 PM".
4. Back to Where Was I? → card syncs and flips to **Verified ✓**. Ask again → Yes, 10:42 PM.
5. Open Gmail → Reply → Send. Back → **Completed**. "Did I reply to Maya?" → Yes, 10:47 PM.
6. Click **Where Was I?** → reconstruction of yesterday's internship session → Continue where I left off → lands on step 3 with the cursor at the end of the half-written answer.
7. Team Presentation → Mark finished → pick a file. `meeting_notes.docx` is rejected; the `.pptx` or screenshot is verified.
8. **Reset demo** (top right) restores everything.

## Map

- `app/page.tsx`: dashboard
- `app/canvas`, `app/gmail`, `app/browser`: mock apps
- `lib/state.tsx`: shared state, persistence, cross-tab sync
- `lib/answer.ts`: question box answers
- `components/`: task cards, ask box, Where Was I? panel, proof modal

## Captured tasks (human memory)

Commitments that don't live in any app. Click **Add task** in Open loops (or open **Captured** in the header) and type naturally, e.g. "Meet Maya tomorrow at 3 PM to finish the presentation". A local, deterministic parser (`lib/parse.ts`, no API) shows what it understood before you save; **Edit details** lets you correct the name, date, time, notes and priority.

Captured tasks live in the same `localStorage` state as the demo apps, appear in Open loops with an "Added by you" label, and can be completed, edited, postponed or deleted. The question box answers from them ("What do I have tomorrow?", "When do I need to call Mom?"). Reset demo clears them.

Dates are read against the demo clock (Friday Oct 2, 10:38 PM, `lib/clock.ts`) so "tomorrow" always means Saturday in the story.

Demo:
1. Add task → type "Meet Maya tomorrow at 3 PM to finish the presentation" → check the preview → Add task.
2. Ask "What do I have tomorrow?" → the Maya meeting is listed.
3. Mark complete on its card → it leaves Open loops (Undo in the toast) and shows under Captured → Completed.
4. Refresh: everything persists. Reset demo clears captured tasks.
