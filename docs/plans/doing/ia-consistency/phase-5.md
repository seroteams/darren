# Phase 5 — Label sweep

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Mop up the remaining user-visible "meeting" strings and the last comma joiner, so the "1:1" rule holds everywhere.

## Changes — "meeting" → "1:1" in visible copy
- `frontend/src/ui/team-card.ts` (~L48) — "N meeting(s)" → "N 1:1(s)".
- `frontend/src/stages/member-home.js` (~L140) — empty-state "the date and meeting type".
- `frontend/src/stages/join.js` (~L49) — "dates and meeting types".
- `frontend/src/stages/preparation-brief.ts` — "Pre-meeting brief" (~L579), "For this kind of meeting" (~L69), aria "Meeting stages" (~L435), "during-the-meeting move" (~L36). (Keep "check-in"/named cadences as-is.)
- `frontend/src/stages/runs.ts` (~L60) — role/seniority comma joiner `${role}, ${seniority}` → middot `·` (the last comma joiner in either app).

## Not in this phase
- Product/proper-noun names ("Monthly Check-in") — those stay.

## Done when
- [ ] No user-visible "meeting"/"session" strings remain for a 1:1 (grep clean in the files above).
- [ ] `runs.ts` uses a middot joiner.
- [ ] `npm test` green, typecheck clean.
- [ ] Screenshots of the affected member screens attached.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Team card** — `member app > Team`. A person's card reads "N 1:1s", not "N meetings". ❌ Not OK if "meeting" survives anywhere a 1:1 is meant.
2. **Empty states** — a brand-new member's Home and the invite screen mention "1:1", not "meeting type".
3. **Prep brief** — open a prep brief; its labels say "1:1" / the named check-in, not "meeting".
