# Phase 3 — Rules (the guardrails view)

**Part of:** [PLAN.md](plan.md) · **Status:** ⬜

## Goal
A new **Rules** view on the questioning step showing the guardrails shaping this run — the
filters a founder never normally sees — in plain language.

## Two parts
**A. Static — what's active for this meeting type (free, from config):**
- Relational-arc gate (bi-weekly / "something feels off" hide competency questions).
- Repeat / eligibility filter (no re-asking, grounded questions only).
- Shallow-answer & clarity dampers, thread-follow, axis-coverage, the planner skip-shortcut.
- Derived from the arc config + `isRelationalArc(meetingType)` — no model call.

**B. Dynamic — what actually fired last turn:**
- The planner already produces this per turn: `assessment.note` ([SHALLOW]/[SKIP] markers),
  `unbooked_signal` (deltas held back), and `issues[]` (clamps/drops).
- `unbooked_signal` and the note are already on the transcript entry; **`issues[]` is not
  persisted yet** (console-only today). Small plumbing: add `issues?: string[]` to
  `TranscriptEntry` (`backend/shared/session.types.ts`) and write it with the turn in
  `queue-manager.ts` / the plan stream, then expose it through `GET /runs/:id/stages`.

**Frontend:** a new "Rules" tab/section in the panel, rendering A (from a small preview/config
read) + B (from the logged turn), each line in plain words.

## Not in this phase
- Extending Rules to non-questioning steps (parked).

## Done when
- [ ] `npm test` + `npm run typecheck` green.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Active rules** — in a **Bi-weekly check-in**, open **Run panel → Rules**. You should see a plain-language note that competency/performance questions are hidden for this meeting type. In a **Performance & feedback**, that line is absent.
2. **What fired** — answer a question very briefly ("dunno"). After the turn, Rules should note the answer looked shallow / scoring was damped (or the planner skipped) — matching what actually happened.
3. **Honest, not noise** — when nothing special fired, Rules says so plainly rather than inventing entries.
4. **No cost** — opening Rules spends nothing (cost log flat).
