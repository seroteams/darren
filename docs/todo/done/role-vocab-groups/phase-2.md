# Phase 2 — Hand-authored fixtures + grouped render on both screens

**Part of:** [PLAN.md](PLAN.md) · **Status:** 🔨 built & browser-verified, awaiting QA

## Goal
Show the grouped vocabulary — for free — on both the interview "language of this role"
screen and the Job lexicons page, proven across three contrasting role *types*.

## Changes
- Rewrite three role files into grouped shape (keep each `version:1` + existing
  `prompt_version` so no paid regen):
  - `data/role-profiles/ux-lead--lead.json` — UX / Lead / UX Lead.
  - `data/role-profiles/junior-graphic-designer--junior.json` — junior IC:
    Craft / Ways of working / Growing into the role (no "Lead").
  - `data/role-profiles/head-of-product--director.json` — leadership-led:
    Strategy / Leadership / The role.
- `frontend/server/handlers/role-profile.js` + `role-lexicons.js`: return the groups
  alongside the terms.
- Shared grouping render helper, used in `frontend/client/src/stages/onepage.js`
  (`showRoleLanguage`) and `stages/job-lexicons.js`. Grouped when groups present, flat
  fallback otherwise.
- `frontend/client/src/styles/design.css`: group sub-header styles; labels rendered as real
  heading elements (e.g. `<h3 class="eyebrow">`) so screen readers announce them.

## Not in this phase
- No prompt edit / regeneration (Phase 4). Wording here is a hand-authored stand-in — judge
  layout and whether the grouping *fits each type*, not the exact words.
- The other 11 roles stay flat (they prove the fallback).

## Prerequisite
- Job lexicons Phase 1 (browse page) green-lit and committed first — this extends its render.

## Done when
- [ ] Grouped sections render on both screens for the three archetypes; other roles stay flat.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **UX Lead** — start a one-page run for a UX Lead / Lead. On "the language of this role"
   you should see three labelled groups: **UX**, **Lead**, **UX Lead**, each with a few
   modern words.
2. **Junior, no fake leadership** — run for a Junior Graphic Designer / Junior. Groups like
   Craft / Ways of working / Growing into the role — and **no "Lead" group**. ❌ Not OK if
   it forces a leadership group.
3. **Director, leadership-led** — run for a Head of Product / Director. Groups lean to
   strategy/leadership; no awkward empty craft section.
4. **Lexicons page matches** — open Job lexicons. The same three roles show grouped, same
   labels.
5. **Other roles unchanged** — open another role (e.g. Senior backend engineer). Still a
   single flat list, no empty headers.
6. **Narrow screen** — shrink the window. Groups and rows stack cleanly, still readable.
7. **No words** — a role with no words skips the screen and goes straight to the interview,
   as before.
