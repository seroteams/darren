# Where things live — the tracker map

A one-page answer to "which file do I look at?" There are **two** status sources.
Everything else is a log, a feature, or a story — not a place to check status.

## The two sources of truth

| File | Answers | Scope |
|---|---|---|
| **[STATUS.md](../../STATUS.md)** | "Where are we **right now**?" | Tactical — the phase plan we're actively working through. The `▶ Your move` banner, baseline, and phase boxes. Updated at every phase boundary. |
| **[SERO_BOARD.md](../../SERO_BOARD.md)** | "What's the **big picture**?" | Strategic — the feature board. Check this first for direction; old plans are banners/archives. |

If you only remember one thing: **STATUS.md for now, SERO_BOARD.md for the map.**

## Everything else (NOT a status source)

| File / thing | What it actually is | Where to check status instead |
|---|---|---|
| **docs/archive/prototype-to-production/progress.md** | Append-only log of decisions + lessons. History, not state. | STATUS.md |
| **Build badges** — `admin/src/stages/tasks.js` (`s` field) | A *UI feature*: per-step build state that drives the /tasks board and the "copy continue prompt". Legit to keep; it shows build progress, it is not a rival status narrative. | STATUS.md |
| **docs/reports/sero-how-it-works.html** | The founder-facing deck explaining how Sero works. Refreshed by hand at each track close. Does not self-update. | STATUS.md |
| **docs/reports/sero-changelog.html** | The customer-facing changelog homepage (Customer / Internal toggle). A story of what shipped, written after the fact. | STATUS.md |
| **LANES.md** | Who is editing what right now, across parallel chats. A collision guard, not a status board. | STATUS.md |
| **docs/plans/doing/&lt;slug&gt;/plan.md** | The per-track phase table. True for that track only, and the folder's bucket (doing / future / done) is the real signal. | STATUS.md |

## The rule of thumb
Status changes phase-to-phase and lives in **two** files (STATUS + SERO_BOARD). If a
file is a *log* (PROGRESS), a *feature* (badges), or a *story* (changelog), it is not
where you check where we are — it points you back here.
