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
| 2 | Fixtures + grouped render | 3 archetypes (UX Lead, junior IC, director) shown grouped on both screens; styling. FREE. | ✅ |
| 3 | Lock it | Offline regression guard so future edits can't silently break grouping. FREE. | ✅ |
| 4 | Real words (paid) | Prompt edited (all future gens grouped) + 5 archetypes regenerated for real & verified. Rest of library + gate pending Carl. | ✅ |

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

**Phase 3 🔨 built & verified 2026-06-14 — awaiting Carl's QA.** Added a fixture-integrity
guard to `test-role-profile.js` (loads the real on-disk UX Lead profile; asserts every term's
group matches a declared group, ≥1 group populated, live-run block still flat). Demonstrated
it bites: a bogus `group` value → `npm test` FAILS clearly (exit 1) → reverted → 25/25 green.

**Phase 4 🔨 core done 2026-06-14 (PAID — Carl authorised "i want it done").** Generation
prompt updated (`prompts/generate-role-profile.md`): output now carries `terminology_groups`
+ per-term `group`, with a `<terminology_rules>` block (1–3 role-aware groups, IC-aware,
modern ways-of-working) and a "modern ≠ invented" honesty bullet. New prompt hash `bda3c52f`,
so **every future generation is grouped automatically**. Regenerated **5 archetypes** for real
(~5 model calls) and verified live + 26/26 offline:
- UX Lead → **UX / Lead / UX Lead**
- Junior Graphic Designer → Design craft / Ways of working / Growing into the role (no "Lead")
- Principal Backend Engineer → Backend engineering / **Technical leadership** / Principal backend work
- Customer Success Manager → Customer success practice / Retention and growth / Senior account leadership
- Head of Product → Product / Product leadership / Head of Product

**Full sweep done 2026-06-14 (Carl authorised "group the rest now", ~$0.40).** All **17**
cached roles regenerated to grouped — **12 generated, 5 cached, 0 failures** — each with
role-aware labels (junior/ops roles got "Learning the role"/"Growing into", never a forced
"Lead"). `npm test` → **26/26**. Carl chose the group-only option, so the **~$3 `npm run gate`
was NOT run** (his call; offline suite + live checks stand in). The whole Job lexicons library
and every one-page run now show grouped, modern, model-written vocabulary.

**✅ SIGNED OFF (2026-06-15).** Carl + Claude walked the full role-type matrix on the real
regenerated words: structural sweep clean on all 18 profiles (1–3 groups, no empty/orphan
groups, every meaning ≤15 words), and the five matrix archetypes each read correctly — no
forced "Lead" on the junior IC, Principal's middle group is influence/architecture not
people-management, CSM's craft group is the discipline itself, Head of Product is
leadership-led with no empty craft group. No invented jargon. Phases 3 + 4 flipped ✅;
folder moved to `docs/todo/done/`. (Code already in commit `7b8921a`.)

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
