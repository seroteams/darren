# Plan: Group `logs/` into month subfolders
**Version:** v1

## Caveman version
The `logs/` folder is getting too long. Put each session inside a folder named after its month (e.g. `logs/april/2026_Apr22_…`, `logs/may/2026_May08_…`). Move the loose `probe-*.json` files into `logs/probes/`. Teach the code that creates sessions to use the new layout, and teach the code that *reads* `logs/` to look one level deeper. Move all existing folders/files into the new structure so nothing breaks on the next run.

## Changelog
- v1: Initial plan.

## Context
The `logs/` directory now contains ~70 session subfolders plus a handful of ad-hoc probe JSON files — too long to scan at a glance. The user wants per-month subfolders (`april/`, `may/`, …) holding the session dirs, plus a `probes/` subfolder for the loose probe artefacts. We need to (a) update the one place that creates session directories, (b) update every place that *reads* `logs/` so it looks one level deeper, (c) physically move the existing files, and (d) make sure persisted sessions still load after the move.

## Approach

### 1. Session creation — write to `logs/<month>/<id>/`
Modify [src/session.js](src/session.js):
- Add `monthFolder(now)` returning the lowercase full month name (`"april"`, `"may"`, …). Reuse the existing `months` array logic from `sessionId()` — or factor both off a single `Date`.
- Change `createSession()` ([src/session.js:19-24](src/session.js#L19-L24)) so it computes `id` and `month` from the **same** `Date` instant (don't call `new Date()` twice — they could straddle a month boundary), then builds `dir = path.join(LOGS_ROOT, month, id)`. `fs.mkdirSync(dir, { recursive: true })` already handles the nested create.
- Export a small helper `monthFolderFor(id)` that parses the 3-letter month out of an existing id string and returns the lowercase folder name. Used by readers below.

### 2. Readers — walk one level deeper
Three files iterate `logs/` directly today; each needs to look inside month subfolders. Use the new `monthFolderFor(id)` helper where it simplifies things, otherwise just do a two-level scan.

- [frontend/server/session-persistence.js:48-66](frontend/server/session-persistence.js#L48-L66): change the `readdirSync(LOGS_ROOT)` loop to iterate month dirs first, then session dirs inside each. Critical fix: when loading state, override `s.dir` to the actual on-disk path (`path.join(LOGS_ROOT, month, entry.name)`) instead of trusting the serialized `dir` field — old state files have the pre-move absolute path baked in.
- [rerun-eval.js:24-32](rerun-eval.js#L24-L32) `pickSession()` `--latest` branch: glob `logs/*/*/transcript.json` (or two nested `readdirSync`s) and pick the newest. Return the full path including the month segment.
- [smoke-test.js:163,198-207](smoke-test.js#L163): the before/after diff needs to walk two levels. Simplest: replace the two `readdirSync("logs")` calls with a small helper that returns the set of `month/session` relative paths. The "new session directory" assertion ([smoke-test.js:201-205](smoke-test.js#L201-L205)) and the `sDir = path.join("logs", session)` line ([smoke-test.js:207](smoke-test.js#L207)) then work unchanged because `session` is now `"may/2026_May16_..."`.

### 3. Display strings — reflect the new path
[cli.js:77,170,521](cli.js#L77) print `logs/${session.id}/`. After (1), `session.dir` is the authoritative path; print it (relative to cwd) instead of reconstructing. At [cli.js:549](cli.js#L549), `logBase` should likewise be `session.dir` rather than `path.join("logs", session.id)` — this is for the `logFeedback` `files` payload, which currently writes wrong paths if the dir isn't `logs/<id>`.

### 4. Probe artefacts — `logs/probes/`
- [probe-bank-ab.js:127](probe-bank-ab.js#L127): change `path.join("logs", ...)` → `path.join("logs", "probes", ...)`. The existing `mkdirSync(path.dirname(outPath), { recursive: true })` already covers folder creation.
- [probe-plan-turn-ab.js:148-151](probe-plan-turn-ab.js#L148-L151): same change.
- [rerun-focus-points.js:44](rerun-focus-points.js#L44): already writes under `logs/_rerun-fp/` — leave alone (it's already its own subfolder).

### 5. Physical move of existing files
Run a one-shot script (or do it manually with PowerShell `Move-Item`) that:
- For each existing `logs/2026_<Mon><DD>_*` directory, parse `<Mon>`, lowercase-expand it (`Apr`→`april`, `May`→`may`), `mkdir -p logs/<month>/`, then move the dir into it.
- Move `logs/probe-bank-ab-*.json` and `logs/probe-plan-turn-*.json` into `logs/probes/`.
- `logs/_rerun-fp/` already exists and stays put.

No need to rewrite the `dir` field inside old `session-state.json` files — the fix in (2) ignores it on load.

## Critical files
- [src/session.js](src/session.js) — write path (1) + export helper
- [frontend/server/session-persistence.js](frontend/server/session-persistence.js) — read path + dir override (2)
- [rerun-eval.js](rerun-eval.js) — `--latest` discovery (2)
- [smoke-test.js](smoke-test.js) — new-session detection (2)
- [cli.js](cli.js) — display + feedback file paths (3)
- [probe-bank-ab.js](probe-bank-ab.js), [probe-plan-turn-ab.js](probe-plan-turn-ab.js) — probe output paths (4)

## Verification
1. `node smoke-test.js` — runs end-to-end and asserts a new session dir exists with all expected stage files. After the change it should report the new path as `logs/may/<id>/` (or whatever current month) and still pass.
2. Restart the frontend server and confirm `[session-persistence] restored N session(s) from disk` log line appears with a non-zero N — confirms (2) walks the new layout and recovers `dir` correctly.
3. `node rerun-eval.js --latest` — should find the newest session under the month subfolders and run without "session not found".
4. `node probe-bank-ab.js` (if a scenario is handy) — confirm output lands in `logs/probes/probe-bank-ab-<ts>.json`, not `logs/`.
5. Visual check: `ls logs/` should now show a short list — month folders + `probes/` + `_rerun-fp/` — nothing else.
