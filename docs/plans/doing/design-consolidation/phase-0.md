# Phase 0: Foundations

## ✅ GREEN-LIT 2026-07-22 — Carl: "mockup approved". Rename parked pending his word (commit 3f482ad + this close).

**Part of:** [plan.md](plan.md) · **Status:** ✅

## Goal

Everything the redesign leans on exists before any screen changes: the before-screenshots are frozen, the audit is a tick-list, the target look is approved, the shared kit is built, and the rename question is settled.

## Changes

- **Rename (needs Carl's confirm first):** GitHub repo darren → SeroEngine + `git remote set-url`; fix `docs/reference/RENDER_SETUP.md` repo mentions and `.claude/launch.json` path; verify Render still deploys. Never touch "Darren Method" or Darren-the-person references (test fixtures depend on them).
- **Baseline:** run `node scripts/gallery-export.mjs` against the current app (verified 2026-07-22: 42 captured / 0 failed). The gallery HTML is gitignored by design, so the durable baseline is the commit itself: re-export at the pre-consolidation commit reproduces it exactly. Carl's local copy from screen-gallery Phase 2 is the visual before-copy.
- **Acceptance tracker:** [acceptance.md](acceptance.md) written from the audit.
- **Mockup (gate for Phase 1):** one artifact showing the target look: a manager list page, a flow step with stepper + wizard footer, and the pinned labelled sidebar, all in real Sero tokens.
- **Shared kit** (no screen migrations yet): list toolbar component (search, count, filter pills, sortable headers) on the `.um-table` skin; the page-header contract documented + helper; breadcrumb rollout helper.
- Committee session saved to `logs/committee/2026-07-22-design-consolidation.html` (local only).

## Not in this phase

Any visible screen change. Any CSS deletion. The kit ships dormant until Phase 1 uses it.

## Done when

- [ ] Carl confirmed the rename name + timing (or parked it)
- [ ] Baseline export committed and openable from disk
- [ ] acceptance.md exists and maps every audit finding to a phase
- [ ] Mockup approved by Carl (link recorded in plan.md)
- [ ] Kit components exist with unit tests; free checks green

## Test scenarios — for the product owner

1. **The mockup** — open the artifact link. It should look like Sero (same colours and type), but with a labelled sidebar, a proper list with search, and a flow step with a visible progress bar and Back/Continue in the corners. ❌ Not OK if it looks like a different product.
2. **The before-baseline** — open `docs/screen-gallery/index.html` from disk. You should see dated snapshots of ~44 screens as they are today. ❌ Not OK if pages are blank or the date is old.
3. **The tick-list** — open `acceptance.md`. Every complaint from the audit report should appear as a box with a phase number. ❌ Not OK if something you remember from the report is missing.
