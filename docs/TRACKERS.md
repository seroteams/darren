# Where things live — the tracker map

A one-page answer to "which file do I look at?" There are **two** status sources.
Everything else is a log, a feature, or a story — not a place to check status.

## The two sources of truth

| File | Answers | Scope |
|---|---|---|
| **[STATUS.md](../STATUS.md)** | "Where are we **right now**?" | Tactical — the phase plan we're actively working through. The `▶ Your move` banner, baseline, and phase boxes. Updated at every phase boundary. |
| **[SERO_BOARD.md](../SERO_BOARD.md)** | "What's the **big picture**?" | Strategic — the feature board. Check this first for direction; old plans are banners/archives. |

If you only remember one thing: **STATUS.md for now, SERO_BOARD.md for the map.**

## Everything else (NOT a status source)

| File / thing | What it actually is | Where to check status instead |
|---|---|---|
| **docs/prototype-to-production/PROGRESS.md** | Append-only log of decisions + lessons. History, not state. | STATUS.md |
| **Build badges** — `admin/src/stages/tasks.js` (`s` field) | A *UI feature*: per-step build state that drives the /tasks board and the "copy continue prompt". Legit to keep; it shows build progress, it is not a rival status narrative. | STATUS.md |
| **docs/sero-how-it-works.html** | Manual founder-facing changelog — the story of what shipped, refreshed by hand at each phase close. Does not self-update. | STATUS.md |

## The rule of thumb
Status changes phase-to-phase and lives in **two** files (STATUS + SERO_BOARD). If a
file is a *log* (PROGRESS), a *feature* (badges), or a *story* (changelog), it is not
where you check where we are — it points you back here.
