# Phase 009 — Getting ready to share (Alpha readiness)

**Goal:** Real invited managers can safely run real 1:1s on their real teams via a hosted Sero —
and the codebase reads clean to a newcomer.
**Driver:** Carl
**Created:** 2026-07-01
**Overview:** [../../../archives/prototype-to-production/✓009-ready-to-share.md](../../../archive/prototype-to-production/009-ready-to-share.md)

## Done means
- An invited manager opens a hosted URL, logs in, and completes their first 1:1 with no hand-holding.
- Their team's data is fenced (org + role), AI keys can't leak, spend is capped and visible, and there's a plain privacy note.
- Nothing half-finished is on screen — every built feature is signed off or removed.
- A newcomer can open the repo, follow the README, and find their way — trackers/docs don't contradict each other.

## Two workstreams
- **A. Product-ready** (ship-blockers, do first): Phases 1–5. Gate real people using it.
- **B. Repo-ready** (newcomer-clean): Phases 6–7. If the fortnight gets tight, B slips before A.

## Phases
| # | Phase | What it lands | Track | Status |
|---|---|---|---|---|
| 1 | Safety floor (execute 008) | Data fenced by org+role · AI keys proven server-only · sensitive data out of logs · human sign-off | A | 🟢 |
| 2 | Hosted + spend-capped | A shareable URL an invited manager can reach · usage/cost cap · graceful failure | A | 🔴 |
| 3 | Privacy note + first run | Plain privacy/consent note · onboarding empty states · a clear "run your first 1:1" path | A | 🟢 done (verified live) |
| 4 | Clear the QA pile | The built-but-unQA'd features each signed off or cut, so nothing half-built shows | A | 🟢 |
| 5 | Feedback + one-pager | A simple in-app feedback route · a "what Sero is / what to expect" page | A | 🟢 done (verified live) |
| 6 | Finish repo-tidy | repo-tidy phases 3–4 + parked naming pass & hermetic tests | B | 🟢 done — Carl walked it 2026-07-01 ("tried it and it's fine") |
| 7 | Tidy docs + newcomer README | Finish tracker-consolidation 2–4 · conventions/dead-code sweep · a README a newcomer follows | B | 🟢 done — Carl walked it 2026-07-01 |

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

## Phase 3 — ✅ done, verified end-to-end (2026-07-01, commit `05abd1e0`)
Built under the ultra batch (nothing live, no paid runs). **Carl said "finish 3 and 5", so I verified it
end-to-end in the running app rather than leaving it pre-QA** — logged in as BOTH a real member and an
owner (real DB session, not the dev side-door): member lands on `/home` with the first-run "how it works",
the member rail is Home·Team·Runs (member theme), **Team and Runs show the new empty states with a
start-a-1:1 button and no "Coming soon" anywhere**, and the privacy note opens from the footer (with the
rail for a logged-in member; standalone + "back to sign up" from the signup screen). Also offline: vite
build clean, typecheck clean, `npm test` 53/53. Walk the scenarios yourself anytime — nothing here was
self-certified blind.

**Decisions I made (flagging for your call):**
- **Team/Runs → intentional empty states, not hidden.** Each now says what's coming and offers "start a
  1:1", so nothing reads as "coming soon". Keeps the Home·Team·Runs shape member-nav set. Easy to switch
  to hiding Team if you'd rather.
- **Privacy note copy is code-honest:** account deletion is an email path (no self-serve endpoint exists),
  and it states plainly that the AI provider processes the text. No over-promising.
- **Register landing fix** lands a member on Home (was bouncing via the admin start page); a self-signup
  owner still lands on the admin start page — unchanged for you.

**QA walk (log in via the dev Admin/Standard quick-swap):**
1. On the **sign-up** screen: a consent line + "Read the privacy note" link shows before you submit; the
   link opens the note; "← Back to sign up" returns you.
2. Open the **privacy note** from the nav footer (as both a member and an admin) — it reads plainly and
   every claim is true.
3. As a fresh **member**: Home shows the 3-step "how it works" + Start button; **Runs** and **Team** show
   real empty states (no "coming soon") each with a start-a-1:1 button that begins intake.
4. Deep-link `/privacy` in the URL as a logged-in member — it renders (not bounced to Home).

## Phase 5 — ✅ done, verified end-to-end (2026-07-01, commit `92aff101`)
Feedback route + About one-pager. Backend built **test-first** (red→green): 5 new feedback service tests.
**Verified end-to-end in the running app** (Carl said "finish"): About renders live with the nav
highlighting it; the feedback form sends and shows the "Thanks!" state; a real note **landed in
`content/data/feedback/feedback.jsonl`** stamped with the sender's user/org + timestamp, trimmed
(**destination verified, not just the code**); an empty note → 400, and a **logged-out POST → 401**. Also
offline: `npm test` 53/53, typecheck clean, vite build clean. The feedback file is now git-ignored (tester
notes can be HR-adjacent — never committed).

- **Feedback** (`POST /api/v1/feedback`): login required (any role), origin-guarded, stored to
  `content/data/feedback/feedback.jsonl` — a local file, **no external service** (Carl reads it directly).
  Non-empty + trimmed + capped at 2000 chars; the message is never logged.
- **About** one-pager (`/about`): what Sero is / do first / expect / early-alpha, with a Start button.
- Both reachable from the nav footer (What is Sero? · Send feedback · Privacy · Log out) for members and admins.

**QA walk:**
1. From the nav footer open **What is Sero?** — it reads plainly and explains what to do first.
2. Open **Send feedback**, submit an empty note → inline "write a short note first" (nothing sent).
3. Send a real note → "Thanks!" state. **Verify the destination** (not the code): open
   `content/data/feedback/feedback.jsonl` on the server and confirm your note + timestamp + your user/org.
4. Log out and `POST /api/v1/feedback` directly → 401.

## Current state
**Phases 1 · 3 · 4 · 5 · 6 · 7 ✅ done — 6 & 7 walked + signed off by Carl 2026-07-01 ("tried it and
it's fine"). Phase 2 ⏸ parked (not hosting yet).** Every non-parked phase of 009 is complete. Remaining 009
scope (hosting) now lives under the **pre-go-live** track (see [SERO_BOARD.md](../../../../SERO_BOARD.md)); Carl is
restructuring the roadmap there. **Formal archive of this folder → `done/` left to Carl** so it lands where
his reorg puts it (his SERO_BOARD treats 009 as paused-under-pre-go-live, not simply done).

**Phase 6 (repo-tidy 3–4 + hermetic tests) — built, offline-verified, committed:**
- **P6a** `sessions.controller.ts` split 698→134 lines: thin controller + `session-runtime.ts` (service
  wiring) + `session-streams.ts` (the 5 SSE handlers). Verbatim cut; `server.ts` untouched (streams
  re-exported). Commit `b51aec29`.
- **P6c** `npm test` made hermetic: `test-grounding-gate.js` now snapshots + restores
  `content/questions/_index.json`, so a full run leaves no tracked file dirty. Commit `c66a455a`.
- **P6b** admin TypeScript pilot: `admin/tsconfig.json` + `state.d.ts` + `stage.types.ts`; `team`/`runs`/
  `error` stages → `.ts`; `npm run typecheck:admin`; path written to `admin/TYPESCRIPT.md`. Commit `70e0f339`.
- Verified offline throughout: `npm test` **53/53**, root + admin typecheck clean, `vite build` resolves the
  `.ts` stages. **Live full-run QA deferred (ultra batch — no paid runs).** See P6 QA scenarios (phase-6.md).

**Phase 7 (docs + newcomer README) — built, committed `0f5f6677`:**
- README "where are we" now points to the two-source model (STATUS + SERO_BOARD) + `docs/reference/trackers.md` map.
- CLAUDE.md §6 tracker rule tightened to the two-source model (no rule removed).
- Archived `PROGRESS.md` banner reframed as append-only log, not a status source.
- Changelog (`sero-how-it-works.html`) "LIVE" badge → "manual log, see STATUS.md" (edit staged; committed
  with Carl's in-flight reformat of that file). Link reconciliation to `docs/archive/…` verified clean
  (inbound live links repointed; archived internals left frozen per `docs/archive/README.md`).

**Close-out remaining (Carl's, when the reorg settles):** reflect 6 & 7's sign-off in STATUS.md / SERO_BOARD.md
and move this folder to `done/`. Left to Carl because he's mid-restructure of those trackers (folding 009's
open scope into the pre-go-live track) and moving the folder would break the live links he's editing.

Original Phase-1 sign-off detail below.

<details><summary>Phase 1 sign-off (2026-07-01)</summary>

Product owner walked all 6 QA
scenarios (cross-company wall, role limits, key-search zero-hits, DB clean, no-login wall) and gave the
go; committed `e68c4c8c`. Human-expert sign-off remains waived/deferred (see Decisions). Phase 2 (hosted +
spend-capped) is parked (Carl: not hosting yet).
</details>

<details><summary>Phase 1 history</summary>

Plan approved by Carl; Phase 1 executes the existing
[008 security overview](../../../archive/prototype-to-production/008-security/00-phase-overview.md) — the hard
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
- **2026-07-01 — real Team content deferred.** Carl: "finish 3 and 5 — we can do the teams later." So the
  member **Team** page stays the intentional empty state (real team content = member-nav Phase 2, later).
  Phases 3 & 5 were verified end-to-end and closed. Phases 6 (repo-tidy 3–4) & 7 (docs/README) remain open
  — not yet green-lit to continue.
- **2026-07-01 — Team/Runs empty states kept (not hidden).** The two member tabs show intentional empty
  states that offer "start a 1:1" rather than hiding Team; confirmed fine by the "teams later" call.
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
- **Phase 1 is large** — the security floor may split into its own sub-plan when we reach it (008 already
  has its own overview). Kept as a single row here so the readiness picture stays whole.
- Broad alpha (many companies) — start with 2–3 friendly managers; widen later.
- Full admin-SPA TypeScript sweep — repo-tidy Phase 4 only *pilots* it; the full conversion is its own plan.
- Anything a manager doesn't touch and a newcomer doesn't read — out of scope for "ready to share".
