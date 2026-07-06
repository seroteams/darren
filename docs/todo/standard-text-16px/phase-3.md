# Phase 3 — User pages triage

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Reading text on the non-session user-facing pages is 16px; labels/meta stay 14px.

## Changes
- Triage `text-sm` in: `member-home.js`, `team.ts`, `person-detail.ts`, `start.js`, `join.js`, `register.js`, `login.js`, `welcome.ts`, `privacy.js`, `about.js`, `runs.ts`, `run-detail.ts`.
- Same rule: reading → `text-base`; table cells that are data-labels, timestamps, badges, and column headers stay `text-sm`.
- Record per-element calls here.

## Not in this phase
- Session flow (Phase 2), admin/internal (Phase 4), genuine labels.

## Done when
- [ ] Each file's `text-sm` triaged; reading text 16px.
- [ ] "Kept 14px" list recorded.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Home / team / person detail** — the descriptive copy and any prose blocks read at 16px; the people-table rows keep their compact label sizing (names, roles, "last met"). ❌ Not OK if table rows ballooned.
2. **Auth pages (login/register/join)** — the intro/explanatory text reads at 16px, form field labels stay small. ❌ Not OK if labels grew.
3. **About / privacy** — the body prose reads comfortably at 16px throughout. ❌ Not OK if a paragraph is still small.
