# Detail: admin internal toolset (10 pages)

Full agent findings, 2026-07-22. Evidence cited as file:line.

**Headline:** DESIGN.md §5 mandates ONE table style for all lists, and a shared implementation exists (`.um-table`, admin/src/styles/design/admin-tables.css, used by the superadmin screens). None of the ten internal tools uses it. Every list here is a bespoke `<ul>`, card stack, or accordion.

## Verdicts

| Page | Verdict | Closest pattern | Biggest familiarity break |
|---|---|---|---|
| LIBRARY (/library) | HYBRID | Airtable/Retool filterable table | Sort pills visually identical to filter pills (library.js:147-155); custom `<ul>` rows with no column headers; duplicate open affordances; header Back button on a rail page |
| COMPARE (/compare) | HYBRID→CUSTOM | GitHub compare / diff view | Two native selects + a legacy "Load" button; three feedback idioms on one screen; hand-rolled opacity-span save confirmation (compare.js:382,462-465) |
| PERSONAS (/personas) | CUSTOM | CI runs table (GitHub Actions) | Inline styles everywhere (personas.js:133,156-163,382-385); homogeneous data as an unfilterable card stack; wrong eyebrow ("Team" on the Test engine page); two badge systems |
| LEXICON_REVIEW (/lexicon) | HYBRID | CMS moderation queue | Session-flow costume on an admin tool (staggered reveals, "Continue" that resets to START); all-or-nothing gate (submit disabled until EVERY item decided); no bulk actions |
| ROLE_LEXICONS (/job-lexicons) | STANDARD | CMS master-detail editor | Bare one-line empty state; two delete idioms in one list (× vs hover trash); placeholder-only inputs |
| MEETING_ARCS (/meeting-arcs) | CUSTOM | Zapier step editor | A parallel component system in an 84-line injected style block (meeting-arcs.js:12-84): own buttons with INK-dark primary, own inputs; window.confirm for destructive (294,324); "Update" misnamed and over-weighted |
| GUIDE (/guide) | HYBRID | GitBook/Stripe docs | One-shot top TOC instead of sticky side TOC with scrollspy; own `.guide-btn`; Back button + Esc |
| TEST (/test) | STANDARD shape | Figma files / template gallery | Own style block + raw px sizes; text glyphs ↗ ← against Lucide-only; "← All tests" instead of breadcrumb |
| GALLERY (/gallery) | HYBRID→CUSTOM | Storybook | Catalogue hidden behind a dropdown that closes on every pick instead of a persistent sidebar tree; 136-line gold parallel kit without a DESIGN.md exemption; raw ⚡ emoji |
| REVIEW_RUN (/run/:id) | STANDARD-leaning | Greenhouse scorecard split view | Back hardcoded to Library regardless of origin (review-run.js:125); raw run id leads the meta line; excellent keyboard shortcuts are invisible |

## Cross-tool consistency: FAILING

1. Four parallel button systems: `.btn`, `.arc-btn` (ink-dark primary), `.guide-btn`, `.gal__screens-btn`. Primary buttons change colour, radius and weight between pages.
2. Page-scoped `<style>` blocks in 4 of 10 files: the literal mechanism of drift.
3. Zero adoption of the mandated shared table: lists render as pill-filtered `<ul>` (Library), unfiltered card stack (Personas), accordion (Meeting arcs), card grids (Test/Gallery).
4. Five back-navigation idioms, none the mandated breadcrumb. Zero of ten pages follow the Breadcrumb Rule.
5. Inconsistent header eyebrows that do not match the nav's Work/Engine/Build/Operate groups; Personas mislabels itself "Team".
6. Three loading-state idioms, no skeletons.
7. Divergent feedback idioms: label-swap, opacity span, status pill with retry, window.confirm.

## Highest-leverage systemic fixes

1. One list component (`.um-table` recipe + standard toolbar: search, filter pills, count) across Library and Personas first.
2. One page-header contract: eyebrow = nav group, H1 = page name, actions right, no Back buttons; breadcrumbs on all drill-downs.
3. Kill the four local button/input systems and in-file style blocks; give genuinely dev-chrome surfaces (Gallery toolbar) an explicit DESIGN.md exemption.
4. One feedback contract: toast for saves, status-pill+retry for autosave, shared confirm dialog for destructive.

Best internal references: REVIEW_RUN (sticky scorecard split, autosave, keyboard) and ROLE_LEXICONS (master-detail). Furthest from the system: PERSONAS and MEETING_ARCS; rebuild those first.
