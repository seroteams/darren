# Phases 2 and 3 — the read, and the real screen

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built 2026-08-03, £0, awaiting Carl's walk

Built together because Phase 2 has no surface to walk on its own: an endpoint nobody
can see is not something to green-light.

## Phase 2 — the read

`GET /api/v1/sessions/:id/prior-recap`, a clone of the proven `prior-promises` pair so
the fence and the file/pg split cannot drift.

| File | What |
|---|---|
| `backend/engine/prior-recap.ts` | `priorRecapFromState` · `axesFromBriefing` · `filePriorRecap` · `priorRecapFor` dispatcher |
| `backend/db/runs-store.ts` | `pgPriorRecap`, beside `pgPriorPromiseRun`, same double fence |
| `backend/api/services/sessions/prior-recap.ts` | eligibility + glue |
| `backend/api/services/sessions/sessions.controller.ts` · `server.ts` | controller + route |
| `shared/api.js` | `getPriorRecap` |

Fence: same org, same manager, same roster person, excluding this session. It returns the
newest **finished** run (a briefing is what `finished` is derived from), so an abandoned
prep is skipped rather than shown as last time.

**What travels, and what does not.** The headline, the meeting type, the date, the agreed
items with their outcomes, and the four axis reads. Not the transcript, not the notes, not
the summary bullets. A test asserts the payload's exact key set, so the record cannot creep
back in later.

**Honesty rules kept:** the headline is quoted whole and never shortened (measured over 59
saved runs: 13 to 23 words, median 19). A run that armed no promise loop falls back to the
briefing's `next_actions` and the payload says `agreedSource: "suggested"`, because nobody
confirmed those. `read_status` stays authoritative, so an axis the meeting never read shows
no score whatever number sits beside it.

Eligibility differs from card zero's in one deliberate way: it does **not** retire on
`priorCheckin`. Tapping last time's actions off does not mean you stop wanting to see what
last time was.

## Phase 3 — the real screen

| File | What |
|---|---|
| `admin/src/ui/coach-panel-state.ts` | `cleanRecap` (wire validation) · `segmentOneLabel` |
| `admin/src/ui/coach-panel.ts` | a `"last"` mode, `setPriorRecap()`, `endGlance()` |
| `admin/src/styles/coach-panel.css` | `.coach-last*`, four rules, colour and spacing only |
| `admin/src/stages/questioning.js` · `admin/src/stages/bank.js` | read the glance, rename segment one, hand over at question 1 |

Segment one is **Last 1:1** before the meeting and **Support** once it starts. The label
lives in `coach-panel-state.ts` because both hosts draw that header and they are copies of
one another; a test asserts both were wired and that only the runner ends the glance.

The read rides the same `Promise.all` as the open-actions read, before the gate paints, so
the panel is never a Support view that swaps under the manager mid-read. Both degrade to
nothing on failure and neither can block a 1:1.

The agreed rows reuse the shipped `renderPromiseList()` and the scores ride as `.chip`s
rather than the meters below them, because those meters are a per-answer **delta** on a
plus/minus 3 scale and these are a whole-meeting **score** on plus/minus 10. Drawing them
the same way would say they are the same number.

## Verified

- `npm test` **233/233** (15 new: 8 engine/fence, 5 wire validation, 2 host wiring), `npm run typecheck`, `npm run lint:copy`, `npm run lint:tokens`, all clean. £0.
- **The read, against real seeded rows in the local database** (`scripts/seed-promises.ts`), not fixtures: it returned the newest finished 1:1 for Priya Sharma, manager's promises first, outcomes intact (`yes` / `changed` / open), and three axes honestly `not read`. The fence held both ways: a different roster person returned a **different** run, and a wrong manager id returned **null**.
- **The real panel, rendering that real payload**, in `proof/real-panel-real-data.png`: segment one reads "Last 1:1", the date, headline, agreed rows with Open / Done / Changed chips, and the four axis chips.

## Not verified, and why

**The runner itself was not screenshotted.** Reaching it needs a logged-in account with a
past 1:1, and I do not create accounts or enter passwords. The seeded data is already in
place for `manager@seroteams.com`, so the walk below is a straight one. What is unproven on
screen is the segment relabel and the hand-over inside the live runner; both are covered by
source tests, which is weaker than seeing it.

## Test scenarios — for the product owner

1. **The glance.** `local > admin > log in as manager@seroteams.com > Home`. Open the in-progress 1:1 with Priya Sharma. The right half should read "Last 1:1", with last time's date, headline, agreed rows and the score chips. ❌ Not OK if it still shows the three generic listen-for cues.
2. **The hand-over.** Tap "Start the meeting". Segment one should go back to "Support" with coaching for question 1, and there should be no way back to the glance.
3. **A first 1:1.** Start one with someone you have never met. The panel should be exactly what it is today. ❌ Not OK if there is an empty "Last 1:1" tab.
4. **Refresh mid-meeting.** Reload on question 2. You should land back on the question with Support showing, not on the glance.
