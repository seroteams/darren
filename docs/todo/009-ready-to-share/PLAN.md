# Phase 009 — Getting ready to share (Alpha readiness)

**Goal:** Real invited managers can safely run real 1:1s on their real teams via a hosted Sero —
and the codebase reads clean to a newcomer.
**Driver:** Carl
**Created:** 2026-07-01
**Overview:** [../../prototype-to-production/009-ready-to-share.md](../../prototype-to-production/009-ready-to-share.md)

## Done means
- An invited manager opens a hosted URL, logs in, and completes their first 1:1 with no hand-holding.
- Their team's data is fenced (org + role), AI keys can't leak, spend is capped and visible, and there's a plain privacy note.
- Nothing half-finished is on screen — every built feature is signed off or removed.
- A newcomer can open the repo, follow the README, and find their way — trackers/docs don't contradict each other.
- On the second 1:1 for a person, Sero remembers the first.

## Two workstreams + one parallel track
- **A. Product-ready** (ship-blockers, do first): Phases 1–5. Gate real people using it.
- **B. Repo-ready** (newcomer-clean): Phases 6–7. If the fortnight gets tight, B slips before A.
- **C. Value in parallel**: Phase 8 (continuity) — ready before return visits, not before day one.

## Phases
| # | Phase | What it lands | Track | Status |
|---|---|---|---|---|
| 1 | Safety floor (execute 008) | Data fenced by org+role · AI keys proven server-only · sensitive data out of logs · human sign-off | A | 🟢 |
| 2 | Hosted + spend-capped | A shareable URL an invited manager can reach · usage/cost cap · graceful failure | A | 🔴 |
| 3 | Privacy note + first run | Plain privacy/consent note · onboarding empty states · a clear "run your first 1:1" path | A | 🔴 |
| 4 | Clear the QA pile | The built-but-unQA'd features each signed off or cut, so nothing half-built shows | A | 🟢 |
| 5 | Feedback + one-pager | A simple in-app feedback route · a "what Sero is / what to expect" page | A | 🔴 |
| 6 | Finish repo-tidy | repo-tidy phases 3–4 + parked naming pass & hermetic tests | B | 🔴 |
| 7 | Tidy docs + newcomer README | Finish tracker-consolidation 2–4 · conventions/dead-code sweep · a README a newcomer follows | B | 🔴 |
| 8 | Continuity loop | Meeting #2 reviews meeting #1's actions & commitments | C | 🔴 |

🔴 not started · 🟡 in progress · 🟢 done (tested) · ✂️ cut

## Phase 4 — QA pile tracker
The built-but-un-QA'd features, walked one at a time. Tick 🟢 (signed off) or cut ✂️.

| # | Feature | What it gives the user | Status |
|---|---|---|---|
| 1 | repo-tidy P1 | invisible: one shared type-guard module | 🟢 |
| 2 | frontend-admin-split P1 | invisible: shared code in `shared/` folder | 🟢 |
| 3 | tracker-consolidation P1 | invisible: a "which tracker is which" map | 🟢 |
| 4 | member-nav P1 | member sees a simple Home · Team · Runs rail | 🟢 (landing fix `fc77b8ba`) |
| 5 | stage-data-tabs | Notes · Sent · Reply tabs on the right rail | 🟢 (walked live, 1 paid stage) |
| 6 | sent-preview | "about to send" preview before a stage runs | 🟢 (walked live) |
| 7 | repo-tidy P2 | invisible: queue-manager split 1309→434 lines | 🟢 (behaviour-preserving, tests green) |
| 8 | todo-board-rebuild P3 | "Run the checks" button — built + verified (✅ 52/52 live) | 🟢 |
| 9 | briefing-grounding-fixes P1 | over-claim damper — committed (delta-gates.ts); verified −9→−5 | 🟢 |

## Current state
**Phase 1 ✅ signed off (2026-07-01). Phase 2 ⬜ next — not started.** Product owner walked all 6 QA
scenarios (cross-company wall, role limits, key-search zero-hits, DB clean, no-login wall) and gave the
go; committed `e68c4c8c`. Human-expert sign-off remains waived/deferred (see Decisions). Phase 2 (hosted +
spend-capped) awaits Carl's start.

<details><summary>Phase 1 history</summary>

Plan approved by Carl; Phase 1 executes the existing
[008 security overview](../../prototype-to-production/008-security/00-phase-overview.md) — the hard
prerequisite for real staff data.
- **Baseline (free, 2026-07-01):** `npm test` **52/52** · `npm run typecheck` **clean**. Paid gate/smoke
  not run — need Carl's go-ahead (~$3 full / ~$0.35 single case); security work is mostly free to verify.
- **Security review done (2026-07-01)** — findings in [phase-1-security-review.md](phase-1-security-review.md):
  keys server-only (source + built bundle) ✅ · role + company fencing correct for stamped data ✅ ·
  web-path logging clean ✅. **Null-org escape hatch — CLOSED** (`f0e5401d`, 2026-07-01, test-first): the
  live-session wall now default-denies, so an org caller can't read an unstamped/anonymous session
  (`npm test` 52/52 · typecheck clean). Deploy-time condition for Phase 2 still stands: web server only.
- **DB null-org audit — DONE (2026-07-01, read-only against live Neon).** Verified the destination, not
  the code: **0 literal-null** org_id rows (column is `NOT NULL` + the write path coerces null →
  placeholder), `runs` table empty, all 10 orgs are dev/test. Found **3 sessions in the pre-auth
  placeholder org** (`00000000-…-0001`) — all throwaway test data (generic roles, no person name, none
  completed). **Cleared** on Carl's explicit go-ahead (scoped `DELETE … WHERE org_id = placeholder`,
  returning 3 keys; placeholder org row left intact as the anon-insert bridge). DB now: 0 unfenced
  sessions, 6 total (all real dev/test orgs).
- **Anonymous session-start path — DECIDED (2026-07-01):** kept open for the alpha (see Decisions).

</details>

## Decisions (this plan)
- **2026-07-01 — anonymous session-start path kept open for the alpha (A, tracked as C).** The start
  route (`POST /api/v1/sessions` · `/api/start`) stays login-free (origin + rate-limit only), as decided
  in auth-hardening Phase 2. Safe because: the hosted app gates every page behind login, so a real manager
  always creates an org-fenced session; anonymous sessions are stamped null → quarantined in the placeholder
  org and 404 to any logged-in caller (escape hatch closed); the free CLI/scripted/smoke test lanes rely on
  it. **Follow-up (deferred, not cancelled):** add an auth gate to the start route before widening past 2–3
  friendly managers — same gate as the human security review. Carl deferred the choice to Claude's
  recommendation.
- **2026-07-01 — human expert sign-off waived for alpha (accepted risk).** Carl chose to proceed on
  automated checks only for a small friendly alpha. 008's overview marks the expert review *required*; this
  is an explicit override. Mitigation: keep the alpha to 2–3 personally-known managers; treat sign-off as
  **deferred, not cancelled** — book it before widening. Flagged in-session.

## Parked
- **Phases 1 and 8 are large** — the security floor and the continuity loop may each split into their own
  sub-plan when we reach them (008 already has its own overview; continuity needs person-profile linking).
  Kept as single rows here so the readiness picture stays whole.
- Broad alpha (many companies) — start with 2–3 friendly managers; widen later.
- Full admin-SPA TypeScript sweep — repo-tidy Phase 4 only *pilots* it; the full conversion is its own plan.
- Anything a manager doesn't touch and a newcomer doesn't read — out of scope for "ready to share".
