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
| 2 | Label + remove | "Example" badge on Home card, Team card and person detail; one-click "Remove example" with confirm | 🔨 Built 2026-07-28, awaiting Carl |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
Phase 2 🔨 BUILT 2026-07-28: the Example chip is on the Team card and the person-detail
header (one shared `exampleChip()`), and "Remove example" clears the person, their example
1:1 and its artifacts through the roster's existing hard delete. Proven on a real fresh
signup: chip present, cancel changes nothing, confirm leaves people/runs/recent all at
zero and Home back on its first-run welcome. 200/200, typecheck, three linters. **Not
walked by Carl and not screenshotted.** Two pieces are NOT built because they sit inside
lane `f4b03826`: the "See all past 1:1s" label (`admin/src/stages/runs.ts` + `isDemo` on
`toMemberRow`) and the Team ⋯ menu shortcut. See [phase-2.md](phase-2.md).

Phase 1 ✅ GREEN-LIT by Carl 2026-07-22 (commit 543a8cba) after the fresh-signup walk: register → Home shows the Sofia example 1:1, recap + Team render, admin metrics/returns exclude it, account delete clears it. Proof: npm test 169/169 (baseline 168/168), typecheck + both lints clean, live local verification in chat. Next: Phase 2 (Example badge + one-click remove) — not started, waits for a fresh session/day. Committee log: `logs/committee/2026-07-22-demo-member-on-signup.html`.

## Must agree with (added by the onboarding-firstrun lane, 2026-07-26)
- **One rule for "has this manager run a real 1:1?"**: `hasRealRuns()` in `admin/src/stages/start-rows.ts`. Home, the prep wizard and the left rail all call it. **P2's "Remove example" must not compute its own version** — two copies of this rule is exactly what caused the live bug that onboarding P1 fixed (the wizard's beginner help had been invisible to every new signup since 22 July).
- Removing the example leaves the account with zero runs, so the brief-first welcome stays on Home and the rail stays quiet. That is correct. The welcome's sample-brief card already drops its "See the whole example 1:1" link when there is no example run to open (`firstVisitHtml({ exampleRunId })`), so nothing dead-ends. Worth a walk-through when P2 is built.

## Parked
- Auto-hide the example once the manager adds their first real member (committee raised; decide after watching real usage).
- Backfill a demo member for EXISTING empty accounts (this plan covers new registrations only).
- Guided tour / walkthrough overlay on top of the demo (Rasmus seat: the artefact is the pitch — no tour for now).
- Instrumentation: count how many managers open the demo run (Seibel seat; ties into the wider activation-metrics question).
