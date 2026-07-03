# Admin smoke test — 2026-07-02 (overnight)

**What this is:** a free, no-cost UI sweep of every admin/console screen — driving the real app in the browser, checking each screen renders and wiring works, and capturing console + network errors. **No paid engine runs were triggered** (nothing that hits the OpenAI API). Run while you slept.

- **Build:** `096c8024` · Jul 1 23:52
- **How run:** API on :3001 + Vite on :3000 (separate, per the known preview port-conflict). Logged in as **admin/owner** (`carl@seroteams.com`) for the console; switched to **member** (`member@seroteams.com`) to test the member-facing run pages.
- **Method:** SPA route navigation + DOM snapshots + an in-page error collector (console.error / window error / unhandledrejection) + server network log.

## Headline

**Everything renders. Zero JavaScript console errors across the entire sweep.** 26 screens loaded cleanly. Three small findings below, all low severity — nothing broken for the intended user.

---

## Screens tested — all ✅ (rendered, no console errors)

### Console / data screens (as admin)
| Screen | Route | Result |
|---|---|---|
| Runs | `/runs` | ✅ renders (empty — admin owns no runs) |
| Library | `/library` | ✅ archived + Keep/Fix/Block filters, 6 archived |
| Compare runs | `/compare` | ✅ run picker populated |
| Regression check | `/regression` | ✅ renders (did **not** click "Run" — kept it clean) |
| Personas | `/personas` | ✅ full persona set |
| Operator guide | `/guide` | ✅ |
| Tasks (build board) | `/tasks` | ✅ big board renders |
| Meeting arcs | `/meeting-arcs` | ✅ |
| Role words (lexicons) | `/job-lexicons` | ✅ |
| What is Sero? | `/about` | ✅ |
| Privacy | `/privacy` | ✅ |
| Send feedback | `/feedback` | ✅ form renders |
| Home | `/home` | ✅ |
| Team | `/team` | ✅ empty-state |

### Prep-flow screens (no active session)
`/new` `/flow` `/focus` `/prepare` `/bank` `/interview` `/evaluate` `/briefing` `/debrief` `/lexicon`
→ **All ✅** — each correctly redirects to the intake "Setup · Step 1 of 5" screen when there's no live session. No errors, sensible guard behaviour.

### Run detail pages (dynamic)
| Page | Route | Result |
|---|---|---|
| Admin run review | `/run/:id` | ✅ opens a run (Priya Shah — stages, "0/8 judged", briefing) on a real deep-link |
| Member "Past 1:1" reopen | `/runs/:id` | ✅ **works for a member** — deep-link/refresh opens the full briefing |
| Member Runs list | `/runs` (member) | ✅ lists all 9 of the member's own runs with "4h ago / 2d ago…" |

The **reopen-a-run** work (the recent WIP) is solid for its actual audience: a member can cold-load / refresh a run URL and it opens.

---

## Findings (all low severity)

### 1. LOW — admin/owner deep-link to `/runs/:id` bounces to an empty state
Deep-linking `/runs/:id` as an **admin/owner** shows "Past 1:1 — No 1:1 selected" and rewrites the URL to `/runs`.
**Cause:** boot only wires the `myRunId` route param inside the *member* branch (`admin/src/main.js:218-220`). An admin falls through to `main.js:255`, which sets `stage: RUN_DETAIL` **without** the id.
**Impact:** minimal — `/runs/:id` is a member-only page; members are handled correctly. Admins aren't the intended audience for it. Worth a one-line fix if you want admins' deep-links to behave, but not urgent.

### 2. LOW — member boot fires an admin-only request (403 ×N, swallowed)
On every **member** boot, the nav's regression-alert check calls `GET /api/regression/run`, which is admin-only → **403 Forbidden**. The code catches it silently (`main.js:75`), so nothing is user-visible, but it's 3 failed requests per member page-load. Could be skipped for non-admins.

### 3. HOUSEKEEPING — one test run left in the admin account
To exercise the member run-detail page I cloned a run (free, file-copy). The cleanup `DELETE` was blocked by read-only safety mode, so it's still there:
`2026_Jul02_00-03-9428ab1beb8245b4bc42bedeb43001d1` (a copy of the Priya Shah run, owned by `carl@seroteams.com`).
Remove it from the Runs UI if you don't want it — harmless otherwise.

### Note (not a bug)
- Admin review of run `2026_Jul01_12-45-qa1priya` shows "Prep unavailable for this run / No questions recorded" — looks like that particular run's saved data is partial, not a page fault.

---

## What was NOT tested (and why)
- **A real end-to-end prep** (intake → questions → briefing). That runs the engine and costs OpenAI money — not authorized for this sweep. So "does a fresh prep actually generate a briefing" is unverified here.
- **Buttons that trigger the engine** (One-page run, Demo persona, Regression "Run", any "Suggest fix"). Loaded the pages, did not fire them.
- **Register screen visually** — I authenticated via the API, didn't open the `/register` form itself.
- **Screenshots** — the preview screenshot tool timed out repeatedly (renderer quirk; snapshots/eval stayed responsive), so evidence here is DOM-snapshot text, which is more precise anyway.

## Bottom line
The admin console is in good shape: every screen loads, no console errors, guards and the member reopen-run flow behave. Two tiny polish items (admin deep-link branch, member 403 noise) and one leftover test run to delete.
