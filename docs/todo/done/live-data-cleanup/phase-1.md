# Phase 1 — Audit report

**Part of:** [PLAN.md](PLAN.md) · **Status:** 🔨

## Goal
Save the full live-data audit as a readable report so the findings aren't trapped in a chat.

## Changes
- New file: `docs/audits/live-data-audit-2026-07-05.md` — what's healthy, what's disconnected, what's parked.

## Not in this phase
- No code changes at all.

## Done when
- [ ] The report exists and reads in plain words.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Read it** — open [docs/audits/live-data-audit-2026-07-05.md](../../audits/live-data-audit-2026-07-05.md). You should understand every finding without asking me. ❌ Not OK if any section needs a translator.
2. **Spot-check a claim** — the report says the Job lexicons page still calls the old `/api/role-lexicons` path. Open `shared/api.js`, search for `role-lexicons` — you should see paths without `/v1/`.
3. **Nothing changed** — run `git status`; only new docs files should appear, no code edits.
