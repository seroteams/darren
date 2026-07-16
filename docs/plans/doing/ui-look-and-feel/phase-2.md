# Phase 2 — The label & content voice

**Part of:** [plan.md](plan.md) · **Status:** 🔨 core built — awaiting Carl QA (rest needs eyes)

## Built (Fri 17 Jul 2026, overnight — Carl chose "one careful step")
First ran a 3-agent discovery sweep (full label + name map, saved in the run journal). It surfaced
two blind-build traps, which shaped a conservative scope:
- `.eyebrow` is used **~146× across 53 files**, many as *slot* labels — a blind global reclassify
  would over-blue the app, so slots are reclassified later with eyes on.
- The Team "name" is a **compact list row**, not a hero card — a display-face name would break the
  row, so name-as-hero waits for a layout call.

**Landed** (`admin/src/styles/design/base.css`):
- `.eyebrow` → the **section tier**: accent-dark, `--type-tracking-caps-lg` (0.08em), semibold —
  the blue uppercase eyebrow from the artifact Carl loved. One shared class → **one-word revert**
  if it's too much blue. (Also refines the briefing/prep labels toward the approved Arc mock;
  dark-ground eyebrows keep their own colour via the cascade.)
- Added `.eyebrow--slot` (quiet dim tier) + `.ident-name` (display-face identity) as scaffolding
  for the eyes-on adoption pass.

**Deferred within P2 (needs Carl's eyes — teed up, homework done):**
- Reclassifying the ~7 hand-rolled label variants + the slot-role `.eyebrow` uses onto the two
  tiers (which are section vs slot is a per-usage judgement).
- Name-as-hero on Team/rows (compact-row layout call).
- `.page-header` eyebrow slot on the ~12 main screens; brand-mark consolidation.

**Offline proof (free):** `npm run build:all` exit 0; brief+css tests 54/54; typecheck unchanged.
Not screenshotted (pane bug) — on-screen sign-off is Carl's QA.

## Goal
The artifact's two-tier label system and "content is the hero" typography land everywhere via
shared classes — chrome gets quiet uppercase labels; the words that matter get the display face.

## Changes
- **Two label tiers:** restyle `.eyebrow` to the accent-dark section tier (600 / 0.08em /
  uppercase) + add `.eyebrow--slot` (ink-dim / 0.06em); sweep the ~7 hand-rolled uppercase
  variants and the three table-header recipes onto the tiers (`base.css`, `admin-tables.css`,
  `notes-panel.css`, `stage-review.css`…).
- **Content is the hero:** `.question-stem` → display face 600 balanced; shared `.ident-name`
  class so people's names become the card hero (`team-card.ts`, `.rd-name`, person-detail);
  `.mcr-h1` weight fix; measure caps applied to ledes/support text.
- **Page headers:** `.page-header` gains an eyebrow slot; adopted on the ~12 main list/landing
  screens ("Your team", "This week"…).
- **One brand mark:** `ui/brand-mark.js` SVG replaces 3 inline copies + the 11px "S"; one
  `.brand-word` rule so "Sero" is Bricolage in rail, mobile bar, topbar and auth screens.

## Not in this phase
- Chips/buttons (Phase 3). Frame (Phase 4). Off-barrel CSS (Phase 5).

## Done when
- [ ] `npm test` + `npm run typecheck` green.
- [ ] Seen on the running app: Team, a run, login, 3 admin screens.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Names are the hero** — open Team. Each person's name is the biggest, warmest thing on their
   card, in the display face; job titles stay quiet.
2. **Two tiers, everywhere the same** — open any main screen: a small blue-toned uppercase word
   above the title. Open a briefing: quieter grey section labels beneath. Clearly two tiers.
3. **The question reads like it matters** — during a run, the question you're answering is set in
   the display face — not like a form label.
4. **One brand** — login and the mobile bar both show "Sero" in the brand typeface with the same
   mark.
