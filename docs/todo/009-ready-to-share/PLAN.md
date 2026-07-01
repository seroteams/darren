# Phase 009 — Getting ready to share (Alpha readiness)

**Goal:** Real invited managers can safely run real 1:1s on their real teams via a hosted Sero —
and the codebase reads clean to a newcomer.
**Driver:** Carl
**Created:** 2026-07-01
**Overview:** [../../archives/prototype-to-production/✓009-ready-to-share.md](../../archives/prototype-to-production/✓009-ready-to-share.md)

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
| 3 | Privacy note + first run | Plain privacy/consent note · onboarding empty states · a clear "run your first 1:1" path | A | 🟢 done (verified live) |
| 4 | Clear the QA pile | The built-but-unQA'd features each signed off or cut, so nothing half-built shows | A | 🟢 |
| 5 | Feedback + one-pager | A simple in-app feedback route · a "what Sero is / what to expect" page | A | 🟢 done (verified live) |
| 6 | Finish repo-tidy | repo-tidy phases 3–4 + parked naming pass & hermetic tests | B | 🔴 |
| 7 | Tidy docs + newcomer README | Finish tracker-consolidation 2–4 · conventions/dead-code sweep · a README a newcomer follows | B | 🔴 |
| 8 | Continuity loop | Meeting #2 reviews meeting #1's actions & commitments | C | ⏸ deferred (Carl, 2026-07-01) |

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
**Phases 1 · 3 · 4 · 5 ✅ done (3 & 5 verified end-to-end 2026-07-01). Phase 2 ⏸ parked (not hosting yet).
Phase 8 (continuity / "remembering") ⏸ deferred by Carl (2026-07-01) — "we can do the remembering and
teams later". Phases 6 (repo-tidy 3–4) & 7 (docs/README) still open — awaiting Carl's word on whether to
continue the batch.** Original Phase-1 sign-off detail below.

<details><summary>Phase 1 sign-off (2026-07-01)</summary>

Product owner walked all 6 QA
scenarios (cross-company wall, role limits, key-search zero-hits, DB clean, no-login wall) and gave the
go; committed `e68c4c8c`. Human-expert sign-off remains waived/deferred (see Decisions). Phase 2 (hosted +
spend-capped) is parked (Carl: not hosting yet).
</details>

<details><summary>Phase 1 history</summary>

Plan approved by Carl; Phase 1 executes the existing
[008 security overview](../../archives/prototype-to-production/✓008-security/00-phase-overview.md) — the hard
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
- **2026-07-01 — Phase 8 (continuity / "remembering") + real Team content deferred.** Carl: "finish 3 and
  5 — we can do the remembering and teams later." So Phase 8 is parked, and the member **Team** page stays
  the intentional empty state (real team content = member-nav Phase 2, later). Phases 3 & 5 were verified
  end-to-end and closed. Phases 6 (repo-tidy 3–4) & 7 (docs/README) remain open — not yet green-lit to continue.
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
- **Phases 1 and 8 are large** — the security floor and the continuity loop may each split into their own
  sub-plan when we reach them (008 already has its own overview; continuity needs person-profile linking).
  Kept as single rows here so the readiness picture stays whole.
- Broad alpha (many companies) — start with 2–3 friendly managers; widen later.
- Full admin-SPA TypeScript sweep — repo-tidy Phase 4 only *pilots* it; the full conversion is its own plan.
- Anything a manager doesn't touch and a newcomer doesn't read — out of scope for "ready to share".
