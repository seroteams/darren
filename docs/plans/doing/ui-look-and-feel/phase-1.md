# Phase 1 — Calm the type, fix the freebies

**Part of:** [plan.md](plan.md) · **Status:** 🔨 core built — awaiting Carl QA (some items deferred)

## Built (Fri 17 Jul 2026, overnight — Carl chose "all of Phase 1")
**Landed:**
- `admin/src/styles/design/tokens.css` — the calm + scaffolding + defect defs:
  `--type-display` retuned 44–56px → **30–42px** (DESIGN.md's ~40px spec); `--type-tracking-caps`
  /`-caps-lg`; role spacing (`--space-section/-card-pad/-page-tail`); `--shadow-lift` (ink-tinted);
  `--radius-frame` 18px; reading measures (`--measure-tight/-lede`, `--container-reading` 56rem);
  tint-triad `-line` hairlines. **Defect fixes:** defined `--color-page` (un-hides Pulse bar
  tracks + pills — were transparent); promoted `--session-topbar-h` to `:root` at 50px (fixes the
  6px content-under-bar tuck); defined phantom `--sero-emerald-500`/`--sero-rose-700` to their
  exact current fallback hexes (zero visual change).
- `admin/src/styles/design/base.css` — `.text-display`/`.h1`/`.h2` weight **700→600** +
  `text-wrap: balance` (calmer titles that wrap evenly).

**Deferred within Phase 1 (honest — done next, fast):**
- **Briefing reading column + `.prep-callout` restyle** — deferred on the plan's coordination rule:
  these are the exact briefing/prep surfaces the Arc change (awaiting Carl's QA) renders through;
  editing them now would muddy that QA. Do once Arc is green-lit + closed.
- **96px page tail on `.stage`** — `.stage` is a vertically-centred container; a bottom tail fights
  its centring. Needs eyeballing to attach to the right (scrolling) containers.
- **Micro-defect long tail** (`.tk-phase` radius, `.error-card`, `.num` tabular, guided sub-14px,
  resting shadows, `transition:all`→explicit, chip text-safety colours, amber/warn remap) — ~10
  small un-eyeballed colour/spacing tweaks; batching them blind carried more risk than value
  tonight. Safe to sweep next.

**Offline proof (free):** `npm run build:all` exit 0 (both apps' CSS compiles); brief+css tests
54/54; typecheck unchanged (only the pre-existing `guided-arcs` error). Not screenshotted — the
preview pane's screenshot path hung all session (known bug); on-screen sign-off is Carl's QA.

## Goal
One pass over the token layer that visibly re-calms every screen in both apps, plus every
near-free defect fix — maximum visible improvement per file touched, zero layout change.

## Changes
- **Type retune** (`admin/src/styles/design/tokens.css`, `base.css`, `briefing.css`):
  `--type-display` → clamp(30–42px); `.h1`/`.text-display` weight 700→600; pin `--type-h2`;
  `text-wrap: balance` on heading helpers + `.briefing-headline` + `.prep-callout`.
- **New landing-spot tokens** (pure additions, adopted by later phases):
  `--type-tracking-caps` (0.06em) / `--type-tracking-caps-lg` (0.08em); ~6 role spacing tokens
  (`--space-section` 40px, `--space-card-pad`, `--space-page-tail` 96px…); `--shadow-lift`
  (ink-tinted two-layer); `--sero-radius-frame` 18px; `--measure-tight`/`--measure-lede`;
  semantic `-line` hairline tokens (mint/coral/gold/primary triads).
- **Reading calm:** 96px page tail on `.stage`/`.flow-page`; `--container-reading: 56rem`; move
  the briefing off `stage-wide` (`admin/src/stages/briefing.js:53`) — the single biggest
  calm-vs-dashboard win.
- **Signature callout:** `.prep-callout` → borderless accent-soft block in Bricolage 600
  (`admin/src/styles/design/one-page-run.css:98-108`).
- **Defect fixes:** define `--color-page` (un-hides Pulse bars/pills); `--session-topbar-h` to
  `:root` (6px content-under-bar bug); define phantom `--sero-emerald`/`--sero-rose` **to their
  exact current fallback hexes** (no visual change yet); remap `--color-amber`/`--color-warn` onto
  gold-800; `.tk-phase` radius; retokenize `.error-card`; tabular-nums on `.num`/`td.num`; fix
  wrong fallback hexes in `guided.css`/`guided.page.ts`.
- **The quick-wins bundle** (~15 one-liners — full list in plan §4 of
  [audit-findings.md](audit-findings.md)): guided flow's 13 sub-14px sizes → `--type-body-sm`;
  resting shadows off `.tg-card`/`.run-row`; `transition: all` → explicit lists; motion gated
  behind reduced-motion; chip text-safety colour fixes; focus one-offs → `--sero-shadow-focus`.

## Not in this phase
- Dark mode (Phase 2). Label tiers (Phase 3). Chip consolidation (Phase 4). The frame (Phase 5).

## Done when
- [ ] `npm test` + `npm run typecheck` green (baseline recorded first).
- [ ] Seen on the running app: titles calmer on both apps' main screens, briefing in the reading
      column, Pulse bars visible, no content under the top bar.
- [ ] Product owner has walked the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Calmer titles** — open any admin page and the customer Team page. Titles should feel
   noticeably calmer (smaller, less heavy), and multi-line titles wrap evenly instead of leaving
   one lonely word. ❌ Not OK if anything looks *bigger*/bolder or overlaps.
2. **Book-like briefing** — open a briefing. It reads in a narrower column with breathing room at
   the bottom; the manager's opening line sits in the warm display face inside a soft blue block
   with no border.
3. **Pulse bars visible** — open Pulse → "Where runs break off". The bars now have a visible
   track behind them (they were invisible before).
4. **No tuck-under** — start a run. Content no longer slides under the fixed top bar by a few
   pixels.
5. **Nothing else moved** — flick through 3 screens you know well. Same layouts, same features;
   only calmer.
