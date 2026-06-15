# Next-stage build — harden the core, fill the gaps

**Goal:** A manager can start a 1:1, lose their browser mid-way, come back, finish, and trust every word of the output — with better intake on the way in and a clear timeline on the way out.
**Driver:** Carl
**Created:** 2026-06-12
**Status:** HARDENING CORE DONE 2026-06-16. Phases 1–3 (contracts, persistence/resume, deterministic fallback) ✅ — the engine can no longer silently fail and partial runs resume. Phases 4–8 are feature/UX improvement passes; they are the **roadmap** forward-work (see [docs/ROADMAP.md](../../ROADMAP.md) M0→M1), to be done one at a time when that build starts. No loose demo-fix/hardening todo remains.

This is hardening + gap-fill of the existing app, **not** a rebuild. Sero already has prep, a live runner, a briefing stage, per-stage schemas, question fallbacks, and trust gates. Phase files get written (Darren Method) when the build actually starts.

## Done means
- A partial web run survives a server restart or closed tab and can be resumed.
- The engine cannot silently fail: every stage either validates, falls back deterministically with a logged flag, or stops with a stated reason.
- Manager intake captures structured issues, not just one free-text box.
- Prep, run, and summary screens support the flow — no new dashboards, settings, or analytics.

## Phases

### 1 — Contracts ✅ (2026-06-16)
**Scope:** One boundaries doc (`docs/contracts.md`) that writes down the existing per-stage input/output schemas, enums, and data boundaries; tighten anything loose found while writing. Document — don't rebuild.
**Builds on:** `RESPONSE_SCHEMA` in `src/generate.js` (focus points), `src/reviewer.js` (briefing), `src/role-profile.js` (role profile), `src/lexicon/schema.js`; axes + ranges in `src/axes.js`; question YAML shape in `src/questions.js`; review dimensions in `src/run-history.js`.
**Done when:** every stage's contract is on one page; any mismatch between doc and code is fixed code-side or flagged.
**Landed:** [docs/contracts.md](../../contracts.md) — all 7 stages documented (focus → role profile → lexicon → questions → axes → briefing → run history), each with fields/types/enums and its validate/clamp/fallback behaviour, plus the cross-cutting trust boundaries. No code mismatch found; the one known gap (no deterministic briefing fallback) is captured as Phase 3 below. Offline doc deliverable — `npm test` 28/28 unaffected.

### 2 — Persistence / session continuity ✅ (2026-06-16 — see [phase-2.md](phase-2.md))
**Scope:** The genuinely new build. Save web session state stage-by-stage as it happens (file-based under `logs/`, same shape the CLI already writes — no database yet). A partial run can be resumed after restart/tab-close. Access rules: session files are single-user local; private manager notes live only in the session record, never in any shared output (rule 7 on the board).
**Builds on:** `src/session.js` (stage logging), `frontend/server/sessions.js` (in-memory store — gains a write-through), `frontend/server/session-persistence.js` (already reads/writes logs/), `src/run-history.js` (already infers stage for resume).
**Done when:** kill the server mid-interview, restart, reopen — the run continues from the last answered question.

### 3 — Deterministic fallback ✅ (2026-06-16 — see [phase-3.md](phase-3.md))
**Scope:** Fill the one hole: a briefing-generation failure path. If the evaluation stage fails or returns invalid JSON after retry, produce a deterministic minimal briefing (transcript-derived facts only: what was asked, what was said, axes marked "not scored — generation failed") with a visible flag. Never mask, never invent.
**Builds on:** existing fallbacks in `src/question-validator.js` (FALLBACK_STEM), `src/role-profile.js` (FALLBACK_BLOCK), `src/closer.js`; schema validation already in `src/reviewer.js`.
**Done when:** force an evaluation failure → the manager still gets an honest minimal summary, flagged as such; `SCHEMA_INVALID` path covered by a test.

---

## Roadmap feature work (phases 4–8)

The hardening core above is done. The phases below are feature/UX improvement
passes — they are the roadmap forward-work (M0→M1), each its own one-phase build
with a live walkthrough when started. They are intentionally **not** open
demo-fix todos.

### 4 — Issue pills + observed shift ✅ (2026-06-16)
**Scope:** Structured manager intake on top of the free-text notes: tappable issue pills (e.g. workload, motivation, friction, delivery, growth) plus an "observed shift" field (what changed, since when). Feeds focus-point generation the same way notes do today. Free text stays.
**Builds on:** `frontend/client/src/stages/intake.js` (5-step wizard), `frontend/server/handlers/notes.js`, notes already flow into every stage as context.
**Done when:** picking pills + a shift visibly shapes the suggested focus points; nothing selected behaves exactly like today.

### 5 — Prep engine quality ✅ (2026-06-16)
**Scope:** Improvement pass on the prep stage: role-aware and meeting-aware prep that uses the role profile and meeting type harder (no new data sources). Tune `prompts/` for the prep stage; respect the focus arc gate.
**Builds on:** `src/generate.js`, role profile block injection (role-profiles track), `src/one-on-one-types/` tone registers.
**Done when:** the prep brief for the same person reads distinctly different across meeting types, and gate stays green.

### 6 — Prep timeline UI ✅ (2026-06-16)
**Scope:** One screen improvement: show the manager what to do before/during the meeting as a simple ordered timeline (from existing prep output). No settings, no dashboard.
**Builds on:** `frontend/client/src/stages/preparation.js`.
**Done when:** a manager can glance at prep and know their first move.

### 7 — Live 1:1 runner polish ✅ (2026-06-16)
**Scope:** Ask, capture, adapt — improvement pass on the existing runner: keep the back-navigation fix (jun11 Phase 4) company, smooth answer capture, planner adaptation visible but quiet.
**Builds on:** `frontend/client/src/stages/questioning.js`, `src/queue-manager.js`, planner flow.
**Done when:** a full live run feels continuous: no dead ends, no unexplained question jumps.

### 8 — Summary + follow-up
**Scope:** Improvement pass on the briefing/debrief: shared actions (employee-facing) clearly separated from private reflection (manager-only `brutal_truth_manager`), follow-up items carried into the next session's prep via session continuity (phase 2).
**Builds on:** `frontend/client/src/stages/briefing.js`, `run-debrief.js`, `src/reviewer.js`.
**Done when:** after a run, the manager can copy a shareable summary and privately see what to watch — and the next run's prep mentions the open follow-ups.

## Out of scope (board-level decisions — don't re-open here)
Person-profiles/persona pages, dashboards, benchmarking, trends, relationship maps, coaching library. Historical data = session continuity only.

## Verification per phase
Free checks first (`npm test`, fixtures-only replay). Paid checks (`gate --only <case>` ≈ $0.35, full gate ≈ $3) only with Carl's explicit per-run go-ahead, per the CLAUDE.md cost rule.
