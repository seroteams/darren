# Richer, categorised "Language of this role" vocabulary

**Goal:** Each role's words become richer and modern, shown in three role-aware groups
(Craft → Level → Role) on both the interview "language of this role" screen and the Job
lexicons page — instead of one flat list of textbook terms.
**Driver:** Carl
**Created:** 2026-06-14

## Done means
- The "language of this role" screen shows words in labelled groups (for UX Lead:
  **UX / Lead / UX Lead**), not one flat list.
- The Job lexicons page shows the same words, grouped the same way.
- The words read like how the role actually works today (sprints, research ops, AI design,
  accessibility-as-practice), not 101 definitions.
- Roles with no leadership angle (junior/IC) get a sensible middle group, never a forced
  "Lead" bucket.
- Old roles and live 1:1s keep working untouched throughout.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Engine + helper + tests | Grouped data shape + `group` threaded through `effectiveTerminology`/`listRoleProfiles` + `terminologyGroups`; old files still work; offline tests. No visible change. | ✅ |
| 2 | Fixtures + grouped render | 3 archetypes (UX Lead, junior IC, director) shown grouped on both screens; styling. FREE. | 🔨 |
| 3 | Lock it | Offline regression guard so future edits can't silently break grouping. FREE. | ⬜ |
| 4 | Real words (paid) | Edit the generation prompt, regenerate real modern vocabulary, run the gate. PAID. | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 ✅ green-lit by Carl 2026-06-14** (tested via `npm test` → 25/25; Carl gave the go).

**Phase 2 🔨 built & browser-verified 2026-06-14 — awaiting Carl's QA.** Three archetypes
rewritten to grouped shape (`ux-lead--lead`, `junior-graphic-designer--junior`,
`head-of-product--director`); shared `ui/vocab-groups.js` (`groupTerms`/`isGrouped`); grouped
render in `onepage.js` (`showRoleLanguage`) + `job-lexicons.js`; read handler returns
`terminologyGroups`; CSS group headers. Verified live on the Job lexicons page (port 3000):
UX Lead → **UX / Lead / UX Lead**, Junior Graphic Designer → **Craft / Ways of working /
Growing into the role** (no forced "Lead"), Head of Product → **Strategy / Leadership / The
role**; the other 12 roles stay flat; no console errors. `npm test` still 25/25. (Onepage
"language of this role" screen uses the identical helper + handler + CSS; not driven through
the full setup flow to avoid a paid `/api/start` — it's QA scenario 1 for Carl.)

**Commit still deferred** (not bundled) — `src/role-profile.js` is shared with Carl's
uncommitted job-lexicons overlay work; Phase 2 also edits in-flight files (`job-lexicons.js`,
`design.css`). Left to Carl unless he asks to commit together.

**Mid-build discovery:** `src/role-profile.js` already contains the full Job-lexicons
overlay system (`effectiveTerminology`, `addOverlayTerm`, source-tagged terms) — the
"add your own words" work landed in the working tree since this plan was written. So Phase 1
threads `group` through the existing `effectiveTerminology` + `listRoleProfiles` and adds a
small `terminologyGroups` reader, instead of the originally-planned `flattenTerminology`
helper (which would have been redundant and would have dropped the overlay merge). Same net
effect, cleaner route, matches the live code.

**Working tree is busy / not clean:** lots of unrelated uncommitted work is in flight
(arc-editor, regression-replay, job-lexicons). So "green light = commit" needs care — on
approval I'll commit **only** the role-vocab-groups files (`src/role-profile.js` grouping
lines, `scripts/test-role-profile.js`, `docs/todo/role-vocab-groups/`), not the rest of the
tree, and confirm the path with Carl first.

**Next after QA:** Phase 2 (visible grouped render). Its prerequisite — the Job-lexicons
browse/overlay code — is already present in-tree, so Phase 2 builds on it directly.

**Cost posture:** Phases 1–3 are entirely free (offline tests + dev server only). Phase 4
is the only paid phase and needs Carl's explicit go-ahead for that specific run, smallest
run first (UX Lead alone before any sweep).

## Parked
- Tune `maxItems` (18 to start) after seeing real generations — richness vs prompt length.
- `--refresh-role-profile` flag to make Phase 4 regeneration targeted/cheaper than re-running
  setup (already parked in the role-profiles PLAN).
- Per-term ordering within a group (currently insertion order).
- Forward-compat for user-added words (Job lexicons Phase 2/3): they carry no `group`, so
  the render's trailing "other" bucket already gives them a home; a dedicated "Your words"
  group can come later without reworking the design.
