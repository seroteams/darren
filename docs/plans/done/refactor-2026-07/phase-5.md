# Phase 5 — screen scaffold helper + state typing

## ✅ GREEN-LIT 2026-07-25

Carl approved on the scaffold render-proof screenshot (183/183, all checks). Commits f38f9c19 + d7a53bbd. Built by session 17d7a976.

Goal: one standard loading state and one standard "couldn't load" card instead of per-screen hand-rolls; kill the drifted hand-written state.d.ts by making state.js real TypeScript.

## What landed

**Part 1 — state.ts (commit f38f9c19).** state.js + the twice-drifted state.d.ts became ONE typed state.ts; StageName now derives from the STAGES object so a new stage can never be missing from the type. 67 imports across 64 files repointed by a printed scripted transform.

**Part 2 — the scaffold.** New [screen-scaffold.ts](../../../admin/src/ui/screen-scaffold.ts): `loadingHtml` (the standard ghost cards, via a new string door on skeleton.js — same markup as createSkeleton), `errorCardHtml` (card + eyebrow + dim copy + ghost retry; each screen passes its own words), `wireRetry`. Adopted:

- **Customer app — every loading state is now the standard ghost cards** (was grey "Loading…" sentences): team, members, person-detail, member-home (both hosts), guided check-in.
- **Admin** — the five remaining "Loading…" sentences (error log, feedback inbox ×2, registered list, runs drilldown, member runs, run-detail) → ghost cards; six hand-rolled error cards → `errorCardHtml` with their exact copy (incl. runs.ts's email-carl line).

## Recorded remainder (safe, mechanical)

Six admin screens (gate1, ratings, guest-runs, pulse, user-detail, admin-runs' list view) already show standard skeletons but still hand-roll their error-card markup — identical to `errorCardHtml()`'s output bar a wrapper class. Swap them opportunistically or with P7.

**Small standardisation note:** converted error cards now share one gap class (space-y-3); the admin variants used l-stack--2 — a few px difference, visible only on a failed load.

## Verification (all free)

- `npm run typecheck` + `:admin` + `:customer` — green (the new net actively caught a return-type regression in skeleton.js mid-build; fixed before it shipped).
- `npm test` — **183/183** (runs.test.ts's pin updated: it asserted the old "Loading your 1:1s" sentence; now asserts the standard ghost cards).
- `lint:copy` + `lint:tokens` — green.
- **Screenshot** [proof/scaffold-render-proof.png](proof/scaffold-render-proof.png): real `loadingHtml` + `errorCardHtml` output under the real design CSS (render proof; the screens re-render this same markup).

## QA — what Carl checks

1. Look at [proof/scaffold-render-proof.png](proof/scaffold-render-proof.png): loading = the familiar ghost cards, failure = the standard card.
2. Optional 60-second walk: `local > customer app (member login) > Home` — while it loads you should now see ghost cards, never a grey "Loading…" sentence.
3. ✅ Pass: looks right. ❌ Fail: anything off — say which screen.
