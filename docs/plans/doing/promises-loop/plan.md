# Promises Loop — the real build

> **PARKED 2026-07-18 (Carl: "finish all, moving on").** P1-P2 green-lit + shipping (promises lock in at wrap-up, card zero checks them next time); P3 (Q1 feed, review feed, person-page surfacing) parked. Un-park by saying so in any chat.

**Goal:** Every 1:1 ends by locking in what you both agreed, and the next 1:1 with that person opens by closing those promises off — one tap each — with the first question picking up whatever slipped.
**Driver:** Carl
**Created:** 2026-07-12

## Done means
- Finishing a 1:1 offers "Agree next actions" as the primary way out; the manager confirms the promises (with who-owns-what) and they're stored.
- Starting the next 1:1 with the same person shows card zero — "Before question 1" — with last time's promises, manager's own first, and yes/partly/no/changed taps.
- The taps are saved (the orphaned `outcomeCheck` finally has its consumer) and question 1 can reference an unfinished promise.
- The end-of-session review reflects the check-in: the briefing acknowledges follow-through, and unfinished promises roll forward into the suggested next actions.
- The person page's "Since last time" shows promises with their outcomes — the loop is visible after the fact.

## Resolved before we start
*(dug out of the code during the /test mock work — see the walkable mock at `/test` → "Promises loop in the runner")*

1. **Where promises live** — new `Session.promises[]`: `{ id, owner: "manager" | "report", action, when, outcome: null | "yes" | "partly" | "no" | "changed" }`. They belong to the session that made them; the NEXT session's check-in writes the `outcome` back onto them. `Session.outcomeCheck` (contract-only since the no-inference ruling, `backend/shared/session.types.ts:148-152`) becomes the derived roll-up of those outcomes — the spec §6 field finally gets its consumer, no migration needed (jsonb state).
2. **Capture timing** — the reviewer produces `next_actions` only at synthesis (`backend/engine/reviewer.ts`), i.e. AFTER the last question. So the confirm step lives at the top of the briefing; question 9's primary CTA "Agree next actions →" is the doorway into it. The ghost path ("Finish") skips confirming — no promises stored, loop simply doesn't arm. Honest: the engine suggests, the manager confirms — only manager-confirmed promises are stored facts (no-inference ruling).
3. **Read path for "last time"** — same-manager + same-person fence already exists: `focusHistoryFor()` in `backend/engine/focus-history.ts` / `pgFocusHistory` in `backend/db/runs-store.ts`. Reuse the pattern, read `state.promises` instead of focus history.
4. **Card zero placement** — per the design verdict (2026-07-12, Rogelberg-backed): beginning wins; manager's promises first; ~90 seconds one-tap. The runner precedent for a special card is the agenda closing check (`admin/src/stages/questioning.js:330-363`).
5. **Q1 feed cost** — plan-turn prompts lost their cache discount at ≥10k tokens (probe 2026-07-10). The check-in injection must stay tiny (a 2–4 line block), and only on turn 1.
6. **Scope fences** — admin runner only (members don't run 1:1s); guests excluded (no personId continuity); bi-weekly/feels-off focus-arc gates untouched (promises aren't competencies).

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Promise contract + wrap-up confirm | `promises[]` type + persistence; briefing opens on a confirm card (owners, edit, skip); Q9 primary CTA "Agree next actions →" | ✅ |
| 2 | Card zero — resurface + close-out | Prior promises fetched for same person; "Before question 1" card with yes/partly/no/changed taps; outcomes written back + roll-up to `outcomeCheck` | ✅ green-lit 2026-07-18 |
| 3 | Q1 feed, review feed + surfacing | Check-in injected into turn-1 planning AND the reviewer; unfinished promises roll forward into next_actions; person page shows outcomes | 🟡 SPLIT — surfacing half (person page + Recap show promises + outcome chips) ✅ green-lit 2026-07-18 (Carl walked the seeded Priya data); engine feed (turn-1 planner + reviewer roll-forward) still to build |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 ✅ GREEN-LIT 2026-07-12** (Carl: "i love it push green light" + "go" → agent-driven live walk on his say-so). Committed `47c0024b` (+ CSS pre-committed in `6aadec58`). Proof: 124/124 tests + typecheck clean; live end-to-end walk — Q9 fork seen, confirm card grounded in real notes, edits + owner flip, "Locked in ✓" (1 paid run, ~$0.35). One caveat on the dev lane: the PG mirror write fails for the synthetic dev identity (known non-uuid limit, pre-existing, not phase-1 code) — promises-in-PG proved by the roundtrip test; real accounts use the normal write path. Skip-path walked in unit tests only.
**Phase 2 ✅ GREEN-LIT 2026-07-18 (Carl: "signed off its nice").** Card zero is live end-to-end: a GET/POST pair
(`/sessions/:id/prior-promises` + `/promise-outcomes`) on the focus-history fence pattern, the
"Before question 1" card in the shared runner (both apps), taps written back onto the PRIOR run
(live in-memory copy first — without touching its lastSeenAt — else the store row) + `outcomeCheck`
roll-up, and `priorCheckin` stamped on the current session for phase 3's feed. Proven on the real
screen + read back from the DB (one paid walk ~$0.25); 156/156 tests, typecheck clean. Build detail
in [phase-2.md](phase-2.md). **Next: phase 3 (Q1 feed, review feed + surfacing) — Carl's call to start.**

## Parked
- **3×-rolled-over promise as a countable routing event** — engine nudge/routing territory; also validation-stage rule says no nudge features until Gate 1.
- **Member-side visibility** of promises (the report seeing what was agreed) — big trust/product call, own plan.
- **Freeform "add another promise" at capture** — v1 confirms/edits what the engine heard; adding brand-new items can come later if the confirm step feels thin.
- **Email/notification anything** — banned during validation (contaminates the return-unprompted metric).
- The `/test` mock stays in the Tests gallery as the design reference — it is not the build.
