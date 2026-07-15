# Shared shell layer — stop hand-syncing admin ↔ frontend

**Goal:** end the copy-paste drift between the admin and customer app shells.
**Driver:** clean-up sweep 2026-07-12 (Lens F finding K)
**Created:** 2026-07-12
**State:** FOLDED into the board's **shared-folder-split** code-health track (2026-07-15 clean-up)
— this file stays as that track's shell-slice evidence annex, not a separate plan. The 2026-07-15
sweep re-confirmed the drift: main.js / router.js / app-nav.js are hand-synced forks (208 / 84 / 116
identical lines respectively), and 7+ frontend stage files import `admin/src` internals directly.

## The problem (evidence from the sweep)
Three shell files exist as drifted hand-synced copies across the two apps — every new stage or nav
change has to be made twice, and they've already diverged:

| File | admin | frontend | Drift |
|---|---|---|---|
| `main.js` | 411 lines | 352 lines | lazy-loader map + error-reporter wiring diverge |
| `router.js` | 164 lines | 122 lines | `PATH_FOR` / `STAGE_FOR` tables copied; 131 diff lines |
| `ui/app-nav.js` | 333 lines | 203 lines | icon-map + `render()` copied, trimmed to customer subset |

Plus a related duplicate: two full prep-brief implementations over the **same** SSE stream
(`admin/src/stages/preparation.js` 242 lines vs `frontend/src/stages/preparation.ts` 190) — the admin
copy is the dead-file finding (Lens E) and folds in here.

## Why parked
- The board already carries **shared-folder-split** (L) as the deliberate structural-debt track,
  scheduled for *after testers are on live*. This is the same debt seen from the shell angle — do not
  double-build. Fold this into that track when it starts.
- Touches both apps' boot path — needs its own Darren-Method phases + the customer-serving test as the
  safety net, not a clean-up drive-by.

## If un-parked (rough shape, detail written when scoped)
1. Lift the shared shell (router tables, nav model, loader map) into a single top-level module both apps import.
2. Keep per-app differences (customer subset of nav, admin-only stages) as explicit config, not copies.
3. Retire the dead `admin/src/stages/preparation.js` as part of the prep-brief consolidation.
4. Guard with the existing `test-customer-serving.js` (customer bundle must still exclude internal-tool code).
