# Phase 2 — Multi-1:1 axis trend

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built, awaiting Carl's sign-off

## ✅ GREEN-LIT — (pending)

## Built (2026-07-16)
Evolves Phase 1's single "Last 1:1" line into a real trend across the person's last few 1:1s.
- `frontend/src/stages/person-axes.ts` — `renderLastAxes` replaced by `renderAxisMemory(axesPerRun)`: per-axis series oldest→newest (e.g. *Engagement −1 → +3 → +6*). Only sessions that actually read an axis add a point; an axis never read shows **"not read"**, never a 0. Returns "" when nothing was ever read.
- `frontend/src/stages/person-axes.test.ts` — rewritten, **8/8** (trend, not-read honesty, read-0 real, single-run, empty cases, order, null-run safety).
- `frontend/src/stages/person-detail.ts` — fetches the last up-to-4 runs' briefings in parallel (capped so a long history can't fan out), builds the series oldest→newest, folds it into the existing "Since last time" block.
- `admin/src/styles/design/admin-tables.css` — `.since-axes` (Phase 1) replaced by a 2-column `.axis-mem` grid.

**Offline proof (all free):** helper **8/8** · full suite **146/146** · `npm run typecheck` clean · `npm run build` clean · rendered on the real screen (2-col grid, **14px**, series *"Engagement −1 → +3 → +6"*, unread axes italic *"not read"*).

## Goal
On a manager's person page, show each health axis's read across the last few 1:1s as a trend — labelled past context, no scoring change.

## Changes
- New pure `renderAxisMemory` + fetch of the last ≤4 runs' briefings (existing `getMyRun`, already server-fenced by company + user, so the trend is correctly keyed on this person + this manager — finding #7 stays sidestepped).

## Not in this phase
- No backend/engine/scoring change. No new API route (the existing fenced `getMyRun` is reused).
- "Engine uses the trend to steer questioning" stays parked (you chose "manager sees it").

## Done when
- [x] Helper 8/8, full suite 146/146, typecheck + build clean.
- [x] Trend renders on the real screen (verified via computed grid + rendered text; the pane's screenshot tool hangs here).
- [ ] Product owner has walked the scenarios below and said go.

## Test scenarios — for the product owner
1. **Someone with a few 1:1s** — open a person you've met 2–3+ times. Each axis shows a trend, oldest→newest (e.g. *Clarity −5 → −2*). ❌ Not OK if the numbers don't match those meetings.
2. **Someone met once** — open a person with a single 1:1. Each read axis shows one number; unread axes show "not read". ❌ Not OK if a fake 0 appears.
3. **Honesty** — an axis not discussed in any of those meetings shows "not read", never a number. ❌ Not OK otherwise.
4. **New person** — no finished 1:1 → no axis block at all (no empty box).
