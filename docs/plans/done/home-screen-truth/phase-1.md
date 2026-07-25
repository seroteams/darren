# Phase 1 — Rows that tell the truth

**Part of:** [plan.md](plan.md) · **Status:** ✅ done

## ✅ GREEN-LIT 2026-07-25 — Carl walked Home, confirmed the recovery card no longer multiplies

Carl's first walk surfaced the multi-card defect (three cards, three blue buttons, no rows left). Fixed in the same phase, retested, signed off.

## Built (2026-07-25)

**Files**
- `backend/api/services/runs/runs.service.ts` — `recent` mapper now carries `ctx: { name, meetingType }`. Nothing else from ctx: no `role`, no `seniority`, no `dir`. No repo change was needed; both repos already returned `ctx`.
- `admin/src/stages/start-rows.ts` (new) — `rowModel()` + `orderForHome()`, the tested row vocabulary. The name never falls back to the headline blob.
- `admin/src/ui/time.ts` — added `whenLabel()`; deleted the two hand-rolled copies in `start-core.js` and `runs.ts`.
- `admin/src/stages/start-core.js` — renders from `rowModel`, fetches 5 and shows the top 3 via `orderForHome`, "Half done" chip in `.run-list__side`, `reviewChip` gated behind `isInternalAdmin`, and a real `errorCardHtml` + `wireRetry` branch on a failed fetch.
- `admin/src/styles/design/start-stage.css` — `.run-list__status` chip, tokens only.
- `admin/src/stages/runs.ts` — imports the shared `whenLabel`.
- Tests: `start-rows.test.ts` (new, 8 cases), `runs.service.test.ts` (rewritten + 2 new leak guards), `time.test.ts` (3 new), `start-core.test.ts` (4 new source guards, 1 stale regex replaced).

**Offline proof**
- `npm test` 186/186 (baseline before the work was 184/185; the one failure was another chat's in-flight `rehydrateById` duplicate in `frontend/src/main.js`, since fixed by them, and never mine).
- `npm run typecheck` clean · `npm run lint:tokens` PASS · `npm run lint:copy` PASS.
- No paid runs. Nothing in this phase touches OpenAI.

**Live proof** on the running customer app (`localhost:3173`, real logged-in manager, real Postgres rows):
- `/api/v1/runs/recent` now returns `ctx: {"name":"Sofia","meetingType":"Bi-weekly check-in"}` and no `role` / `seniority` / `dir`.
- Home renders `Priya / Bi-weekly check-in · just now / [Half done]` above `Sofia / Bi-weekly check-in · 3d ago` with no chip. The unfinished prep is hoisted above the more-recent finished one.
- Computed styles: chip `14px`, `rgb(27,93,145)` on `rgb(233,243,251)` (the `accent-dark` / `accent-soft` token pair); name `font-weight 600`; second line `14px`.
- No `@` anywhere inside `.run-list` (the only email on the page is the profile badge naming the signed-in account).
- Failed `/runs/recent` renders "Couldn't load your 1:1s" with Try again and **no** first-run card; clicking Try again restored both rows.

## Fixed after Carl's first walk (2026-07-25)

Carl clicked three old preps; every one failed to resume and each healed in place, leaving **three identical recovery cards, three blue buttons, and no rows left**.

- **Why they failed (not a regression):** `getSession` (`backend/api/sessions.ts:74-82`) serves the live in-memory session map, swept on a **7-day TTL** (`SESSION_TTL_MS`, line 18). Carl's preps were 3 and 10 days old, so the sessions were gone. The run *list* comes from Postgres and is durable forever; the *resumable session* is not. The screen was telling the truth. `git diff` confirms Phase 1 changed no line of `resume`, `openRun` or `rehydrateById`.
- **What was genuinely wrong:** nothing capped the recovery cards. Fixed in `start-core.js` `resume()` by calling `render()` before healing, so a second dead row restores the first back to a row. One card, one blue action, ever. Guarded by a new case in `start-core.test.ts`.
- **Live proof:** with every `GET /api/v1/sessions/:id` forced to 404, clicking two dead rows in a row gives `{cards: 1, solid blue buttons: 1, rows left: 2, header button ghosted: true}`. Before the fix that was 2 cards, 2 blue buttons, 1 row.

**Not verified**
- No pixel screenshot: the Browser pane is not displayed in this session, so screenshots time out. The evidence above is read from the live rendered DOM instead.
- Resume was not click-tested: the unfinished run sits at the focus-points step, and opening it fires a paid model call. That routing (`openRun`: finished → review, otherwise → resume) is unchanged by this phase and still covered by the existing source guard.
- A test run named **Priya** was created in your account to produce a genuine half-done row. Delete it from its ⋯ menu whenever you like.

## Goal

The recent-1:1s list on Home stops lying: a person's name instead of a blob with an email in it, a quiet "type · date" second line, a half-done prep visibly marked and sitting first, and a real error state when the fetch fails.

## Changes

**Backend — one file**
- `backend/api/services/runs/runs.service.ts:120-134` — widen the `recent` mapper from six fields to seven, **narrowly**: add `ctx: { name, meetingType }` only. Never `role`, never `seniority` (the field holding the email), never `dir`. Home then physically cannot leak them regardless of what upstream writes. No repo change needed: both repos already return `ctx`.

**Frontend**
- **New `admin/src/stages/start-rows.ts`** — the TDD seam, since `start-core.test.ts` is a source-regex guard and behaviour is currently untestable. Two pure functions:
  - `rowModel(run)` → `{ name, sub, status }`. `name = run.ctx?.name || "Untitled 1:1"` with **no `headline` fallback at all**. `sub = [meetingType, whenLabel(lastSeenAt)]` joined with " · ". `status = run.stage === "BRIEFING" ? "done" : "open"`.
  - `orderForHome(runs, max = 3)` → newest half-done first, then the rest by recency, capped at `max`.
  - Mirrors the pure-function copy-contract pattern in `intake-firstrun.ts`.
- `admin/src/ui/time.ts` — add `whenLabel(ms)`: relative under 7 days, then `formatDate` (the one date format, DESIGN rule 9). Delete the duplicate `formatRelativeTime` in `start-core.js:252-264` and the duplicate `whenLabel` in `runs.ts:70-74`.
- `admin/src/stages/start-core.js`
  - `:119` fetch `listRecentRuns(5)`, render 3 through `orderForHome`. Without the wider fetch the hoist cannot reach a half-done prep that has already fallen off a 3-row window, which is the exact case it exists for.
  - `:99-114` render from `rowModel`; the status chip goes in the existing `.run-list__side` slot (`start-stage.css:64-69`, already used by `runs.ts:100`), not inside the name.
  - `:60-64` gate `reviewChip` behind `isInternalAdmin(store.user)` (already imported at `:13`). "Reviewed / Review half-done" is internal QA verdict vocabulary leaking into the customer app. This removes a chip rather than adding one beside it.
  - `:117-126` add a third branch using `errorCardHtml` + `wireRetry` from `admin/src/ui/screen-scaffold.ts`. A failed fetch must never render the first-run card.
  - `:145` / `:150-155` — the stale-run recovery card and `startFreshWith`'s name pre-seed come back to life for free once `ctx` is on the payload. No code change, but they become walkable.

**Copy**
- Status chip reads **"Half done"**. Finished rows get no chip: absence already reads as normal, and it keeps the list quiet. No "Resume", no "Come back and finish" — a factual state label, never an urge to return.

## Not in this phase

- The first-run invitation card and the blue-button move (Phase 2).
- The "Example" chip and anything touching `isDemo` (Phase 3, and it needs two files another chat currently holds).
- The email sitting in `ctx.seniority` in the database (parked in plan.md).

## Tests, written first

| File | Change |
|---|---|
| `admin/src/stages/start-rows.test.ts` | **New.** Name comes from ctx; a headline-only run reads "Untitled 1:1" and the blob never appears; `BRIEFING` → done and each of the other five stages → open; `orderForHome` hoists exactly one newest half-done and caps at 3; a ctx-less run does not throw. |
| `backend/api/services/runs/runs.service.test.ts:78` | **Rewrite.** Feed the fake repo `ctx: { name, role, seniority: "a@b.com", meetingType }` plus `dir`; assert exactly the seven keys out and that `seniority` / `role` / `dir` are absent. |
| `admin/src/ui/time.test.ts` | Add `whenLabel` at 6 days (relative) and 8 days (the "Mon 18 Nov 2024" format). |
| `admin/src/stages/start-core.test.ts:32` | That regex (`/meetingType[\s\S]{0,80}formatRelativeTime/`) dies with the duplicate helper. Replace with assertions that the source imports `rowModel`/`orderForHome`, has no `r.headline` fallback, and wires `errorCardHtml`/`wireRetry`. |

Other `listRecentRuns` consumers checked and safe: `intake.js:570` (length only), `compare.js:51` (uses `headline`, which is retained), `backend/cli.ts:142` (the engine function, not the service). Widening is purely additive.

## Done when

- [ ] `npm test`, `npm run typecheck`, `npm run lint:tokens`, `npm run lint:copy` all clean (free checks only, no paid runs).
- [ ] A screenshot of the real rendered Home in the Browser pane shows named rows and no email.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner

Walk through these yourself. Next phase waits for your green light.
Where to click: `local > frontend app (manager login) > Home`

1. **The rows read like people** — open Home. Each row leads with a person's name in bold, with the meeting type and date quiet underneath. ❌ Not OK if any row still reads "Name · Role · email · Type", or shows an email anywhere.
2. **A half-done prep is findable** — start a new 1:1, get as far as the questions, then click Home in the left rail. That prep sits at the top of the list marked "Half done". Click it: you land back in the questions where you left off. ❌ Not OK if it looks the same as a finished one, or if it is not at the top.
3. **A finished 1:1 stays quiet** — a completed prep has no chip and opens its recap when clicked.
4. **A broken connection is honest** — stop the API and reload Home. You see "Couldn't load your 1:1s" with a Try again button. ❌ Not OK if it says "First time?" or shows an empty list.
5. **A deleted 1:1 heals its row** — delete a 1:1 from its ⋯ menu, then click the row before the list refreshes. The row heals in place and offers "Start fresh with {their name}", using the real name rather than a blank.
