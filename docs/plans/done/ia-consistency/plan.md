# App-wide navigation / IA consistency

**Goal:** Every drill-down in both apps reads the same way — one breadcrumb trail, a heading that names what you're looking at, and "1:1" (never "meeting"). The pattern we shipped in the admin user drilldown becomes the house standard.
**Driver:** Carl
**Created:** 2026-07-21
**Mockup:** [before/after — admin drilldown](https://claude.ai/code/artifact/7ace4766-ce81-46d1-ae2c-0373b9d98a6b) — approved 2026-07-21. It demonstrates the exact pattern this standard codifies; the member screens apply it identically. (A member-screen preview can be added at Phase 2 setup if wanted.)

## Done means
- A person's 1:1 recap is headed by their name + the meeting, not a generic "Past 1:1".
- Detail screens carry a breadcrumb trail (Team › Priya, Your 1:1s › Priya) instead of one-off "Back" buttons.
- No user-visible screen calls a 1:1 a "meeting" or "session".
- The rules are written into DESIGN.md, so new screens follow them by default.

## Resolved before we start
- **Reuse, don't build.** The pattern already exists and is tested: `admin/src/ui/breadcrumb.ts` + `admin/src/ui/recap-header.ts`. Every phase wires these in — no new components.
- **`run-detail.ts` is shared.** It lives in `admin/src/stages/` but the member app loads it too (`frontend/src/main.js`). Fixing it once fixes the member recap AND the superadmin one.
- **Member screens are NOT superadmin-gated** — so Phases 2–5 are screenshot-verifiable in the real member app (unlike the admin drilldown, which needs Carl's login).
- **One open decision (Phase 6):** 7 superadmin pages use the circled "Back" control Carl chose on 2026-07-15. Converting them to breadcrumbs reverses that call — his decision, taken when we reach it.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Write the standard | The 3 rules added to DESIGN.md (breadcrumb, name-the-object, "1:1"-not-"meeting") | ✅ |
| 2 | Member 1:1 recap | `run-detail.ts` names the person + breadcrumb; fixes a member→manager-page nav bug | ✅ |
| 3 | Person detail | `person-detail.ts`: "Back to Team" → `Team › {name}` breadcrumb; "meeting" → "1:1" | ✅ |
| 4 | Guided dead-ends | Monthly Check-in record/runner get a breadcrumb origin (no more nav dead-end) | ✅ |
| 5 | Label sweep | "meeting" → "1:1" across the remaining member copy; last comma joiner → middot | ✅ |
| 6 | Admin back-buttons (decision) | Carl chose KEEP — circled "Back" stays on the 7 superadmin pages; no change | ✅ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 ✅ (green-lit 2026-07-21)** — the three IA rules are in DESIGN.md.
**Phase 2 ✅ (green-lit 2026-07-21)** — `run-detail.ts` now leads with the shared `recapHeader` (breadcrumb `Your 1:1s › {meeting}` + person-named heading), identity moved out of the Overview tab, and the back is role-aware (manager→RUNS, member→MEMBER_HOME). Carl walked it. Committed `cbdb71b4`. Baseline was `npm test` 167/167 (frontend render change — no engine `gate` needed).
**Phases 3–5 ✅ built + committed 2026-07-21** (Carl's "continue until done"): P3 person-detail breadcrumb + "1:1s"; P4 Monthly Check-in runner + record get the `Team › {name} › Monthly Check-in` trail (no more dead-ends); P5 swept every user-visible "meeting"→"1:1" + the last comma joiner→middot. Verified by `npm test` 167/167 + typecheck — **not individually screen-walked** (SPA won't render in the automated pane + dev-login has no member data); Carl can walk any of them, nothing's pushed. Commits `c320f9dd` (P3), `b2d5e337` (P4), `774f2414` (P5).
**✅ COMPLETE 2026-07-21.** All 6 phases resolved. Phase 6 = Carl chose KEEP (circled "Back" stays; no change). The standard is in DESIGN.md and applied across both apps' recap/detail surfaces. Phases 3–5 were built + test-verified (167/167) + committed but **not individually screen-walked** (SPA won't render in the automated pane); nothing pushed, so any real-screen nit is a trivial follow-up. Moved to `docs/plans/done/`.
**Board:** https://claude.ai/code/artifact/f6bced93-814a-460c-b5f5-590491d960cc

## Parked
- Centralising `pulse-drilldowns.css` into `design.css` (it's imported per-stage today, which blocks node-testing those stages). Nice tidy, not needed for this work.
- Stale code comments still saying "Role, Seniority" in `run-detail.ts:38` — fold into whichever phase touches the file.
