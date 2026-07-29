# Phase 7 — Member view, motion, and the small sweep

**Part of:** [plan.md](plan.md)

**Split on 2026-07-29, Carl's call.** The phase was three jobs in one, and a reality check
found two of its items no longer exist. It now runs as:

| | Slice | Status |
|---|---|---|
| **7a** | Member home says what it is (F10) | 🔨 BUILT 2026-07-29, awaiting Carl |
| **7b** | Three motion wins (F12) | ⬜ not started |
| **7c** | The small sweep | 🔨 BUILT 2026-07-29: 6 fixed, 3 need Carl |

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

## 7c — The small sweep 🔨 BUILT 2026-07-29 (6 fixed, 3 need Carl)

### Fixed

| # | Item | What changed |
|---|---|---|
| 1 | Live pulse: the "Runs per day" chart drew a flat line with no message when there was no data | `sparkline()` returns the written empty state when the series totals zero, reusing the existing `.lp-empty` the card beside it already used. A floor-level line read as data ("nothing happened, every day") rather than absence. |
| 2 | Person page: the meta line left a dangling "·" | The middot was a standalone `<span>` **between** items, so a wrap could strand it: "Content Designer · 1 1:1 ·". Each part is now one `.person-summary__item` and the middot is a `::before` on every item after the first, so separator and item can only wrap together. |
| 3 | Person page: "-5" with no scale, legend or tooltip | A legend under the bars ("Each score runs from -6 to +6 … below it reads as a concern") plus a `title` on every number. The track always carried `aria-valuemin/max`, so only the screen was missing the scale. |
| 4 | Run detail: the meeting type appeared twice | The blue `.rd-type-badge` is gone. The breadcrumb's current crumb names the meeting once, in ink at semibold rather than accent blue, so it no longer reads as a link that isn't one. |
| 5 | Compare runs: the nav lit "Test engine" while the page said "Compare runs" | The eyebrow became a breadcrumb, `Test engine › Compare runs`, matching the pattern the Pulse sub-pages already use. The parent crumb navigates. |
| 6 | Collapsed nav: icon-only with no tooltips | `title` on every rail row in both apps, including the hand-written Log out row that does not go through `rowHtml`. The aria-labels only ever helped screen-reader users. |

### Needs Carl, not built

**The wizard vocabulary — and the audit got this one wrong.** It reads as "a guest sees
*Focus areas / Prep brief / During the meeting*, a manager sees *Focus / Prep / Meeting*",
so it looks like two vocabularies picked by audience. It is not. `session-topbar.js` paints
the full labels, measures whether the strip overflowed, and falls back to the short ones if
it did. A guest has no nav rail, so there is more room, so they get the long form. It is one
vocabulary with a measured responsive degrade, and the full name always rides on the `title`.

The complaint still has something in it: "During the meeting" → "Meeting" is a big jump for
the same step. But making the two forms agree is a copy decision, so it is yours:
- **A** leave it (the degrade is deliberate and the title always carries the full name)
- **B** shorten the long forms so both agree ("Focus / Prep / Meeting" everywhere)
- **C** change only the jarring one ("During the meeting" → "In the meeting", short "Meeting")

**The logged-out 401.** Not something our code logs. `main.js` calls `me()` inside a
`try/catch` and stays silent; the red line is the browser's own network log of a 401
response, which no JavaScript can suppress. The only real fix is to make `/api/v1/auth/me`
answer **200 with a null user** when logged out instead of 401. That changes an auth API
contract and every caller that currently relies on the throw, so it is not a small-sweep
item. Worth doing, worth doing on purpose.

**Pulse metric grid.** The tiles are `repeat(auto-fit, minmax(10.5rem, 1fr))`, which should
already reflow rather than strand "Errors" alone. Confirming needs a laid-out viewport, and
this session's Browser pane reports 0x0. Not changed: altering a working responsive grid
blind would be worse than leaving it.

### Verified

- `npm test` **206/206**, typecheck, `lint:copy`, `lint:tokens`, `lint:components` green.
  Six new tests.
- **On screen** (admin app, superadmin): the Pulse chart shows "No runs in the last 7 days
  yet…" instead of a flat line; **23 of 23** rail rows carry a tooltip; Compare runs renders
  `Test engine › Compare runs` with the eyebrow gone and the crumb navigating to the Test
  engine, which is the row the rail was lighting all along.
- No console errors.

### NOT verified

- No screenshot, and nothing geometric: the Browser pane reports a 0x0 viewport, so the
  dangling-middot fix is proved by its markup and CSS rule rather than by seeing a line wrap.
  That one wants your eyes on a narrow window.
- The person page's axis legend and the run-detail header were not opened on a real record
  this session; both are covered by unit tests against their render output.

## Not in this phase
- A real member history screen. Parked: Carl chose the reframe, and it needs a ruling on what
  a member may see first.
- The empty right third of the list pages. Parked with the same decision.
