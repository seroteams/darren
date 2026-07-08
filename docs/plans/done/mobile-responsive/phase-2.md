# Phase 2 — Auth + member screens

**Part of:** [PLAN.md](plan.md) · **Status:** ✅ done — green-lit by Carl 2026-07-05 ("commit, its good")

> Build notes (2026-07-05): the member screens turned out to be nearly mobile-ready — the
> 375px walk found only two real papercuts, both fixed in `design.css`: long placeholders
> now end in "…" instead of clipping mid-word (register's Company hint), and
> `.page-header__row` wraps below 640px so a long page title (a person's name) can't crush
> the Tidy up / Back button. Verified live at 375px: login, register (walked for real —
> created throwaway account `mobile-qa@test.local`, feel free to delete), privacy, about,
> feedback — zero horizontal overflow. Team/Runs/run-detail/person-detail were verified at
> markup level (same card-stack primitives as the walked pages) — they need a member login,
> which is the point of your walk below.

## Goal
Everything a member or manager sees outside a run — login, register, privacy, about, feedback, Home, Team, Past 1:1s, run detail, person detail — reads and taps comfortably at phone width.

## Changes
- `admin/src/styles/design.css` — additive `@media` blocks next to each component: page-header rows wrap instead of squeeze, action clusters wrap, long names/emails ellipsize, run-detail sections stack, list rows get comfortable tap heights.
- Verify the existing `auth-split` stack (820px) actually works at 375px; adjust if not.
- Tiny markup tweaks in `stages/run-detail.ts` / `stages/person-detail.ts` only if CSS alone can't fix a layout.

## Not in this phase
- The run pipeline screens (Phase 3).
- iOS select-zoom fix (Phase 4 does it app-wide).

## Done when
- [ ] Each listed screen at 375px: no sideways page scroll, nothing truncated into uselessness, all buttons tappable.
- [ ] Free checks green: `npm test`, `npm run typecheck:admin`, admin build.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Front door** — on the phone: open the app logged out, register a throwaway, log out, log back in. Both forms fit the screen, labels readable, buttons full-width-ish and easy to hit.
2. **Member basics** — as a member: Home, then Team, tap a person, then Past 1:1s, open one. Every page readable without pinching. ❌ Not OK if any page scrolls sideways.
3. **Tidy up on touch** — on Team, use Tidy up: rename someone, then merge two cards. Both work with fingers.
4. **Footer pages** — open What is Sero?, Send feedback (send a test note), Privacy. All comfortable at phone width.
