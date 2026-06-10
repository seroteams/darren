# Phase 1 — Grouping engine + profile files

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Run one script and get a truthful `data/people/<slug>/profile.md` for every person who has finished runs. No API, no UI, no automatic triggers — just the engine and the files.

## Changes
- **New `src/person-profile.js`** (CommonJS, mirrors `src/run-history.js` style):
  - `slugify(name)` — lowercase, non-alphanumerics collapsed to `-`; empty result → run skipped.
  - `collectPersonRuns()` — reuses `walkRuns()` from run-history; keeps only runs with a saved briefing; groups by slug. Per-run record: id, date (briefing.completedAt → state.completedAt → lastSeenAt), ctx, mode (`state.mode || "manual"`), review verdict, axis scores + read-status, summary bullets, next actions, watch-fors, engagement level. Briefing + ctx + review.json only — never transcripts.
  - `listPeople()` — slug, name, run count, last run, profile-built timestamp, stale flag.
  - `renderProfileMarkdown(person, synthesis|null)` — pure and deterministic: same input → identical bytes.
  - `buildProfile(slug)` — fresh full walk every time; atomic tmp+rename write (same pattern as `handlers/review.js`) of `profile.md` + `profile.json` sidecar; in-flight map per slug; slug guard `/^[a-z0-9-]+$/`.
- **New `scripts/rebuild-profiles.js`** — `node scripts/rebuild-profiles.js` (everyone) or `node scripts/rebuild-profiles.js maya` (one person).
- **New `scripts/test-person-profile.js`** — offline tests: slugify, grouping, render determinism, "n.r." for not-read axes, fewer-than-2-runs stub gate.
- **Edit `src/run-history.js`** — export the existing private `reviewSummaryOf`.
- **Edit `scripts/run-tests.js`** — register the new test. **Edit `.gitignore`** — add `data/people/`.

### profile.md sections (this phase's version)
Who · Runs (newest-first table: date, run id, meeting type, mode, review verdict, 4 axis scores with "n.r." = not read) · Axis trends (plain numbers, oldest → newest, plus "read in N of M runs") · How to help them (honest stub: "Not enough yet — this section is written from run evidence in a later phase.")

### profile.json sidecar
`{ version: 1, slug, name, builtAt, runIds, runCount, synthesized: false, synthesis: null }`

## Not in this phase
- API endpoints, auto-rebuild on run finish (Phase 2)
- Anything in the app UI (Phases 3–4)
- Model-written synthesis (Phase 5)

## Done when
- [ ] One script rebuilds all profiles from the ~43 runs already on disk
- [ ] Profiles are byte-identical on rebuild (derived, no drift)
- [ ] `node scripts/run-tests.js` green
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Maya's profile** — run `node scripts/rebuild-profiles.js maya`, then open `data/people/maya/profile.md`. You should see her ~11 runs listed with dates, meeting types, review verdicts, and axis numbers, plus a short "not enough yet" note where the help section will go. ❌ Not OK if any run is missing, any number looks invented, or the file is hard to read.
2. **Everyone** — run `node scripts/rebuild-profiles.js`. You should see a folder per person under `data/people/` (roughly 17), with "Maya" and "Maya Chen" as separate folders.
3. **Delete and regenerate** — delete the `data/people/maya/` folder, rerun the script. The file should come back exactly the same.
4. **Tests** — run `node scripts/run-tests.js`. Everything green.
