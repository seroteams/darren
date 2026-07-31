# Action review placement — the four concerns the committee left open

**Date:** 2026-07-31
**Feeds:** [docs/plans/doing/action-review-placement/plan.md](../plans/doing/action-review-placement/plan.md) (phase 1 green-lit, phase 2 not started)
**Committee record:** `logs/committee/2026-07-31-action-review-placement.html`
**Status:** research only. Nothing implemented, nothing queued. Placement (option A) is decided and is not re-opened here.
**Spend:** £0. Free checks and code reading only, no OpenAI runs.

---

## 1. The dead half-screen on non-question cards (Rasmus)

### Confirmed in the code

`setQuestionHints` is called from exactly one place: [questioning.js:226](../../admin/src/stages/questioning.js), inside `showNextQuestion()`.

Three cards never call it, and none of them clears the panel:

| Card | Where | What the Support panel shows |
|---|---|---|
| Walk-in gate | `showReadyGate()` [questioning.js:594](../../admin/src/stages/questioning.js) | `questionHints` is still `[]`, so `supportHtml()` falls through to the prep-brief fallback: three "From your prep brief" cards, or the "No coaching hints for this question yet" line when there is no brief |
| Action review | `showPromiseCheckin()` [questioning.js:638](../../admin/src/stages/questioning.js) | same as above |
| Agenda closing check | `showAgendaClosingCheck()` [questioning.js:463](../../admin/src/stages/questioning.js) | `questionHints` still holds the **last question's** hints. Genuinely stale: coaching for a question already answered, sitting beside "Did you get to it?" |

Each of the three clears `qHost`, `thinkingHost` and `footerHost`. The coach panel lives outside all three, in `.coach-host` ([questioning.js:77](../../admin/src/stages/questioning.js)), so nothing touches it. `USE_COACH_SPLIT = true` for both apps ([questioning.js:40](../../admin/src/stages/questioning.js)), so this is the customer app too, not just admin.

Live-scores mode is unaffected — it reads session state, not per-question data.

### Lane check (no collision)

`coach-hints-live` (session c91a58a9) claims its plan folder plus `sessions.service.ts`, `questions.test.ts`, `reconcile-queue.test.ts`, `queue-manager.ts`, `content/prompts/plan-turn.md`. It does **not** claim `coach-panel.ts` or `questioning.js`. Its phase 2 changes what hints *contain* on a question turn; it never touches the no-question case. Different problem, different files.

One shared surface: both read the same `supportHtml()` fallback chain ([coach-panel.ts:131](../../admin/src/ui/coach-panel.ts)), and that plan already parks "the fallback path forces every brief cue to render as *Listen for*". Whoever lands second should re-read it.

`questioning.js` is inside the action-review-placement lane (78d09803), so any fix here belongs to that plan or waits for it to clear.

### Options

| | Option | Cost | Trade |
|---|---|---|---|
| **A ⭐** | Each non-question card gets its own two or three fixed lines, in the existing Support shape | one string map plus three call sites; no engine, no model, free to test | three more strings that have to stay true |
| B | Replace with one honest line: "Nothing to coach here. The scores keep updating." | smallest possible | leaves the empty half Rasmus called the fault |
| C | Auto-switch to Live scores on non-question cards | no new copy | on the walk-in gate nothing is scored yet, so all four axes read "Not rated" — swaps stale for empty. Also overrides the manager's own toggle |

**Recommend A.** It is the only option that makes the half-screen earn its space at the moment the manager is deciding something. Draft lines, for illustration only:

- Walk-in gate — *How to ask:* open on your own question, not on last time's list. *Listen for:* what they want out of the time.
- Action review — *How to ask:* "anything from last time you want to close off?"
- Agenda closing check — *Listen for:* whether the thing they raised actually got aired, not whether you mentioned it.

**Honesty constraint.** These are UI copy about the card on screen, exactly like `IDLE_LINES` ([coach-panel.ts:36](../../admin/src/ui/coach-panel.ts)) which is deliberately written about the absence of a read. They must never render inside the same treatment as model-written per-question hints without a label saying what they are.

---

## 2. Manager's own promises listed first (Rogelberg)

### Where the rule actually lives — three places, not one

| Sort | File | Note |
|---|---|---|
| `orderForCheckin` | [promise-checkin.ts:35](../../admin/src/ui/promise-checkin.ts) | "design verdict 2026-07-12 — the leader goes first" |
| `listForPerson` | [trackers.service.ts:194](../../backend/api/services/trackers/trackers.service.ts) | the guided runner's Catch-up, same rule |
| `formatPromiseCheckin` | [promise-history.ts:109](../../backend/engine/promise-history.ts) | orders the block the **reviewer prompt** reads |

A flip touches all three plus their tests, and the third changes engine input.

### What the research says

Already sourced in-repo, [docs/research/2026-07-20-arc-evidence-review.md](2026-07-20-arc-evidence-review.md):

- Rogelberg, *Glad We Met* (OUP 2024): the meeting should be "dominated by topics of importance to the direct report rather than issues that are top of mind for the manager" (HBR, 2022). Same doc, finding 1.
- Recommendation 5 of that review uses "70–80% direct-report talk-time (Rogelberg/HBR)" as the arithmetic that caps a 30-minute meeting at roughly four to six manager questions.

Checked again today: the book's agenda guidance is a **loose framework, not a fixed agenda** — the manager may propose a core question or a topic list, but the report brings the topics; the talk-time target is usually summarised as the report speaking somewhere between half and ninety per cent of the time.

**The limit, stated plainly.** None of this measures *who reads their own follow-through out loud first*. Rogelberg's evidence is about topic ownership and airtime. On the plain reading, listing the manager's own commitments first is the manager being accountable in public before asking anything of the report, which is the opposite of an audit. Rogelberg's objection here is a perception argument, not a measured effect, and it should not be dressed as one.

### What the one real user said

[docs/validation/machar-2026-07-29.md](../validation/machar-2026-07-29.md): *"You've got two people coming with maybe not exactly the same agenda. I'm running it. I'm the manager. I'm okay with that on my side, but I also want to hear from my staff."*

He is comfortable owning the meeting **and** wants the report's agenda in it. That points at a reframe, not a flip.

### Options

| | Option | Cost | Reversible |
|---|---|---|---|
| **A ⭐** | Keep the order, change the framing. The card's question becomes the report's: "Anything from last time you want to close off?" | copy only, in three strings: the lead [promise-checkin.ts:84](../../admin/src/ui/promise-checkin.ts), the offer label [questioning-ready.ts:36](../../admin/src/stages/questioning-ready.ts), the card heading [questioning.js:648](../../admin/src/stages/questioning.js) | yes, one commit, free to verify |
| B | Flip to report-first | three sorts plus tests, and `formatPromiseCheckin` changes what the reviewer prompt receives — that puts a paid gate run back on the table | yes, but re-verifying costs money |
| C | Do nothing until a manager has been watched using the offer | zero | n/a — this is what the plan already parks |

**Recommend A, and it is also the cheapest to test:** one screen of copy, walkable free in the dev runner, no engine input changed so no paid re-verify. It answers the actual objection ("whose meeting is this?") without breaking the 2026-07-12 accountability verdict.

---

## 3. The measurement (Seibel)

### Definition

"Taking the offer" = the manager pressed the second button on the walk-in card and the action review rendered. There are four states worth counting, not two.

| State | Meaning | How it reads from the stored run |
|---|---|---|
| Not offered | no prior run held an open action | no earlier run for the same `userId` + `personId` has a promise with `outcome: null` |
| Offered, declined | pressed "Start the meeting" | `priorCheckin` **absent** |
| Offered, opened, nothing tapped | card seen, no answer given | `priorCheckin.skipped === true` |
| Offered, closed off | at least one tap | `priorCheckin.outcomes.length >= 1` |

### Can it be read with zero new build? Mostly

- **Opened is recorded.** `stamp()` writes `priorCheckin` on the current run whenever the card is left, taps or skip ([promise-checkin.ts:133](../../backend/api/services/sessions/promise-checkin.ts)).
- **The denominator is reconstructable, not recorded.** For any run, walk earlier runs for the same manager and person and look for a promise with `outcome: null` — exactly what `filePriorPromiseRun` does ([promise-history.ts:144](../../backend/engine/promise-history.ts)). When the card *was* opened, `priorCheckin.fromSessionId` names the run it read from, so the two halves reconcile.
- **Scripted runs are already excluded** — `checkinEligible` refuses `mode === "scripted"` ([promise-checkin.ts:45](../../backend/api/services/sessions/promise-checkin.ts)).
- **Second entry point counts too:** `bank.js` renders the same walk-in card and sets `store.reviewActionsFirst` ([bank.js:154, 171](../../admin/src/stages/bank.js)).

**Two holes, stated rather than smoothed over:**

1. A manager who is offered the review and presses "Start the meeting" **writes nothing**. "Declined" is always inferred, never recorded.
2. A manager who opens the card and then refreshes or navigates away without pressing the button also writes nothing, and gets counted as declined.

Both under-count "taken". At n = 2 that is not a rounding error, it could be the whole answer.

### Rory's claim, made falsifiable

*"If more than half take the offer when it is optional, the framing was the whole problem."*

With Machar's next two sessions the denominator is **at most 2**, and only for sessions with a person he has already met. Two data points cannot establish "more than half". They can do one useful thing: if **0 of 2** take the offer, the framing claim is dead in its strong form. Anything else is not a rate and should not be reported as one.

The offer will fire at least once: session 1 produced locked-in actions — *"Lock these in. Okay, they come back at the start of the next one to one, which is good"* — with both owners represented (*"I'll take that on and Daryl can do that bit"*). So a Machar → Daryl session 2 shows the offer with at least two open rows.

### Options

| | Option | Cost | Trade |
|---|---|---|---|
| **A ⭐** | Read it by hand from the two runs' stored state | zero build; about ten minutes per session | "declined" stays inferred |
| B | Stamp the walk-in choice (`"start"` / `"review"`) on the session in `leave()` | roughly five client lines plus one session field; no engine, no prompt, no paid run | breaks "zero new build" by about an hour |
| C | Wait for more managers before measuring anything | zero | learns nothing from the two sessions that are actually coming |

**Recommend A now** — it is precisely what Seibel asked for — **with B queued behind it.** The moment there are five managers instead of two, the inferred denominator becomes the thing everyone argues about instead of the result.

---

## 4. Two stores for one job (structural)

### The duplication, exactly

| | Interview runner | Guided Monthly Check-in |
|---|---|---|
| Store | `session.promises[]` inside the run's JSON state | `tracker_items` table, `kind = 'promise'` |
| Scope | the **run** (resurfaced by walking run history) | the **person** (`person_id` FK) |
| Text | `action` | `text` |
| Owner | `manager` / `report` | `manager` / `member` |
| Outcome | `outcome`: `yes/partly/no/changed` or `null` | `status`: `open/done/partly/not_done/changed` |
| Due date | `when` (free text) | **no field** |
| Audit trail | none | `history[]`, dated events |
| Archive | none — open until tapped | `archived_at` |
| Origin link | implicit | `created_session_id` → `guided_sessions` |
| Fence | manager + person via `historyRunMatches` | org + person→manager wall, plus a separate member lane |

Both drive the identical four chips ([promise-checkin.ts:26](../../admin/src/ui/promise-checkin.ts) and `OUTCOME_TO_STATUS`, [trackers.service.ts:27](../../backend/api/services/trackers/trackers.service.ts)) and both sort manager-first.

### What a single person-scoped store would cost

Direction is not in doubt: `tracker_items` is the better-built half — person-scoped already, with history, archive, org fence, a member lane and the right indexes. The move is the interview runner adopting it.

1. **Field reconciliation.** Add a due-date column: the runner's `when` has nowhere to land today. Map `report` → `member` once, everywhere.
2. **Write path.** The end-of-meeting lock-in writes tracker rows instead of `session.promises[]`. `created_session_id` currently references `guided_sessions`, and an interview run is not one — so it needs to become nullable-plus-a-kind, or gain a second column. This is where the real cost sits.
3. **Read path.** `priorPromiseRunFor` / `filePriorPromiseRun` / `pgPriorPromiseRun` collapse into one `listForPerson()` filtered to open. The whole run-walk disappears, which is the prize.
4. **Back-fill.** Every existing run's `session.promises[]` has to migrate, or history vanishes from the next 1:1.

### What it breaks

- **The file store — the biggest hidden cost.** The runner works with no database (`hasDatabaseUrl()` false → file walk, [promise-history.ts:188](../../backend/engine/promise-history.ts)). `tracker_items` is Postgres only. One store means the interview runner stops working without a DB, which takes local dev and the replay lane with it, unless a file shim is written. Nothing in the field table above hints at this.
- **The write-back.** `applyPromiseOutcomes` mutates the **prior run's** state and rolls up `outcomeCheck` ([promise-history.ts:126](../../backend/engine/promise-history.ts)), which the reviewer reads. That roll-up needs a new home.
- **The reviewer prompt.** `formatPromiseCheckin` ([promise-history.ts:103](../../backend/engine/promise-history.ts)) builds a prompt block from `priorCheckin`. Moving the store changes engine input, so re-verifying costs a paid gate run.
- **The member wall.** `trackerVisibleToMember` deliberately hides promises from members ([trackers.service.ts:45](../../backend/api/services/trackers/trackers.service.ts)). Putting interview promises in the same table asks that wall to guard data it was not designed for — a security re-read, not just a merge.
- **Tests.** Five mirrored test files: `promise-history`, `promise-checkin` (api), `promise-checkin` (ui), `trackers.service`, `guided-stages`.

### Options

| | Option | Cost | Trade |
|---|---|---|---|
| **A ⭐** | Leave it parked. This document is the map | zero | the duplication stays, and it is real |
| B | Do the cheap half: align the owner vocabulary (`report` → `member`, reading both for back-compat, since `promisesFromState` currently rejects anything that is not `manager`/`report`) and add the due-date column | about half a day; `formatPromiseCheckin` renders owner as "manager's own" / "the team member's", so the prompt text does not change and no paid run is needed | tidies without deciding |
| C | Full merge now | its own plan, four-plus phases, a migration, a file-store shim, one paid gate run | premature |

**Recommend A.** The two runners do not yet share a single user, and at VALIDATION STAGE nothing is proven enough to justify a migration plus a paid re-verify. B is available as a tidy for whoever is next in those files anyway.

---

## Where this leaves each concern

| # | Concern | Recommendation | Blocks phase 2? |
|---|---|---|---|
| 1 | Stale Support panel on non-question cards | Fixed lines per card (A) | No. Own phase, inside this plan's lane |
| 2 | Manager's promises listed first | Keep the order, reframe the question (A) | No. Copy-only, free |
| 3 | Measuring "took the offer" | Hand-read Machar's next two runs (A), stamp the choice later (B) | No. Needs the sessions to happen |
| 4 | Two stores | Stay parked (A) | No |
