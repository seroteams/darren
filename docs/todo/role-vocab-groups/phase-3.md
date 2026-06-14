# Phase 3 — Lock the free behaviour

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
A regression guard so a future careless edit can't silently break the grouping — and one
that survives Phase 4 regenerating real words.

## Changes
- `scripts/test-role-profile.js`: load the real rewritten `ux-lead--lead.json` via
  `loadRoleProfile` + `flattenTerminology` and assert **structural invariants, not a fixed
  word count**: every term's `group` matches a declared `terminology_groups[].key` (no
  orphans), at least one group is populated, and `renderRoleProfileBlock` still emits
  `- <term>: <meaning>` lines.

## Not in this phase
- No new behaviour — guard only.

## Done when
- [ ] `npm test` green with the new guard.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Guard passes** — I run `npm test`; the new fixture-integrity check passes.
2. **Guard bites** — I temporarily set a term's `group` to a bogus value and run `npm test`;
   it FAILS with a clear message, then I revert and it passes again. (Proves the guard
   actually protects you.)
