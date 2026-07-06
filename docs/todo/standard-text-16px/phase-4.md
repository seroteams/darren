# Phase 4 — Admin / internal triage

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Reading text on admin/internal/test surfaces is 16px; labels/meta stay 14px. Closes the plan.

## Changes
- Triage `text-sm` in: `admin-feedback.ts`, `admin-user-detail.ts`, `admin-error-log.ts`, `admin-registered.ts`, `library.js`, `compare.js`, `personas.js`, `review-run.js`, `lexicon-review.js`, `job-lexicons.js`, `guide.js`, `feedback.js`, `meeting-arcs.js`.
- Same rule. These are internal/dense tools, so expect **more** legitimate 14px labels than the user pages — don't over-bump. Record calls here.

## Not in this phase
- User-facing pages (Phases 2–3). The dev-chrome exemption surfaces (dev-badge, build-stamp) stay untouched.

## Done when
- [ ] Each file's `text-sm` triaged.
- [ ] "Kept 14px" list recorded.
- [ ] Product owner has tested the scenarios below and said go.
- [ ] Plan closed → move folder to `docs/todo/done/`.

## Test scenarios — for the product owner
1. **Admin pages** — any explanatory/reading text reads at 16px; the dense tables (users, error log, registrations) keep their compact 14px rows and headers. ❌ Not OK if tables grew and got harder to scan.
2. **Guide / library** — prose and descriptions read at 16px. ❌ Not OK if a reading block stayed small.
3. **Nothing dev-chrome changed** — the terminal-style debug kit still looks the same. ❌ Not OK if it changed.
