# Phase 5 — Brand + chrome + retire static page

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Finish the sheet (brand + chrome demos), confirm full parity with the old static page, and retire it.

## Changes
- `admin/src/stages/design.js` — add sections: brandmark (the served SVGs in `admin/public/sero-flowbite/brand/`), navigation demo, side panel demo.
- Full parity pass: all 24 sections present and reachable from the rail; scrollspy covers every one.
- Remove any remaining reference to the static page; retire `admin/public/sero-flowbite/index.html` (delete once parity is confirmed and Carl agrees).
- Move the plan folder to `docs/plans/done/` once green-lit.

## Not in this phase
- Nothing — this closes the build.

## Done when
- [ ] All 24 sections present and reachable; scrollspy covers every one.
- [ ] Brand SVGs load; no CDN Tailwind/Flowbite requests in the network tab.
- [ ] Whole stage passes DESIGN.md law (nothing <14px, one blue action per group, 12px card / 4px control radii).
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Brand** — the logo master + colour tiles + on-background variants + do/don't, all loading real SVGs.
2. **Chrome** — a navigation demo and a side-panel demo that read like the real app chrome.
3. **Whole sheet** — scroll top to bottom: every section from the old page is here, in the app's own colours, nothing tiny, one blue action per group.
4. **Old page gone** — the rail no longer opens the old static page; the new stage is the only one.
