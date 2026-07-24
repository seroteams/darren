# Re-audit: the same lens, after design consolidation P0-P6

Date: 2026-07-24 · Read-only closing pass (design-consolidation Phase 7) · No app code changed.

**Method.** Same question as the 2026-07-22 audit, per screen: is it a known SaaS pattern or a custom invention, and what still fights familiarity? Same verdicts: STANDARD (a known pattern, nothing fighting it), HYBRID (a known pattern with bespoke elements still fighting it), CUSTOM (an invention with no mainstream equivalent). Every screen was re-judged from today's source under `admin/src/stages/` and `frontend/src/stages/` plus the shared kit (`admin/src/ui/`, `admin/src/styles/`); the evidence file is named in each row. Code reading was decisive on every screen, so no rendered checks were run; no paid runs.

## Headline

| | Standard | Hybrid | Custom | Surfaces |
|---|---|---|---|---|
| Original audit (2026-07-22) | 12 | 19 | 14 | 45 |
| **Today (2026-07-24)** | **34** | **9** | **2** | 45 |

Of today's two Customs, one is the Screen gallery toolbar, a declared DESIGN.md exemption. The other, Guest runs, is a genuine straggler (below). "0 CUSTOM outside declared exemptions" is therefore one screen away from true.

## The full verdict table

Counting matches the original: Forgot and Reset count as two surfaces, About / Feedback / Privacy as three.

### Manager: core screens

| Screen | Original | New | Why (evidence file) |
|---|---|---|---|
| Home / | CUSTOM | STANDARD | Rich avatar rows in one card, row click opens, "See all" link, shared page header at medium width, Lucide icons, shared skeleton (start-core.js) |
| Team | HYBRID | STANDARD | Shared toolbar (search + count), one card of divider rows, solid "Add person" accent, row actions behind a Lucide ⋯ menu (team.ts, team-card.ts) |
| Members | STANDARD | STANDARD | um-table with avatars, toolbar search + count, solid "Invite people" accent (members.ts, members-table.ts) |
| Person detail | HYBRID | STANDARD | Recap-header identity block with avatar, breadcrumb, ds-tabs shelf, real axis bars replace the text arrows (person-detail.ts, person-axes.ts) |
| Past 1:1s | HYBRID→CUSTOM | STANDARD | Canonical rows with recency groups, toolbar search + count, Start 1:1 as the header's one accent (runs.ts) |
| Run detail | STANDARD | STANDARD | Breadcrumb + recap header + three ds-tabs; rating now sits below the read on Overview. Answers tab still has no count badge (run-detail.ts) |

### Manager: the 1:1 prep flow

| Screen | Original | New | Why (evidence file) |
|---|---|---|---|
| Setup (intake) | HYBRID | STANDARD | The topbar stepper now covers Setup; shared wizard footer with a real Back trail; the bespoke fill bar is gone (intake.js, session-topbar.js) |
| Focus points | HYBRID | STANDARD | Checkbox cards with a selected count, one fade with no stagger, inline error + retry (focus-points.js, focus-points-card.ts) |
| Prepare | CUSTOM | HYBRID | ONE customer layout on the reading column; but the 11-variant lab and its 988-line stylesheet stay resident behind the internal switcher, and a light two-block reveal remains (preparation.ts, preparation.css) |
| Bank | HYBRID | STANDARD | The shared flow interstitial (orb + step label + skeleton) with inline retry (bank.js, ui/flow-interstitial.ts) |
| Interview | CUSTOM | HYBRID | Stepper visible above the split, calm coach panel, three-button wizard row, Esc-skip gone, Enter is a newline; the full-screen 50/50 overlay itself stays a deliberate bespoke signature (questioning.js, questioning-actions.ts) |
| Evaluate | STANDARD-ish | STANDARD | The same shared interstitial as Bank, inline retry (eval.js) |
| Briefing | CUSTOM | HYBRID | Whole recap in the DOM before first paint, one soft fade, shared wizard footer with the primary bottom-right; the multi-act report composition remains its own (briefing.js) |
| Debrief (internal) | CUSTOM (dev chrome) | STANDARD | Page header + wizard footer; Continue is the primary, Copy QA prompt a ghost; internal-only (run-debrief.js) |
| Monthly Check-in | CUSTOM | HYBRID | Rebased on the app shell: breadcrumb, page header, card-flat, top stepper in the stage-step language; mcr-* retired, though the gd-* guided composition is still its own (guided/guided.page.ts, guided.css) |

### Member + auth + content

| Screen | Original | New | Why (evidence file) |
|---|---|---|---|
| Welcome | HYBRID | STANDARD | Log in as a quiet top-right link, one fixed brand photo, one blue guest CTA (welcome.ts) |
| Log in | STANDARD | STANDARD | Auth split shell, neutral dim field labels, show/hide password toggle (login.js) |
| Register | CUSTOM (by accident) | STANDARD | Wears the full auth-split brand shell; the undefined auth-card class is gone (register.js) |
| Forgot / Reset (2) | STANDARD | STANDARD | Same shell; Resend email button on the confirmation; the shared password toggle (forgot-password.js, reset-password.js) |
| Join (invite) | HYBRID | STANDARD | Logo on top, identity hero naming inviter and org, what-you-see facts list, Log in footer, distinct dead-invite state (join.js) |
| Member home | CUSTOM | STANDARD | Portal composition at medium width: recent 1:1 card, timeline with the privacy caption, Requests and Goals cards; the mh-* kit is deleted (member-home.js, member-home-view.ts) |
| Run detail (member) | STANDARD shell | STANDARD | Role-routed and reachable; the crumb names "Your 1:1s" in the member's voice (run-detail.ts) |
| About / Feedback / Privacy (3) | STANDARD | STANDARD | Privacy's breadcrumb sits on top replacing the bottom Back; "Who can see it" is a label/value list; About speaks in the member's voice for members (privacy.js, about.js, feedback.js) |

### Admin: internal tools

| Screen | Original | New | Why (evidence file) |
|---|---|---|---|
| Library | HYBRID | STANDARD | um-table + shared toolbar (search, filter chips, count), sortable, row ⋯ menu (library.js) |
| Compare | HYBRID→CUSTOM | HYBRID | Page header and tokens, but the native select + Load picker and the cmp- kit survive; the one audited screen no plan phase ever scoped (compare.js) |
| Test engine (personas) | CUSTOM | STANDARD | um-table rows, page header, shared skeleton; the single inline style left is a data-driven bar width (personas.js) |
| Phrase review | HYBRID | STANDARD | Admin costume: tabs, per-row Keep/Drop, checkbox bulk actions, partial save, rows render at once (lexicon-review.js) |
| Role words | STANDARD | STANDARD | Master-detail with role search, unchanged bones (job-lexicons.js) |
| Meeting arcs | CUSTOM | HYBRID | Shared .btn/.input primitives and the shared confirm now, but a page-scoped style block and the arc- kit remain (meeting-arcs.js) |
| Operator guide | HYBRID | HYBRID | Medium width + page header, though its in-file ARC_STYLE block and own composition remain (guide.js) |
| Test prototypes | STANDARD shape | STANDARD | Breadcrumb replaces the back button; the in-file style block stays on this internal mock gallery (test.js) |
| Screen gallery | HYBRID→CUSTOM | CUSTOM (declared exempt) | The edit bar deliberately stays a top toolbar; exemption declared in DESIGN.md (stages/gallery/) |
| Review run | STANDARD-leaning | STANDARD | Origin-aware breadcrumb replaces the hardcoded Back to Library; shortcuts still lack an on-screen legend, noted below (review-run.js) |

### Superadmin

| Screen | Original | New | Why (evidence file) |
|---|---|---|---|
| Live pulse | HYBRID | HYBRID | One 7/30/90 range control, uniform KPI tiles with delta chips, um-table skin; but a page-scoped style block and the private lp- kit remain, and the screen has no solid primary (admin-pulse.ts) |
| Gate 1 | HYBRID | STANDARD | Wide container, toolbar + filter chips, um-table, rows open the manager's record (admin-gate1.ts) |
| All runs | HYBRID | STANDARD | Toolbar (search + External/Internal/Guest chips), rows open the read-only briefing, breadcrumbs (admin-runs.ts) |
| Ratings | HYBRID | STANDARD | Star histogram above the table, toolbar + score filter, rows open the run (admin-ratings.ts) |
| Registered | CUSTOM | STANDARD | One flat um-table with Company column, search + role/status chips, shared confirm (admin-registered.ts) |
| User detail | CUSTOM | HYBRID | Identity header, 1:1s as um-table, breadcrumbs; but the shell is still the 38rem .stage-inner and a run opens by in-place innerHTML swap (admin-user-detail.ts) |
| Error log | HYBRID | STANDARD | Grouped issues with count + last seen, Unresolved/Resolved/All tabs, env and source filters, search (admin-error-log.ts) |
| Feedback inbox | HYBRID | STANDARD | New/Done/Archived/All tabs, collapsed two-line cards, triage and delete behind ⋯ with the shared confirm (admin-feedback.ts) |
| Guest runs | CUSTOM | CUSTOM | Still one-line prose buttons (no table, no toolbar), a crumb trail rendered twice (top and bottom), 38rem shell. The one audited screen P0-P6 never touched (admin-guest-runs.ts) |

## The seven systemic acceptance items (S1-S7)

| Item | Verdict | Evidence |
|---|---|---|
| S1 One width per page type; .stage-inner retired from app screens | **NOT VERIFIED** | Every list/dashboard did move (stage-medium or l-container--wide, grep-confirmed), but `.stage-inner` still shells 14 files and is still marked @deprecated (base.css:311); Admin user detail (admin-user-detail.ts:133) and Guest runs (admin-guest-runs.ts:54) are consoles, not reading pages, yet sit on the 38rem measure; the prep flow still changes width step to step (38rem, reading, medium, full, wide) |
| S2 Labelled sidebar, fixed account entry, help entry, real nav links | **VERIFIED** | app-nav.js: pinned open is the default (collapse is the user's choice), labels always visible, rows render as real `<a href>` links, account lives in the fixed top-right avatar menu, Guide restored as the internal help row |
| S3 One table style + toolbar on every list | **NOT VERIFIED** | Shared listToolbar + um-table or the canonical row recipe on every list checked (Home, Team, Members, Past 1:1s, Library, Personas, Gate 1, All runs, Ratings, Registered, Error log, Feedback inbox) except Guest runs: prose rows, no toolbar (admin-guest-runs.ts:35-45) |
| S4 Breadcrumbs on every drill-down; zero per-screen Back buttons | **NOT VERIFIED** | Breadcrumbs everywhere, including the origin-aware Review run (review-run.js:116-146) and Privacy; the last back furniture is Guest runs' doubled trail (header plus `.pd-back-bottom`, admin-guest-runs.ts:54); dev-only test mocks under stages/tests/ keep "← Back" |
| S5 One button/input system; zero page-scoped style blocks outside exemptions; parallel namespaces deleted | **NOT VERIFIED** | mh-*, mcr-* and the undefined auth-card are gone and buttons/inputs ride the shared kit; but four page-scoped `<style>` blocks survive outside the declared exemptions: admin-pulse.ts:244, meeting-arcs.js:13, guide.js:278, test.js:154 (gallery and dev chrome are exempt) |
| S6 One accent per screen, never zero | **VERIFIED** | Confirmed in source on every key screen: Team "Add person", Members "Invite people", Home "Start a new 1:1" (with an accent-budget swap during recovery, start-core.js:79), Past 1:1s and Person detail "Start 1:1", one primary per auth form, Briefing and Debrief wizard primaries. The read-only Pulse console carries none; its only actions are drill-ins |
| S7 Instant content; one loading treatment; inline error + retry | **VERIFIED** | One shared interstitial for Bank and Eval (ui/flow-interstitial.ts), Briefing fully in the DOM before first paint with one soft fade (briefing.js:221-226), Focus one fade with no stagger (focus-points.js:92), the standard skeleton on every loading state, inline error + retry across the flow and the admin lists. Residual: Prepare fades in two blocks 80ms apart (preparation.ts:157) |

## Stragglers

Nothing was fixed in this pass: P7 adds no scope. These are the follow-ups.

1. **Guest runs (/admin/guests) is still Custom, outside the exemptions.** No acceptance item ever covered it (D1-D12 skip it). Rows are anonymous prose buttons, there is no um-table or toolbar, the crumb trail renders twice, and the shell is the 38rem measure. One D-item-sized follow-up closes the last Custom.
2. **`.stage-inner` is not retired.** Still @deprecated in base.css yet the shell of 14 files. Reading pages keeping a measure matches the plan's intent, but Admin user detail and Guest runs are consoles, and the prep flow still changes width step to step. S1 cannot be ticked as written; either finish the retirement or rewrite S1 to bless the reading measure.
3. **Four page-scoped style blocks outside the declared exemptions**: Pulse, Meeting arcs, Guide, Tests. All token-clean and layout-only, but S5's "zero page-scoped style blocks" is not literally true. Move them to stage CSS files or declare them.
4. **Admin user detail opens a run by in-place innerHTML swap**, not a route or panel (D10's letter), on top of the 38rem shell.
5. **Review run has no visible shortcut legend.** The keyboard contract (arrows, P/F, N, C, Esc) exists but is still invisible (D6 asked for a legend).
6. **Run detail's Answers tab has no count badge** (the unfinished half of M7).
7. **Compare (/compare) was never scoped into the plan.** Native selects + Load button + the cmp- kit stand as at the original audit. Hybrid, not Custom, so it does not breach "Done means", but it is the most dated internal screen left.
8. **Auth field labels are still small caps.** They went from blue caps to quiet dim caps (`.eyebrow--slot`), but A4 said sentence case. Cosmetic.

## Post-fix addendum (2026-07-24, same day)

The eight stragglers above were triaged the same day. Six were audit acceptance items and are
now FIXED and re-verified by grep + the full free-check suite (184/184, typecheck, both linters):

- Guest runs: rebuilt on um-table + shared toolbar, one Pulse trail, skeleton loading. Verdict
  moves Custom -> Standard, so the count is now 35 Standard / 9 Hybrid / 1 Custom, and the one
  Custom (Screen gallery) is a declared DESIGN.md exemption. 0 Custom outside exemptions: TRUE.
- S1: `.stage-inner` fully retired (0 non-test references; rule deleted from base.css). The run
  flow keeps two deliberate widths (reading width for Setup/Focus/Recap, medium for the question
  screens); whether to unify is Carl's call at the P7 walk, park-able.
- S3, S4: TRUE with Guest runs fixed (last non-table list, last doubled trail).
- S5: TRUE. The four page-scoped <style> blocks (Pulse, Meeting arcs, Guide, Test) moved to real
  CSS files; 0 inline style blocks remain in either app's stages.
- D6 shortcut legend and M7 Answers badge: present (rv-keys / rd-tab__n); A4 labels sentence-case.

Still open by choice, for Carl at the walk: flow-width unification (above), the Prepare variant
lab CSS (~600 lines held for the 12-layout lab; deleting it is the standing P4 fork), and
Compare (internal dev tool, Hybrid, never in the audit's scope).

CSS trend vs the P0 baseline: 9,874 lines in .css files then (plus several hundred more hiding
in inline <style> blocks) -> 9,680 now with zero inline blocks, while the shared kit (toolbar,
tables, stepper, save pip, confirm) was added. Namespaces deleted end-to-end: mcr-*, mh-*,
auth-card, .arc-btn, .guide-btn, .lib-controls rows, .pd-back, .lp-table, stage-inner.
Fresh gallery baseline: 42/45 captured, 0 failed (3 customer-app skips are the exporter's known
limitation, unchanged from P0).
