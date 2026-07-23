# Demo member on signup

**Goal:** Every newly registered manager lands on a Home that already shows one example team member with a finished example 1:1 they can open, so they see what Sero produces before adding anyone real.
**Driver:** Carl
**Created:** 2026-07-22
**Mockup:** https://claude.ai/code/artifact/6c597415-766e-4ab7-9f1c-8c4827e4e75e — awaiting Carl's approval (published 2026-07-22)
**Board:** https://claude.ai/code/artifact/3b6a36b4-57de-40e7-baae-159893e51d99

## Done means
- Register a brand-new account → Home already shows one example 1:1 card; Team shows the example person.
- Clicking in opens a real-looking finished briefing (cloned from curated fixture data, zero OpenAI cost per signup).
- Everything demo is clearly labelled "Example" and disappears with one click (confirm dialog).
- Demo rows are flagged in the database and excluded from admin metrics, run lists, and validation counts.
- Existing accounts are untouched (seeding happens only at registration).

## Resolved before we start
- **Seam:** seed right after `createOrgWithOwner` in `backend/api/services/auth/auth.service.ts` (~line 98). The repo transaction (`auth.repo.ts:102-124`) creates org + manager; the seeding step follows it.
- **Data shape:** one `people` row + one finished `sessions` row (briefing inside `state`, `personId` + `completedAt` set) + its `run_artifacts`. Blueprint: `scripts/seed-runs.ts` (clone via `createSession` → `upsertSession(hydrateSession(...))` → `cloneArtifacts`), fixtures in `scripts/gallery/fixtures/` (e.g. `run-full.json`) so seeding never depends on on-disk run ids.
- **Why it shows on Home:** manager Home (START, `admin/src/stages/start-core.js`) lists recent runs, so the demo run appears there; the person appears on Team (`frontend/src/stages/team.ts`). Person detail (`frontend/src/stages/person-detail.ts`) works off the same rows.
- **Flag:** new `is_demo` boolean (default false) on `people` + `sessions`; every admin metric / run list / validation count filters it out.
- **Gotcha:** never seed under the synthetic `dev-org` (non-uuid ids short-circuit repos) — only real registration orgs.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Seed on signup | New registrations get the flagged demo person + finished example run; admin metrics exclude demo rows | ✅ |
| 2 | Label + remove | "Example" badge on Home card, Team card and person detail; one-click "Remove example" with confirm | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
Phase 1 ✅ GREEN-LIT by Carl 2026-07-22 (commit 543a8cba) after the fresh-signup walk: register → Home shows the Sofia example 1:1, recap + Team render, admin metrics/returns exclude it, account delete clears it. Proof: npm test 169/169 (baseline 168/168), typecheck + both lints clean, live local verification in chat. Next: Phase 2 (Example badge + one-click remove) — not started, waits for a fresh session/day. Committee log: `logs/committee/2026-07-22-demo-member-on-signup.html`.

## Parked
- Auto-hide the example once the manager adds their first real member (committee raised; decide after watching real usage).
- Backfill a demo member for EXISTING empty accounts (this plan covers new registrations only).
- Guided tour / walkthrough overlay on top of the demo (Rasmus seat: the artefact is the pitch — no tour for now).
- Instrumentation: count how many managers open the demo run (Seibel seat; ties into the wider activation-metrics question).
