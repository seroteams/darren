# Standard (reading) text → 16px

**Goal:** Every piece of *reading* text in the app renders at 16px (`--type-body`); 14px stays reserved for labels, metadata, eyebrows, and table headers — exactly as DESIGN.md §3 defines.
**Driver:** Carl
**Created:** 2026-07-06

## Why
DESIGN.md §3 already says body/reading text = 16px and 14px = "metadata, table headers, eyebrows." But a lot of reading text is stuck at 14px via the shared `.hint` class (18 uses) and Tailwind `text-sm` (160 uses). This pass makes usage match the rule. It is a **visible** change (reading text grows 14→16px) — distinct from the size-preserving token migration.

## The rule (the whole job hinges on this)
For every 14px text element, ask: **is the user reading this as content, or scanning it as a label?**

- **→ 16px (`--type-body`) — reading text:** instructional sentences, ledes, helper/hint prose, descriptions, answers, card body copy, empty-state explanations, paragraphs.
- **stays 14px (`--type-body-sm` / `--type-label`) — label/meta:** eyebrows, table/column headers, badges & pills, timestamps and "last met" meta, status text, breadcrumbs & nav, form field labels, captions, keyboard hints, chip text.

When genuinely ambiguous, default to 16px (the rule favours reading) and note it for QA.

## Mechanism
- `.hint` (shared class, `buttons-inputs.css`) → its token `--type-small` → `--type-body`. One change, but it moves all 18 uses — QA covers them.
- Tailwind `text-sm` on reading text → `text-base`; leave `text-sm` on labels/meta.
- Inline `var(--type-small)` / literals on reading text → `var(--type-body)`.

## Done means
- Reading text across the app is 16px; labels/metadata still 14px per the rule.
- No layout breaks from the ~2px growth (that's what per-page QA checks).
- Nothing drops below the 14px floor.

## Phases
| # | Phase | Surface | Status |
|---|---|---|---|
| 1 | Rule + `.hint` bump | The shared `.hint` class → 16px + session-flow ledes | ✅ |
| 2 | Session flow triage | intake, questioning, focus-points, preparation, briefing, onepage, run-debrief `text-sm` | ⬜ |
| 3 | User pages triage | member-home, team, person-detail, start, join, register, login, welcome, privacy, about, runs, run-detail | ⬜ |
| 4 | Admin/internal triage | admin-*, library, compare, personas, review-run, lexicon-review, job-lexicons, guide, feedback, meeting-arcs | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 ✅ done + committed** (Carl tested /new 2026-07-07). `.hint` → 16px (18 uses). Tests 82/82. **Phase 2 (session-flow `text-sm` triage) is next — not started.** One carried-over TODO: the intake lede (`.js-intake-lede`) was deferred in Phase 1 because `intake.js` was held by another session — fold it into Phase 2 when that file is clean. Prior token-migration plan closed in `docs/todo/done/`.

## Parked
- Whether `.hint--kbd` (keyboard hints) should stay 14px even after the base `.hint` bump — it's a caption, likely yes. Decide in Phase 1.
- Converting `text-sm`/`text-base` Tailwind usages to semantic type classes (`.body`/`.label`) instead — bigger refactor, not now.
