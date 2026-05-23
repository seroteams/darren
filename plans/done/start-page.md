# Plan: Start page with recent runs

**Version:** v3

## Caveman version

Add Start screen (CLI + web) before name prompt. Shows last 3 runs as 1-line each: who · role · seniority · meeting type. Press Enter = start fresh run. Press 1/2/3 = expand overview + show actions: **Resume** | **Save & exit** | **Delete**. Resume rehydrates session at correct stage. Save & exit keeps log dir (run stays in recent list). Delete removes log dir + drops session.

Also: add **Start** entry to top-left nav (`session-topbar`). Click → popover with two actions: **Save and exit** | **Exit and delete session**. Both return user to Start screen.

## Changelog

- v1: Initial plan
- v2 (+38/-19): Fix source-of-truth (`session-state.json` `notes[]` only); CommonJS; CLI reorder; naive summarizer; web skip START when no runs; filesystem walk for dir; skip `logs/probes`.
- v3 (+62/-8): Add Start to top-left nav (click → Save/Delete popover); make runs resumable (recent list row → rehydrate via existing `/api/session?s=`); new `DELETE /api/runs/:id` endpoint for delete action; CLI gets matching menu (resume by id).

## Steps

### 1. Run summary helper — `src/run-history.js` (new, CommonJS)

`module.exports = { listRecentRuns, summarizeRun, deleteRun }`.

- `listRecentRuns(limit = 3)`:
  - Walk `logs/*/` (each month dir), skip `logs/probes`.
  - For each run dir, attempt `JSON.parse(fs.readFileSync(<dir>/session-state.json))`. Skip silently on ENOENT or parse error.
  - Sort by `lastSeenAt` desc, return top N as `{ id, dir, ctx: {name, role, seniority, meetingType}, lastSeenAt, stage }` (stage derived same way as `sessions.js:inferStage`).
- `summarizeRun(id)`:
  - Find dir by filesystem walk. Read `session-state.json`.
  - `headline`: join non-empty `[name, role, seniority, meetingType]` with ` · `.
  - `overview`: `"For <name> (<seniority> <role>). <notesSummary>"` — see v2 rules.
  - Return `{ id, headline, overview, notes, stage }`.
- `deleteRun(id)`:
  - Find dir. `fs.rmSync(dir, { recursive: true, force: true })`.
  - Return `{ deleted: true, id }`.
- No LLM. Sync I/O.
- Verify: against `2026_May16_21-30-020c9f99` → headline `"Michael · Acting Coach · Senior · Bi-weekly check-in"`, stage derives from state.

### 2. CLI start menu — `cli.js`

Reorder: banner → menu → `createSession()` (only if user picks "new") → name prompt.

Menu:

```
  Recent runs
  ─────────────
  [1]  Michael · Acting Coach · Senior · Bi-weekly check-in
  [2]  Priya · Backend eng · Staff · Skip-level
  [3]  ...

  [n] New run   [1-3] view   [d <n>] delete   › _
```

- Enter or `n` → `createSession()` + name prompt.
- `1-3` → print `summarizeRun(id).overview` + sub-prompt: `[Enter] back   [r] resume   [d] delete`. Resume in CLI = not yet supported; print `"Resume from CLI not supported — open web app."` and return to menu. (CLI resume is out of scope; web only.)
- `d <n>` → confirm `y/N`, then `deleteRun(id)`, refresh list.
- If `listRecentRuns().length === 0` → skip menu, behave as today.

Verify: `node cli.js`, see menu, press 1 → overview. `d 1` + y → run vanishes. Pick `n` then Ctrl+C → no orphan dir.

### 3. API endpoints — `frontend/server/handlers/runs.js` (new, CommonJS) + wire `server.js`

- `GET /api/runs/recent?limit=3` → `{ runs: [{ id, headline, lastSeenAt, stage }, ...] }`
- `GET /api/runs/:id/overview` → `{ id, headline, overview, notes, stage }`
- `DELETE /api/runs/:id` → `{ deleted: true, id }`. Also drop from in-memory `sessions` map (`dropSession(id)` from `sessions.js`).

`server.js` additions:
```js
const runs = require("./handlers/runs");
router.add("GET", "/api/runs/recent", runs.recent);
router.add("GET", /^\/api\/runs\/(?<id>[^/]+)\/overview$/, runs.overview);
router.add("DELETE", /^\/api\/runs\/(?<id>[^/]+)$/, (c) => {
  if (!originOk(c.req)) return c.error(Object.assign(new Error("Bad origin"), { status: 403 }));
  return runs.del(c);
});
```

Resume reuses existing `GET /api/session?s=<id>` (already rehydrates from `loadPersistedSessions` in `sessions.js:111`). No new resume endpoint needed.

Verify: `curl localhost:3001/api/runs/recent`; `curl -X DELETE localhost:3001/api/runs/<id>`.

### 4. Web start stage — `frontend/client/src/stages/start.js` (new)

- Add `START: "START"` to `STAGES` in `state.js:3`.
- Add `START: () => import("./stages/start.js")` to `loaders` in `main.js:12`.
- `main.js` boot: when no `seroSessionId`, fetch `listRecentRuns()`. Empty → `setState({ stage: INTAKE, substage: "NAME" })`. Else → `setState({ stage: START })`.
- Stage renders title + 3 rows: `[1] headline`. Big "Start new run" button (Enter shortcut).
- Number keys 1-3 expand row inline: overview text + actions `[R] Resume   [S] Save & exit   [D] Delete`.
  - **Resume**: `localStorage.setItem("seroSessionId", id)`, then call same rehydrate path as `boot()` (refactor `boot()` body into `rehydrate(id)` helper, call it).
  - **Save & exit**: no-op for an item already on disk (it's already saved); collapse row, return to menu. Only relevant from in-flight session (see step 6).
  - **Delete**: confirm dialog, then `fetch("/api/runs/<id>", {method:"DELETE"})`, re-list.
- "Start new run" → `setState({ stage: INTAKE, substage: "NAME" })`.

Verify: clear localStorage, reload → start page if past runs. Press 1 → overview. Press R → resumes mid-flow at correct stage. Press D + confirm → row removed.

### 5. API client wiring — `frontend/client/src/api.js`

```js
export async function listRecentRuns(limit = 3) {
  return json(await fetch(`/api/runs/recent?limit=${limit}`));
}

export async function getRunOverview(id) {
  return json(await fetch(`/api/runs/${encodeURIComponent(id)}/overview`));
}

export async function deleteRun(id) {
  return json(await fetch(`/api/runs/${encodeURIComponent(id)}`, { method: "DELETE" }));
}
```

### 6. Top-left nav — `frontend/client/src/ui/session-topbar.js`

Currently shows stage breadcrumb only (`INTAKE · FOCUS_POINTS · ...`). Add **Start** label at far left, before stages, separated by a wider gap.

- Click on Start label → popover anchored below with two buttons:
  - **Save and exit** — `localStorage.removeItem("seroSessionId")`, `resetSession()`, `setState({ stage: START })`. Session log dir stays on disk; rehydrates next time user resumes.
  - **Exit and delete session** — confirm dialog. Then `deleteRun(store.sessionId)`, `localStorage.removeItem("seroSessionId")`, `resetSession()`, `setState({ stage: START })`.
- Popover closes on outside click or Esc.
- Start label only clickable when `stage !== START` (no-op on Start screen itself — render dimmed or hide popover).

Verify: mid-run, click Start → popover appears. Save & exit → land on Start screen, run still in recent list. Resume → mid-flow restored. Delete → run gone from list.

## Risks / non-goals

- CLI resume not supported (web only). CLI menu shows resume option but prints "open web app" message.
- Save & exit relies on `loadPersistedSessions` rehydrating from `session-state.json` on next server boot. If server hasn't restarted, in-memory `sessions` map already has it — fine. If restarted, disk reload covers it.
- Delete is destructive. Confirm dialog required on both web and CLI. No undo.
- `state.dir` field in session-state.json stale — always derive dir from filesystem walk.
- Older runs in `logs/april` without `session-state.json` skipped silently.
- `logs/probes` skipped.
- No LLM summarization.
- `MAX_CONCURRENT = 50` (sessions.js:12) — disk-loaded sessions count toward this. If logs/ grows beyond 50 active, oldest get TTL-swept. Acceptable for now.
