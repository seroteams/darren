# Phase 001 · Step 02 — Render the manager's runs on the Runs page

## 1. Goal (plain)
Make the **Runs** page actually list this manager's finished 1:1s (newest first) instead of
always showing the "No runs yet" placeholder. Keep the friendly empty state for anyone with
zero runs, and show a plain error message if the list can't load.

## 2. What you'll have when it's done
- Opening Runs fetches `listMyRuns()` on mount and renders a row per run: who it was about,
  the meeting type, and how long ago.
- **Three states, all owned by this screen** (per the standing rule — no state is deferred):
  - **Loading** — a brief "Loading your 1:1s…" while the fetch is in flight.
  - **Empty** — the existing "No runs yet… Start your first one" card, unchanged, with its
    "Start a 1:1" button still working.
  - **Error** — a plain "Couldn't load your 1:1s. Try again." card if the fetch fails.
- Rows are read-only for now (no click target). **Re-opening a run is Phase 002** — do not
  build it here.

## 3. A grounding example (before → after)
- **Before:** open Runs → "No runs yet. Start your first one…" even after three 1:1s.
- **After:** open Runs →
  - `Priya · Senior Engineer · One-on-one · 2d ago`
  - `Sam · Engineer · Bi-weekly · 5d ago`
  - `Alex · Staff Engineer · One-on-one · 1w ago`
  newest at the top; the empty card only shows when there genuinely are none.

## 4. The technical detail
Rewrite [admin/src/stages/runs.ts](../../../../admin/src/stages/runs.ts) so `mount`:

1. **Imports what it needs:**
   - `listMyRuns` from `../../../shared/api.js` (added in Step 01).
   - `escapeHtml` from `../ui/html.js` (used by every other stage; escape **every** value).
2. **Renders a loading shell first**, then fetches:
   ```ts
   let runs: MyRun[] = [];
   try {
     ({ runs = [] } = await listMyRuns());
   } catch {
     // render the error card and return
   }
   ```
3. **Branches on the result:**
   - `runs.length === 0` → keep the **existing empty-state card** exactly as it is today
     (heading, copy, and the working "Start a 1:1" button — reuse the current handler).
   - otherwise → render the header + a `.l-stack` list of rows.
4. **Row shape** — match the plain list style already used elsewhere; one row per run:
   `${name} · ${role}${seniority ? ", " + seniority : ""} · ${meetingType} · ${relTime(lastSeenAt)}`.
   Fall back to `headline` (already provided by the endpoint) when a ctx field is blank.
   `escapeHtml` every interpolated value.
5. **Time-ago:** copy the tiny `relTime(ms)` helper from
   [compare.js:93](../../../../admin/src/stages/compare.js) (just now / `Nm ago` / `Nh ago` /
   `Nd ago`) — it's four lines; keep it local to the file, don't add a shared util for one use.
6. **Types:** add a small local `type MyRun = { id: string; headline: string; ctx: { name: string;
   role: string; seniority: string; meetingType: string }; lastSeenAt: number }` so
   `npm run typecheck` stays strict-clean. This mirrors the endpoint's real shape
   ([run-history.ts:227](../../../../backend/engine/run-history.ts)).
7. **Design:** reuse `.stage-inner`, `.l-stack`, `.card-flat`, `.page-header`, `.eyebrow`,
   `text-sm`, `text-ink-dim` — the classes already in this file. No new CSS. Body text ≥14px
   (the existing classes already satisfy the floor).

**Do NOT in this step:**
- Do **not** relabel the nav/page "Runs" → "Past 1:1s". That relabel belongs to **Phase 004**
  per the CTO decision in PROGRESS ("Team is primary; Runs → Past 1:1s"). Keep the heading
  "Runs" here to avoid doing two things at once.
- Do **not** make rows clickable / re-openable — that's **Phase 002**.
- Do **not** add rating stars — that's **Phase 003**.

## 5. How to check it worked
- `npm run typecheck` clean; `npm test` green (no backend change).
- Manual (dev app, free — no OpenAI): log in as a member with finished runs → the list shows,
  newest first. Log in as a member with none → the empty card shows. (Full walk in
  `99-qa-signoff.md`.)
- No console errors on mount; escaping verified (a run whose name contains `<` renders as text,
  not markup).

## Note on the empty list (documented, expected — not a bug)
Runs are attributed by `userId`, which was only stamped from member-nav Phase 2 onward. 1:1s
created **before login existed**, via the dev side-door, or anonymously carry no `userId` and
are **intentionally invisible** in a member's list. No backfill for the alpha. So a brand-new
member — or one whose only runs predate attribution — correctly sees the empty state.
