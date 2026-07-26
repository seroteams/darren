# Committee research — three concerns left unbuilt

**Session:** Local vs live admin, 25 July 2026 · **Record:** `logs/committee/2026-07-25-local-vs-live-admin.html`
**Status:** research only. Nothing was built, nothing was changed. Free checks only, no OpenAI spend.

> **Carl's decision, 2026-07-26: option A on all three.** Direction is locked; nothing is scheduled.
> Each track is a separate darren-method plan when the validation gate clears, one phase at a time.
> Board entry: [SERO_BOARD.md](../../SERO_BOARD.md) §2 "Committee follow-ups".
> Two caveats he should see before any of it starts, both from the findings below:
> **(1)** Issue 1 needs a legal read on F5 (substitution, not rewriting) and F6 (prose that identifies
> someone without naming them) *before* a plan is written, not after.
> **(2)** Issue 2 Step 1 and Issue 3 are both small and both serve the validation programme itself
> (you cannot run a tester programme where reports have no build and triage vanishes). If the corridor
> push stalls on either, that is the argument for un-parking those two early. Not a reason to start now.
**Stage gate:** Sero is at VALIDATION STAGE (bar = 2 of 3 corridor managers returning unprompted). None of this
gets built before that metric lands; anything here that survives goes through the darren-method, one phase at a time.

---

## Issue 1 — the lab cannot see real users

Raised by Simon Willison, constrained by EU counsel.

### Findings

**F1. On live, `logs/` is not "ephemeral" — it is not written at all.**
`shouldEchoToDisk()` returns false whenever `APP_ENV` is `live` ([run-artifacts-store.ts:40-45](../../backend/db/run-artifacts-store.ts)),
and Render sets `APP_ENV: live` ([render.yaml:32-33](../../render.yaml)). Every disk write in the engine sits behind that
gate ([session.ts:141-149](../../backend/engine/session.ts)). So there is no disk copy on live to go missing. This is
better news than the brief assumed: the durable copy is Postgres.

**F2. Everything the lab reads already exists as live database rows.**
`queueArtifact` upserts each stage artifact into `run_artifacts`, keyed `(session_key, stage, name)`
([run-artifacts-store.ts:47-72](../../backend/db/run-artifacts-store.ts), [schema.ts:169-193](../../backend/db/schema.ts));
run-root files like `transcript.json` go in with `stage: ""` ([session.ts:141-149](../../backend/engine/session.ts)).
The three files a replay capture reads (`05-evaluation/inputs.json`, `05-evaluation/response.json`, `transcript.json` —
[check-session.ts:107-124](../../scripts/lib/check-session.ts)) are therefore rows on live, today, for every real run.

**F3. The scrub surface is small, fixed and knowable.**
`extractInputs` returns exactly eight fields: `rawResponse`, `ctx{name, role, seniority}`, `meetingType`,
`managerNotes`, `focusPoints`, `transcript`, `axisState`, `bankQuestions`
([check-session.ts:114-123](../../scripts/lib/check-session.ts)). `replay-capture.js` writes those to `input.json`,
plus `expected.json` = `{verdict, hard_fails, warnings, briefing}` ([replay-capture.js:58-73](../../scripts/replay-capture.js)).
That is the whole of what would ever leave live. Nothing else needs to travel.

**F4. Five of those eight carry personal data.**

| Field | Risk | Why |
|---|---|---|
| `ctx.name` | High | The employee's name, verbatim |
| `managerNotes` | Highest | Free text. Health, performance, conflict, whatever the manager typed |
| `transcript` | High | The manager's own answers, verbatim |
| `axisState.history[].answer_excerpt` | High | Verbatim excerpts of those answers ([check-session.ts:41-54](../../scripts/lib/check-session.ts)) |
| `rawResponse` / `expected.briefing` | High | Model prose that names the person and quotes the notes |
| `focusPoints` | Medium | `label` / `reason` are derived from the notes ([trust-checks.ts:208-235](../../evals/trust-checks.ts)) |
| `meetingType`, `bankQuestions` | Low | Catalogue / config shaped |

**F5. Scrubbing must be substitution, not rewriting — or the fixture proves nothing.**
`checkEvidenceAnchor` requires word-stem overlap between `managerNotes` and every `signal` focus point, and between
`managerNotes` and `engagement_read.observed_shift` ([trust-checks.ts:208-237](../../evals/trust-checks.ts)).
Paraphrasing or blanking the notes would flip those gates and the case would be worthless as a regression.
A **consistent one-to-one token map**, applied identically across notes, transcript, axis excerpts, focus points,
raw response and expected briefing, preserves every overlap the gates measure. So: pseudonymise identifiers,
never rewrite prose.

**F6. The residual risk is the prose itself, and code cannot close it.**
"the Berlin contract", "her second maternity leave", "the person who replaced Dave" — self-identifying with no name
in them. A token map does not touch these. Any bridge needs a human read-and-approve step before the file lands,
and the tester's consent.

**F7. The guard counsel wants kept is not the blocker.**
`env-guard.ts` stops a **local process** opening the **live database** ([env-guard.ts:43-59, 68-106](../../backend/db/env-guard.ts)).
It says nothing about live producing a file. The correct shape is therefore: **the export runs inside the live
process; the output travels as a file.** No local process ever holds a live `DATABASE_URL`, and the guard stays
untouched and un-weakened.

**F8. The cross-company-read precedent exists, and it has already bitten once.**
The internal "prefill / clone a run" tool reads finished runs unfenced across every company
([runs.service.ts:51-56](../../backend/api/services/runs/runs.service.ts)). It was reachable by any signed-up customer
until the H-1 fix; it is now superadmin-only on live ([internal-tool-guard.ts:26-36](../../backend/api/middleware/internal-tool-guard.ts),
[2026-07-16-personal-data-security.md §2](archive/2026-07-16-personal-data-security.md)). Any new cross-company read
must ride the same gate and the same audit funnel — `appendSuperadminAudit` → `audit_log`
([superadmin-audit.ts:52-74](../../backend/api/middleware/superadmin-audit.ts), [schema.ts:265-275](../../backend/db/schema.ts)).

**F9. `export-demo-fixture.ts` is a shape reference, not a starting point.**
It refuses production ([lines 23-25](../../scripts/export-demo-fixture.ts)), reads the local DB, and strips only
**ownership ids** — `orgId`, `userId`, `personId`, `dir`, `runLabel`, `isDemo` ([lines 49-56](../../scripts/export-demo-fixture.ts)).
It does not touch name, notes, transcript or briefing prose. Copied to live as-is it would export raw PII. Useful
only for its output shape (`{state, artifacts}` in one JSON).

**F10. There is already a reproduction lane to aim at.**
`repro-from-bundle.js` takes a bundle in run-folder layout, replays it through current code and answers
"does this reproduce?" ([repro-from-bundle.js:29-59](../../scripts/repro-from-bundle.js)); cassettes make the model
side byte-faithful ([cassette.ts](../../backend/engine/cassette.ts)). A bridge that emits exactly that layout gets
`replay-capture`, `replay-regression` and `repro-from-bundle` for free, with no changes to any of them.

### How scrubbing would be proven

Proof means a gate that refuses to write the file, not a promise in a comment. Three layers, all free:

1. **Allow-list, never deny-list.** The exporter names the eight fields from F3 explicitly. A column added to
   `sessions` or `run_artifacts` next month can then never ride along by default.
2. **A post-scrub scan, in the same process, on the finished JSON.** Assert that none of these appear anywhere in
   the serialized output (case-insensitive, whitespace-normalised): the person's name and any name variants from
   their `people` row, the org name, every user email in that org, the source `session_key`, and the org/user/person
   uuids. **Fail closed** — on any hit the file is not written and the operator sees which field leaked.
3. **A committed test that proves the scanner still fires.** A fixture with a known name planted in each of the five
   risky fields must make the scan fail. Without this, layer 2 rots silently. Same logic `replay-regression` already
   applies to itself: drift in *either* direction counts ([replay-regression.js:1-15](../../scripts/replay-regression.js)).

Plus the record: one `audit_log` row per export via the existing superadmin funnel (who, which run, when), and a
manifest shipped beside the bundle — run id, size of the substitution map, scan result, exporter build SHA.

**Honest limit:** this proves *no known identifier survived*. It does not prove the prose is unidentifiable (F6).
That is closed by consent plus Carl reading the file, not by code. Say so out loud in any plan.

### Options

| | Option | What it costs | What it buys | Residual risk |
|---|---|---|---|---|
| **A ⭐** | **Live-side export → scrubbed bundle** — superadmin-only endpoint on live, one run per call, allow-list + fail-closed scan + audit row; downloads a bundle in run-folder layout | One endpoint, one scrubber, one scan, one test. Reuses the whole existing replay toolchain unchanged | The lab can replay a real run offline, $0, with the same tools as today | Prose re-identification (F6); mitigated by consent + Carl's read |
| B | **A, but consent-gated** — the tester taps "share this run with the Sero team" after a run; only flagged runs are exportable | A + a button, a column, and testers remembering to tap | The strongest legal footing; consent is recorded per run | Coverage: the runs you most want are the ones nobody flagged |
| C | **Shape-only telemetry** — never export prose. Export structural facts (stage sequence, question counts, axis deltas, verdict, hard-fails) and rebuild a synthetic persona to match | Smaller build, no scrubber, no counsel review | Zero personal data leaves live, ever | Cannot reproduce a prose bug — which is the main class of bug the lab exists to catch |
| D | **Status quo** — synthetic personas only | Nothing | Nothing | The lab keeps guessing at real behaviour |

**Recommendation: A, with B folded in before any non-corridor customer.** A is the only option that reproduces the
bugs the lab actually needs, and F7 shows the safety guard survives untouched. For friendly corridor testers who
already know they are testing, A alone is proportionate. The moment a paying customer's run is in scope, B's explicit
consent flag stops being optional — build it then, not now.

---

## Issue 2 — tester feedback is not traceable to a build

Raised by Charity Majors.

### Findings

**G1. Neither table has a build column.**
`error_logs` = org / user / email / environment / source / method / path / status / error_code / message / details /
resolved_at / created_at ([schema.ts:400-423](../../backend/db/schema.ts)). `feedback_notes` = org / user / message /
page / run_id / verdict / created_at ([schema.ts:367-389](../../backend/db/schema.ts)). No build in either. The
`details` jsonb is typed narrowly to `{stack?, userAgent?}` ([schema.ts:414](../../backend/db/schema.ts)).

**G2. The server already knows its build, for free, in-process.**
`getBuildInfo()` caches the git short SHA + commit date at boot ([build-info.ts:36-42](../../backend/api/build-info.ts)),
served at `GET /api/version` ([server.ts:218](../../backend/api/server.ts)). Every writer of an error row or a feedback
row runs inside that process ([error-log.ts:125-200](../../backend/api/middleware/error-log.ts),
[feedback.service.ts:66-98](../../backend/api/services/feedback/feedback.service.ts)). Stamping the build server-side
is one column and one field in the entry builders — no client change, nothing to forget, nothing to spoof.

**G3. The server's SHA is not necessarily the SHA the tester was running.**
One Render service builds and serves both apps from one commit ([render.yaml:18-22](../../render.yaml)), so at deploy
time API and bundle match. They diverge when a tester keeps a cached SPA across a redeploy. **And the client cannot
detect that today:** `build-stamp.js` asks `/api/version` ([build-stamp.js:65](../../admin/src/ui/build-stamp.js)),
which reports the *server's current* build, not the bundle's. Neither vite config defines a build constant
([vite.config.js](../../vite.config.js), [frontend/vite.config.js](../../frontend/vite.config.js) — no `define`).
So "which bundle was the tester on" is answerable only if the SHA is baked in at build time.

**G4. The client fetches the SHA and then throws it away.** `createBuildStamp` keeps `sha` in a closure
([build-stamp.js:52](../../admin/src/ui/build-stamp.js)) and never exposes it; nothing else in the app can read it.

**G5. Run id is half-wired, and the main feedback path is worse than assumed.**
`feedback_notes.run_id` exists but is only ever populated by the *verdict tap*
([schema.ts:375-380](../../backend/db/schema.ts), [feedback.service.ts:82-98](../../backend/api/services/feedback/feedback.service.ts),
[briefing.js:476](../../admin/src/stages/briefing.js), [finish-feedback-modal.js:86](../../admin/src/ui/finish-feedback-modal.js)).
The plain Send-feedback form calls `submitFeedback(message)` with **no page argument**
([feedback.js:45](../../admin/src/stages/feedback.js)) even though the API and the column both accept one
([api.js:218-220](../../shared/api.js), [feedback.service.ts:76-77](../../backend/api/services/feedback/feedback.service.ts)).
So today a plain tester note records neither page nor run. `error_logs` has no run id at all.

**G6. The error reporter's payload is `{message, path}` only**
([error-reporter.js:17-25](../../admin/src/ui/error-reporter.js) → [api.js:145-147](../../shared/api.js)).
Adding a field is a one-line change, but every added field must stay secret-free — that rule is the header contract
of [error-log.ts:7-13](../../backend/api/middleware/error-log.ts).

**G7. Grouping is a deliberate decision, not a side effect.** The Error log groups issues by
`message + path + environment` ([admin-error-log.ts:64-85](../../admin/src/stages/admin-error-log.ts)). Put build in
the key and one bug spanning two deploys splits into two issues. Leave it out and the group can show
"first seen on `abc1234` → last seen on `def5678`", which is the more useful read. Recommend leaving the key alone.

### Options

| | Option | Cost | What it buys | Cost of being wrong |
|---|---|---|---|---|
| **A ⭐** | **Server stamp now, bundle stamp next, run id last** (3 steps, see below) | Step 1 is a migration + ~6 lines. Steps 2-3 are small and independent | Every row traceable to a build from day one; stale-bundle detection later; run id last because it needs the most client wiring | Low — each step ships and proves itself alone |
| B | **Stuff it in `details` jsonb** — build + runId inside `error_logs.details`, a new jsonb on `feedback_notes` | No migration for errors | Fastest to write | `details` is typed `{stack?, userAgent?}` and would become a junk drawer; not filterable, not indexable |
| C | **Correlation id** — mint a per-browser-session id, log it on both client and server, join afterwards | Largest: new id, new plumbing, new joins | The full Honeycomb-style story: every event in one tester session | Overbuilt for one triager reading 200 rows |

**Recommendation: A, in three separately shippable steps.**

1. **Server stamp.** `build` column on `error_logs` and `feedback_notes`, filled from `getBuildInfo()` in
   `errorLogEntry` / `browserErrorEntry` / the feedback service. No client change, cannot be forgotten.
   This alone closes most of Charity's concern.
2. **Bundle stamp.** Bake the SHA into each bundle at build time (a vite `define`), send it from
   `error-reporter.js` and the feedback form, store as `client_build`. Server build ≠ client build **is** the
   "tester on a stale bundle" signal (G3) — you get a new diagnostic, not just a new column.
3. **Run id.** Pass the current run to the error reporter and the feedback form; add `run_id` to `error_logs`;
   populate `feedback_notes.run_id` and `page` on the plain form (G5 — `page` is a free win, the column already exists).

---

## Issue 3 — feedback triage is browser-local

Raised by Charity Majors.

### Findings

**H1.** Triage lives in `localStorage` under `seroFeedbackStatus`, an id → `"done" | "archived"` map
([admin-feedback.ts:56-68](../../admin/src/stages/admin-feedback.ts)); absent = new. The tab counts derive from it
([admin-feedback.ts:274-286](../../admin/src/stages/admin-feedback.ts)), and a prune pass drops marks for deleted
notes on every load ([admin-feedback.ts:359-365](../../admin/src/stages/admin-feedback.ts)).

**H2.** This was intentional. The file header says done/archived are "Carl's personal triage marks, not shared data"
([admin-feedback.ts:12-13](../../admin/src/stages/admin-feedback.ts)). Making them durable reverses a deliberate call
— worth naming out loud rather than fixing quietly.

**H3.** There is exactly one triager. The screen is superadmin-gated server-side
([server.ts:313-314](../../backend/api/server.ts)), so there is no concurrency, no per-user scoping and no merge
problem to design for. One person, many browsers.

**H4.** The repo has already made this exact move once, in the other direction: feedback notes moved *off* a JSONL
file *onto* a table precisely so the superadmin screen could read them properly
([schema.ts:362-366](../../backend/db/schema.ts)). Migrations are routine here — 21 of them, `npm run db:generate`
offline then `npm run db:migrate` ([drizzle.config.ts](../../drizzle.config.ts)).

### Options

| | Option | Build size | Live-with size | Notes |
|---|---|---|---|---|
| **A ⭐** | **`status` column on `feedback_notes`** + `PATCH /api/v1/admin/feedback/:id/status` | One migration + repo/service/controller/route/api fn + swap two client functions | Smallest. Filtering can move server-side later; delete removes the mark automatically | Deletes the prune pass (H1) outright — fewer moving parts than today |
| B | **One `app_state` row** — key `feedback_triage`, value = the same id → status map, GET/PUT | Smallest to build: no migration, the table already exists ([schema.ts:279-283](../../backend/db/schema.ts)) | A blob. No per-note index, and the prune pass stays because deletes do not touch it | Genuinely smaller today, quietly worse in six months |
| C | **Leave it in localStorage** | Nothing | Triage keeps vanishing between machines | |

**Recommendation: A.** B is smaller to *build*; A is smaller to *live with*, and matches the move this repo already
made for the notes themselves (H4). "Smallest durable store" should mean smallest total, and A deletes the prune pass
it replaces. Either way this is small enough to be one darren-method phase.

---

## What this does not settle

- **Counsel has not seen this.** F5's substitution-not-rewriting constraint and F6's prose limit both need a legal
  read before Issue 1 is planned, not after.
- **Consent wording** for option B (Issue 1) is unwritten.
- **Nothing here is scheduled.** VALIDATION STAGE holds; this is research-for-later by Carl's own rule.
