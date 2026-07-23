# Sero full UX/UI design audit: every page, every persona, plus flows

Date: 2026-07-22 · Read-only audit, no app code changed · Requested by Carl.
Question asked of every screen: is it a known SaaS pattern or a custom invention, and what is fighting familiarity? UX and UI only, no feature suggestions.

Detail per batch (full evidence, file:line): [manager-core](detail/manager-core.md) · [prep-flow](detail/prep-flow.md) · [member-auth](detail/member-auth.md) · [admin-tools](detail/admin-tools.md) · [superadmin](detail/superadmin.md) · [nav-and-flows](detail/nav-and-flows.md)

## Headline

**The app is not fighting standard patterns by philosophy. It is fighting them by accretion.** Every ingredient of a standard SaaS product already exists in the codebase (page-header, breadcrumb.ts, um-table, l-container, session-topbar stepper, recap-header, ds-tabs) and the screens that use them (Members, Run detail, Role words, Review run) are the ones that feel familiar. The screens that feel oversimplified or bespoke are the ones that hand-rolled their own layout inside a deprecated 608px reading column.

Verdict spread across 45 audited surfaces: **12 STANDARD · 19 HYBRID · 14 CUSTOM.**

## The full page table

### Manager: core screens (customer app)

| Page | Route | Verdict | Closest known pattern | What fights familiarity most |
|---|---|---|---|---|
| Home | / | CUSTOM | Notion Home / Loom library | Expand-in-place accordion for recent 1:1s; 3 items, no view-all; near-zero density on a 608px strip |
| Team | /team | HYBRID | Lattice/HiBob people directory | No search/sort/count; one card per person instead of one list; zero blue on the page |
| Members | /members | STANDARD | Slack/Notion members settings | No search; tiny ghost Invite; no avatars; text ⋯ glyph |
| Person detail | /team/:person | HYBRID | Lattice profile page | No avatar in header; no tabs; axis trend as raw text arrows |
| Past 1:1s | /runs | HYBRID→CUSTOM | Loom/Grain history list | Rows are one flat dim string; no search/filter/grouping |
| Run detail | /runs/:id | STANDARD | Gong/Grain call detail | Minor: rating outranks content; no tab count badge |

### Manager: the 1:1 prep flow

| Step | Route | Verdict | Closest known pattern | What fights familiarity most |
|---|---|---|---|---|
| Setup (intake) | /new | HYBRID | Typeform / Stripe onboarding | The flow's own stepper is hidden here; no Back; elastic step count; Continue bottom-left |
| Focus points | /focus | HYBRID | Onboarding multi-select step | Bespoke select cards; staggered reveal; no "N selected" |
| Prepare | /prepare | CUSTOM | Notion AI / Gamma summary | 12 layout variants, 1,004-line CSS; poster-style default; width jump mid-flow |
| Bank | (interstitial) | HYBRID | Generation interstitial | Different loading screen from Eval; no context on page |
| Interview | /interview | CUSTOM | Typeform + AI copilot rail | Overlay covers the stepper; half-screen lavender; 5-button action row; Esc skips |
| Evaluate | (interstitial) | STANDARD-ish | Generation interstitial | Second, different loading treatment |
| Briefing | /briefing | CUSTOM | Results/recap report page | ~2s reveal choreography; crowded bottom-left footer; second section grammar vs briefing-view |
| Debrief (internal) | /debrief | CUSTOM (dev chrome) | CI build summary | The one blue button points away from the journey |
| Monthly Check-in | /guided/:id | CUSTOM | Guided survey | A second design language: own shell, own primary colour, bottom tab bar instead of the stepper |

### Member + auth + content

| Page | Route | Verdict | Closest known pattern | What fights familiarity most |
|---|---|---|---|---|
| Welcome | / (logged out) | HYBRID | Miro/Airtable front door | Log in demoted to mid-page ghost; random stock photo per visit |
| Log in | /login | STANDARD | Airtable/Canva split login | Blue-caps field labels; Forgot link below submit |
| Register | /register | CUSTOM (by accident) | Slack/Notion signup | `auth-card` class undefined in any CSS: whole brand shell missing |
| Forgot / Reset | /forgot-password, /reset-password | STANDARD | Slack/GitHub reset | No show/hide toggle; no Resend button |
| Join (invite) | /join/:token | HYBRID | Slack/Figma invite accept | No logo on a member's first-ever screen; inviter line buried; same undefined `auth-card` |
| Member home | /home | CUSTOM | Member portal home | Inert timeline rows that look dead; parallel `mh-*` widget kit; grey-sentence empty states |
| Run detail (member) | /runs/:id | STANDARD shell | Record detail | Manager voice throughout; in practice unreachable (phantom stage) |
| About / Feedback / Privacy | /about /feedback /privacy | STANDARD | In-app content pages | Privacy's lone bottom Back link; "Who can see it" as one dense paragraph |

### Admin: internal tools

| Page | Route | Verdict | Closest known pattern | What fights familiarity most |
|---|---|---|---|---|
| Library | /library | HYBRID | Airtable/Retool table | Sort pills identical to filter pills; `<ul>` rows, no column headers |
| Compare | /compare | HYBRID→CUSTOM | GitHub compare | Native selects + legacy Load button; three feedback idioms |
| Test engine (personas) | /personas | CUSTOM | CI runs table | Inline styles throughout; card stack with no search/filter; mislabelled eyebrow |
| Phrase review | /lexicon | HYBRID | CMS moderation queue | Session-flow costume; all-or-nothing submit gate |
| Role words | /job-lexicons | STANDARD | CMS master-detail | Minor: bare empty state; two delete idioms |
| Meeting arcs | /meeting-arcs | CUSTOM | Zapier step editor | Parallel button/input system in an injected style block; window.confirm |
| Operator guide | /guide | HYBRID | Stripe/GitBook docs | No sticky TOC; own button class |
| Test prototypes | /test | STANDARD shape | Figma files grid | Own style block; text glyphs; back button not breadcrumb |
| Screen gallery | /gallery | HYBRID→CUSTOM | Storybook | Catalogue behind a closing dropdown instead of a sidebar tree |
| Review run | /run/:id | STANDARD-leaning | Greenhouse scorecard | Back hardcoded to Library regardless of origin; invisible keyboard shortcuts |

### Superadmin

| Page | Route | Verdict | Closest known pattern | What fights familiarity most |
|---|---|---|---|---|
| Live pulse | /pulse | HYBRID | Stripe/Mixpanel dashboard | No time-range control; three hardcoded windows; no delta chips; private table skin |
| Gate 1 | /admin/gate1 | HYBRID | Metric drill-down | Inert rows; doubled bespoke Back control |
| All runs | /admin/runs | HYBRID | Stripe Payments list | No toolbar (search/filters/pagination); rows do not open the run |
| Ratings | /admin/ratings | HYBRID | Intercom ratings | No star histogram; no filter by score |
| Registered | /admin/registered | CUSTOM | Stripe Customers | No search on a user-management screen; bespoke company-card tables; native confirm/alert |
| User detail | /admin/users/:id | CUSTOM | Stripe customer page | No identity header; prose-string card stacks; in-place page swap |
| Error log | /admin/errors | HYBRID | Sentry Issues | No grouping/dedup; no severity; no search |
| Feedback inbox | /admin/feedback | HYBRID | Intercom inbox | No read/done state; only permanent delete; inert runId pill |
| Guest runs | /admin/guests | CUSTOM | Sessions list | Table data as anonymous prose buttons; three nav systems on one screen |

## The seven systemic causes (why it feels custom and oversimplified)

1. **The default canvas is a deprecated 608px reading column.** `.stage-inner` (38rem, marked @deprecated) is used by 18 files including Home, Team, Past 1:1s, Member home and Person detail, while the blessed `.l-container` widths (64/72rem) are used by only the 8 newest admin-ops screens. Five distinct widths churn between sibling pages. Dashboard-shaped pages render as a skinny strip adrift in whitespace: the literal "lonely card on a huge canvas".
2. **The nav shell hides its own labels.** A 60px hover-expanding icon rail that overlays content, instead of the labelled sidebar of Linear/Notion/Slack/Lattice. No global search, no fixed profile entry (it migrates by role and corner), no help entry, no active state during the core flow, and "Start 1:1" means a dashboard for one role and a form for another.
3. **The mandated single table style is barely used.** DESIGN.md §5 demands one table for all lists and `.um-table` exists, yet lists ship as accordions (Home), per-row cards (Team), flat prose strings (Past 1:1s, guest runs, user detail), `<ul>`s (Library), and card stacks (Personas). Almost no list has search, sort, a count, or filters. This is simultaneously why pages feel oversimplified (no toolbar, no columns) and custom (each list invents its own anatomy).
4. **Wayfinding is conditional.** A genuinely good 7-step stepper exists but is hidden on step 1, covered by the interview overlay, and replaced by a bottom tab bar in Guided. The Breadcrumb Rule is followed by ~5 screens while the rest use five different back-button idioms (including doubled top-and-bottom backs and a Back hardcoded to the wrong origin).
5. **25+ micro design systems.** ~9,600 lines of stage CSS vs ~170 lines of shared primitives; four parallel button systems; a 1,004-line stylesheet for one screen; an undefined `auth-card` class that silently strips the brand shell from Register and Join; a parallel widget kit on the member's only daily screen; a second full design language in Guided.
6. **The accent is misspent.** Team and Members (the pages managers live on) ship zero blue because their primary actions are small ghost buttons, while the flow in aggregate runs three different "primary blues" plus a half-lavender screen, and Debrief's only blue button points away from the journey. The One Accent Rule is broken in both directions.
7. **Choreography over immediacy.** Reveal staggers on Focus, Prepare and the Briefing (~2s of staged appearance) where every familiar SaaS renders content instantly. Four different loading treatments; errors navigate away to a separate screen instead of inline retry.

## Why the artifact mockups always look better than the app

A mockup does five things by default that the app currently prevents: one generous container width on every frame; one header grammar reused everywhere; a complete standard shell (labelled sidebar, topbar, search, profile) visible in every frame; rows drawn rich (avatar, bold title, quiet second line, right-side affordance); and everything visible instantly with the accent spent on exactly one button. Every one of those is a consolidation task on primitives that already exist, not new design.

## Recommendations (UX/UI only), in leverage order

**Wave 1: consolidation (mechanical, high payoff)**
1. Retire `.stage-inner` on app screens: list/dashboard pages go to `l-container` medium (64rem), reading pages keep a measure inside it. One width per page type, everywhere.
2. One page-header contract: eyebrow = nav group, h1, lede, actions right, breadcrumb above on any drill-down. Delete every per-screen Back button (both apps).
3. Roll out the `.um-table` recipe + a standard list toolbar (search, count, filter pills, sortable headers, clickable rows) to every list: Home recents, Team, Past 1:1s, Library, Personas, all seven superadmin lists.
4. Define the shared auth shell and apply it to Register and Join (the `auth-card` fix). One costume for the whole auth flow.
5. Kill the four parallel button systems and in-file style blocks; sentence-case neutral field labels on all forms.

**Wave 2: the flow spine**
6. Show the session-topbar stepper on every step from Setup to Recap, compact above the interview split, and reuse it in Guided instead of the bottom tab bar.
7. One wizard footer: ghost Back left, primary Continue right, one exit ("This 1:1" menu) in the topbar. One shared interstitial (centred orb + step label) for Bank and Eval.
8. Default the Briefing to instant render with one soft fade; pick ONE Prepare layout for customers and fence the other eleven behind the admin lab.

**Wave 3: shell upgrades**
9. Labelled sidebar option: pin the rail open at desktop widths (labels always visible), keep the icon rail as the collapsed state the user chooses.
10. Fixed top-right account entry for all roles; restore a Help entry; make nav rows real links.
11. Spend the accent: solid primary Add person / Invite / Start 1:1 in the header row of Team, Members, Past 1:1s; one blue per screen, never zero.

**Member-specific (transparency)**
12. Make Member home look intentional: portal composition at medium width, system inputs, chips for status, a progress bar for goals, real empty states, and a visible caption explaining the privacy boundary instead of dead-looking rows.

## What is already right (protect these)

Members table, Run detail (breadcrumb + recap header + tabs), Forgot/Reset flow, Role words master-detail, Review run scorecard split, the session-topbar stepper itself, token discipline, the pill colour vocabulary, honest plain-language Privacy copy, and the adaptive breadcrumb on run detail. These are the internal references to copy from.
