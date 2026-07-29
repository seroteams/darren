# Committee research — the five open console concerns

**Session:** Which of the 15 console features earn their place at validation stage, 29 July 2026
**Record:** `logs/committee/2026-07-29-sidebar-feature-audit.html`
**Status:** research only. Nothing was built. Free checks only, no OpenAI spend.
**Stage gate:** Sero is at VALIDATION STAGE (bar = 2 of 3 corridor managers returning unprompted).
Nothing here gets built before that metric lands. Anything that survives goes through the
darren-method, one phase at a time.

---

## Issue 1 — new session freezes the whole sidebar

Raised by Rasmus Andersson.

### Findings

**A1. The reported cause is already fixed and already live.**
`swapField` now resolves on whichever of the animation frame or a 60ms timer lands first
([field.js:31-39](../../admin/src/ui/field.js)). Shipped as `1747f4ad`, deployed in `f20f2ed3`,
serving on sero.team since 2026-07-29 21:22 GMT+7.

**A2. I reproduced the original failure condition and confirmed the fix.**
Local build `4badeefa`, admin console in a genuinely non-painting tab
(`document.visibilityState === "hidden"`, confirmed in-page). Mounted INTAKE at `/admin/new`, then
navigated four times in a row from the sidebar. Every one changed both the URL **and** the rendered
heading: Meeting arcs → Coaching phrases → Design system → Error log. Before the fix all four would
have left "Who are you prepping for?" on screen with only the URL moving.

**A3. The structural hole is still open — swapField was one instance of a class.**
`boot-shell.js` already time-boxes two things: the stage reveal
([boot-shell.js:172-174](../../admin/src/boot-shell.js)) and the outgoing fade
([boot-shell.js:139-141](../../admin/src/boot-shell.js)). It does **not** time-box the mount itself:
`await mod.mount(node, {...})` at [boot-shell.js:177](../../admin/src/boot-shell.js) has no upper
bound. Renders are serialised through one `renderChain`
([boot-shell.js:183-195](../../admin/src/boot-shell.js)), so **any** stage whose `mount()` never
settles still stalls every later navigation, exactly as `swapField` did. The next such bug will look
identical and be found the same slow way.

**A4. How often a real user hits a non-painting tab: not measurable today.**
There is no telemetry for `visibilityState` at boot, and no error is thrown when this happens, so it
would never have reached the Error log either. Known triggers, none exotic:

| Trigger | Notes |
|---|---|
| Browser session restore | Restored tabs mount in the background and do not paint until selected |
| Cmd/Ctrl-click, "open in new tab" | The new tab loads hidden |
| Tab switched away during a cold load | The common one on a slow connection |
| Mobile Safari / Chrome backgrounding | Returning to a backgrounded tab can re-run the boot |

Directionally common rather than rare. Worth naming: the Browser preview pane runs hidden, which is
why this reproduced there and never in a normal foreground tab.

### Options

| | Option | Cost | What it buys | Cost of being wrong |
|---|---|---|---|---|
| **A ⭐** | **Time-box `mount()` in boot-shell**, mirroring the two guards already in the same file, plus one test that a hanging mount cannot stall the chain | ~5 lines and a test. One darren-method phase | Kills the whole class, not the one instance. The nav rail can never again be frozen by a stage that forgets to resolve | Low. The pattern and its rationale are already in this file twice |
| B | **Leave it** — `swapField` was the only known cause and it is fixed | Nothing | Nothing new to review | The next stage that awaits a frame reintroduces an identical, invisible, no-error bug |
| C | **A, plus an audit of every stage `mount()`** for frame-dependent or unresolved promises | A, plus a sweep of ~15 stage modules | Finds the second instance if it already exists | Larger than the evidence justifies right now |

**Recommendation: A.** B leaves a trap that produces no console error, so it is found only by someone
noticing the screen did not change. A is small, and the file already argues for the pattern in its
own comments.

---

## Issue 2 — the Error log cannot be joined to a run

Raised by Charity Majors.

### Findings

**B1. This was already researched, and Carl already decided it.**
[2026-07-25-lab-traceability-research.md](2026-07-25-lab-traceability-research.md) §"Issue 2 — tester
feedback is not traceable to a build". Carl chose **option A on 2026-07-26**: server build stamp
first, bundle stamp second, **run id third**. It is parked behind the validation gate and logged on
[SERO_BOARD.md](../../SERO_BOARD.md) §2 "Committee follow-ups". No new decision is needed here.

**B2. The gap is unchanged since then.** `error_logs` still has no `run_id` and no build column
([schema.ts:405-427](../../backend/db/schema.ts)); the client reporter still sends `{message, path}`
only ([error-reporter.js:17-25](../../admin/src/ui/error-reporter.js)).

**B3. "Live 0" on a local console means "not visible from here", not "live is clean".**
Each error row is stamped `environment` by the process that writes it
([error-log.ts:52](../../backend/api/middleware/error-log.ts)), and local dev and the published site
read two separate databases. A local console physically cannot return a production-stamped row, so
the Live filter can only ever show 0. The 29 July commit put that on screen in words
([env-label.ts:28-30](../../admin/src/ui/env-label.ts)).

**B4. Whether live errors are actually being captured is still unverified.**
The mechanism is wired: the capture middleware runs inside the live process and writes to the live
database. But nobody has opened the console on sero.team and looked. That is a 30-second check, not a
build. Until someone does it, "live is clean" is an assumption.

**Recommendation: no new decision.** Re-read the 25 July report when the gate clears. The one genuinely
open item is B4, and it is a look, not a plan.

---

## Issue 3 — the Test engine's free check overstates what it proves

Raised by Simon Willison.

### Findings

**C1. What the check actually does.** `GET /api/v1/regression/run` runs the offline replay suite
([replay-suite.ts:1-4](../../scripts/lib/replay-suite.ts)): it loads frozen cases from `evals/replay/`,
re-grades each one's **recorded past model response** against the **current** trust-check code, and
reports drift from a stored baseline. No API call, no model, no prompt.

**C2. So "7 still good" means "7 saved runs still grade the same way they graded before".**
It proves the grading code has not drifted. It says nothing about whether the current engine, the
current prompts, or the current model produce good output. A reader glancing at "Free safety check
(no AI) · 7 still good" on the Test engine page can reasonably take it as the engine passing. That
is the honest substance of Simon's concern.

**C3. The 7 cases** are `jordan-kim`, `leak-devon`, `marcus-lee`, `maya-chen`, `rachel-singh`,
`sofia-martinez`, `thin-sam`.

**C4. The copy lives in two lines**: the label at
[personas.js:372](../../admin/src/stages/personas.js) and the summary at
[personas.js:400](../../admin/src/stages/personas.js).

### Options

| | Option | Change | What it fixes |
|---|---|---|---|
| **A ⭐** | **Rename what is counted** — summary becomes "7 saved runs still grade the same" | One string, [personas.js:400](../../admin/src/stages/personas.js) | The false read ("the engine passed") without adding words to the screen |
| B | **Rename the check too** — "Grading check (no AI)" instead of "Free safety check (no AI)" | Two strings | Also removes "safety", which is the word doing most of the overclaiming |
| C | **Add a one-line gloss** under the strip explaining what it does not cover | One string plus a line of layout | Most explicit, most screen weight, most likely to be skimmed past |

**Recommendation: B.** It is the same size as A and "safety" is the word carrying the false promise.
Both are copy-only, both are reversible, neither touches the check itself.

---

## Issue 4 — the arc is authored by the manager, never the report

Raised by Steven Rogelberg. Independently raised by Machar Smith on 29 July.

### Findings

**D1. Machar asked for this as a question *inside the meeting*, not a prep field.**
Reading his transcript rather than the summary: he was rewording the existing early question, not
requesting a new step. "I just wouldn't word it like that. Saying what would Daryl like to use the
time for in addition, or something like that."
([machar-2026-07-29.md](../validation/machar-2026-07-29.md) F2). That matters, because it makes the
smallest option the one he actually asked for.

**D2. Three candidate homes, in ascending size.**

| Where | What it means | Size |
|---|---|---|
| The questioning stage's opening question | Reword the early question so it invites the report's agenda. Matches D1 | Smallest. Prompt/arc wording, no schema change |
| A 4th intake step | Optional: "Has X said what they want from this one?" before the notes step. Prep flow today is NAME → MEETING_TYPE → NOTES ([intake.js](../../admin/src/stages/intake.js)) | Medium. New substage, new state field |
| Ask the report directly | A pre-meeting prompt to the employee | Largest. Reports do not have accounts; the manager is the end user |

**D3. The evidence is directionally strong and not quantified.**
Rogelberg's position: 1:1s go best with a *lightweight* agenda "driven ideally by the employee or in
concert with the manager", and involving the employee "is constantly sending the signal that this
meeting is indeed for you, not me". His basis is a 1,200-person global knowledge-worker survey, a
250-person US survey, and interviews with ~50 Fortune 100 leaders; roughly half of 1:1s are rated
suboptimal by employees, and managers systematically overestimate how well theirs go.

**Honest limit: I did not find a published effect size** for agenda ownership specifically in what is
publicly searchable. The direction is well supported. The magnitude is not. Anyone writing a plan off
this should say so rather than implying a measured lift.

Sources: [Fisher College of Business](https://fisher.osu.edu/blogs/leadreadtoday/glad-we-met-art-and-science-11-meetings) ·
[CNBC](https://www.cnbc.com/2025/12/08/many-bosses-do-1-on-1-meetings-completely-wrong-management-expert-says.html) ·
[Flinchum, Kreamer, Rogelberg & Gooty (2023)](https://journals.sagepub.com/doi/abs/10.1177/20413866221097570) ·
[stevenrogelberg.com](https://www.stevenrogelberg.com/11-meetings-1)

**Recommendation: the opening-question reword**, if anything. It is what the tester asked for, it is
the cheapest, and it is the only one of the three that does not need a new data model or a new user.

---

## Issue 5 — judging the console by one KPI

Raised by Rory Sutherland.

### Findings

**E1. Rory's counter-proposal is much cheaper than it sounds.**
A manager-facing Pulse would mostly be *scoping existing computation to one user*, not new
measurement. `PulseManager` already carries `runCount`, `firstRunAt`, `lastActiveAt`, `cameBack` and
`gapDays` per manager ([superadmin.service.ts:83-95](../../backend/api/services/superadmin/superadmin.service.ts)).
The founder Pulse computes it today; the manager simply cannot see their own row.

**E2. But the doorman warning cuts both ways.** Showing a manager their own prep count and return
pattern is itself a behavioural intervention, not a neutral mirror. At n=3 corridor testers its effect
could not be separated from noise, and it would contaminate the very metric the validation gate
measures. That is an argument for building it **after** the gate, not before.

**E3. On the underlying point** — that Guide, Design system and Tests should not be scored against
return-unprompted — the audit is not evidence either way. All 15 screens mount and are wired to a real
endpoint. Nothing in the 29 July sweep measured whether any of them changes a manager's behaviour.

### Options

| | Option | When | Notes |
|---|---|---|---|
| **A ⭐** | **Park it, explicitly** — record that internal tooling is not scored on return-unprompted, and revisit a manager-facing Pulse after the gate | Now (a line, not a build) | Answers Rory's objection without spending the validation window |
| B | **Build the manager-facing Pulse now** | Now | Cheap to build, but contaminates the corridor metric while it is being measured |
| C | **Score every screen against return-unprompted anyway** | Now | The doorman fallacy Rory is warning about |

**Recommendation: A.** B is the right idea at the wrong time, and its cost is paid in the one metric
Sero is currently staking everything on.

---

## What this does not settle

- **Nothing here is scheduled.** VALIDATION STAGE holds; this is research-for-later by Carl's own rule.
- **Issue 2 needs no new decision** — it needs the 25 July report re-read when the gate clears.
- **B4 is the one open question of fact**: are live errors being captured at all? A look at the console
  on sero.team answers it.
- **Only free checks were run**: `npm run typecheck` (clean), `npm test` (206/208, the two failures are
  the known fresh-worktree environmental ones), and a live navigation walk in a hidden tab. No OpenAI spend.
