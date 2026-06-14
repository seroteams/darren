# Phase 4 — Real words: prompt edit + regenerate + gate

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜ · **PAID — needs Carl's explicit go-ahead per run**

## Goal
Replace the hand-authored stand-ins with genuine, modern, grouped vocabulary the model
writes for **every role** — validated across a spread of role types — and lock it in with
the gate.

## Changes
- `prompts/generate-role-profile.md`: update the output contract to include
  `terminology_groups` + per-term `group`; add a `<terminology_rules>` block (1–3 role-aware
  groups ordered craft → level → role, role-specific labels, IC-aware middle group, emphasise
  modern ways of working over 101 definitions) and an honesty bullet ("modern ≠ invented;
  'never invent jargon' outranks richness").
- Regenerate profiles (smallest first): editing the prompt makes caches stale, so each
  role's next setup regenerates it (paid). Start with **UX Lead alone**; broaden across the
  role-type matrix only as approved.

## Cost
- Each regeneration is one model call (well under the ~$0.35 of a full pipeline run); the
  full gate is ~$3. **Nothing here runs without Carl's explicit yes for that specific run,
  with the cost stated first.** Default to the smallest thing that proves the point.

## Not in this phase
- Nothing further — this closes the feature.

## Done when
- [ ] Approved roles regenerated with grouped modern vocabulary, no invented jargon.
- [ ] Approved gate/smoke/eval green.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner (role-type matrix)
1. **UX Lead** (craft-lead) — modern, grouped, no made-up words.
2. **Junior Graphic Designer** (junior IC) — no forced "Lead" group.
3. **Principal Backend Engineer** (IC leadership) — middle group is influence/architecture,
   not people management.
4. **Customer Success Manager / Partner Alliance Manager** (relationship) — craft group
   reads as the discipline itself.
5. **Head of Product (Director)** (org leader) — leadership-led, no empty craft group.
6. **Across all** — meanings short (≤15 words), no empty groups, 1–3 groups each.
