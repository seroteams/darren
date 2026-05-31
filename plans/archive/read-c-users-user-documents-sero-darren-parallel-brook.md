# Plan: Archetype Templates for Setup Inputs

**Version:** v1
**Caveman summary:** Add 5-7 seed archetype JSONs in `scenarios/`. Intake UI picker prefills the 5 setup fields, user edits, runs. "Save as archetype" stores edits as new versioned JSON. No answer scripting. Versioning via `version` int + inline `changelog[]`.
**Changelog:**
- v1 initial (+full plan)

---

## Context

User's setup-input notes are consistently one-line seeds (e.g. "they want to move to Head of"), forcing the focus-points stage to invent context. User isn't blocked by lack of knowledge — blocked by cold-start blank-field load. They also want to iterate on pipeline quality against *stable* inputs, but right now every run starts from a different ad-hoc seed, so engine changes and input changes are entangled.

Goal: a library of reusable archetypes that (a) reduce cognitive load at intake, (b) act as fixtures for A/B-ing engine changes, (c) evolve over time with version + changelog so improvements are traceable.

Constraint chosen by user: **setup notes only** (no scripted answers — keeps dynamic-answer realism intact). 5-7 archetypes. Stored both in repo JSON and editable from UI.

## Approach

### 1. Schema (new)

File pattern: `scenarios/archetype-NN-<slug>.json`. Distinct prefix from existing fixture files (`001-*.json`, `002-*.json`) which include `answers[]`. Archetypes never carry answers.

```json
{
  "schemaVersion": 1,
  "archetypeId": "underperformer-perf-feedback",
  "version": 2,
  "label": "Underperformer — direct feedback needed",
  "description": "One-line description shown in picker",
  "data": {
    "name": "Aom",
    "role": "Lead BA",
    "seniority": "Lead",
    "meetingTypeIndex": 1,
    "notes": "Has been communicating disrespectfully with the UX team. Two specific incidents in last fortnight..."
  },
  "changelog": [
    { "version": 2, "date": "2026-05-20", "change": "Added second incident detail to notes" },
    { "version": 1, "date": "2026-05-18", "change": "initial" }
  ]
}
```

`meetingTypeIndex` mirrors what [intake.js:228](frontend/client/src/stages/intake.js#L228) sends. Store both index and `meetingType` label is unnecessary — server resolves label from index already ([start.js:14-53]).

### 2. Seed archetypes (7)

| # | Slug | meetingTypeIndex | Spine |
|---|------|---|---|
| 1 | underperformer-perf-feedback | 1 | Lead BA, disrespectful comms w/ UX team |
| 2 | burnout-wellbeing-dip | 3 | Senior eng, post-launch flatness, withdrawn |
| 3 | promo-push-head-of | 2 | UX Lead, wants Head of, ambition vs readiness gap |
| 4 | new-hire-floundering | 0 | Junior frontend, 8 weeks in, output thinning |
| 5 | star-plateau | 2 | Staff eng, performing well but bored, retention risk |
| 6 | last-minute-planner | 0 | Senior coach, workshops always late-planned, no foresight |
| 7 | manager-to-manager-drift | 0 | Peer manager direct report, low context exchange, growing silo |

Notes field in each ≈ 60-120 words, surfacing: *trigger*, *concrete example*, *manager's read*, *desired outcome*.

### 3. UI changes — `frontend/client/src/stages/intake.js`

Insert new `PICK_ARCHETYPE` substage at start of `SUBSTAGES` array ([intake.js:5]), with skip option:

```
SUBSTAGES = ["PICK_ARCHETYPE", "NAME", "ROLE", "SENIORITY", "MEETING_TYPE", "NOTES"]
```

- `renderArchetypePicker()`: grid of cards (mirror `renderMeetingType` pattern at [intake.js:143]). Cards show `label` + `description`. Buttons: pick → prefills `store.ctx` from `data` → advance to NAME (user still walks each field, can edit). "Start blank" → advance with no prefill.
- After NOTES substage, before `submit()`: add small "Save as new archetype" affordance (only shown if no archetype was picked, or if fields diverged from picked one). Calls new API.

API additions in `frontend/client/src/api.js`: `listArchetypes()`, `saveArchetype(payload)`.

### 4. Server changes — `frontend/server/handlers/`

New file: `frontend/server/handlers/archetypes.js`
- `GET /api/archetypes` → reads `scenarios/archetype-*.json`, returns array sorted by NN.
- `POST /api/archetypes` → body `{label, description, data}`. Writes new file with auto-incremented NN, `version: 1`, changelog `[{version:1, date:today, change:"initial"}]`.
- `PUT /api/archetypes/:id` → body `{data, changeNote}`. Reads file, bumps `version`, prepends changelog entry, writes back.

Register routes in main server file (locate via grep for existing `/api/meeting-types` route registration — `getMeetingTypes` is already proxied in [api.js], pattern exists).

### 5. Versioning behavior

- New archetype → v1.
- Edit existing archetype from UI → user prompted for one-line `changeNote`; version bumps; entry prepended to changelog.
- Files versioned in git as well (double-layer history; intentional — git tracks file lifecycle, in-file changelog tracks *semantic* archetype evolution).

### 6. What NOT to do

- No archetype-answer scripting (user excluded).
- No coupling between archetype IDs and pipeline behavior — archetypes are pure input fixtures; pipeline doesn't know they exist.
- No deletion via UI in v1 (delete by removing file from repo). Avoids accidental loss of fixtures used in past runs.
- Don't migrate existing scenarios (`001-priya-perf-feedback.json` etc.) to new shape — they have different purpose (full hands-free runs). Leave alone.

## Critical files

- `frontend/client/src/stages/intake.js` — add picker substage + save affordance
- `frontend/client/src/api.js` — add `listArchetypes` / `saveArchetype` / `updateArchetype`
- `frontend/server/handlers/archetypes.js` — **new**, three endpoints
- `frontend/server/handlers/start.js` — no change
- `src/meeting-types.js` — no change
- `scenarios/archetype-01-*.json` through `archetype-07-*.json` — **new** seeds

## Verification

1. **Seed load:** start server, hit `GET /api/archetypes`, expect 7 entries.
2. **Picker flow:** intake screen shows picker first; pick archetype-03; advance through fields; all 5 fields pre-populated with archetype data; edit notes; run; confirm `logs/<month>/<run>/01-focus-points/inputs.json` matches edited values.
3. **Skip blank:** intake → "Start blank" → fields empty → manual entry works as before (regression check).
4. **Save new:** fill fields manually → "Save as archetype" → enter label/description → confirm new file appears in `scenarios/` with `version:1`, changelog has initial entry.
5. **Edit existing:** pick archetype → modify notes → save with changeNote "tightened example" → confirm same file now `version:2`, changelog prepended.
6. **Engine A/B:** rerun archetype-01 twice across an engine change; diff focus-points response.json; confirm input identical so any delta is engine-side.

## Open / deferred

- Per-archetype run-history attachment (rejected this round — user picked versioned-only).
- Archetype delete from UI.
- Archetype sharing/import.