# Detail: manager core screens (START, TEAM, MEMBERS, PERSON_DETAIL, RUNS, RUN_DETAIL)

Full agent findings, 2026-07-22. Evidence cited as file:line.

**Structural headline:** every screen in this batch wraps content in `.stage-inner`, capped at `max-width: var(--measure)` = 38rem = 608px (admin/src/styles/design/base.css:311-315, tokens.css:365). That is a prose reading column, not a SaaS app canvas. `--container-wide` (72rem) and `--container-medium` (64rem) exist in tokens.css:366-367 and are unused by any manager core screen. The nav rail collapses to 60px. On a laptop every "dashboard" page is a 608px strip in ~1300px of empty canvas. This alone produces most of the "one lonely card on a huge canvas" feeling.

## 1. START / manager home ("/") — admin/src/stages/start-core.js

- Anatomy: 608px column, page-header h1 "Prep a 1:1", subtitle, "Start a new 1:1" button, then "RECENT 1:1S" eyebrow with at most 3 accordion rows that expand in place (listRecentRuns(3), line 104).
- Closest pattern: SaaS home "recent items + quick actions" (Notion Home, Loom library). Recent-items-accordion has no mainstream equivalent.
- **Verdict: CUSTOM.**
- Fights familiarity:
  - Expand-in-place accordion rows (start-core.js:89-98, 113-163): two clicks + a mystery disclosure to do the one obvious thing (open the run).
  - Hand-typed text chevrons `▼`/`▶` (start-core.js:92) against the Lucide-only rule.
  - Only 3 recent items, no "view all", no avatars (breaks DESIGN.md table recipe).
  - Invisible keyboard shortcuts (start-core.js:260-280) with zero affordance.
  - Near-zero density: huge display heading over a 3-row list.
  - Header inconsistency: action inside `field__actions` under the lede (start-core.js:32-34) while Team/Members put it right of the header. Three sibling screens, three header layouts.
- Fixes: canonical table rows (avatar, name, type, time, actions, row click opens) + "See all"; widen to container-medium with a two-zone composition; Lucide chevrons; one shared page-header recipe.

## 2. TEAM ("/team") — frontend/src/stages/team.ts, team-card.ts

- Anatomy: header row (h1 + small ghost "Add someone"), vertical stack of full-width person cards (avatar / name+meta / access pill + "Start 1:1" + ⋯).
- Closest pattern: people directory (Lattice People, HiBob, Notion members).
- **Verdict: HYBRID** (strongest row anatomy in the batch).
- Fights familiarity: no search/sort/filter/count (team.ts:78-81); each person a separate bordered card with 8px gaps instead of one list; page action is a 14px ghost button (team.ts:38) so the screen has zero blue; five click targets per row with none dominant; 608px squeeze causes meta wrapping (team-card.css:59).
- Fixes: list toolbar (search, count, solid primary "Add person"); one card with divider rows; demote per-row actions to ⋯/hover; make Add the screen's single accent.

## 3. MEMBERS ("/members") — frontend/src/stages/members.ts, members-table.ts

- Anatomy: same header recipe, real table (Member / Role / Status / ⋯) with pills, hover, name+email stacked.
- Closest pattern: workspace members settings page (Slack, Notion, Linear). Nav placement at rail foot matches convention.
- **Verdict: STANDARD** with gaps.
- Fights familiarity: no search/filter/count; "Invite people" as tiny ghost (members.ts:23), zero accent on screen; no avatars (Team has them: two adjacent people lists look like different products); ⋯ as text glyph (members-table.ts:39) vs Lucide elsewhere; no sorting; 4-column table inside 608px.
- Fixes: search + count; solid accent Invite; avatars + Lucide MoreHorizontal; widen.

## 4. PERSON_DETAIL ("/team/:person") — frontend/src/stages/person-detail.ts, person-axes.ts

- Anatomy: breadcrumb, display-size name h1, stat meta line, "Since last time" card (axis trend, promises, reminders), full-width CTA "Start 1:1 with {name}", quiet list of past 1:1s.
- Closest pattern: person profile page (Lattice/HiBob/15Five: header + tabs + primary action).
- **Verdict: HYBRID** (bones right, furniture missing).
- Fights familiarity: no avatar in header (Team and recap-header both show one; identity anchor vanishes where it matters most); no tabs, one flat scroll; axis trend as raw text `+1 → 0 → +2` (person-axes.ts:52-57) next to a system that owns axis bars; full-width blue slab reads banner not button; history rows lack absolute dates/chevrons.
- Fixes: reuse recap-header identity block; Start 1:1 as normal-size accent in header row; shelve body into tabs (reuse ds-tabs); axis bar component; chevron + date on history rows.

## 5a. RUNS ("/runs") — admin/src/stages/runs.ts

- Anatomy: h1 "Past 1:1s" (no lede), right-aligned bar with accent "Start 1:1", stack of button-cards each one flat middot string "Name · Role · Seniority · Type · 2d ago" + optional star.
- Closest pattern: history list (Loom library, Grain/Fathom, Linear list).
- **Verdict: HYBRID leaning CUSTOM.**
- Fights familiarity: no hierarchy inside rows (all fields one 14px dim string, runs.ts:179); no search/filter/grouping/pagination; floating action bar is a fourth header pattern; separate card boxes; header height differs from siblings.
- Fixes: canonical row anatomy (avatar, bold name, second line, star right, chevron); action into page-header row; search/filter + recency grouping; widen.

## 5b. RUN_DETAIL ("/runs/:id") — admin/src/stages/run-detail.ts

- Anatomy: breadcrumb + shared recap header + three tabs (Overview / Recap / Answers).
- Closest pattern: record detail with tabs (Gong/Grain call page).
- **Verdict: STANDARD.** The most familiar screen in the batch; shows the system working.
- Minor: rating card outranks content on Overview; Answers tab could badge the answered count; same 608px as its parent list so list → detail has no width change.

## Why mockups beat the real screens (this batch)

1. Canvas width: mockups fill ~1100-1400px; real screens clamp to 608px beside a 60px rail, wide containers unused.
2. Section rhythm: mockups have three tiers (title, sections, cards); real pages have two at most; big heading over sparse body = "oversimplified" signature.
3. Spacing in practice vs spec: DESIGN.md promises 24px card pad and 24-32px rhythm; reality is 20px (cards.css:11-16), 16/20px (team-card.css:10), 12/16px (start-stage.css:17), 8px list gaps.
4. Visible primary action: mockups spend the accent; Team/Members ship zero blue (ghost sm buttons).
5. Row richness: mockups draw avatar + bold title + grey second line + right affordance; real rows are flat strings. DESIGN.md §5 already specifies the rich row; only team-card.ts implements ~80% of it.

**Verdicts: START CUSTOM · TEAM HYBRID · MEMBERS STANDARD · PERSON_DETAIL HYBRID · RUNS HYBRID/CUSTOM · RUN_DETAIL STANDARD.** The two STANDARD screens are the two that reuse shared components (um-table, recap-header, ds-tabs).
