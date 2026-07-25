# Phase 4 — Sweep and truth (parked until Gate 1)

**Part of:** [plan.md](plan.md) · **Status:** ⬜ (parked: builds only after the corridor metric is in)

## Goal
Every dependent surface agrees with the new first run, and the record tells the truth.

## Changes
- Dependency sweep (the dependency-check ritual): both apps, the test-engine page, guest flow, invite/member landing — anywhere the first-run rule or Home state is assumed.
- Alignment with demo-member P2: "Remove example" and the rail gate both use the Phase 1 helper; removing the example must not re-lock the rail.
- `docs/sero-changelog.html` + `docs/sero-how-it-works.html` refreshed (customer-facing entry for the new first run).
- Proof pack: screenshots of the real rendered screens (fresh account, desktop + mobile) attached to this folder.

## Not in this phase
- New features of any kind; this phase only reconciles and records.

## Done when
- [ ] The register → first brief → unfolded app walk works on the live build, screenshotted.
- [ ] No surface still claims the old first run (guide, changelog, in-app copy).
- [ ] Product owner has tested the scenario below and said go.

## Test scenarios — for the product owner
1. **The full stranger walk** — `live > incognito > sero.team > register a fresh test account`: welcome screen → watch 10 seconds of the video → open the sample → run a real prep → app unfolds. The whole journey makes sense with no explanation from us.
2. **The record agrees** — open the changelog page: the new first run is described in customer words.
