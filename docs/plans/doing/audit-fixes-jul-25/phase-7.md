# Phase 7 — Member view, motion, and the small sweep

**Part of:** [plan.md](plan.md)

**Split on 2026-07-29, Carl's call.** The phase was three jobs in one, and a reality check
found two of its items no longer exist. It now runs as:

| | Slice | Status |
|---|---|---|
| **7a** | Member home says what it is (F10) | 🔨 BUILT 2026-07-29, awaiting Carl |
| **7b** | Three motion wins (F12) | ⬜ not started |
| **7c** | The small sweep | ⬜ not started, 9 live items |

## Reality check before building (2026-07-29)

The audit ran on 25 July. Four days and a lot of work later, some findings are stale. Checked
each against today's code rather than fixing from the list:

| Item | Still real? |
|---|---|
| Screen gallery: second yellow chrome bar, missing h1 | **Gone.** The whole gallery feature was deleted by another chat. Item dropped. |
| Front door: "Try it free. No account needed" is a divider label, not a button | **Already fixed** by entry-redesign P2. `welcome.ts` renders a real `button()`; the login footer link is now a styled `.link`. |
| A 120ms cross-fade when the stage changes | **Already exists.** `.stage-enter` / `.is-in` in `motion.css`, with `prefers-reduced-motion` honoured. What is missing is the customer app opting in, plus the stagger and the skeleton timing. Folded into 7b. |
| The other 9 small items | Real. Confirmed in source. Listed in 7c below. |

---

## 7a — Member home says what it is (F10) 🔨 BUILT

Copy only, no new capability.

**What it did**

- **The nav label and the page heading now name the same place.** The rail item said
  "Your 1:1s" and the page it opened said "Home". The heading is now "Your 1:1s"
  (`frontend/src/stages/member-home.js`).
- **The orphaned grey line became an explanation.** It said, flatly:
  *"Only the date and 1:1 type are recorded here."* True, and it left the member to work out
  why on the one screen they have. It now reads:
  > Your manager's notes and prep stay private to them, so they can think honestly before
  > your 1:1. What you see here is the record of the conversation: when it happened, and
  > what kind it was.

  The no-inference ruling is not changed. It is explained.

**Verified**

- `npm test` **206/206**, typecheck, `lint:copy`, `lint:tokens`, `lint:components` green.
  Four new assertions, including one that reads the rail source and the page source together
  so the two labels cannot drift apart again.
- **On screen** (customer app, signed in as a real member): the active rail item reads
  "Your 1:1s" and the `<h1>` reads "Your 1:1s". Measured off the live DOM, not claimed.
  No console errors.

**NOT verified**

- **The new caption was not seen on screen.** It only renders when the member has 1:1
  history, and the member account available in this session has none, so the page showed the
  empty state instead. The copy itself is covered by unit test. Worth a glance when you have
  a member with a real 1:1.
- No screenshot: the Browser pane does not composite frames in this session.

**Test scenario**

`local > customer app > sign in as a member > Your 1:1s`

1. The rail item and the page heading should say the same thing.
   ❌ Not OK if the page still says "Home".
2. If that member has any 1:1s, the line under the list should explain *why* they see the
   date and the type, in a sentence a person would write.

---

## 7b — Three motion wins (F12) ⬜

Measured across 256 page loads: 3 pages had a running animation, the average page had 33
elements with a transition and almost all were hover colours.

- the stage cross-fade (exists in CSS; the customer app does not pass `fadeStages`)
- a 40ms-per-row stagger when a list mounts
- the shared skeleton visible on a first fetch, with a minimum display time so it does not flash

Respect `prefers-reduced-motion` on all three. Verify by reading computed styles, not by
watching: screenshots time out on running animations.

## 7c — The small sweep ⬜ (9 live items)

- Live pulse: the "Runs per day" chart draws a flat line with no message when there is no
  data, while the card beside it has a written empty state. **Confirmed live** in
  `sparkline()` — no empty branch.
- Live pulse: six metric cards in a five-wide grid, so "Errors" sits alone. (The grid is
  `auto-fit minmax(10.5rem, 1fr)`, so this may already self-correct; needs a laid-out
  viewport to confirm before changing anything.)
- Person page: the meta line wraps and leaves a dangling "·". And "1 1:1" is hard to read.
- Person page: the Clarity and Growth bars show "-5" with no scale or legend. Say what the
  number is out of. (`person-axes.ts` clamps to ±6 but never tells the reader.)
- Run detail: the meeting type appears twice in the header, once in the breadcrumb and once
  as `.rd-type-badge`.
- The 1:1 wizard: a guest sees "Focus areas, Prep brief, During the meeting"; a manager sees
  "Focus, Prep, Meeting". Pick one vocabulary.
- Compare runs: the nav highlights "Test engine" while the page says "Compare runs".
- Collapsed nav: icon-only with no tooltips. The aria-labels are there, so this is for
  sighted users only.
- Logged out: every page logs a red 401 on `/api/v1/auth/me`. Treat a logged-out 401 as a
  normal state, not an error.

## Not in this phase
- A real member history screen. Parked: Carl chose the reframe, and it needs a ruling on what
  a member may see first.
- The empty right third of the list pages. Parked with the same decision.
