# Focus freshness across repeat sessions

**Goal:** A manager's 3rd bi-weekly with the same person suggests fresh focus points instead of repeating the last list — unless their notes re-signal the same theme.
**Driver:** Carl
**Created:** 2026-07-11

## Done means
- Starting a prep for a person who already has finished runs, the focus-points prompt carries a "previously covered" block (visible in the run's Sent tab).
- A repeat bi-weekly with unchanged, empty-ish notes produces a visibly different focus list from last time.
- A repeat where the notes re-name the old theme (e.g. workload again) still surfaces that theme — freshness never overrides a real signal.
- Relational-arc gate untouched: no competency id reaches a bi-weekly / feels-off prompt, including via the history block.

## Resolved before we start
- **Person key = `personId`** (roster join, stamped on web sessions). Runs without a personId get no history — honest, no name-matching guesses.
- **Fence = same org + same manager (`userId`).** Another manager's prep angles for the same person never leak into this manager's prompt.
- **History = any prep where focus points were suggested, finished or not** (Carl picked A, 2026-07-11 — testing showed his real runs rarely reach a briefing, and the freshness goal is "don't re-suggest the same agenda"). The current session excludes itself so a regenerate never sees its own first attempt. ~~Originally: finished runs only.~~
- **History source:** last 3 qualifying runs' focus output — `01-focus-points/response.json` in the run dir (file store) and the artifact-row twin in `backend/db/runs-store.ts`. Both stores need the read (prod is Postgres).
- **Relational filter applies to history too:** when the new session is bi-weekly / feels-off, competency-category entries from past (evaluative) runs are dropped from the history block — same rule as `filterForArc` in role-profile.ts. The `FOCUS_ARC_LEAK` gate stays as backstop.
- **Prompt seam:** new `{{FOCUS_HISTORY_BLOCK}}` placeholder in `content/prompts/generate-focus-points.md`, filled in `buildMessages` (backend/engine/generate.ts). Empty history → block renders as "(first session with this person)" so the template never has a dangling placeholder.
- **Privacy:** past focus ids/labels are structured events already in the system — allowed evidence under the no-inference ruling (EVIDENCE_ANCHOR). No manager note text from past runs rides along, only ids + labels + when + meeting type.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | History into the prompt | Engine read (both stores) + `{{FOCUS_HISTORY_BLOCK}}` + freshness rules in the prompt, offline-proven | ✅ |
| 2 | Live proof | Same-person repeat runs show fresh lists; signal-re-raise still wins; example promoted if good | ✅ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**TRACK CLOSED 2026-07-12.** Both phases ✅. P1 green-lit after live Playwright proof (`ba3223d`). P2 green-lit by Carl ("b" = run the gate, then close): signal-beats-freshness proven with a nano call (workload re-raised → returned as `source: signal`), and the golden gate case `biweekly-priya` ran **PASS (1 ok / 0 regressed / 0 error)** — no FOCUS_ARC_LEAK, confirming the history block never leaks evaluative content into a relational arc. Total testing spend across the track ≈ $0.50. Folder → `docs/plans/done/focus-freshness/`.

## Parked
- UI hint on the focus picker ("covered last time" chip) — prompt-side only for now.
- Feeding served *question* themes (not just focus ids) into freshness — bigger payload, revisit after Phase 2 proves the small version.
- Widening the wellbeing/topic catalogue (3 wellbeing entries is thin) — separate content task.
- Name-based fallback for runs without a personId — decided against (guessy).
