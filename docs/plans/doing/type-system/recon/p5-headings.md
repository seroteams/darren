# Recon: p5-headings

_Read-only inventory, 2026-07-30. Source of truth for the build._

> **Read-only pass. Nothing was written, edited or created.** Every number below was measured from the tree at commit `b662b101` (a parallel session committed `type.css` + `phase-5.md` mid-audit; I re-read both and this inventory is against the CURRENT file, not my first read).

---

# 0. THE ONE THING THAT CHANGED UNDER ME

`admin/src/styles/design/type.css` is now **308 lines**, not 301. Commit `b662b101` ("type-system P2 fixes: the phone stem and the coach column") changed the phone block:

```css
@media (max-width: 639.98px) {
  .type-heading-xl, .cp-screen .question-stem,
  .questioning-card .question-stem, .flow-section .question-stem {
    font-size: var(--type-size-xl);      /* 20px — NOT 2xl/24px any more */
    line-height: var(--type-leading-xl); /* 28px */
  }
}
```

The phone rung for `heading-xl` is now **20/28**, not 24/32. Every "after" number below uses 20. `phase-5.md` also gained a **"Carried in from Phase 2's verification"** section about `admin/src/stages/tests/runner-v2.js`. Re-read both files before building.

---

# 1. HEADINGS — EVERY SELECTOR, TODAY'S SIZE AT 1440px, AND ITS ROLE

## 1a. What the tokens actually resolve to at 1440px

`html { overflow-y: scroll }` (base.css:15) is set, and `vw` includes the scrollbar, so a 1440px window = 1440 vw units.

| Token | Definition (tokens.css) | at 1440px | at 390px (phone) |
|---|---|---|---|
| `--type-display` | `clamp(1.875rem, 5vw, 2.625rem)` | 5vw = 72 → capped **42px** | `mobile.css:350` overrides to `1.9rem` = **30.4px** |
| `--type-h1` | `clamp(2rem, 4.2vw, 2.75rem)` | 4.2vw = 60.48 → capped **44px** | `mobile.css:351` → `1.6rem` = **25.6px** |
| `--type-h2` | `clamp(1.75rem, 3.5vw, 2.25rem)` | 3.5vw = 50.4 → capped **36px** | `mobile.css:352` → `1.35rem` = **21.6px** |
| `--type-h3` | `1.25rem` | **20px** | 20px (no override) |
| `--type-h4` | `1.125rem` | **18px** | 18px (no override) |
| `--type-body` | `16px` | 16px | 16px |
| `--type-body-lg` | `1.0625rem` | **17px** | 17px |
| `--type-body-md` | `15px` | 15px | 15px |
| `--type-body-sm` | `14px` | 14px | 14px |

## 1b. The DISPLAY / HERO tier → `.type-display` (36/40)

| # | file:line | selector | today @1440 | verdict |
|---|---|---|---|---|
| H1 | `admin/src/styles/design/base.css:56` | `.text-display` | 42px / lh 1.1 = **46.2px**, display face, 600, −0.02em, balance | → `.type-display` 36/40. **Only 2 markup uses, both in `admin/src/stages/design.js` (215, 830)** — the internal design sheet that Phase 6 rewrites. Near-zero customer risk. |
| H2 | `admin/src/styles/design/base.css:65` | `.h1` | 42px / **46.2px**, display face, 600, −0.02em, balance | **MUST SPLIT — see §1c.** |
| H3 | `admin/src/styles/design/briefing.css:4` | `.briefing-headline` | 42px / lh 1.14 = **47.88px**, 600, −0.02em, `max-width: 40rem` | → `.type-display` 36/40. One markup use: `briefing.js:107`. The Recap hero. `briefing.css` is a **Phase 4** file and is in **my** lane. |

`--type-display` has exactly **three shipped consumers** (base.css ×2, briefing.css ×1), plus `admin/tailwind.config.js:58` and one parked gallery file.

## 1c. `.h1` must split — the plan's own test scenarios demand two different sizes

`phase-5.md` scenario 1 says the welcome heading goes **42 → 36**. Scenario 2 says page titles land at **30**. Both surfaces wear `class="h1"` today. A single rename cannot satisfy both.

- **`admin/src/stages/start-welcome.ts:148`** — `<h1 class="h1">${HEADLINE}</h1>` inside `.start-welcome__intro`. **This is the welcome hero → `.type-display` (36/40).**
- **`admin/src/ui/page-header.ts:19`** — `const h1 = \`<h1 class="h1">${escapeHtml(opts.title)}</h1>\``. **This is every page title in the admin console → `.type-heading-xl` (30/36).**
- The other 34 literal `class="h1"` sites are per-stage page titles → `.type-heading-xl`.

**Phone regression, unflagged anywhere in the plan:** `.type-display` has **no phone rung** in `type.css`. Today the welcome hero on a 390px screen is 30.4px (via `mobile.css:350`). After the sweep it becomes **36px — it GROWS by 5.6px on a phone**, on the exact screen whose phone shot (Carl, 27 Jul) motivated the responsive block. Either add `.type-display` to the `@media (max-width: 639.98px)` block in `type.css` (dropping it to `--type-size-3xl` 30/36), or the welcome screen regresses on mobile. `.type-heading-lg` has the same shape of problem in the other direction: 21.6 → 24 on a phone.

## 1d. `heading-lg` tier (24/32) — everything at 36px or 28px today

| # | file:line | selector | today @1440 | role | note |
|---|---|---|---|---|---|
| H4 | `base.css:75` | `.h2` | **36px** / lh 1.2 = 43.2, display, 600, −0.01em | `.type-heading-lg` 24/32 | 16 markup uses (9 of them in `guide.js`, 4 in `design.js`) |
| H5 | `admin-tables.css:110` | `.ud-nameline .rd-name` | **36px** / 43.2 (lh 1.2 from `.rd-name`), display, **700** | `.type-heading-lg` 24/32 | This is scenario 3's "person's name drops 36 → 24". Weight also drops 700 → 600. `admin-tables.css` is in **my** lane. |
| H6 | `auth.css:118` | `.join-hero` | **36px**, weight 500 | `.type-heading-lg` | Loses `--type-h2`. `.join-hero strong` at `auth.css:122` is `--type-weight-bold` (retiring) |
| H7 | `auth.css:177` | `.auth-card .auth-brand__title` | **36px** / lh 1.1 = 39.6 | `.type-heading-lg` (or `heading-xl` — see open questions) | Specificity 0,2,0 — beats `.auth-brand__title` |
| H8 | `frontend/src/stages/preparation-lab.css:513` | `.pv-f__opener` | **36px** / lh 1.25 = 45, display, 600, −0.01em | `.type-heading-lg` | Variant-lab file (satellite) |
| H9 | `admin-tables.css:385` | `.star-rating__star` | **28px** / lh 1 | **glyph** — not a heading | `★` glyph. Guard's only `off-ladder-font` hit at 28px. Do not put it on a text role. |
| H10 | `buttons-inputs.css:56` | `.input` | `clamp(1.25rem, 3.5vw, 1.75rem)` = **28px** @1440, 20px @≤571px | **control** — judgement | The underlined text input on intake, feedback, forgot-password, briefing notes, job-lexicons. 28px is off-ladder. `buttons-inputs.css` is a **Phase 4** file. |
| H11 | `design-stage.css:512` | `.ds-star` | **24px** / lh 1 | **glyph** | internal design sheet |

## 1e. `heading-md` tier (20/28) — everything at `--type-h3` today

**Face change to flag:** `.h3` is currently the **base** family. `.type-heading-md` is the **display** family (Bricolage) plus `text-wrap: balance`. Every `.h3` in the app changes typeface, not just leading.

| # | file:line | selector | today @1440 | role |
|---|---|---|---|---|
| H12 | `base.css:84` | `.h3` | 20px / lh 1.35 = **27px**, 600, base family | `.type-heading-md` 20/28, display face |
| H13 | `base.css:260` | `.ident-name` | 20px / lh 1.25 = 25, display, 600, −0.01em | **DELETE.** Zero markup uses anywhere in either app (grepped `.js/.ts/.html`) — it is scaffolding from an adoption pass that never happened. |
| H14 | `auth.css:106` | `.join-org-tile` | 20px, display, 600 | **glyph** — a 56px brandmark tile holding one letter, not a heading |
| H15 | `about-stage.css:40` | `.about-sec__title` | 20px, 600 | `.type-heading-md` (Phase 4 file) |
| H16 | `run-detail.css:21` | `.rd-name` | 20px / lh 1.2 = 24, display, **700** | `.type-heading-md` (weight 700 → 600). Phase 4 file. |
| H17 | `run-log.css:76` | `.run-log__stat-value` | 20px / 24, 600 | see §3 — the plan wants this on `metric` (→ 30px). **Judgement.** Satellite sheet. |
| H18 | `stage-review.css:89` | `.stage-review__section-title` | 20px, 600 | `.type-heading-md` |
| H19 | `frontend/src/stages/guided/guided.css:239` | `.gd-sum h3` | 20px, display | `.type-heading-md` |
| H20 | `guided.css:331` | `.gd-panel__title` | 20px / 25, display, **700** | `.type-heading-md` |
| H21 | `preparation-lab.css:599` | `.pv-g__opener` | 20px / 25, display, 500 | `.type-heading-md` |
| H22 | `preparation-lab.css:803` | `.pv-j__opener` | 20px / 25, 500, `max-width: var(--measure)` | `.type-heading-md` |
| H23 | `frontend/src/stages/preparation.css:124` | `.pv-l__hero-theme` | 20px / 25, display, 600 | `.type-heading-md`. **Customer app, ships to managers.** |
| H24 | `add-person-modal.css:18` | `.apm__title` | `1.25rem` = 20px / lh 1.3 = 26, display, 600, −0.01em | `.type-heading-md`. Satellite; **not named in any phase file.** |

## 1f. `heading-sm` (18/28) and `body-lg` (18/28) — everything at `--type-h4` today

| # | file:line | selector | today @1440 | role | kind |
|---|---|---|---|---|---|
| H25 | `base.css:90` | `.h4` | 18 / lh 1.5 = **27px**, 600 | `.type-heading-sm` | heading — 6 markup uses, all `design.js` |
| H26 | `base.css:96` | `.lead` | 18 / lh 1.6 = **28.8px**, 400 | `.type-body-lg` 18/28 (+ `--measure-lede`) | prose — 4 markup uses, all `design.js` |
| H27 | `admin-tables.css:153` | `.um-menu-btn` | 18 / lh 1, `letter-spacing: 1px` | **glyph** — the `⋯` row overflow button | glyph |
| H28 | `app-nav.css:147` | `.app-nav__word` | 18, **700**, −0.01em | `.type-heading-sm` (600) or a brand exception | chrome |
| H29 | `mobile.css:57` | `.app-nav-mobilebar__brand` | 18, **700**, −0.01em | same as H28 | chrome |
| H30 | `session-topbar.css:49` | `.session-topbar__brand-word` | 18, **700**, **display face** | `.type-heading-sm` (base face) | chrome — guard `display-face-below-20` hit |
| H31 | `buttons-inputs.css:33` | `.btn--lg` | 18 | judgement: 16 or 18 | control |
| H32 | `design-stage.css:39` | `.ds-rail__title` | 18, display, 600 | `.type-heading-sm` | heading — guard `display-face-below-20` hit |
| H33 | `notes-panel.css:384` | `.modal__message` | 18 / lh 1.4 = 25.2, 600 | `.type-heading-sm` | heading |
| H34 | `promise-agree.css:123` | `.pa-add__plus` | 18 / lh 1 | **glyph** — a `+` | glyph |
| H35 | `stage-extras.css:137` | `.cl-phase-title h3` | 18, 600 | `.type-heading-sm` | heading |
| H36 | `stage-extras.css:329` | `.notes-quote` | 18 / lh 1.55 = 27.9 | `.type-body-lg` | prose |
| H37 | `stage-review.css:159` | `.stage-review__headline` | 18 / 25.2, 600 | `.type-heading-sm` | heading |
| H38 | `finish-feedback-modal.css:6` | `.ffm__title` | `var(--type-h4, 18px)` = 18, 600 | `.type-heading-sm` | heading |
| H39 | `test-gallery.css:26` | `.tg-card__title` | 18, display, 600 | `.type-heading-sm` | heading — guard hit |
| H40 | `guided.css:365` | `.gd-rec__block h3` | 18, display | `.type-heading-sm` | heading — guard hit |
| H41 | `preparation-lab.css:470` | `.pv-e__lead` | 18 / lh 1.6 = 28.8 | `.type-body-lg` | prose |
| H42 | `preparation-lab.css:936` | `.pv-h__opener` | 18 / lh 1.5 = 27, 500 | `.type-body-lg` | prose |
| H43 | `preparation-lab.css:355` | `.pv-a__confidence` | 18 / 28.8 | **Phase 4** sends this to `.type-label` (14) | chrome |
| H44 | `run-detail.css:7` | `.rd-avatar` | `1.125rem` = 18 | avatar initials → `.type-label-strong` flat | glyph |
| H45 | `admin-pulse.css:24` | `.lp-tile__value .lp-den` | 18, 500 | KPI denominator — see §3 | numeric |
| H46 | `about-stage.css:103` | `.about-how__title` | `--type-body-lg` = **17px**, 600, lh 1.1 | `.type-heading-xs` (16) | heading |
| H47 | `frontend/src/styles/team-card.css:44` | `.team-card__name-btn` | `--type-body-lg` = **17px**, display face, 600, −0.01em | `.type-heading-xs` 16/24 | heading — guard `display-face-below-20` at 17px. **Customer app. `team-card.css` is named in NO phase file.** |

## 1g. `heading-xs` tier (16/24) — 16px at weight ≥600

| # | file:line | selector | today | role |
|---|---|---|---|---|
| H48 | `admin-pulse.css:36` | `.lp-card h3` | 16, 600 | `.type-heading-xs` |
| H49 | `buttons-inputs.css:177` | `.bench-flow__title` | 16 / lh 1.25 = 20, 600 | `.type-heading-xs` |
| H50 | `meeting-arcs.css:29` | `.arc-phase__label` | 16, 600 | `.type-heading-xs` |
| H51 | `ux-audit-fixes.css:22` | `.btn--cta` | `var(--type-body, 1rem)` = 16, 600 | **control** |
| H52 | `guided.css:94` | `.gd-q__stem` | 16, **700** | `.type-heading-xs` — the question stem's 4th home (Phase 4 names it) |
| H53 | `guided.css:202` | `.gd-block__label` | 16, **700** | `.type-heading-xs` |
| H54 | `preparation.css:205` | `.pv-rate__q` | 16, 600 | `.type-heading-xs` |
| H55 | `buttons-inputs.css:239` | `.cmp-delta` | 16, 600 | numeric — see §3 |

## 1h. Two odd sizes that are glyphs, not headings

| # | file:line | selector | today | verdict |
|---|---|---|---|---|
| H56 | `meeting-arcs.css:18` | `.arc-chip__sep` | `1.1rem` = **17.6px** | `·` separator. Glyph. |
| H57 | `design/test-engine.css:134` | `.joblex-remove` | `1.05rem` = **16.8px** | `×` remove button. Glyph. |

## 1i. The ten alias classes' full before/after (base.css)

| class | today @1440 | after (role) | line-height delta |
|---|---|---|---|
| `.text-display` | 42 / 46.2 | `type-display` 36 / 40 | −6.2px |
| `.h1` (hero) | 42 / 46.2 | `type-display` 36 / 40 | −6.2px |
| `.h1` (page title) | 42 / 46.2 | `type-heading-xl` 30 / 36 | −10.2px |
| `.h2` | 36 / 43.2 | `type-heading-lg` 24 / 32 | −11.2px |
| `.h3` | 20 / 27 | `type-heading-md` 20 / 28 | +1px, **face changes to Bricolage** |
| `.h4` | 18 / 27 | `type-heading-sm` 18 / 28 | +1px |
| `.lead` | 18 / 28.8 | `type-body-lg` 18 / 28 | −0.8px, gains `--measure-lede` |
| `.body` | 16 / 25.6 | `type-body` 16 / 24 | −1.6px, gains `--measure` |
| `.label` | 14 / 21, tracking 0.04em | `type-label` 14 / 20, tracking **0.02em** | −1px, tracking halves |
| `.caption` | 14 / **21.7** (inherits body 1.55) | `type-body-sm` 14 / 20 | −1.7px, gains `--measure` |
| `.eyebrow` | 14 / **21.7** (inherits), 0.08em, uppercase | `type-overline` 14 / 20 | −1.7px, tracking identical |

---

# 2. THE INVERTED LADDER — CONFIRMED, BUT ITS BLAST RADIUS IS ONE SELECTOR

**Confirmed.** `--type-h1` maxes at 44px, `--type-display` at 42px, so above a certain viewport width `h1` renders larger than `display`.

**The exact crossover, which the plan does not state:** the inversion is **desktop-only**.
- `display` reaches its 42px cap at viewport ≥ **840px** (5vw ≥ 42).
- `h1` reaches its 44px cap at viewport ≥ **1047.6px** (4.2vw ≥ 44).
- They are **equal at 42px at exactly 1000px**. Below 1000px, `display` (5vw) is **larger** than `h1` (4.2vw) — the ladder is correctly ordered. Above 1000px the inversion opens up, reaching its full 2px at 1047.6px and staying there.

**Consumers of `--type-h1` (4 total, 3 parked):**

| file:line | selector | today @1440 | after |
|---|---|---|---|
| `admin/src/styles/design/auth.css:48` | `.auth-brand__title` | **44px** / lh 1.1 = 48.4, display face, **weight 700**, balance | `.type-heading-xl` **30 / 36**, weight 600 |
| `admin/src/stages/tests/how-it-works.js:230` | `.hw-h1` | 44px | parked gallery |
| `admin/src/stages/tests/welcome-lean.js:83` | `.wl-h1` | 44px | parked gallery |
| `admin/src/stages/tests/welcome-options.js:83` | `.wo-h1` | 44px | parked gallery |

**And `.auth-brand__title` only renders at 44px on two live screens.** Everywhere else it is overridden:
- `admin/src/stages/login.js:172`, `admin/src/stages/register.js:35`, `frontend/src/stages/welcome.ts:24` — inside `.auth-card`, so `auth.css:177` (`.auth-card .auth-brand__title`, specificity 0,2,0) wins → **36px**.
- `frontend/src/stages/join.js:62` and `:81` — carry `.join-hero` too; `auth.css:118` is later in source at equal specificity → **36px, weight 500**.
- **`admin/src/stages/forgot-password.js:23`** ("Reset your password") and **`admin/src/stages/reset-password.js:25`** ("Choose a new password") — bare `.auth-brand__title`. **These two screens are the only place in the shipped product where the inverted 44px actually paints.** Both go 44 → 30 (−14px), the single largest reduction in the phase.

**Consumers of `--type-display` (5 total):**

| file:line | selector | today @1440 | today @390 | after |
|---|---|---|---|---|
| `base.css:58` | `.text-display` | 42 | 30.4 | 36 / 40 (**grows on phone: 30.4 → 36**) |
| `base.css:68` | `.h1` | 42 | 25.6 | 36 hero / 30 page title (hero **grows on phone: 25.6 → 36**) |
| `briefing.css:6` | `.briefing-headline` | 42 | 30.4 | 36 / 40 (**grows on phone**) |
| `admin/tailwind.config.js:58` | `fontSize.display` (`text-display` ×2 markup) | 42, lh 1.1, −0.02em, **weight 700** | 30.4 | must be deleted with the token |
| `admin/src/stages/tests/welcome-redesign.js:128` | `.wr-hero__h` | 42 | 30.4 | parked gallery — **breaks silently, see §5** |

**Consumers of `--type-h2` (7 total, 3 uncovered):** `auth.css:119` `.join-hero`, `auth.css:178` `.auth-card .auth-brand__title`, `base.css:77` `.h2`, `admin-tables.css:110` `.ud-nameline .rd-name`, `preparation-lab.css:516` `.pv-f__opener`, plus `entry-redesign.js:94` (parked) and a comment reference at `type.css:294`. All 36px @1440 → 24/32.

**The `.text-display` name collides.** `admin/tailwind.config.js:58` generates a `.text-display` utility (weight **700**, lh 1.1) and `base.css:56` defines a `.text-display` class (weight **600**, lh 1.1). `admin/src/main.js` imports `tailwind.css` on line 3 and `design.css` on line 4, so base.css wins today. Both must go together.

---

# 3. THE METRIC SELECTORS — THE "16" DOES NOT MATCH ANYTHING IN THE TREE

I could not reproduce a set of 16 selectors that should all become `.type-metric` (30/36). Here is what is actually there.

## 3a. Only THREE selectors in the repo render a large number today

| # | file:line | selector | today | tabular today? | after `.type-metric` |
|---|---|---|---|---|---|
| M1 | `admin/src/styles/admin-pulse.css:23` | `.lp-tile__value` | **30px** / lh 1.15 = 34.5, display, 600 | **YES** (`font-variant-numeric: tabular-nums`) | 30 / 36, gains −0.01em tracking. Size unchanged; row grows 1.5px. This is one of the plan's two 30px literals. |
| M2 | `frontend/src/stages/guided/guided.css:204` (font-size on **:208**) | `.gd-block__score` | **30px** / lh inherited 1.55 = **46.5**, display, **700** | **NO** | 30 / 36 — **line-height drops 10.5px**, weight 700 → 600, and it **gains** tabular figures it does not have today. This is the plan's second 30px literal. |
| M3 | `admin/src/styles/design/run-log.css:76` | `.run-log__stat-value` | **20px** / lh 1.2 = 24, 600, base family | markup adds `.num-tabular` at `run-debrief.js:38` | `.type-metric` would take it **20 → 30px and change its face to Bricolage**. **Judgement call — see open questions.** |

`admin-pulse.css`, `guided.css` and `run-log.css` are **all code-split satellites** (none is in the `design.css` barrel), so each must be stripped to zero type declarations before grouping into `.type-metric`, or you get the half-applied failure P2 documented.

## 3b. The complete tabular-figure inventory (21 CSS sites) — 18 of which must NOT become `.type-metric`

Putting `.type-metric` on any of these would blow 14px chrome numbers up to 30px display type.

| file:line | selector | today's size | tabular today | correct role |
|---|---|---|---|---|
| `admin-pulse.css:46` | `.lp-bar__n` | inherits 14 (`.lp-bar` sets `--type-body-sm`), 600 | YES | `label-strong` |
| `about-stage.css:181` | `.about-step__n` | 14, 600 | YES | `label-strong` (step ordinal in a 1.75rem circle) |
| `axes.css:82` | `.axis__thumb` | 14, 700 | YES | `label-strong` |
| `axes.css:91` | `.axis__value` | **inherits 16** from body, 600 | YES | `heading-xs` or `label-strong` — **decision** |
| `axes.css:109` | `.axis__delta` | 14 / lh 1.2 | YES | `label-strong` |
| `buttons-inputs.css:346` | `.cmp-axis__read` | 14 | YES | `body-sm` |
| `notes-panel.css:96` | `.notes-panel__ts` | 14 | YES | `body-sm` (Phase 3 file) |
| `stage-extras.css:41` | `.prep-timeline__num` | 14, 600 | YES | `label-strong` |
| `stage-extras.css:77` | `.cl-overall__pct` | 14, 600 | YES | `label-strong` |
| `stage-extras.css:130` | `.cl-num` | **inherits 16**, 600 | YES | `heading-xs` / `label-strong` |
| `stage-extras.css:142` | `.cl-count` | 14 | YES | `body-sm` |
| `stage-extras.css:165` | `.cl-step-no` | 14 | YES | `body-sm` |
| `stage-extras.css:279` | `.focus-point__num` | 14, 600 | YES | `label-strong` |
| `start-stage.css:558` | `.lex-row__num` | **inherits 16**, 600 | YES | `label-strong` |
| `feedback-inbox.css:74` | `.fb-time` | 14 | YES | `body-sm` |
| `feedback-inbox.css:149` | `.fb-stars` | inherits chip 14 | YES | `label` (it is a chip variant) |
| `pulse-drilldowns.css:16` | `.pd-count b` | 14 (from `.pd-count`) | YES | inherits |
| `pulse-drilldowns.css:19` | `.pd-stars` | inherits | YES | inherits |
| `pulse-drilldowns.css:21` | `.pd-num` | inherits | YES | inherits |
| `pulse-drilldowns.css:33` | `.pd-hist__n` | 14 (from `.pd-hist__row`), 600 | YES | `label-strong` |
| `base.css:46` | `.num-tabular` | utility, no size | YES | **KEEP** — the standalone escape hatch `type.css:243` and `:215` both point at |

`.num-tabular` has **15 markup uses** (11 shipped + 4 in tests): `admin-user-detail.ts:113,131`, `compare.js:249,250`, `ui/axes.js:92`, `ui/run-debrief.js:38,77,91,182`, `member-home-view.ts:134`, `person-axes.ts:54`, and assertions in `admin-user-detail.test.ts:97` and `person-axes.test.ts:24,50,57`.

## 3c. Numeric selectors Phase 4 already claims (do NOT touch in Phase 5)

`guided.css:93` `.gd-q__n` (15px), `guided.css:180` `.gd-row__pct` (15px, 700), `guided.css:370` `.gd-rec__scorerow, .gd-rec__item` (15px) — `phase-4.md` explicitly sends these **down to 14**. `member-home.css:95` `.member-goal__pct` (14, 600) and `preparation.css:216` `.pv-rate__status` (14, 600) are already at the floor.

---

# 4. THE MARKUP SWEEP — TRUE COUNT IS 269 LITERAL, NOT 261, PLUS 3 THAT A RENAME WILL MISS

Scanned every `class=` / `className=` attribute in `.js`/`.ts`/`.html` under `admin/src` and `frontend/src` (whole-file scan, backtick-normalised, so multi-line and template-literal attributes are included; interpolations stripped before tokenising). 3,812 class attributes scanned.

## 4a. Literal uses, by class

| class | count | where |
|---|---|---|
| `.eyebrow` | **115** | 57 files (see below) |
| `.caption` | **45** | `design.js` ×26, `review-run.js` ×8, `ui/run-debrief.js` ×8, `ui/stage-recap-sections.js` ×2, `member-home-view.ts` ×1 |
| `.h1` | **38** (36 real + **2 in test files**) | 36 stage/ui files |
| `.h2` | **16** | `guide.js` ×9, `design.js` ×4, `personas.js`, `review-run.js`, `ui/account-sheet.ts` |
| `.h3` | **15** | `design.js` ×6, `member-home-view.ts` ×4, `admin-user-detail.ts`, `guide.js`, `job-lexicons.js`, `meeting-arcs.js`, `ui/share-link-modal.ts` |
| `.body` | **15** | **all in `admin/src/stages/design.js`** |
| `.label` | **13** | **all in `admin/src/stages/design.js`** |
| `.h4` | **6** | **all in `admin/src/stages/design.js`** |
| `.lead` | **4** | **all in `admin/src/stages/design.js`** |
| `.text-display` | **2** | **both in `admin/src/stages/design.js`** (215, 830) |
| **TOTAL** | **269** | |

**Sequencing warning: 118 of the 269 (44%) live in `admin/src/stages/design.js`** — the in-app design-system sheet. `phase-6.md` says that file gets **rewritten** to show the seven rungs and fourteen roles. Renaming its classes in Phase 5 and then rewriting the file in Phase 6 is churn. Consider leaving `design.js` alone in Phase 5 and doing it once in Phase 6, or moving the rewrite forward.

## 4b. The three sites a rename WILL miss

1. **`frontend/src/stages/preparation-brief.ts:122-123`** — the shared eyebrow helper, exported and reused by `preparation-lab.ts`:
   ```ts
   export function eyebrow(text: string, extra = ""): string {
     return `<div class="eyebrow${extra ? ` ${extra}` : ""}">${esc(text)}</div>`;
   }
   ```
   The class name is **glued to a template interpolation**, so `class="eyebrow"` does not match it. This one helper feeds **~25 call sites** across `preparation-brief.ts` (157, 158, 171, 174, 180, 237, 243) and `preparation-lab.ts` (57, 63, 75, 96, 98, 113, 132, 134, 154, 158, 207, 224, 234, 246, 252, 270). Miss it and every eyebrow on the customer prep brief loses its role.
2. **`admin/src/ui/skeleton-presets.ts:214`** — `${skLeaf("eyebrow", "10ch")}` — the class name is a **function argument**, not markup.
3. **`admin/src/ui/skeleton-presets.ts:230`** — `${skLeaf("eyebrow", "11ch")}` — same.

`skLeaf(classes, width)` (`admin/src/ui/skeleton-parts.ts:33`) builds `class="${cls(classes, "sk-leaf")}"`. `motion.css:153` builds ghosts out of the REAL class, so a ghost whose class was renamed and a ghost whose class was not will size differently from the card they stand in for — the exact failure `type.css:37-40` warns about.

I also checked and cleared 10 other "whole class attribute is a variable" sites: `review-run.js:93,94` (`rv-seg__btn`), `test.js:370` (`l-container`), `ui/briefing-view.ts:39` (chip classes), `ui/button.ts:84` (btn classes), `ui/icon.js:31` (svg), `ui/skeleton-parts.ts:33,46,54,69` (sk- classes), `preparation-lab.ts:114,132` (`pv-*` classes). None carries a target token.

## 4c. Three tests hard-assert on these class names

| file:line | assertion | what happens |
|---|---|---|
| `admin/src/ui/page-header.test.ts:13` | `assert.match(html, /<h1 class="h1">Team<\/h1>/)` | **fails** the moment `page-header.ts:19` renames |
| `admin/src/ui/recap-header.test.ts:18` | `assert.ok(!/<h1 class="h1">/.test(html))` | **goes inert** — passes trivially and stops guarding |
| `admin/src/ui/finish-feedback-modal.test.ts:56` | `assert.ok(!/class="eyebrow"/.test(MODAL))` | **goes inert** — this is a NEGATIVE guard ("Small-caps eyebrow labels are back") that silently stops catching its regression. Must be repointed to `class="type-overline"`. |

## 4d. `.eyebrow--slot` has no role equivalent

8 markup uses (`briefing.js:114,119,126,131,146,152`, `ui/flow-interstitial.ts:21`, `frontend/src/stages/member-home-view.ts:77`) plus the rule at `base.css:120`, which sets `letter-spacing: var(--type-tracking-caps)` (0.06em) and a dim ink. Letter-spacing is a type property, so it cannot stay in `base.css` past Phase 6. There is no `.type-overline--slot` in `type.css`. **Needs a decision:** add the modifier to `type.css`, or fold the slot tier away (the base.css comment at :110 says "those get reclassified to `--slot` in a later, eyes-on pass" — that pass never happened).

## 4e. Three parked-gallery `.eyebrow` uses

`admin/src/stages/tests/promises-before-recap.js:89,94` and `promises-loop.js:112`. The gallery is exempt from the **guard**, not from the **cascade** — delete `.eyebrow` from `base.css` and these three lose their styling with no warning.

---

# 5. TOKEN RETIREMENT — WHAT PHASES 3 AND 4 ACTUALLY LEAVE BEHIND

Bucketing: **P3** = the 8 files + tailwind config named in `phase-3.md`'s "Done when". **P4** = the 12 files named in `phase-4.md`. **PARKED** = `admin/src/stages/tests/*.js`. **UNCOVERED** = named in no phase file, so it lands on Phase 5.

| Token | Total consumers | P3 | P4 | PARKED | **UNCOVERED** |
|---|---|---|---|---|---|
| `--type-display` | 5 | 1 (tailwind) | 1 (briefing.css) | 1 | **2** — `base.css:58, 68` |
| `--type-h1` | 4 | 0 | 0 | 3 | **1** — `auth.css:48` |
| `--type-h2` | 7 | 1 | 1 | 1 | **3** — `auth.css:119, 178`, `base.css:77` |
| `--type-h3` | 20 | 2 | 7 | 7 | **4** — `auth.css:115`, `base.css:85`, `base.css:262`, `stage-review.css:90` |
| `--type-h4` | 22 | 4 | 9 | 0 | **9** — `design.js:571` + `design.js:784` (**inline `style=` attributes**), `admin-pulse.css:24`, `base.css:91`, `base.css:97`, `design-stage.css:42`, `mobile.css:58`, `stage-review.css:160`, `test-gallery.css:26` |
| `--type-body` | 82 | 2 | 45 | 21 | **14** — `admin-pulse.css:36`, `auth.css:203`, `base.css:28/35/103`, `design-stage.css:193/233/529/782`, `orb.css:45`, `start-stage.css:270`, `test-engine.css:99`, `tailwind.css:11` (comment), `ux-audit-fixes.css:26` |
| **`--type-body-sm`** | **431** | 63 | 121 | 102 | **145** ← the blocker |
| `--type-body-md` | 15 | 0 | 13 | 1 | **1** — `frontend/src/styles/team-card.css:31` |
| `--type-body-lg` | 13 | 0 | 4 | 8 | **1** — `frontend/src/styles/team-card.css:47` |
| `--type-leading-tight` | 13 | 1 | 1 | 7 | **3** — `auth.css:50`, `base.css:61`, `base.css:71` |
| `--type-leading-snug` | 10 | 1 | 4 | 4 | **1** — `base.css:265` |
| `--type-leading-normal` | 48 | 2 | 15 | 24 | **7** — `auth.css:135/204/249`, `base.css:93/272`, `primitives.css:20`, `start-stage.css:282` |
| `--type-leading-relaxed` | 20 | 1 | 6 | 10 | **3** — `base.css:99`, `base.css:104`, `start-stage.css:272` |
| `--type-weight-bold` | 12 | 4 | 1 | 0 | **7** — `auth.css:49/123`, `design-stage.css:468/750`, `mobile.css:59`, `shared-components.css:36`, `feedback-inbox.css:54` |
| `--font-mono` | 13 | 4 | 4 | 0 | **4** — `design-stage.css:109`, `test-engine.css:254/289`, `feedback-inbox.css:137` |
| `--type-tracking-tighter` | 3 | 0 | 0 | 0 | **2** — `base.css:60/70` — **+ 1 in `type.css:66`** |
| `--type-tracking-tight` | 15 | 3 | 1 | 5 | **3** — `base.css:79/264`, `mobile.css:60` — **+ 3 in `type.css:81, 89, 211`** |
| `--type-tracking-wide` | 8 | 2 | 0 | 3 | **2** — `primitives.css:72`, `start-stage.css:264` — **+ 1 in `type.css:165`** |
| `--type-tracking-wider` | 7 | 0 | 1 | 4 | **1** — `base.css:271` |
| `--type-tracking-caps` | 5 | 0 | 1 | 3 | **1** — `base.css:122` |
| `--type-tracking-caps-lg` | 2 | 0 | 0 | 0 | **1** — `base.css:117` — **+ 1 in `type.css:195`** |

## 5a. Blocker: four `--type-tracking-*` tokens are consumed by `type.css` itself

`phase-5.md` line 11 says delete "the six `--type-tracking-*`". `type.css` reads **four of them** — `--type-tracking-tighter` (:66), `--type-tracking-tight` (:81, :89, :211), `--type-tracking-wide` (:165), `--type-tracking-caps-lg` (:195). Deleting them makes every heading role, `.type-label`, `.type-overline` and `.type-metric` drop their letter-spacing silently (an invalid `var()` on a non-inherited property computes to `unset`/initial). **Only `--type-tracking-wider` and `--type-tracking-caps` are genuinely deletable.** The other four must either survive, or their values must be inlined into the roles.

## 5b. Blocker: `--type-body-sm` cannot be deleted in Phase 5 as the plan stands

431 consumers; P3 + P4 as scoped clear 184. **145 remain in 40 files that no phase file names**, plus 102 in the parked gallery. The heaviest uncovered: `design-stage.css` ×17, `start-stage.css` ×17, `test-engine.css` ×15, `admin-pulse.css` ×13, `stage-review.css` ×12, `feedback-inbox.css` ×8, `base.css` ×7, `axes.css` ×6, `account-sheet.ts` ×6, `add-person-modal.css` ×5, `primitives.css` ×5, `guide.css` ×5, `test-gallery.css` ×4, `team-card.css` ×4, plus singles in `flow-kit.css`, `save-pip.css`, `shared-components.css`, `stage-lookback.css`, `promise-checkin.css`, `persona-bench.css`, `lexicon-review.css`, `pulse-drilldowns.css`, `member-runs.css`, `row-menu.css`, `breadcrumb.css`, `profile-badge.js`, `guided.page.ts:345` (an inline `style=` string), `meeting-arcs.js:370` (an inline `style=` string).

`phase-5.md`'s "Done when" grep (`type-h1|type-h2|type-h3|type-h4|type-body|type-display|type-leading-*`) will therefore return **hundreds** of hits, not zero — including from the parked gallery, which the grep does not exclude.

## 5c. `admin/tailwind.config.js` — 151 markup uses depend on retiring tokens, and `phase-3.md` only mentions `xs`

| entry | line | reads | live markup uses |
|---|---|---|---|
| `fontSize.xs` | 58 | `var(--type-small)` — **undefined** | `text-xs` ×**9** (plan says 6) |
| `fontSize.sm` | 59 | `var(--type-body-sm)` | `text-sm` ×**107** |
| `fontSize.display` | 60 | `var(--type-display)`, weight 700 | `text-display` ×2 |
| `letterSpacing.tight` | 63 | `var(--type-tracking-tight)` | `tracking-tight` ×5 |
| `letterSpacing.wide` | 64 | `var(--type-tracking-wide)` | `tracking-wide` ×3 |
| `lineHeight.tight` | 67 | `var(--type-leading-tight)` | `leading-tight` ×7 |
| `lineHeight.snug` | 68 | `var(--type-leading-snug)` | `leading-snug` ×11 |
| `lineHeight.normal` | 69 | `var(--type-leading-normal)` | `leading-normal` ×24 |
| `lineHeight.relaxed` | 70 | `var(--type-leading-relaxed)` | `leading-relaxed` ×15 |

**No phase file mentions any of these except `xs`.** All nine must be repointed or deleted before the tokens can go, and doing so means touching ~181 markup sites. `admin/tailwind.config.js` is in **my** lane.

## 5d. `admin/src/styles/design/mobile.css:349-353` must go with the tokens

```css
@media (max-width: 639.98px) {
  :root {
    --type-display: 1.9rem;   /* 30px */
    --type-h1: 1.6rem;        /* 26px */
    --type-h2: 1.35rem;       /* 22px */
  }
```
This is the only phone type block outside `type.css`. `type.css:283-285` explicitly says responsive type belongs only in `type.css` because `mobile.css` loads last and would override everything. Deleting this block is what forces the `.type-display` phone-rung decision in §1c.

## 5e. Two tests hard-fail on the token deletions

- `frontend/src/stages/preparation-css.test.ts:119` — `assert.ok(TOKENS.has("--type-body-sm"), "the type scale is in the table")`. **Fails.** (This file is in **my** lane.)
- `admin/src/stages/start-core.test.ts:49` and `:169` — `assert.ok(/\.run-list__status\s*\{[^}]*--type-body-sm/.test(CSS), "the chip respects the 14px floor")`. **Fails.**

## 5f. Deleting these tokens silently breaks the parked gallery

`admin/src/stages/tests/*.js` reads the retiring tokens ~**180 times** (102 × `--type-body-sm`, 21 × `--type-body`, 24 × `--type-leading-normal`, etc.). An undefined `var()` on `font-size` makes the whole declaration invalid at compute time, so those five prototype screens fall back to inherited sizes with no lint error. `phase-5.md` line 17 already asks for a decision on `runner-v2.js`; the same decision applies to all five.

## 5g. `base.css` must lose all 20 of its type-declaring rules

Ten aliases plus: `body` (:18 — literal font stack, `--type-body`, `line-height: 1.55`), `input, textarea, button, select` (:33), `.num-tabular` (:46, keep the rule but it is a type property), `.eyebrow--slot` (:120), the chip group (:145), the segmented-control group (:206), `.conf` (:236), `.ident-name` (:260, dead), `.kbd` (:279), `.stage-step` (:344, `letter-spacing: 0.01em; font-weight: 500`). `base.css` is named in **no phase file** and is in **my** lane.

---

# 6. `admin/src/ui/notes-panel-utils.js:54` — WHAT IT RETURNS AND WHAT CHANGES

```js
export function attachAutoGrow(ta) {
  const grow = () => {
    const cs = getComputedStyle(ta);
    const line = parseFloat(cs.lineHeight) || 22;          // ← line 55, not 54
    const rows = parseInt(ta.getAttribute("rows"), 10) || 3;
    const pad =
      parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const minH = rows * line + (Number.isFinite(pad) ? pad : 0);
    const max = 12 * line;
    ta.style.height = "auto";
    const h = Math.max(minH, Math.min(ta.scrollHeight, max));
    ta.style.height = h + "px";
  };
  ta.addEventListener("input", grow);
  requestAnimationFrame(grow);
  return grow;
}
```
(The `parseFloat` is on **line 55**; `phase-5.md` says 54.)

**Both call sites:** `admin/src/ui/notes-panel.js:100` (`const resizeComposer = attachAutoGrow(ta)`, the composer) and `admin/src/ui/notes-list.js:66` (`attachAutoGrow(editTa)`, the inline edit box, `<textarea class="notes-panel__edit" rows="3">`).

**Both textareas are styled by one rule, `admin/src/styles/design/notes-panel.css:105-118`:**
```css
.notes-panel__edit,
.notes-panel__compose textarea {
  font: inherit;
  font-size: var(--type-body);   /* 16px */
  line-height: 1.5;
  ...
}
```

**What it returns today.** `line-height: 1.5` is a unitless number. CSSOM's *computed* value for a unitless line-height is the used px length in Chrome, Firefox and Safari, so `getComputedStyle(ta).lineHeight` returns the string **`"24px"`** (16 × 1.5). `parseFloat` → **24**. The `|| 22` fallback **never fires today**. With `rows="3"` and 0.55rem vertical padding, `minH` = 3 × 24 + 17.6 = **89.6px**; `max` = 12 × 24 = **288px**.

**What the absolute leadings do.** Absolute leadings do not change the *kind* of value returned — a `line-height: 1.5rem` computes to `"24px"` exactly as `1.5` does. Three outcomes:
- Textarea joins `.type-body` (16/24) → computed `"24px"` → parseFloat 24. **Byte-identical behaviour.** This is the correct target.
- Textarea joins `.type-body-sm` (14/20) → `"20px"` → minH 77.6px, max 240px. Works, but the box is visibly shorter and caps 4 lines earlier.
- **The real risk:** the component sheet is stripped and the textarea is **never grouped into a role**. It then falls to `base.css:33` (`input, textarea, button, select { font-size: var(--type-body) }`) which sets **no** line-height, and the inherited `line-height: 1.55` from `body` does not reach it because form controls do not inherit from `body` through the UA stylesheet unless `font: inherit` is present — and `font: inherit` is exactly what would be deleted. Computed line-height becomes **`"normal"`**, `parseFloat("normal")` is **NaN**, and the `|| 22` fallback fires. The box is then sized off 22 against ~19px of real line box: `minH` = 83.6px, `max` = 264px. It still grows, but the initial height and the cap are both wrong, and nothing warns you. **The `|| 22` fallback is not evidence that this happened before — it is the trap that will hide it happening now.**

**What must be tested (typed by hand, per the plan's "Done when"):**
1. In the browser console on a run with the notes panel open: `getComputedStyle(document.querySelector('.notes-panel__compose textarea')).lineHeight` — must return a **`"NNpx"` string**, never `"normal"`.
2. Same for `.notes-panel__edit` after clicking a saved note to edit it (it is created on demand by `notes-list.js:59`).
3. Type a note past 3 lines: the box must grow one line at a time and stop at 12 lines.
4. Reload with the composer already holding a long draft: `requestAnimationFrame(grow)` on line 66 must land the correct initial height.
5. The composer textarea also has `font: inherit` before its longhands (notes-panel.css:109). If that whole rule is deleted, confirm the face does not change to the UA default monospace-ish control font.

---

# 7. `admin/src/styles/design/chip-system.test.ts` — WHAT ACTUALLY BREAKS

```ts
const BASE = read("base.css");

const REFITTED: Array<[string, string]> = [
  ["um-badge", "admin-tables.css"],
  ["pd-pill", "../pulse-drilldowns.css"],
  ["el-pill", "../error-log.css"],
  ["fb-pill", "../feedback-inbox.css"],
  ["fb-verdict", "../feedback-inbox.css"],
  ["fb-type", "../feedback-inbox.css"],
  ["cl-badge", "stage-extras.css"],
  ["lib-badge", "stage-review.css"],
  ["cmp-verdict-tag", "buttons-inputs.css"],
];

// A selector in a group ends with a comma, or with " {" if it's the last one.
const inGroup = (css: string, sel: string) =>
  new RegExp(`^\\.${sel}\\s*(,|\\{)`, "m").test(css);

test("every refitted family is grouped into the one chip recipe", () => {
  for (const [family] of REFITTED) {
    assert.ok(inGroup(BASE, family), `.${family} is part of the shared .chip recipe in base.css`);
  }
});

test("no refitted family re-declares its own chip geometry", () => {
  const GEOMETRY = /(border-radius|padding|font-size|font-weight)\s*:/;
  ...
});
```

**`phase-5.md`'s claim is only conditionally true.** The chip block at `base.css:136-155` declares **geometry** (`display`, `align-items`, `gap`, `padding`, `border-radius`, `border`, `white-space`) **and** type (`font-size: var(--type-body-sm)`, `font-weight: var(--type-weight-medium)`). Phase 6 only requires the **type** declarations to leave `base.css`. If you move only those two lines and group the ten families into `.type-label` in `type.css`, the geometry group stays in `base.css`, `inGroup(BASE, …)` still matches, and **every one of the six tests keeps passing unchanged**.

The test only breaks if the build agent reads "the chip recipe now lives in type.css" literally and moves the whole block. That would break tests 1 ("every refitted family is grouped"), 4 ("the three segmented controls share one recipe" — `inGroup(BASE, "el-filters")` etc.), 5 ("an active segment takes the accent tint") and 6 ("the status-dot motif").

**What actually needs to change, and why it matters more than the regex:** after the move, this test loses its ability to prove the *type* half. A chip family that gives up its `font-size` in `base.css` but never joins `.type-label` in `type.css` will silently render at whatever it inherits (16px in most containers, not 14px), and nothing catches it. The correct repoint is:

```ts
const TYPE = read("type.css");
// ...
test("every refitted family is grouped into the one chip recipe", () => {
  for (const [family] of REFITTED) {
    assert.ok(inGroup(BASE, family), `.${family} takes its geometry from the shared .chip recipe`);
    assert.ok(inGroup(TYPE, family), `.${family} takes its type from the .type-label role`);
  }
});
```
`inGroup`'s regex needs no change — it is multiline-anchored and each family already sits at the start of its own line in both grouped lists. Test 2's `GEOMETRY` regex (which includes `font-size|font-weight`) stays correct and gets **stronger** after the sweep, because those properties will genuinely be gone from every component file.

Also note test 3 reads `BASE + buttons-inputs.css + stage-extras.css + stage-review.css` for `.fp-chip` and `.cl-tag` border-radius — those two are deliberately **not** in the chip group (`base.css:134`), so they stay put.

---

# 8. LANE CHECK against `LANES.md`

**My session is `1a2e5006`** — I hold the "Type system P2" lane.

| Session | Claimed | Overlaps Phase 5? |
|---|---|---|
| **`1a2e5006` (me)** | 2026-07-30 | Covers `docs/plans/doing/type-system/`, `tokens.css`, `base.css`, `type.css`, `admin/tailwind.config.js`, `admin-tables.css`, `briefing.css`, `design.css`, `coach-panel.css`, `questioning.js`, the three lint/test scripts, `preparation-css.test.ts`, `.claude/launch.json`. **The core Phase 5 files are already mine.** |
| `a6878b4e` — Stage look-back | **2026-07-27 (3 days old → STALE by the board's own 2-day rule)** | **Two real overlaps:** `admin/src/ui/stage-recap-sections.js` (11 `.eyebrow` + 2 `.caption` markup uses) and `admin/src/styles/design/stage-lookback.css` (1 `--type-body-sm`). Also claims `admin/src/ui/stage-review.js`. Stale, so the hook should ignore it, but surface it to Carl before editing. |
| `c9200bfa` — Nightly DB backup | 2026-07-30 | No overlap (scripts + docs only). |
| `f1363886` — Walk-in gate | 2026-07-30 | `admin/src/stages/bank.js` — **no** legacy type classes in it. No overlap. |
| `c91a58a9` — Coach hints | 2026-07-30 | Backend + `content/prompts/`. No overlap. |

**`plan.md:29` is now out of date.** It warns that `admin/src/styles/feedback-inbox.css` and `frontend/src/stages/preparation.css` are claimed by session `080b9104` (brief star rating). **That row is no longer on the board** — the collision has cleared. Both files are free.

**Files Phase 5 needs that are in NO lane yet** — claim them before starting: `design/auth.css`, `design/mobile.css`, `design/run-detail.css`, `design/run-log.css`, `design/stage-review.css`, `design/stage-extras.css`, `design/about-stage.css`, `design/design-stage.css`, `design/app-nav.css`, `design/session-topbar.css`, `design/notes-panel.css`, `design/start-stage.css`, `design/test-engine.css`, `design/primitives.css`, `design/promise-agree.css`, `design/buttons-inputs.css`, `design/axes.css`, `design/chip-system.test.ts`, `admin-pulse.css`, `add-person-modal.css`, `test-gallery.css`, `pulse-drilldowns.css`, `feedback-inbox.css`, `guide.css`, `meeting-arcs.css`, `ux-audit-fixes.css`, `frontend/src/stages/guided/guided.css`, `frontend/src/stages/preparation.css`, `frontend/src/stages/preparation-lab.css`, `frontend/src/stages/member-home.css`, `frontend/src/styles/team-card.css`, `admin/src/ui/page-header.ts` + `.test.ts`, `admin/src/ui/recap-header.test.ts`, `admin/src/ui/finish-feedback-modal.test.ts`, `admin/src/ui/skeleton-presets.ts`, `admin/src/ui/notes-panel-utils.js`, `frontend/src/stages/preparation-brief.ts`, `admin/src/stages/start-core.test.ts`, plus ~55 stage/ui files for the markup sweep.

---

# 9. THE CASCADE — WHICH SHEETS BEAT `type.css`

`design.css` imports `tokens.css` → `type.css` → `base.css` → 25 more. **Every sheet NOT in that barrel is a code-split satellite injected after the main bundle and therefore BEATS `type.css` at equal specificity.** The definitive list:

`add-person-modal.css`, `admin-pulse.css`, `coach-panel.css`, `design/design-stage.css`, `design/member-runs.css`, `design/persona-bench.css`, `design/run-log.css`, `design/stage-exit.css`, `design/stage-lookback.css`, `design/test-engine.css`, `error-log.css`, `feedback-inbox.css`, `finish-feedback-modal.css`, `guide.css`, `lexicon-review.css`, `meeting-arcs.css`, `pulse-drilldowns.css`, `row-menu.css`, `test-gallery.css`, `ux-audit-fixes.css`, `frontend/src/stages/guided/guided.css`, `frontend/src/stages/member-home.css`, `frontend/src/stages/preparation-lab.css`, `frontend/src/stages/preparation.css`, `frontend/src/styles/members.css`, `frontend/src/styles/team-card.css`.

Phase 5 selectors living in satellites: `.lp-tile__value`, `.lp-tile__value .lp-den`, `.lp-card h3` (admin-pulse), `.gd-block__score`, `.gd-sum h3`, `.gd-panel__title`, `.gd-rec__block h3`, `.gd-q__stem`, `.gd-block__label` (guided), `.run-log__stat-value` (run-log), `.apm__title` (add-person-modal), `.ds-rail__title`, `.ds-star` (design-stage), `.tg-card__title` (test-gallery), `.ffm__title` (finish-feedback-modal), `.arc-chip__sep`, `.arc-phase__label` (meeting-arcs), `.pv-f/g/j/h/e/a__*` (preparation-lab), `.pv-l__hero-theme`, `.pv-rate__q` (preparation), `.team-card__name-btn` (team-card), `.joblex-remove` (test-engine), `.fb-*` (feedback-inbox), `.pd-*` (pulse-drilldowns). **Each must reach zero type declarations before it is grouped, or you get the half-applied failure P2 documented at `type.css:45-51`.**

---

# 10. GUARD BASELINE — MEASURED NOW (`node scripts/lint-design-tokens.js --json`)

`scanned: 207, errors: 0`. Ceilings in `scripts/test-design-guard.js:43-96`:

| rule | now | ceiling | what Phase 5 should drive it to |
|---|---|---|---|
| `nonTokenFont` | 7 | 7 | **→ 0** if `runner-v2.js` is retired; **→ 5** if not (the 2 non-gallery hits are `admin-pulse.css:23` and `guided.css:208`, both retired by the metric work) |
| `clampOffRung` | 10 | 10 | **→ 0.** All ten are `--type-display`/`--type-h1`/`--type-h2` consumers plus `buttons-inputs.css:62`. This is the ceiling Phase 5 owns. |
| `unsanctionedSizeToken` | 439 | 439 | falls by however many `--type-body*`/`--type-hN` sites Phase 5 clears |
| `offLadderFont` | 22 | 22 | 20 of the 22 are Phase 4's (`guided.css` 15/17px, `team-card.css`); Phase 5 owns `admin-tables.css:386` (28px star) and `test-engine.css:139` (16.8px) |
| `literalFontSize` | 12 | 12 | Phase 5 owns `admin-pulse.css:23` (30px), `guided.css:208` (30px), `add-person-modal.css:20` (1.25rem), `admin-tables.css:386` (1.75rem), `design-stage.css:516` (1.5rem), `run-detail.css:10` (1.125rem), `meeting-arcs.css:18` (1.1rem), `test-engine.css:139` (1.05rem), `mobile.css:298` (`max(1rem,1em)`), `member-runs.css:59/66` (0.875rem) |
| `displayFaceBelow20` | 7 | 7 | **→ 0.** `design-stage.css:42`, `session-topbar.css:52`, `test-gallery.css:26`, `guided.css:91`, `guided.css:365`, `team-card.css:31`, `team-card.css:47` |
| `fontFamilyLiteral` | 8 | 8 | `base.css:24` is Phase 5's (the `body` stack); the other 7 are the mono stacks (Phase 3) |
| `relativeFontSize` | 33 | 33 | all `var(--x, fallback)` — Phase 3/4/6 |
| `undefinedToken` | 3 | 3 | none are type; leave |
| `fontShorthandResetsNumeric` | 0 | 0 | must stay 0 — `.type-metric` puts `font-variant-numeric` last on purpose (`type.css:213-216`) |

Ceilings may fall, never rise. Phase 5 lowering `clampOffRung` to 0 and `displayFaceBelow20` to 0 is the cheapest hard proof the phase landed.

## Work items (139)

| file | line | selector | today | role | kind | note |
|---|---|---|---|---|---|---|
| admin/src/styles/design/base.css | 56 | `.text-display` | font-family: var(--type-family-display); font-size: var(--type-display); font-weight: var(--type-weight-semibold); letter-spacing: var(--type-tracking-tighter); line-height: var(--type-leading-tight); text-wrap: balance; color: var(--color-ink) | type-display | heading | 42px/46.2px at 1440. Only 2 markup uses, both admin/src/stages/design.js (215, 830), which Phase 6 rewrites. Delete the class; rename markup or leave it for Phase 6. |
| admin/src/styles/design/base.css | 65 | `.h1` | font-family: var(--type-family-display); font-size: var(--type-display); font-weight: var(--type-weight-semibold); letter-spacing: var(--type-tracking-tighter); line-height: var(--type-leading-tight); text-wrap: balance | SPLIT: type-display for the welcome hero, type-heading-xl for page titles | heading | 42/46.2 at 1440, 25.6px on a phone via mobile.css:351. Phase 5 scenario 1 wants 36, scenario 2 wants 30, and both wear this class. Welcome hero = start-welcome.ts:148 only; every other site is a page title. |
| admin/src/styles/design/briefing.css | 4 | `.briefing-headline` | font-size: var(--type-display); line-height: 1.14; letter-spacing: -0.02em; font-weight: 600; max-width: 40rem; text-wrap: balance | type-display | heading | 42px/47.88px at 1440. One markup use, briefing.js:107 (the Recap hero). briefing.css is a Phase 4 file and is in my lane. |
| admin/src/styles/design/auth.css | 43 | `.auth-brand__title` | font-family: var(--type-family-display); font-size: var(--type-h1); font-weight: var(--type-weight-bold); line-height: var(--type-leading-tight); text-wrap: balance; margin: 0 | type-heading-xl | heading | 44px/48.4px at 1440 - the ONLY shipped consumer of the inverted --type-h1. Paints at 44 on exactly two screens: forgot-password.js:23 and reset-password.js:25. Drops 44 to 30 and weight 700 to 600. |
| admin/src/styles/design/auth.css | 177 | `.auth-card .auth-brand__title` | font-size: var(--type-h2) | type-heading-lg (or heading-xl - see open questions) | heading | 36px, line-height inherited 1.1 = 39.6. Specificity 0,2,0. Governs login.js:172, register.js:35, welcome.ts:24. |
| admin/src/styles/design/auth.css | 118 | `.join-hero` | font-size: var(--type-h2); font-weight: var(--type-weight-medium) | type-heading-lg | heading | 36px, weight 500. Wins over .auth-brand__title on join.js:62/81 by source order. Its child rule .join-hero strong (auth.css:122) uses --type-weight-bold, which is retiring. |
| admin/src/styles/design/base.css | 75 | `.h2` | font-family: var(--type-family-display); font-size: var(--type-h2); font-weight: var(--type-weight-semibold); letter-spacing: var(--type-tracking-tight); line-height: 1.2; text-wrap: balance | type-heading-lg | heading | 36px/43.2px at 1440, 21.6px on a phone. 16 markup uses; 9 in guide.js, 4 in design.js. |
| admin/src/styles/design/admin-tables.css | 110 | `.ud-nameline .rd-name` | font-size: var(--type-h2) | type-heading-lg | heading | 36px, line-height 1.2 = 43.2 and weight 700 inherited from .rd-name. This is phase-5 scenario 3's 'person's name drops 36 to 24'. In my lane. |
| frontend/src/stages/preparation-lab.css | 513 | `.pv-f__opener` | font-family: var(--type-family-display); font-size: var(--type-h2); font-weight: var(--type-weight-semibold); line-height: var(--type-leading-snug); letter-spacing: var(--type-tracking-tight) | type-heading-lg | heading | 36px/45px. Code-split satellite: strip all type before grouping. |
| admin/src/styles/design/admin-tables.css | 385 | `.star-rating__star` | font-size: 1.75rem; line-height: 1 | none - keep as a sized glyph, or move to a rung | glyph | 28px star glyph. The guard's only off-ladder-font hit at 28px. Putting it on a text role changes the star size; a decision, not a mechanical match. |
| admin/src/styles/design/buttons-inputs.css | 56 | `.input` | font-size: clamp(1.25rem, 3.5vw, 1.75rem) | type-heading-lg (24/32) or type-heading-md (20/28) | control | 28px at 1440, 20px below 571px. The underlined text input on intake, feedback, forgot-password, briefing notes, job-lexicons. buttons-inputs.css is a Phase 4 file; the size choice is a heading-ladder decision. |
| admin/src/styles/design/design-stage.css | 512 | `.ds-star` | font-size: 1.5rem; line-height: 1 | none - sized glyph | glyph | 24px star on the internal design sheet. Phase 6 rewrites design.js; this is its stylesheet. |
| admin/src/styles/design/base.css | 84 | `.h3` | font-size: var(--type-h3); font-weight: var(--type-weight-semibold); line-height: 1.35; color: var(--color-ink) | type-heading-md | heading | 20px/27px, BASE family today. type-heading-md is the DISPLAY family plus text-wrap:balance, so every .h3 changes typeface, not just leading. 15 markup uses. |
| admin/src/styles/design/base.css | 260 | `.ident-name` | font-family: var(--type-family-display); font-size: var(--type-h3); font-weight: var(--type-weight-semibold); letter-spacing: var(--type-tracking-tight); line-height: var(--type-leading-snug) | DELETE | heading | Zero markup uses in either app. Scaffolding from an adoption pass that never happened (its own comment says so). Delete outright rather than migrate. |
| admin/src/styles/design/auth.css | 106 | `.join-org-tile` | font-family: var(--type-family-display); font-size: var(--type-h3); font-weight: var(--type-weight-semibold) | none - a 56px brandmark tile holding one letter | glyph | 20px. Sized off the tile, not a heading. Needs a flat rung because em sizing is banned by the 14px floor rule. |
| admin/src/styles/design/about-stage.css | 40 | `.about-sec__title` | font-size: var(--type-h3); font-weight: var(--type-weight-semibold) | type-heading-md | heading | 20px. about-stage.css is a Phase 4 file; the heading is Phase 5's. |
| admin/src/styles/design/run-detail.css | 21 | `.rd-name` | font-family: var(--type-family-display); font-size: var(--type-h3); font-weight: var(--type-weight-bold); line-height: 1.2 | type-heading-md | heading | 20px/24px, weight 700 to 600. Note the sibling override .ud-nameline .rd-name (admin-tables.css:110) which takes 36px - both must move together or the person page and the recap disagree. |
| admin/src/styles/design/stage-review.css | 89 | `.stage-review__section-title` | font-size: var(--type-h3); font-weight: 600 | type-heading-md | heading | 20px. |
| frontend/src/stages/guided/guided.css | 239 | `.gd-sum h3` | font-family: var(--type-family-display); font-size: var(--type-h3) | type-heading-md | heading | 20px. Element-level descendant selector, satellite sheet. |
| frontend/src/stages/guided/guided.css | 331 | `.gd-panel__title` | font-family: var(--type-family-display); font-size: var(--type-h3); font-weight: 700; line-height: 1.25 | type-heading-md | heading | 20px/25px, weight 700 to 600. |
| frontend/src/stages/preparation-lab.css | 599 | `.pv-g__opener` | font-family: var(--type-family-display); font-size: var(--type-h3); font-weight: var(--type-weight-medium); line-height: var(--type-leading-snug); text-wrap: pretty | type-heading-md | heading | 20px/25px, weight 500 to 600. |
| frontend/src/stages/preparation-lab.css | 803 | `.pv-j__opener` | font-size: var(--type-h3); font-weight: var(--type-weight-medium); line-height: var(--type-leading-snug); max-width: var(--measure) | type-heading-md | heading | 20px/25px. Keeps its own max-width; heading roles carry no measure. |
| frontend/src/stages/preparation.css | 124 | `.pv-l__hero-theme` | font-family: var(--type-family-display); font-size: var(--type-h3); font-weight: var(--type-weight-semibold); line-height: var(--type-leading-snug) | type-heading-md | heading | 20px/25px. Customer app, variant L is the one that ships. Satellite sheet. |
| admin/src/styles/add-person-modal.css | 18 | `.apm__title` | font-family: var(--type-family-display); font-size: 1.25rem; font-weight: var(--type-weight-semibold); line-height: 1.3; letter-spacing: -0.01em | type-heading-md | heading | 20px/26px. A literal 1.25rem (guard literal-font-size hit). Satellite sheet named in NO phase file. |
| admin/src/styles/design/base.css | 90 | `.h4` | font-size: var(--type-h4); font-weight: var(--type-weight-semibold); line-height: var(--type-leading-normal) | type-heading-sm | heading | 18px/27px. 6 markup uses, all admin/src/stages/design.js. |
| admin/src/styles/design/base.css | 96 | `.lead` | font-size: var(--type-h4); font-weight: var(--type-weight-regular); line-height: var(--type-leading-relaxed); color: var(--color-ink-dim) | type-body-lg | prose | 18px/28.8px. Gains max-width: var(--measure-lede). 4 markup uses, all design.js. |
| admin/src/styles/design/admin-tables.css | 153 | `.um-menu-btn` | font-size: var(--type-h4); line-height: 1; letter-spacing: 1px | none - sized glyph | glyph | 18px. The row overflow button's ellipsis glyph. The 1px letter-spacing is spacing the dots, not tracking text. |
| admin/src/styles/design/app-nav.css | 147 | `.app-nav__word` | font-weight: var(--type-weight-bold); font-size: var(--type-h4); letter-spacing: var(--type-tracking-tight) | type-heading-sm (weight 700 to 600) or a documented brand exception | chrome | 18px brand wordmark. --type-weight-bold is retiring, so this needs a call either way. Pairs with mobile.css:57 and session-topbar.css:49. |
| admin/src/styles/design/mobile.css | 57 | `.app-nav-mobilebar__brand` | font-size: var(--type-h4); font-weight: var(--type-weight-bold); letter-spacing: var(--type-tracking-tight) | same as .app-nav__word | chrome | Inside @media (max-width: 767.98px). The phone twin of the brand wordmark - must take the same decision. |
| admin/src/styles/design/session-topbar.css | 49 | `.session-topbar__brand-word` | font-family: var(--type-family-display, inherit); font-weight: var(--type-weight-bold); font-size: var(--type-h4); letter-spacing: var(--type-tracking-tight) | type-heading-sm (base family) | chrome | 18px Bricolage - a guard display-face-below-20 hit. heading-sm is deliberately the base family for exactly this reason (type.css:25-27). |
| admin/src/styles/design/buttons-inputs.css | 33 | `.btn--lg` | padding: var(--sero-space-3) var(--sero-space-6); font-size: var(--type-h4) | judgement: type-heading-xs (16) or keep 18 | control | A button size, not a heading. 18px is the only rung it can keep; 16 makes it match .btn--md. |
| admin/src/styles/design/design-stage.css | 39 | `.ds-rail__title` | font-family: var(--type-family-display); font-weight: var(--type-weight-semibold); font-size: var(--type-h4) | type-heading-sm | heading | 18px Bricolage - guard display-face-below-20 hit. Internal design sheet, satellite. |
| admin/src/styles/design/notes-panel.css | 384 | `.modal__message` | font-size: var(--type-h4); font-weight: var(--type-weight-semibold); line-height: 1.4 | type-heading-sm | heading | 18px/25.2px. notes-panel.css is a Phase 3 file but this rule is a heading, so it belongs here. |
| admin/src/styles/design/promise-agree.css | 123 | `.pa-add__plus` | font-size: var(--type-h4); line-height: 1 | none - sized glyph | glyph | 18px plus sign. |
| admin/src/styles/design/stage-extras.css | 137 | `.cl-phase-title h3` | margin: 0; font-size: var(--type-h4); font-weight: var(--type-weight-semibold); color: var(--color-ink) | type-heading-sm | heading | 18px. Element-level descendant selector. |
| admin/src/styles/design/stage-extras.css | 329 | `.notes-quote` | font-size: var(--type-h4); line-height: 1.55 | type-body-lg | prose | 18px/27.9px - a quotation, prose not a heading. |
| admin/src/styles/design/stage-review.css | 159 | `.stage-review__headline` | font-size: var(--type-h4); font-weight: 600; line-height: 1.4 | type-heading-sm | heading | 18px/25.2px. |
| admin/src/styles/finish-feedback-modal.css | 6 | `.ffm__title` | font-size: var(--type-h4, 18px); font-weight: var(--type-weight-semibold, 600) | type-heading-sm | heading | 18px. Also a guard relative-font-size hit for the var() fallbacks. Satellite sheet. See finish-feedback-modal.test.ts:56, whose negative eyebrow assertion goes inert on the sweep. |
| admin/src/styles/test-gallery.css | 26 | `.tg-card__title` | font-family: var(--type-family-display); font-size: var(--type-h4); font-weight: 600 | type-heading-sm | heading | 18px Bricolage - guard display-face-below-20 hit. Satellite sheet named in no phase file. |
| frontend/src/stages/guided/guided.css | 365 | `.gd-rec__block h3` | font-family: var(--type-family-display); font-size: var(--type-h4); margin: 0 0 10px | type-heading-sm | heading | 18px Bricolage - guard display-face-below-20 hit. Customer app. |
| frontend/src/stages/preparation-lab.css | 470 | `.pv-e__lead` | font-size: var(--type-h4); line-height: var(--type-leading-relaxed) | type-body-lg | prose | 18px/28.8px lede. The research table names this explicitly as body-lg. |
| frontend/src/stages/preparation-lab.css | 936 | `.pv-h__opener` | font-size: var(--type-h4); font-weight: var(--type-weight-medium); line-height: var(--type-leading-normal) | type-body-lg | prose | 18px/27px opener. |
| frontend/src/stages/preparation-lab.css | 355 | `.pv-a__confidence` | font-size: var(--type-h4); line-height: var(--type-leading-relaxed) | type-label (Phase 4 owns this) | chrome | 18px/28.8px. phase-4.md sends the nine confidence readouts to label (14px). Do NOT treat as a heading in Phase 5. |
| admin/src/styles/design/run-detail.css | 7 | `.rd-avatar` | font-size: 1.125rem | type-label-strong (flat) | glyph | 18px avatar initials. The research notes avatar initials cannot be em-sized off the diameter because that breaches the 14px floor rule, so they take a flat rung. |
| admin/src/styles/admin-pulse.css | 24 | `.lp-tile__value .lp-den` | font-size: var(--type-h4); font-weight: 500; color: var(--color-ink-dim) | judgement - the quiet denominator inside a 30px KPI | numeric | 18px inside a 30px metric. If it joins .type-metric it becomes 30px and the fraction reads as two equal numbers. Keep it a rung or two below whatever .lp-tile__value lands on. |
| admin/src/styles/design/about-stage.css | 103 | `.about-how__title` | font-size: var(--type-body-lg); font-weight: var(--type-weight-semibold); line-height: var(--type-leading-tight) | type-heading-xs | heading | 17px - an off-ladder size (guard off-ladder-font hit). 17 rounds down to 16, not up to 18, to match the 16px w600 card-heading family. |
| frontend/src/styles/team-card.css | 44 | `.team-card__name-btn` | font-family: var(--type-family-display); font-weight: var(--type-weight-semibold); font-size: var(--type-body-lg); letter-spacing: -0.01em | type-heading-xs | heading | 17px Bricolage - guard hits BOTH off-ladder-font and display-face-below-20. Customer app. team-card.css appears in NO phase file yet still holds the last --type-body-md and --type-body-lg consumers. |
| admin/src/styles/admin-pulse.css | 36 | `.lp-card h3` | font-size: var(--type-body); font-weight: 600; margin: 0 | type-heading-xs | heading | 16px w600 card heading - the family the heading-xs role was created for. |
| admin/src/styles/design/buttons-inputs.css | 177 | `.bench-flow__title` | font-size: var(--type-body); font-weight: 600; line-height: 1.25 | type-heading-xs | heading | 16px/20px. |
| admin/src/styles/meeting-arcs.css | 29 | `.arc-phase__label` | font-weight: 600; font-size: var(--type-body) | type-heading-xs | heading | 16px w600. Satellite sheet. |
| admin/src/styles/ux-audit-fixes.css | 22 | `.btn--cta` | font-size: var(--type-body, 1rem); font-weight: var(--type-weight-semibold, 600) | judgement - a button, not a heading | control | 16px. Also a guard relative-font-size hit. Satellite sheet named in no phase file. |
| frontend/src/stages/guided/guided.css | 94 | `.gd-q__stem` | font-weight: 700; font-size: var(--type-body) | type-heading-xs | heading | 16px w700. One of the question stem's four homes; phase-4.md names it. Weight 700 to 600. |
| frontend/src/stages/guided/guided.css | 202 | `.gd-block__label` | font-weight: 700; font-size: var(--type-body) | type-heading-xs | heading | 16px w700, sits beside .gd-block__score. Weight 700 to 600. |
| frontend/src/stages/preparation.css | 205 | `.pv-rate__q` | font-size: var(--type-body); font-weight: var(--type-weight-semibold) | type-heading-xs | heading | 16px w600. Customer app. |
| admin/src/styles/design/buttons-inputs.css | 239 | `.cmp-delta` | font-size: var(--type-body); font-weight: 600 | type-heading-xs or type-label-strong | numeric | 16px w600 delta figure on the compare screen. Has no tabular figures today and probably should. |
| admin/src/styles/meeting-arcs.css | 18 | `.arc-chip__sep` | color: var(--color-ink-dim); font-size: 1.1rem | none - sized glyph | glyph | 17.6px middot separator. Guard literal-font-size and off-ladder-font hit. |
| admin/src/styles/design/test-engine.css | 134 | `.joblex-remove` | font-size: 1.05rem; line-height: 1 | none - sized glyph | glyph | 16.8px multiplication-sign remove button. Guard literal-font-size and off-ladder-font hit (font-size on line 139). |
| admin/src/styles/admin-pulse.css | 23 | `.lp-tile__value` | font-family:var(--type-family-display); font-size:30px; font-weight:600; line-height:1.15; font-variant-numeric:tabular-nums | type-metric | numeric | 30px/34.5px, ALREADY tabular. Size unchanged; gains -0.01em tracking and 1.5px of leading. One of the plan's two 30px literals. Code-split satellite - strip all type first. |
| frontend/src/stages/guided/guided.css | 204 | `.gd-block__score` | margin-left: auto; font-family: var(--type-family-display); font-weight: 700; font-size: 30px; color: var(--color-ink) | type-metric | numeric | font-size is on line 208. 30px with line-height inherited 1.55 = 46.5px, so leading DROPS 10.5px. Weight 700 to 600, and it GAINS tabular figures it does not have today. The plan's second 30px literal. Satellite. |
| admin/src/styles/design/run-log.css | 76 | `.run-log__stat-value` | font-size: var(--type-h3); font-weight: 600; color: var(--color-ink); line-height: 1.2 | judgement: type-metric (20 to 30px) or type-heading-md | numeric | 20px/24px, base family. Markup adds .num-tabular at ui/run-debrief.js:38 so it already has tabular figures. type-metric takes it to 30px Bricolage - a 50% jump on the run-debrief stat tiles. Needs Carl's eye. |
| admin/src/styles/admin-pulse.css | 46 | `.lp-bar__n` | text-align:right; font-variant-numeric:tabular-nums; font-weight:600 | type-label-strong | numeric | Inherits 14px from .lp-bar. Must NOT take type-metric. |
| admin/src/styles/design/about-stage.css | 169 | `.about-step__n` | font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold); font-variant-numeric: tabular-nums | type-label-strong | numeric | 14px step ordinal in a 1.75rem circle. font-variant-numeric on line 181. |
| admin/src/styles/design/axes.css | 89 | `.axis__value` | text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; color: var(--color-ink) | type-heading-xs or type-label-strong | numeric | Declares NO font-size, so it inherits 16px from body (.axis at axes.css:9 sets none). The axis score. Markup adds .num-tabular anyway (ui/axes.js:92, person-axes.ts:54). Decision: 16 or 14. |
| admin/src/styles/design/axes.css | 65 | `.axis__thumb` | font-size: var(--type-body-sm); font-weight: 700; font-variant-numeric: tabular-nums (line 82) | type-label-strong | numeric | 14px w700 inside a 24px pill. Weight 700 to 600. |
| admin/src/styles/design/axes.css | 103 | `.axis__delta` | font-size: var(--type-body-sm); line-height: 1.2; font-variant-numeric: tabular-nums (line 109) | type-label-strong | numeric | 14px/16.8px delta pill. |
| admin/src/styles/design/buttons-inputs.css | 346 | `.cmp-axis__read` | text-align: right; font-size: var(--type-body-sm); font-variant-numeric: tabular-nums; color: var(--color-ink) | type-body-sm | numeric | 14px. |
| admin/src/styles/design/notes-panel.css | 94 | `.notes-panel__ts` | font-variant-numeric: tabular-nums; color: var(--color-ink-mute); font-size: var(--type-body-sm) | type-body-sm | numeric | 14px timestamp. Phase 3 file, listed here so the tabular inventory is complete. |
| admin/src/styles/design/stage-extras.css | 35 | `.prep-timeline__num` | font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold); font-variant-numeric: tabular-nums | type-label-strong | numeric | 14px ordinal in a 1.75rem circle. |
| admin/src/styles/design/stage-extras.css | 76 | `.cl-overall__pct` | font-variant-numeric: tabular-nums; font-weight: var(--type-weight-semibold); font-size: var(--type-body-sm); min-width: 2.6rem | type-label-strong | numeric | 14px percentage. min-width stays. |
| admin/src/styles/design/stage-extras.css | 120 | `.cl-num` | font-weight: var(--type-weight-semibold); font-variant-numeric: tabular-nums (line 130) | type-label-strong | numeric | Declares no font-size; inherits 16px. A 2.6rem circle. |
| admin/src/styles/design/stage-extras.css | 142 | `.cl-count` | font-size: var(--type-body-sm); color: var(--color-ink-mute); font-variant-numeric: tabular-nums | type-body-sm | numeric | 14px. |
| admin/src/styles/design/stage-extras.css | 165 | `.cl-step-no` | color: var(--color-ink-mute); font-size: var(--type-body-sm); font-variant-numeric: tabular-nums; margin-right: 0.5rem | type-body-sm | numeric | 14px. |
| admin/src/styles/design/stage-extras.css | 268 | `.focus-point__num` | font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold); font-variant-numeric: tabular-nums | type-label-strong | numeric | 14px ordinal in a 1.75rem circle. |
| admin/src/styles/design/start-stage.css | 557 | `.lex-row__num` | font-variant-numeric: tabular-nums; color: var(--color-ink-mute); font-weight: 600; padding-top: 0.15rem | type-label-strong | numeric | No font-size; inherits 16px. |
| admin/src/styles/feedback-inbox.css | 71 | `.fb-time` | font-size: var(--type-body-sm, 14px); color: var(--color-ink-mute); font-variant-numeric: tabular-nums; white-space: nowrap | type-body-sm | numeric | 14px. Also a relative-font-size guard hit. Satellite sheet; the 080b9104 lane claim on this file has cleared. |
| admin/src/styles/feedback-inbox.css | 147 | `.fb-stars` | background: var(--sero-gold-200); color: var(--sero-gold-800); font-variant-numeric: tabular-nums | type-label (it is a chip variant) | numeric | Inherits the 14px chip size from base.css:145. |
| admin/src/styles/pulse-drilldowns.css | 16 | `.pd-count b` | color: var(--color-ink); font-variant-numeric: tabular-nums | inherits from .pd-count (14px) | numeric | Element-level descendant selector. |
| admin/src/styles/pulse-drilldowns.css | 19 | `.pd-stars` | white-space: nowrap; font-variant-numeric: tabular-nums | inherits | numeric | No size of its own. |
| admin/src/styles/pulse-drilldowns.css | 21 | `.pd-num` | font-variant-numeric: tabular-nums | inherits | numeric | Tabular-only rule; could be replaced by .num-tabular in markup. |
| admin/src/styles/pulse-drilldowns.css | 33 | `.pd-hist__n` | text-align: right; font-variant-numeric: tabular-nums; font-weight: 600 | type-label-strong | numeric | Inherits 14px from .pd-hist__row. |
| admin/src/styles/design/base.css | 46 | `.num-tabular` | font-variant-numeric: tabular-nums | KEEP as-is | numeric | The standalone escape hatch that type.css:215 and :243 both point at. 15 markup uses, 4 of them asserted in tests (admin-user-detail.test.ts:97, person-axes.test.ts:24/50/57). It must move to type.css for Phase 6 but must not be deleted. |
| admin/src/styles/design/base.css | 18 | `body` | font-family: "Inter Variable", "Inter", ui-sans-serif, system-ui, sans-serif; font-feature-settings: "ss01", "cv11"; font-variant-ligatures: common-ligatures; font-size: var(--type-body); line-height: 1.55 | must move to type.css | prose | The 1.55 body line-height is what .caption and .eyebrow inherit today (21.7px). Also a font-family-literal guard hit. base.css appears in no phase file. |
| admin/src/styles/design/base.css | 33 | `input, textarea, button, select` | font-family: inherit; font-size: var(--type-body); color: inherit | must move to type.css | control | The only thing giving the notes-panel textareas a size once notes-panel.css is stripped. Directly governs the auto-grow behaviour in section 6. |
| admin/src/styles/design/base.css | 113 | `.eyebrow` | font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold); color: var(--color-accent-dark); letter-spacing: var(--type-tracking-caps-lg); text-transform: uppercase | type-overline | chrome | 14px, line-height INHERITED 1.55 = 21.7px, so leading tightens 1.7px on 118 sites. Tracking is identical (0.08em). Colour (accent-dark) is not part of the role and must survive separately. |
| admin/src/styles/design/base.css | 120 | `.eyebrow--slot` | color: var(--color-ink-dim); letter-spacing: var(--type-tracking-caps) | NO EQUIVALENT EXISTS | chrome | 8 markup uses. letter-spacing is a type property so it cannot stay in base.css past Phase 6, and type.css has no .type-overline--slot. Needs a decision: add the modifier, or fold the slot tier away. |
| admin/src/styles/design/base.css | 102 | `.body` | font-size: var(--type-body); line-height: var(--type-leading-relaxed); color: var(--color-ink) | type-body | prose | 16px/25.6px to 16/24. Gains max-width: var(--measure). All 15 markup uses are in design.js. |
| admin/src/styles/design/base.css | 268 | `.label` | font-size: var(--type-body-sm); font-weight: var(--type-weight-medium); letter-spacing: var(--type-tracking-wider); line-height: var(--type-leading-normal); color: var(--color-ink-mute) | type-label | chrome | 14px/21px to 14/20, and tracking HALVES from 0.04em to 0.02em. phase-3.md already claims collapsing .label and .field__label (primitives.css:11) onto one label - check that has happened before touching this. |
| admin/src/styles/design/base.css | 275 | `.caption` | font-size: var(--type-body-sm); color: var(--color-ink-mute) | type-body-sm | prose | 14px, line-height INHERITED 1.55 = 21.7px to 20px. 45 markup uses. Gains max-width: var(--measure), which will bite on the wide run-debrief rows - check ui/run-debrief.js:37,39,87,92,97,182,190,196 for anything that must stay full width (.type-body--full). |
| admin/src/styles/design/base.css | 136 | `.chip, .um-badge, .pd-pill, .el-pill, .fb-pill, .fb-verdict, .fb-type, .cl-badge, .lib-badge, .cmp-verdict-tag` | font-size: var(--type-body-sm); font-weight: var(--type-weight-medium) (plus geometry that must STAY) | type-label (type only; geometry stays in base.css) | chrome | Move ONLY the two type declarations and group the ten families into .type-label in type.css. Move the whole block and you break four of chip-system.test.ts's six tests. Chips gain 0.02em tracking and a 20px line-height. |
| admin/src/styles/design/base.css | 204 | `.seg__btn, .el-filter, .rv-seg__btn` | font: inherit; font-size: var(--type-body-sm); font-weight: var(--type-weight-medium); line-height: 1.4 (plus geometry that must STAY) | type-label (type only) | control | Note the `font: inherit` shorthand FIRST - it resets font-variant-numeric and font-feature-settings. Same rule as P2 hit on .cp-seg. chip-system.test.ts:68-73 asserts these are grouped in base.css. |
| admin/src/styles/design/base.css | 236 | `.conf` | font-size: var(--type-body-sm); font-weight: var(--type-weight-medium) | type-label | chrome | 14px confidence dot-meter pill. |
| admin/src/styles/design/base.css | 279 | `.kbd` | font-size: var(--type-body-sm); font-family: inherit; line-height: 1.5 | type-code or type-label | chrome | 14px. font-family: inherit is deliberate (it is NOT mono today) - changing it to type-code changes the face. |
| admin/src/styles/design/base.css | 344 | `.stage-step` | color: var(--color-ink-mute); letter-spacing: 0.01em; font-weight: 500 | type-label | chrome | No font-size; a literal 0.01em tracking that matches no token. The session-topbar stepper in both apps. |
| admin/src/styles/design/mobile.css | 349 | `@media (max-width: 639.98px) :root` | --type-display: 1.9rem; --type-h1: 1.6rem; --type-h2: 1.35rem | DELETE with the tokens | unclear | The only phone type block outside type.css. type.css:283-285 says responsive type belongs only there. Deleting it is what exposes the .type-display phone-rung gap: the welcome hero goes 30.4px to 36px on a 390px screen unless .type-display is added to type.css's @media block. |
| admin/src/styles/design/mobile.css | 297 | `input, select, textarea (inside @media max-width: 767.98px)` | font-size: max(1rem, 1em) | must move to type.css | control | The iOS zoom guard. A guard literal-font-size hit. Cannot live in mobile.css past Phase 6, and mobile.css loads LAST so it currently beats every role. |
| admin/src/styles/design/tokens.css | 284 | `--type-display` | clamp(1.875rem, 5vw, 2.625rem) | DELETE | unclear | 5 consumers: base.css:58, base.css:68 (both UNCOVERED by phases 3/4), briefing.css:6 (P4), admin/tailwind.config.js:58 (P3 only touches xs), welcome-redesign.js:128 (parked). Plus the mobile.css:350 override. |
| admin/src/styles/design/tokens.css | 285 | `--type-h1` | clamp(2rem, 4.2vw, 2.75rem) | DELETE | unclear | 4 consumers: auth.css:48 (UNCOVERED) plus 3 parked gallery files. Plus the mobile.css:351 override. The inverted rung - see section 2. |
| admin/src/styles/design/tokens.css | 286 | `--type-h2` | clamp(1.75rem, 3.5vw, 2.25rem) | DELETE | unclear | 7 consumers: auth.css:119, auth.css:178, base.css:77 (all UNCOVERED), admin-tables.css:110 (P3), preparation-lab.css:516 (P4), entry-redesign.js:94 (parked), plus a comment at type.css:294. Plus the mobile.css:352 override. |
| admin/src/styles/design/tokens.css | 287 | `--type-h3` | 1.25rem | DELETE | unclear | 20 consumers. UNCOVERED by phases 3/4: auth.css:115, base.css:85, base.css:262, stage-review.css:90. Plus 7 in the parked gallery. |
| admin/src/styles/design/tokens.css | 288 | `--type-h4` | 1.125rem | DELETE | unclear | 22 consumers, 9 UNCOVERED - including TWO inline style= attributes at admin/src/stages/design.js:571 and :784 which no stylesheet sweep can reach. Others: admin-pulse.css:24, base.css:91, base.css:97, design-stage.css:42, mobile.css:58, stage-review.css:160, test-gallery.css:26. |
| admin/src/styles/design/tokens.css | 289 | `--type-body` | 16px | DELETE | unclear | 82 consumers, 14 UNCOVERED: admin-pulse.css:36, auth.css:203, base.css:28/35/103, design-stage.css:193/233/529/782, orb.css:45, start-stage.css:270, test-engine.css:99, ux-audit-fixes.css:26 (+ a comment in tailwind.css:11). Plus 21 in the parked gallery. |
| admin/src/styles/design/tokens.css | 290 | `--type-body-sm` | 14px | DELETE | unclear | THE BLOCKER. 431 consumers. Phases 3+4 as scoped clear 184. 145 remain in 40 files no phase names, plus 102 in the parked gallery. Also breaks preparation-css.test.ts:119 and start-core.test.ts:49/169, and admin/tailwind.config.js:59 (text-sm x107 markup uses). |
| admin/src/styles/design/tokens.css | 294 | `--type-body-md` | 15px | DELETE | unclear | 15 consumers: 13 in guided.css (P4), 1 parked, 1 UNCOVERED at frontend/src/styles/team-card.css:31. phase-4's done-when grep for --type-body-md will fail on team-card.css unless that file is added to Phase 4. |
| admin/src/styles/design/tokens.css | 293 | `--type-body-lg` | 1.0625rem (17px) | DELETE | unclear | 13 consumers: 4 in P4 files, 8 parked, 1 UNCOVERED at frontend/src/styles/team-card.css:47. Same gap as --type-body-md. |
| admin/src/styles/design/tokens.css | 297 | `--type-leading-tight` | 1.1 | DELETE | unclear | 13 consumers. 3 UNCOVERED: auth.css:50, base.css:61, base.css:71. Plus 7 parked and admin/tailwind.config.js:67 (leading-tight x7 markup uses). |
| admin/src/styles/design/tokens.css | 298 | `--type-leading-snug` | 1.25 | DELETE | unclear | 10 consumers. 1 UNCOVERED: base.css:265 (.ident-name, which is dead anyway). Plus 4 parked and admin/tailwind.config.js:68 (leading-snug x11 markup uses). |
| admin/src/styles/design/tokens.css | 299 | `--type-leading-normal` | 1.5 | DELETE | unclear | 48 consumers. 7 UNCOVERED: auth.css:135/204/249, base.css:93/272, primitives.css:20, start-stage.css:282. Plus 24 parked and admin/tailwind.config.js:69 (leading-normal x24 markup uses). |
| admin/src/styles/design/tokens.css | 300 | `--type-leading-relaxed` | 1.6 | DELETE | unclear | 20 consumers. 3 UNCOVERED: base.css:99, base.css:104, start-stage.css:272. Plus 10 parked and admin/tailwind.config.js:70 (leading-relaxed x15 markup uses). |
| admin/src/styles/design/tokens.css | 306 | `--type-weight-bold` | 700 | DELETE | unclear | 12 consumers, 7 UNCOVERED: auth.css:49, auth.css:123, design-stage.css:468, design-stage.css:750, mobile.css:59, shared-components.css:36, feedback-inbox.css:54. Every one is a live 700-weight decision that becomes 600 - not a mechanical delete. |
| admin/src/styles/design/tokens.css | 270 | `--font-mono` | ui-monospace, monospace | DELETE (merge into --type-family-mono) | unclear | 13 consumers, 4 UNCOVERED: design-stage.css:109, test-engine.css:254, test-engine.css:289, feedback-inbox.css:137. tokens.css:363 says the two merge when those sites move onto a role. |
| admin/src/styles/design/tokens.css | 309 | `--type-tracking-tighter` | -0.02em | CANNOT DELETE | unclear | type.css:66 (.type-display) reads it. Deleting it strips the display role's tracking silently. Keep, or inline -0.02em into the role. |
| admin/src/styles/design/tokens.css | 310 | `--type-tracking-tight` | -0.01em | CANNOT DELETE | unclear | type.css:81 (.type-heading-xl), :89 (.type-heading-lg) and :211 (.type-metric) all read it. Also admin/tailwind.config.js:63 (tracking-tight x5 markup uses). |
| admin/src/styles/design/tokens.css | 311 | `--type-tracking-wide` | 0.02em | CANNOT DELETE | unclear | type.css:165 (.type-label) reads it. Also admin/tailwind.config.js:64 (tracking-wide x3 markup uses). |
| admin/src/styles/design/tokens.css | 312 | `--type-tracking-wider` | 0.04em | DELETE - safe | unclear | Only base.css:271 (.label) plus about-stage.css (P4) and 4 parked. type.css does not read it. One of only two tracking tokens that can actually go. |
| admin/src/styles/design/tokens.css | 313 | `--type-tracking-caps` | 0.06em | DELETE - safe, IF .eyebrow--slot is resolved | unclear | Only base.css:122 (.eyebrow--slot) plus promise-agree.css (P4) and 3 parked. Blocked on the .eyebrow--slot decision. |
| admin/src/styles/design/tokens.css | 314 | `--type-tracking-caps-lg` | 0.08em | CANNOT DELETE | unclear | type.css:195 (.type-overline) reads it. |
| admin/tailwind.config.js | 58 | `fontSize.xs` | ["var(--type-small)", { lineHeight: "1.5" }] | DELETE | unclear | --type-small is undefined, so all 9 markup uses emit an invalid font-size and silently inherit. phase-3.md claims 6 sites; the real count is 9: design.js:705, lexicon-review.js:111, questioning.js:270, questioning.js:289, questioning.js:290, notes-panel.js:45, skeleton-presets.ts:291, plus promises-loop.js:164/241 (parked). Test-first: skeleton-presets.test.ts:242 asserts "text-xs". |
| admin/tailwind.config.js | 59 | `fontSize.sm` | ["var(--type-body-sm)", { lineHeight: "1.5" }] | repoint to var(--type-size-sm) / var(--type-leading-sm) | unclear | 107 live markup uses of text-sm. Mentioned in NO phase file. --type-body-sm cannot be deleted until this is repointed. |
| admin/tailwind.config.js | 60 | `fontSize.display` | ["var(--type-display)", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" }] | DELETE | unclear | Generates a .text-display utility at weight 700 that COLLIDES with base.css:56's .text-display at weight 600. tailwind.css is imported before design.css (main.js:3 then :4) so base.css wins today. Both must go together. |
| admin/tailwind.config.js | 63 | `letterSpacing.tight / letterSpacing.wide` | var(--type-tracking-tight) / var(--type-tracking-wide) | repoint or delete | unclear | tracking-tight x5 and tracking-wide x3 live markup uses. The config's own comments (x3, x2) are stale. |
| admin/tailwind.config.js | 67 | `lineHeight.tight / snug / normal / relaxed` | var(--type-leading-tight) / -snug / -normal / -relaxed | repoint or delete | unclear | leading-tight x7, leading-snug x11, leading-normal x24, leading-relaxed x15 = 57 live markup uses. All four legacy leading tokens are blocked on this. |
| admin/src/ui/page-header.ts | 19 | `<h1 class="h1">` | const h1 = `<h1 class="h1">${escapeHtml(opts.title)}</h1>` | type-heading-xl | heading | THE page-title primitive for the whole admin console. This is the rename that makes phase-5 scenario 2 (page titles at 30px) true. |
| admin/src/ui/page-header.test.ts | 13 | `assert.match(html, /<h1 class="h1">Team<\/h1>/)` | assert.match(html, /<h1 class="h1">Team<\/h1>/, "h1 title") | repoint to type-heading-xl | unclear | HARD FAILS the moment page-header.ts:19 renames. Change the assertion first, watch it fail, then change the source. |
| admin/src/ui/recap-header.test.ts | 18 | `assert.ok(!/<h1 class="h1">/.test(html))` | assert.ok(!/<h1 class="h1">/.test(html), "no parent list <h1 class='h1'> stacked on the recap") | repoint to type-heading-xl | unclear | Does NOT fail - it goes INERT. A negative assertion that passes trivially once the class no longer exists, silently losing the regression it guards. |
| admin/src/ui/finish-feedback-modal.test.ts | 56 | `assert.ok(!/class="eyebrow"/.test(MODAL))` | assert.ok(!/class="eyebrow"/.test(MODAL), "Small-caps eyebrow labels are back. A question is asked at reading size, not labelled like a field.") | repoint to type-overline | unclear | Same inert-guard problem. Must become /class="type-overline"/ or the modal can quietly regain eyebrow labels. |
| frontend/src/stages/preparation-brief.ts | 122 | `export function eyebrow(text, extra = "")` | return `<div class="eyebrow${extra ? ` ${extra}` : ""}">${esc(text)}</div>` | type-overline | unclear | NOT A LITERAL. The class name is glued to a template interpolation so class="eyebrow" does not match it. One helper feeds ~25 call sites across preparation-brief.ts (157,158,171,174,180,237,243) and preparation-lab.ts (57,63,75,96,98,113,132,134,154,158,207,224,234,246,252,270). |
| admin/src/ui/skeleton-presets.ts | 214 | `skLeaf("eyebrow", "10ch")` | ${skLeaf("eyebrow", "10ch")}${skLeaf("", "100%")}${skLeaf("", "78%")} | type-overline | unclear | NOT A LITERAL - the class is a function argument. motion.css:153 builds ghosts from the REAL class, so a ghost that misses the rename sizes differently from the card it stands in for. |
| admin/src/ui/skeleton-presets.ts | 230 | `skLeaf("eyebrow", "11ch")` | ${skLeaf("eyebrow", "11ch")}${skLeaf("", "100%")}${skLeaf("", "64%")} | type-overline | unclear | Second non-literal skeleton eyebrow, in the sections() preset. |
| admin/src/styles/design/chip-system.test.ts | 29 | `const inGroup = (css, sel) => new RegExp(`^\\.${sel}\\s*(,|\\{)`, "m").test(css)` | const BASE = read("base.css"); ... assert.ok(inGroup(BASE, family), `.${family} is part of the shared .chip recipe in base.css`) | add a TYPE = read("type.css") assertion alongside | unclear | The regex itself needs NO change if only the type declarations move out of base.css - the geometry group stays and inGroup still matches. What is actually needed is a second assertion, inGroup(TYPE, family), so a chip family that loses its base.css font-size but never joins .type-label is caught. Without it the test silently stops proving the type half. |
| admin/src/ui/notes-panel-utils.js | 55 | `const line = parseFloat(cs.lineHeight) || 22` | const cs = getComputedStyle(ta); const line = parseFloat(cs.lineHeight) || 22; | verify by hand, do not change the code | unclear | phase-5.md says line 54; it is line 55. Returns "24px" today (16px x 1.5 from notes-panel.css:110-111), so || 22 never fires. Absolute leadings keep it a px string. The risk is the textarea losing its line-height entirely: computed becomes "normal", parseFloat NaN, and the fallback silently sizes the box off 22 against a ~19px line box. |
| admin/src/styles/design/notes-panel.css | 105 | `.notes-panel__edit, .notes-panel__compose textarea` | font: inherit; font-size: var(--type-body); line-height: 1.5 | type-body (16/24 - keeps auto-grow byte-identical) | control | Governs both auto-grow textareas (notes-panel.js:100 composer, notes-list.js:66 edit box). type-body gives computed lineHeight "24px", exactly today's value. Any other role changes the box height; NO role makes it "normal" and trips the || 22 fallback. |
| frontend/src/stages/preparation-css.test.ts | 119 | `assert.ok(TOKENS.has("--type-body-sm"), "the type scale is in the table")` | assert.ok(TOKENS.has("--type-body-sm"), "the type scale is in the table") | repoint to --type-size-sm | unclear | HARD FAILS on the --type-body-sm deletion. In my lane. |
| admin/src/stages/start-core.test.ts | 49 | `assert.ok(/\.run-list__status\s*\{[^}]*--type-body-sm/.test(CSS), "the chip respects the 14px floor")` | same, and again at line 169 for .run-list__example | repoint to --type-size-sm, or to the role grouping | unclear | Two HARD FAILS on the --type-body-sm deletion. Also note both selectors live in start-stage.css, which no phase file names. |
| admin/src/stages/design.js | 215 | `118 of the 269 legacy class uses (.text-display x2, .h2 x4, .h3 x6, .h4 x6, .lead x4, .body x15, .label x13, .caption x26, .eyebrow x4 and more)` | class="text-display" / "h2" / "h3" / "h4" / "lead" / "body" / "label" / "caption" / "eyebrow" | role names - OR leave for Phase 6 | unclear | 44% of the whole markup sweep is in this one file, which phase-6.md says gets REWRITTEN to show the seven rungs and fourteen roles. Renaming here in P5 and rewriting in P6 is pure churn. Recommend deferring this file to Phase 6 and saying so in the phase note. |
| admin/src/stages/tests/runner-v2.js | 145 | `.rv2-stem (32px), .rv2-hint (17px), three 15px rows` | font-size:32px / 17px / 15px x3 - 5 of the guard's 7 nonTokenFont hits | retire the file, or record the contradiction | unclear | phase-5.md's carried-in item from P2 verification. It is the POC the Meeting screen was designed from and now shows a design the live screen deliberately no longer matches. Retiring it takes nonTokenFont from 7 to 0 once the two 30px literals go; leaving it caps the ceiling at 5. |
| admin/src/stages/tests/welcome-redesign.js | 128 | `the 5 parked gallery files read the retiring tokens ~180 times` | var(--type-display), var(--type-h1), var(--type-h3), var(--type-body) x21, var(--type-body-sm) x102, var(--type-leading-normal) x24 ... | decide: migrate, or accept silent breakage | unclear | The gallery is exempt from the GUARD, not from the CASCADE. An undefined var() makes the whole font-size declaration invalid at compute time, so all five prototypes fall back to inherited sizes with no lint error and no failing test. Also holds 3 .eyebrow markup uses (promises-before-recap.js:89/94, promises-loop.js:112). |
| admin/src/styles/design/type.css | 287 | `@media (max-width: 639.98px) block` | only .type-heading-xl and the three grouped question stems drop, to --type-size-xl (20/28) | ADD .type-display (and consider .type-heading-lg) | unclear | Once mobile.css:349-353 is deleted, .type-display has no phone rung and the welcome hero GROWS from 30.4px to 36px on a 390px screen - the exact failure Carl's 27 Jul phone shot motivated. .type-heading-lg similarly goes 21.6 to 24. |
| docs/plans/doing/type-system/phase-5.md | 24 | `the Done-when grep` | grep -rn "type-h1\|type-h2\|type-h3\|type-h4\|type-body\|type-display\|type-leading-tight\|type-leading-snug\|type-leading-normal\|type-leading-relaxed" admin/src frontend/src returns nothing | rewrite the acceptance test | unclear | Cannot pass as written. It does not exclude admin/src/stages/tests/ (the parked gallery, ~180 hits) and phases 3+4 as scoped leave 145 uncovered --type-body-sm sites alone. Either widen Phase 3's scope, exclude the gallery from the grep, or move the residue into Phase 5's stated scope. |
| docs/plans/doing/type-system/phase-5.md | 25 | `"The alias block is gone from type.css"` | - [ ] The alias block is gone from `type.css`; markup uses role names only | correct the file reference | unclear | FACTUALLY WRONG. type.css contains no alias block. The ten treatment classes live in admin/src/styles/design/base.css lines 56-278. The research doc planned to put them in type.css; P1 did not. A build agent following this literally will look in the wrong file. |

## Risks
- THE PHONE REGRESSION NOBODY HAS FLAGGED. Deleting mobile.css:349-353 removes the only phone override for --type-display, and type.css's @media block only drops .type-heading-xl. The welcome hero therefore GROWS from 30.4px to 36px on a 390px screen, and .briefing-headline and .text-display do the same. This is the exact failure Carl's 27 Jul phone shot motivated. Add .type-display (and probably .type-heading-lg) to type.css's @media (max-width: 639.98px) block in the same commit, or ship a mobile regression on the first screen a manager sees.
- FOUR OF THE SIX --type-tracking-* TOKENS ARE READ BY type.css ITSELF. phase-5.md line 11 says delete all six. type.css:66, :81, :89, :165, :195 and :211 read tighter, tight, wide and caps-lg. Deleting them strips the tracking off .type-display, .type-heading-xl, .type-heading-lg, .type-label, .type-overline and .type-metric with no lint error and no failing test - an invalid var() on a non-inherited property just computes to initial. Only --type-tracking-wider and --type-tracking-caps are genuinely deletable.
- --type-body-sm CANNOT BE DELETED IN PHASE 5 AS THE PLAN STANDS. 431 consumers; phases 3 and 4 as scoped clear 184. 145 remain in 40 files that no phase file names (design-stage.css x17, start-stage.css x17, test-engine.css x15, admin-pulse.css x13, stage-review.css x12, base.css x7, axes.css x6, account-sheet.ts x6, primitives.css x5, plus 30 more files), and 102 more in the parked gallery. Phase 3's Goal says '~150 chrome selectors' but its Done-when names only 8 files. Either widen Phase 3, or Phase 5 absorbs roughly 145 extra selectors it has not budgeted for.
- admin/tailwind.config.js IS AN UNCOUNTED BLOCKER. Nine entries read retiring tokens and back roughly 181 live markup uses: text-sm x107 (--type-body-sm), leading-normal x24, leading-relaxed x15, leading-snug x11, text-xs x9, leading-tight x7, tracking-tight x5, tracking-wide x3, text-display x2. Only the xs entry is mentioned in any phase file. None of the four legacy leading tokens or --type-body-sm can be deleted until all nine are repointed.
- THE MARKUP RENAME IS NOT MECHANICAL. Three sites build the class name dynamically and a class="eyebrow" search will not find them: frontend/src/stages/preparation-brief.ts:123 (glued to a template interpolation, feeding ~25 call sites on the customer prep brief) and admin/src/ui/skeleton-presets.ts:214 and :230 (passed as a function argument). Miss the skeleton ones and the loading ghosts size differently from the cards they stand in for - the exact coupling type.css:37-40 documents.
- TWO TESTS GO INERT RATHER THAN FAILING. recap-header.test.ts:18 and finish-feedback-modal.test.ts:56 are NEGATIVE assertions on class="h1" and class="eyebrow". After the rename they pass trivially and stop guarding anything, and nothing goes red to tell you. Both must be repointed to the role names in the same commit as the rename.
- THE 16 METRIC SELECTORS DO NOT EXIST AS A SET. Only three selectors in the repo render a large number: .lp-tile__value (30px), .gd-block__score (30px) and .run-log__stat-value (20px). The 21 tabular-figure sites are otherwise all 14 to 16px chrome. Applying .type-metric (30/36 Bricolage) to a list of 16 would blow up table counts, step ordinals and percentage chips. Build from the size, not from the count.
- THE face CHANGES ARE INVISIBLE IN A DIFF AND OBVIOUS ON SCREEN. .h3 is the base family today and .type-heading-md is Bricolage, so every .h3 in the app changes typeface. Six selectors currently use Bricolage BELOW 20px (session-topbar.css:52, design-stage.css:42, test-gallery.css:26, guided.css:91, guided.css:365, team-card.css:31/47) and the roles deliberately do not, so those all change face the other way. Screenshot before and after, not just measure.
- WEIGHT DROPS 700 TO 600 ON TEN LIVE SELECTORS as --type-weight-bold retires: auth.css:49 and :123, app-nav.css:147, mobile.css:59, session-topbar.css:49, run-detail.css:21, design-stage.css:468 and :750, shared-components.css:36, feedback-inbox.css:54, plus .gd-block__score, .gd-q__stem, .gd-block__label and .gd-panel__title which declare 700 literally. The brand wordmark going from 700 to 600 is a brand decision, not a type decision.
- 44% OF THE MARKUP SWEEP IS CHURN. 118 of the 269 legacy class uses live in admin/src/stages/design.js, which phase-6.md says gets rewritten. Renaming them in P5 and rewriting the file in P6 wastes the work and doubles the review surface.
- DELETING THE TOKENS SILENTLY BREAKS THE PARKED GALLERY. admin/src/stages/tests/*.js reads them ~180 times. The gallery is exempt from the guard, not from the cascade: an undefined var() invalidates the whole declaration at compute time, so five prototype screens quietly fall back to inherited sizes with no lint error and no failing test.
- A PARALLEL SESSION IS COMMITTING TO THESE FILES. type.css and phase-5.md both changed under me mid-audit (commit b662b101). Re-read type.css and phase-5.md immediately before building; the phone rung is now 20/28, not 24/32, and phase-5.md has gained a carried-in item about runner-v2.js.
- EVERY MEASUREMENT HERE IS STATIC. I read files and ran the linter; I did not open a browser. The clamp arithmetic, the inversion crossover at 1000px and the 24px computed lineHeight in section 6 are all derived, not observed. The house rule is that code is not proof - screenshot the welcome screen, a page title, a person's page, the Pulse tiles and the notes panel at 1440px AND 390px before calling it done.

## Open questions
- Does .h1 split, and where exactly? phase-5.md scenario 1 wants the welcome heading at 36 and scenario 2 wants page titles at 30, and both wear class="h1" today. My reading: admin/src/stages/start-welcome.ts:148 is the only hero (-> type-display 36/40) and everything routed through admin/src/ui/page-header.ts:19 plus the 34 per-stage titles are page titles (-> type-heading-xl 30/36). But admin/src/stages/intake.js has FOUR class="h1" sites (144, 297, 339, 418) on the first-run flow, and briefing.js:26 is an error state. Are those heroes or page titles? Carl should see one screenshot of each before this is locked.
- Should .run-log__stat-value take type-metric? The plan's role table says metric is for KPI values, but this selector is 20px today and metric is 30px Bricolage - a 50% jump on the run-debrief stat tiles, which are internal QA surfaces, not a customer dashboard. It already gets tabular figures from .num-tabular in markup. Option A: type-metric (matches Pulse, big change). Option B: type-heading-md 20/28 (no size change). I lean B; it is Carl's eye.
- What happens to .eyebrow--slot? 8 markup uses, and its only distinguishing type property is letter-spacing: 0.06em against the section tier's 0.08em - which cannot stay in base.css past Phase 6 and has no equivalent in type.css. Option A: add .type-overline--slot to type.css. Option B: fold the slot tier away and let ink colour carry the distinction (which is what P2 did for the coach score label and its delta, on the grounds that a 1px or 0.02em difference is one nobody sees). B is more consistent with the system; A is less disruptive.
- Where does .input land? clamp(1.25rem, 3.5vw, 1.75rem) renders 28px at 1440 on intake, feedback, forgot-password, briefing notes and job-lexicons. 28 is off-ladder. 24 (heading-lg) keeps it feeling like a big deliberate field; 20 (heading-md) makes it an ordinary input. buttons-inputs.css is a Phase 4 file, so this may want to move phases.
- Is the brand wordmark allowed to stay at 700? .app-nav__word, .app-nav-mobilebar__brand and .session-topbar__brand-word are all 18px weight 700 and read --type-weight-bold. The roles top out at 600. Either the wordmark drops to 600 (visible, and it is the Sero logotype) or it earns a documented one-line exception. Not a typography decision - a brand one.
- Does admin/src/stages/design.js get swept in Phase 5 or left for Phase 6? It holds 118 of the 269 legacy class uses and phase-6.md says the file is rewritten. Doing it twice is churn; leaving it means the Done-when grep for the alias classes cannot return zero at the end of Phase 5.
- Do the five parked gallery prototypes get migrated, retired, or knowingly broken? phase-5.md already asks this for runner-v2.js. The same question applies to all five: they read the retiring tokens ~180 times and will silently lose their sizes. Retiring runner-v2.js also takes the guard's nonTokenFont ceiling from 7 to 0, which is the cleanest possible proof the phase landed.
- Should Phase 3's scope be widened before Phase 5 starts, or should Phase 5 absorb the residue? Phase 3's Goal says ~150 chrome selectors but its Done-when names 8 files, leaving 145 --type-body-sm sites and 40 files unclaimed by any phase - including base.css, start-stage.css, design-stage.css, test-engine.css, stage-review.css, axes.css, primitives.css, admin-pulse.css and the customer app's team-card.css. This is the single biggest sequencing question and it should be answered before a line is written.
- Session a6878b4e's lane (claimed 2026-07-27, so stale under the board's own 2-day rule) covers admin/src/ui/stage-recap-sections.js, which holds 11 .eyebrow and 2 .caption markup uses, and admin/src/styles/design/stage-lookback.css. Stale means the hook should let the edit through, but the house rule says surface it to Carl rather than edit through a claim. Worth 30 seconds of his time before starting.
- phase-5.md line 25 says 'the alias block is gone from type.css'. There is no alias block in type.css - the ten treatment classes are in admin/src/styles/design/base.css lines 56 to 278. Should the phase file be corrected first so a build agent does not go looking in the wrong file?
