# Phase 3 — The label & content voice

**Part of:** [plan.md](plan.md) · **Status:** ⬜

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
- Chips/buttons (Phase 4). Frame (Phase 5). Off-barrel CSS (Phase 6).

## Done when
- [ ] `npm test` + `npm run typecheck` green.
- [ ] Seen on the running app in both themes: Team, a run, login, 3 admin screens.
- [ ] Product owner has walked the scenarios below and said go.

## Test scenarios — for the product owner
1. **Names are the hero** — open Team. Each person's name is the biggest, warmest thing on their
   card, in the display face; job titles stay quiet.
2. **Two tiers, everywhere the same** — open any main screen: a small blue-toned uppercase word
   above the title. Open a briefing: quieter grey section labels beneath. Clearly two tiers.
3. **The question reads like it matters** — during a run, the question you're answering is set in
   the display face — not like a form label.
4. **One brand** — login and the mobile bar both show "Sero" in the brand typeface with the same
   mark.
