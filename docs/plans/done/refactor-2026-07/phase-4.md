# Phase 4 — customer bundle: variant lab out + frontend dead code

## ✅ GREEN-LIT 2026-07-25

Carl approved on the render-proof screenshot + build numbers (183/183, all checks). Committed as 747bd050. Built by session 17d7a976. Standing note: the admin-only lab switcher gets a 30-second poke next time Carl is in /prepare as admin.

Goal: stop shipping the internal /prepare layout lab (11 unused layouts + switcher) and dead code in the customer download. Nothing a customer sees changes.

## What landed

- **The layout lab is out of the customer download.** preparation-brief.ts keeps only the customer layout (H "Sheet") + shared helpers; new `preparation-lab.ts` + `preparation-lab.css` hold the 11 other layouts, the switcher and the stored-choice logic. preparation.ts dynamic-imports the lab only for internal admins, so Vite ships it as a separate async chunk customers never fetch. A failed lab load degrades to the customer default (the lab is tooling, never load-bearing).
- **Measured on the real build** (vite output + grep on dist):
  - /prepare stage chunk: **20.79 kB JS → 8.94 kB JS**; stage CSS 1,007 lines → 55 (0.96 kB built).
  - The lab chunk (13.34 kB JS + 15.30 kB CSS) loads only for internal admins, on demand.
  - `.stage-exit` (admin shell fade) moved to a new admin-only `stage-exit.css`: grep confirms it is now in the admin build only, absent from every customer stylesheet.
- **boot-splash.js is one copy**: the frontend entry re-imports admin's (it was a byte-identical twin that could drift).
- **10 dead exports un-exported** (stripBase, groupIssues, statusCell, METER_MAX, personKeyOf, runKeyOf, failedCountFromMarks, DEFAULT_GUIDED_ARC, requestChip) and the never-used `DEMO_SESSION_ID` deleted (its Phase-2 seed idea was superseded by the static screen-gallery).
- Tests updated: the variant tests import the lab module; a new test pins `renderDefaultBrief` byte-identical to `renderBrief("H")`; the 14px/token CSS guard now covers both stylesheets. The per-app test tsconfigs gained the ambient CSS declaration they were missing.

## Deviations from the approved plan

- **admin/src/stages/runs.ts member branch NOT deleted.** The survey called it unreachable — true only for the customer app. The ADMIN app's member home still routes members to it (main.js `memberHome = STAGES.RUNS`), so deleting it would have broken a live path. Parked with the router-divergence question (plan.md parked table).
- 11 dead exports became 10: `SLOT_LABELS` is now legitimately imported by the lab module.

## Verification (all free)

- `npm test` — **183/183** (includes the new renderDefaultBrief identity pin + both-CSS floor guard).
- All typechecks green; `lint:copy` + `lint:tokens` green.
- Real production build of both apps; sizes above from its output; stage-exit placement grep-proven on the built assets.
- **Screenshot** [proof/h-render-proof.png](proof/h-render-proof.png): the real `renderDefaultBrief` output under the split customer stylesheet — the Sheet renders complete (dot-meter, all seven slots, hairline rules). Labelled a render proof: markup identity with the pre-split renderer is pinned by test; the live screen only re-renders that same markup.
- **Not click-walked:** the admin-only lab switcher's rewired open/close/select handlers (typecheck + variant tests cover the renders; the wiring itself is internal tooling). One 30-second lab poke next time you're in /prepare as admin confirms it.

## QA — what Carl checks

1. Look at [proof/h-render-proof.png](proof/h-render-proof.png) — the prep brief sheet should look exactly as it always has.
2. ✅ Pass: it does, and the numbers above read right. ❌ Fail: anything looks off — say what.
