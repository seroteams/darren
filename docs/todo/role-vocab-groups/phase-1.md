# Phase 1 — Engine: grouped data shape + helper + offline tests

**Part of:** [PLAN.md](PLAN.md) · **Status:** 🔨

## Goal
Teach the role-profile engine the grouped vocabulary shape and add one normaliser so every
consumer reads old (flat) and new (grouped) profiles the same way — with **zero visible
change** and no paid calls. This is the plumbing every role's grouping sits on.

## Changes (as built)
- `src/role-profile.js`:
  - `RESPONSE_SCHEMA`: terminology items gain a required `group`; new `terminology_groups`
    array (key + label, no `minItems` so a word-less role stays valid); `terminology_groups`
    added to top-level `required`; terminology `maxItems` 10 → 18. *(Only affects future
    generations — Phase 4. Existing files are never re-validated against this.)*
  - Thread `group` through the **existing** merge path: `effectiveTerminology(doc)` now
    carries each AI term's `group` (user overlay words stay ungrouped → trailing bucket),
    and `listRoleProfiles` tags each AI term with its `group` and returns a `groups` array
    per role.
  - Add + export `terminologyGroups(profile)` → declared groups in order (guarded → `[]`).
  - *No `flattenTerminology`* — the Job-lexicons overlay system's `effectiveTerminology` is
    already the merge-normaliser, so grouping just threads through it (see PLAN "Current
    state" for the mid-build discovery).
- `scripts/test-role-profile.js`: 7 new checks — `terminologyGroups` reads groups in order /
  returns `[]` for old + junk input without throwing; `effectiveTerminology` carries `group`
  for new files and leaves it undefined for old flat ones; grouped data still renders flat
  term lines in the live-run block.

## Not in this phase
- No prompt edit, no regeneration (Phase 4).
- No frontend, no CSS, no hand-authored fixtures (Phase 2).
- No `PROFILE_VERSION` bump — the 14 existing files keep working untouched.

## Done when
- [ ] `npm test` green, including the new `flattenTerminology` checks.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk these yourself. Next phase waits for your green light. (This phase is deliberately
invisible — nothing on screen changes yet.)
1. **Tests pass** — I run `npm test`: all 25 test files pass, and `test-role-profile.js`
   now includes 7 new vocabulary-grouping checks (shown passing). ❌ Not OK if anything fails.
2. **Job lexicons still works** — open the Job lexicons page. Every role still lists its
   words exactly as before (still a flat list — grouping is Phase 2). ❌ Not OK if any role
   lost its words.
3. **A normal 1:1 still runs** — start a setup for any role. It starts and references the
   role as usual; the interview is unchanged. ❌ Not OK if a run errors or loses role
   context.
