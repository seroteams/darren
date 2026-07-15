# Design cleanups — make the existing app obey the design system

**Goal:** the [design-system](../../done/design-system/plan.md) track made the *rules*; this track
makes the *existing app* follow them — one shared build per pattern instead of two, tokens
instead of stray colours.
**Created:** 2026-07-05 (investigation done same day; build waiting on parallel tracks to land).

## ⚠️ Why nothing is built yet (deliberate)

Investigated 2026-07-05: every good first target is **being edited right now** by parallel
sessions — `admin/src/stages/admin-registered.ts` (user-mgmt Phase 3), `universe.ts`,
`design.css`. Starting these cleanups today = merge collisions on hot files. The scoping is
done; build starts when those tracks land. **Check the hot files are quiet before each phase.**

> **Re-verified 2026-07-15 (future/ relevance audit): every finding below is still true** — no
> toast helper exists anywhere, `.um-menu` vs `.start-popover` are still two separate dropdowns,
> `.lib-progress__bar` vs `.axis__fill` still two progress bars. Nothing was built or superseded
> (the design stage's `.ds-toast-live` stayed showcase-local, as intended). The 07-05 hot-files
> blocker has mostly cleared (user-mgmt + universe tracks landed) — **but check the in-flight
> admin-live-deploy track before touching admin files.**

## Findings that shape the phases (from the 2026-07-05 audit + file reads)

- **No success toast exists anywhere** — the app never says "saved ✓". Errors are handled 3
  ways: confirm.js modal, `.error-card` (admin-registered), `.notes-panel__error`.
- **Two dropdown menus**: `.um-menu` (admin-registered.ts, fixed-position) vs `.start-popover`
  (session-topbar.js). Same pattern, different styling + JS.
- **Two progress bars**: `.lib-progress__bar` (width %) vs `.axis__fill` (scaleX + tokens).
- **Two input scales** — RESOLVED as intended: DESIGN.md declares both official variants
  (compact boxed + big session), nothing in between.
- **Dev chrome is exempt** (recorded in DESIGN.md §6): `ui/dev-badge.js` + `ui/build-stamp.js`
  are deliberate terminal-style debug chips (dark, mono, own palette). Converting them to Sero
  tokens would make them worse at their job. Leave them.
- `personas.js` / `regression.js` inline styles are token-driven (`var(--…, fallback)`) —
  cosmetic tidy only, low priority.
- `universe.ts` legend colours are data-driven category colours — legitimate; park unless the
  palette itself gets tokenised.

## Phases

| # | Phase | What lands | Status |
|---|---|---|---|
| 1 | Shared toast | `admin/src/ui/toast.js` matching the sheet's toast family; first adopters: role-change success in admin-registered + one error path | ⬜ waiting (admin-registered hot) |
| 2 | One dropdown | Merge `.um-menu` + `.start-popover` into one menu helper | ⬜ |
| 3 | One progress + error alignment | Single `.progress` class; `.error-card` restyled to the sheet's error alert (rounded, retry) | ⬜ |

Each phase: baseline `npm test` + typecheck first · build · browser-verify · Carl walks · commit.

## Parked
- `universe.ts` legend tokenisation (data-driven; hot).
- `personas.js`/`regression.js` inline-style → class tidy (cosmetic).
