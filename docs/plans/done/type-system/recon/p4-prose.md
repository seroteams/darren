# Recon: p4-prose

_Read-only inventory, 2026-07-30. Source of truth for the build._

PHASE 4 INVENTORY — reading surfaces. Read-only pass, 2026-07-30, tree at commit 84ff6cc1 ("phase-close: type-system P2 closed unwalked"). Nothing written.

=====================================================================
0. THREE CORRECTIONS TO THE PLAN BEFORE ANYTHING ELSE
=====================================================================

0a. TWO FILE PATHS IN phase-4.md DO NOT EXIST.
    `admin/src/styles/design/meeting-arcs.css` -> real path is `admin/src/styles/meeting-arcs.css`
    `admin/src/styles/design/member-home.css`  -> real path is `frontend/src/stages/member-home.css`
    Both are code-split satellites (imported from `admin/src/stages/meeting-arcs.js:7` and
    `frontend/src/stages/member-home.js:18`), not barrel members. That matters: they inject AFTER
    the main bundle, so pattern (a) requires stripping every type declaration from them.

0b. `.arc-phase__q` IS NOT A QUESTION STEM. phase-4.md lists it as one of the stem's five homes.
    `admin/src/stages/meeting-arcs.js:359` renders `<span class="arc-phase__q">${n} q</span>`.
    It is a per-phase question COUNT. Kind = numeric, stays 14px. Treating it as a stem and
    sending it to heading-xs would put "3 q" at 16/600 next to a 16px label.

0c. `guided.css:433` (cited in phase-4.md for the stem) DOES NOT EXIST. The file is 384 lines.
    The stem lives at `:94` (`.gd-q__stem`, 16/700) and `:113` (`.gd-q--done .gd-q__stem`, 15/600).

=====================================================================
1. EVERY PROSE SELECTOR IN THE TEN NAMED SHEETS
=====================================================================
Every row is in the workItems table with file:line, today's verbatim declarations, and the role.
The narrative facts a build agent needs:

THE REAL READING-WIDTH PROBLEM, MEASURED FROM THE SHELLS (this is what Carl will see):
  - The RECAP renders inside `admin/src/stages/briefing.js:100`
    `<div class="stage-wide max-w-wide ... recap-page">`. `.stage-wide` (base.css:316) =
    `--container-wide` = 72rem = **1152px**. `.briefing-prose` (briefing.css:40) and
    `.brutal__body` (:257) sit in full-width `.briefing-block` children, declare NO max-width,
    and therefore run **1152px** ~= 114 characters. Those two are the biggest single win in
    the phase.
  - `.bullets-host .bullet`, `.action-body` and `.watch-item__text` sit inside
    `.briefing-grid--pair` (2 columns >=768px), so they already break at ~556px. They still
    need the role for size/leading consistency, but they are not the width story.
  - The PREP BRIEF renders inside `frontend/src/stages/preparation.ts:55`
    `<div class="stage-reading ...">`. `.stage-reading` (base.css:330) = `--container-reading`
    = 56rem = **896px** ~= 89 characters. Every `.pv-*` prose selector in preparation.css and
    preparation-lab.css declares NO max-width, so all of it runs 896px.
  - The GUIDED RUNNER renders inside `.l-container` (guided.page.ts:411), = `--measure` =
    38rem = 608px. Its prose is already at a sane width; guided's problem is size (15px), not
    measure.

FOUR MECHANICAL TRAPS IN THE GROUPING PATTERN (all provable from type.css as it stands):
  T1. `.type-body` declares `font-weight: var(--type-weight-regular)` (400). Grouping a BOLD
      16px selector into it silently un-bolds it, and the component sheet cannot keep the weight
      because the whole point is that it declares zero type. The correct home for every
      16px-semibold object is `.type-heading-xs` (16/600/24, base family). Affected:
      `.arc-phase__label` (600), `.pv-rate__q` (600), `.gd-q__stem` (700), `.gd-block__label`
      (700), `.focus-point__label` (600), `.about-duo__title` (600), `.member-empty__head` (600).
  T2. `.type-body` declares `max-width: var(--measure)`. Grouping a CONTROL or a CELL into it
      caps it at 608px. Use `.type-body--full` (type.css:230) for `.textarea--question`,
      `.pa-input`, `.gd-notes textarea`, `.gd-field` inputs, `.arc-edit .input`.
  T3. Roles carry ABSOLUTE leadings (`--type-leading-base` = 1.5rem = 24px). Several selectors
      today carry a MULTIPLIER that is load-bearing:
        `briefing.css:87  .bullet__mark { line-height: inherit }` — deliberate, so the bullet
          mark shares the sentence's baseline. `.type-body-sm`'s fixed 20px breaks the grid.
        `preparation-lab.css:121 .pv-tile__name { line-height: 1 }` — keeps the 3-across tile
          short. `.type-label`'s 20px grows every tile.
        `guided.css:33 .gd-stepper .stage-step { line-height: 1 }` — pill height.
        `admin-tables.css:387 .star-rating__star { line-height: 1 }`.
      Each needs its own line kept, or the role applied and the geometry moved to a length.
  T4. `font: inherit` is a shorthand and resets `font-variant-numeric`, `font-feature-settings`
      and `font-variant-ligatures` (type.css:237-256 documents this). Nine sites in the phase-4
      set carry it: `.pa-input` (promise-agree:54), `.pa-add` (:113), `.gd-notes textarea`
      (guided:121), `.gd-field select/input/textarea` (:338), `.gd-chip` (:145), `.gd-eng button`
      (:261), `.gd-row` (:165), `.gd-q__clock` (:97), `.gd-panel__x` (:317),
      `.about-alpha__link` (about-stage:205), `.arc-card__head` has none. The guard's
      `fontShorthandResetsNumeric` ceiling is locked at ZERO, so any of these that ends up
      before a `font-variant-numeric` in the same rule breaks the build.

TWO DUPLICATE-CLASS SPLITS ALREADY IN THE TREE (the exact defect P2 fixed for `.question-stem`):
  - `.question-desc`: type.css:131 groups `.cp-screen .question-desc` into `.type-body`, but
    `briefing.css:187` still styles `.questioning-card .question-desc, .flow-section
    .question-desc` at 16/1.5. Same class, two recipes. They must join the same group.
  - `.question-drill-hint`: type.css:147 groups `.cp-screen .question-drill-hint` into
    `.type-body-sm`, but `briefing.css:166` styles the bare `.question-drill-hint` (padding +
    line-height 1.45, no size). Same split.

=====================================================================
2. THE ~40 HAND DECISIONS — WHERE THE NUMBER COMES FROM
=====================================================================
`node scripts/lint-design-tokens.js --json` (free, read-only) returns exactly:
  off-ladder-font 22 + literal-font-size 12 + clamp-off-rung 10 = 44 rows,
  minus 4 rows counted twice (admin-tables.css:386, test-engine.css:139, meeting-arcs.css:18,
  buttons-inputs.css:62 each fire two rules) = **40 UNIQUE SITES**. That is the ~40. The full
  40 are in workItems with a kind and a justification each. Sixteen of them are in guided.css,
  which matches phase-4.md's own count.

Current guard state (ceilings from scripts/test-design-guard.js:43, may fall never rise):
  relativeFontSize 33/33 · offLadderFont 22/22 · unsanctionedSizeToken 439/439 ·
  literalFontSize 12/12 · undefinedToken 3/3 · clampOffRung 10/10 · displayFaceBelow20 7/7 ·
  fontFamilyLiteral 8/8 · fontShorthandResetsNumeric 0/0.
Phase 4 should land: offLadderFont 22 -> 0, literalFontSize 12 -> ~4, and a large cut to
unsanctionedSizeToken. clampOffRung and displayFaceBelow20 are Phase 5's.

THE THING A BLIND FIND-REPLACE DESTROYS — proved, not assumed:
  `guided.css:9-16` declares `.gd svg, .gd-portal svg { width: 1em; height: 1em; }` and
  `guided-icons.ts` emits SVG strings with a viewBox and **no width/height attributes**. So in
  the whole guided runner an icon's size IS its font-size. `.gd-row__chev` at
  `--type-body-lg` renders a 17x17 chevron; `.gd-block__icon` at 17px renders a 17px glyph in a
  38px medallion; `.gd-panel__x` at 17px renders a 17px close cross in a 32px button;
  `.gd-q__clock` at 15px renders a 15px clock in a 28px button. Sending those "up to 16" as
  prose enlarges chrome across the customer app; sending them "down to 14" shrinks the
  iconography by up to 18%. Both are real changes, and neither is a text change.
  Contrast: `admin/src/ui/icon.js:31` DOES write `width="${size}" height="${size}"`, so
  `.star-rating__star { font-size: 1.75rem }` (admin-tables.css:386) is inert for the star
  itself and only sets the button's line box.

=====================================================================
3. THE CONFIDENCE READOUT — NINE SELECTORS, THREE SIZES, ONE OBJECT
=====================================================================
The same sentence (`BriefSlots.confidence`, a plain-language rewrite of the engine's
Low/Medium/High line — preparation-brief.ts:78 `confidenceCopy`) renders through:

  18px  frontend/src/stages/preparation-lab.css:355  .pv-a__confidence   font-size: var(--type-h4); line-height: var(--type-leading-relaxed); color: var(--color-ink)
  18px  frontend/src/stages/preparation-lab.css:470  .pv-e__lead         font-size: var(--type-h4); line-height: var(--type-leading-relaxed); color: var(--color-ink)   [E's confidence + opener + leave-with all share this class]
  16px  frontend/src/stages/preparation-lab.css:915  .pv-h__confidence   font-size: var(--type-body); line-height: var(--type-leading-relaxed); max-width: var(--measure); color: var(--color-ink-dim)
  14px  frontend/src/stages/preparation-lab.css:384  .pv-b__confidence   font-size: var(--type-body-sm); color: var(--color-ink-mute)
  14px  frontend/src/stages/preparation-lab.css:522  .pv-f__confidence   font-size: var(--type-body-sm); max-width: var(--measure); color: var(--color-ink-dim)
  14px  frontend/src/stages/preparation-lab.css:615  .pv-g__confidence   font-size: var(--type-body-sm); color: var(--color-ink-dim)
  14px  frontend/src/stages/preparation-lab.css:744  .pv-i__confidence   font-size: var(--type-body-sm); line-height: var(--type-leading-normal); color: var(--color-ink-dim)
  14px  frontend/src/stages/preparation-lab.css:787  .pv-j__confidence   font-size: var(--type-body-sm); color: var(--sero-offwhite-300)   [on the navy band]
  14px  frontend/src/stages/preparation.css:89       .pv-l__confidence   font-size: var(--type-body-sm); color: var(--color-ink-dim)        [THE SHIPPED ONE]
  Plus two unclassed homes: variant C (preparation-lab.ts:98) uses Tailwind `text-ink
  leading-relaxed` -> inherits 16px; variant D (:118) and K (:275) put it in a bare `<p>`
  inside `.pv-d__value` / `.pv-k__body p` -> 16px.

  And the separate dot-meter chip: `admin/src/styles/design/base.css:236 .conf` —
  font-size: var(--type-body-sm); font-weight: var(--type-weight-medium). It is a PILL that
  sits BESIDE the sentence (preparation-brief.ts:140 `confMeter`), never replaces it. It is
  chrome, not the readout. Three sheets re-ground its colour only, no type:
  preparation-lab.css:612, :795, preparation.css:133.

  CONFIRMATION: yes, all nine sentence selectors collapse to ONE role. They differ only in
  size (18/16/14), colour and an optional measure — colour is per-context (off-white on J's
  navy band, ink-dim elsewhere) and stays in the component sheet, which declares no type.
  phase-4.md says "All become `label`". That is the wrong role for a sentence: `.type-label`
  is 14/500 with `--type-tracking-wide`, built for a field label. The readout is a full
  sentence a manager reads. **Recommend `.type-body` (16/24 + measure) for all nine**, which
  also satisfies the phase's own goal ("every reading block becomes 16px"). If Carl wants it
  quieter than the brief around it, `.type-body-sm` is the fallback — but not `.type-label`.
  `.conf` stays as it is (14px chrome, P3's stratum).

=====================================================================
4. THE QUESTION STEM'S OTHER HOMES — FIVE SURFACES, FOUR SIZES
=====================================================================
P2 already put the 1:1 stem on `.type-heading-xl` (30/36 display, dropping to `--type-size-xl`
20/28 below 640px — type.css:301-307, changed since plan.md was written; the phone rung is now
xl, not 2xl). The other homes:

  a) frontend/src/stages/guided/guided.css:94  `.gd-q__stem`
     `font-weight: 700; font-size: var(--type-body); color: var(--sero-charcoal-800); flex: 1`
     Context: the Monthly Check-in runner. Several question CARDS stack on one screen
     (guided-stages.ts:57, :102, :189). It is a list item, not a hero.
     -> `.type-heading-xs` (16/600/24). Same size, weight 700->600.
     NOT heading-xl: five 30px stems down one 608px column is unreadable.
  b) frontend/src/stages/guided/guided.css:113 `.gd-q--done .gd-q__stem`
     `font-size: var(--type-body-md); font-weight: 600`  (15/600)
     -> same `.type-heading-xs`. The "done" affordance is already carried by
     `.gd-q--done { opacity: 0.75 }` (:112), so losing the 1px size drop costs nothing.
  c) admin/src/styles/design/buttons-inputs.css:416 `.cmp-q`
     `font-weight: 600; font-size: var(--type-body-sm)`  (14/600)
     Context: the internal Compare screen (compare.js:370), a dense two-run diff table where
     each row is `q` over `a`. Nobody reads it as prose; they scan it.
     -> `.type-label-strong` (14/600/20). It is a table row label, and it should stay 14.
  d) admin/src/styles/meeting-arcs.css:31 `.arc-phase__q` — NOT A STEM. See 0b. numeric, 14px.
  e) admin/src/styles/finish-feedback-modal.css:15 `.ffm__q`
     `font-size: var(--type-body, 16px)`  (16px, var-fallback = a relativeFontSize hit)
     Context: one question in a 440px modal, the only reading text in it
     (finish-feedback-modal.js:35, "Would you use this before your next 1:1?").
     -> `.type-heading-xs` (16/600) — it gains a weight and reads as the ask, matching (a).
        `.type-body` (16/400) is the conservative alternative if Carl wants no weight change.
     HARD BLOCKER: `admin/src/ui/finish-feedback-modal.test.ts:63` asserts
     `assert.match(CSS, /\.ffm__q\b/, "The question needs its own reading-size rule.")`.
     Stripping the selector out of the sheet FAILS that test. Test-first: change the assertion
     to point at type.css, watch it fail, then move the rule.
  f) admin/src/styles/design/run-detail.css:77 `.rd-turn__q`
     `display:flex; align-items:baseline; justify-content:space-between; gap: var(--sero-space-3);
      font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold); margin-bottom: .25rem`
     Context: the member re-reading a past 1:1 (run-detail.ts:104). Q over A, many per page.
     -> `.type-heading-xs` (16/600) so the question you are re-reading is reading size, and its
        answer `.rd-turn__a` (:90, 14px) goes UP to `.type-body` (16). Today the answer — the
        thing with the most words on the screen — is the smallest text on it.

  Net: the stem stops being four sizes and becomes two — heading-xl where ONE question is the
  screen (the live 1:1), heading-xs everywhere it is one item in a list. `.cmp-q` is the single
  deliberate exception, and it is an internal diff table.

=====================================================================
5. THE MEASURE — THE TOKENS CANNOT CHANGE; THE ROLES CAN
=====================================================================
Values: `--measure` 38rem = 608px (tokens.css:376) · `--measure-tight` 32rem = 512px (:421) ·
`--measure-lede` 44rem = 704px (:422) · `--measure-narrow` 46ch (:373, added by P1).

Character arithmetic, using the repo's OWN measured figure (type.css:223: "46ch is 464px at
16px Inter", so 1ch ~= 10.09px; Inter's nominal digit advance of 0.6em would give 9.6px):
  --measure 38rem = 608px = **60ch to 63ch**
  --measure-lede 44rem = 704px = 70ch to 73ch
  --measure-tight 32rem = 512px = 51ch to 53ch
  66ch = 633px to 666px · 72ch = 691px to 726px
=> **38rem is ALREADY inside the phase's own 60-66 character target band.** Prose does not run
long today because the token is wrong. It runs long because most prose selectors declare no
max-width at all. The fix is to make prose consume a measure, not to retune the number.

CONSUMERS OF --measure (13 CSS sites + 5 Tailwind utility sites + 2 role rules):
  LAYOUT — must keep a LENGTH, a character measure would be wrong:
    admin/src/styles/design/layout.css:11        .l-container                    page column, 18 plain markup sites (11 more use --wide, 1 --full). Changing --measure moves every one.
    admin/src/styles/design/flow-kit.css:38      .flow-interstitial__skeleton    a skeleton box width (flow-interstitial.ts:22)
    admin/src/styles/design/briefing.css:60      .briefing-grid--pair > :only-child   a grid-cell cap
    frontend/src/stages/preparation-lab.css:350  .pv-a                           variant A's whole column
    frontend/src/stages/preparation-lab.css:928  .pv-h__section                  a section block holding lists + eyebrows
  PROSE — a character measure is right:
    admin/src/styles/design/primitives.css:82    .page-header__lede
    admin/src/styles/design/about-stage.css:16   .about-hero__lede
    admin/src/styles/design/about-stage.css:50   .about-sec__sub
    admin/src/styles/design/start-stage.css:181  .start-welcome__lede
    admin/src/styles/design/start-stage.css:283  .start-welcome__after
    frontend/src/stages/preparation-lab.css:524  .pv-f__confidence
    frontend/src/stages/preparation-lab.css:917  .pv-h__confidence
    frontend/src/stages/preparation-lab.css:809  .pv-j__opener   (a 20px display-face opener — prose-ish, but a HEADING measure, not a body one)
    admin/src/styles/design/type.css:140         .type-body      (the role)
    admin/src/styles/design/type.css:154         .type-body-sm   (the role)
  TAILWIND `max-w-measure` (generated from admin/tailwind.config.js:45 `measure: "var(--measure)"`,
  the config's own comment says x5) — ALL FIVE ARE PROSE LEDES, none is a layout container:
    admin/src/stages/intake.js:62         <p class="text-ink-dim text-sm max-w-measure js-intake-lede">
    admin/src/stages/job-lexicons.js:26   <div class="text-ink-dim max-w-measure">
    admin/src/stages/lexicon-review.js:26 <div class="text-ink-dim max-w-measure js-stage-lede">
    admin/src/stages/meeting-arcs.js:40   <div class="text-ink-dim max-w-measure">
    admin/src/stages/personas.js:62       <div class="text-ink-dim max-w-measure">
  --measure-tight: ONE consumer, frontend/src/stages/member-home.css:29 `.member-empty__copy`. Free to change.
  --measure-lede:  ONE live consumer, type.css:124 `.type-body-lg`. The other seven are the parked
    gallery files under admin/src/stages/tests/ (entry-redesign.js:63, how-it-works.js:208,
    welcome-lean.js:60, welcome-options.js:66/87, welcome-redesign.js:109/122/223). Free to change.

  VERDICT: **do not touch `--measure`.** `.l-container` alone would move 18 screens. Put the
  character measures inside the roles instead — `.type-body { max-width: 66ch }` and
  `.type-body-lg { max-width: 72ch }` — or add two new tokens (`--measure-body: 66ch`,
  `--measure-lede-ch: 72ch`) and point only the roles at them. That is one edit in type.css,
  changes zero layout containers, and leaves the eight prose `--measure` consumers above to be
  swept onto the roles (which then carry the ch measure for free).
  NOTE: a 66ch measure (633-666px) is WIDER than `.l-container` (608px), so inside the guided
  runner and every `.l-container` page it will not bite. That is correct behaviour, not a bug —
  the container is already the measure there.
  Three prose selectors already use ch and can stay: briefing.css:162 `.question-session-notes`
  64ch · about-stage.css:114 `.about-how__line` 52ch · type.css:229 `--measure-narrow` 46ch.

=====================================================================
6. preparation-lab.css REALITY CHECK — MIGRATING IT IS NOT THEATRE
=====================================================================
945 lines, 11 alternative layouts. The gate is `frontend/src/stages/preparation.ts:52`:
  `const lab = isAdmin(store.user);`
and `admin/src/state.ts:208-213`:
  `isAdmin` returns true for `roles.includes("manager") || roles.includes("admin")`.
So the lab chunk loads for EVERY MANAGER, not just internal admins. Once it lands,
`wireLabSwitcher` (preparation.ts:108) injects a switcher chip into the page header with a
12-tile popover (`VARIANTS`, preparation-lab.ts:31-44: Arc, Bento, Contrast, Editorial, Native,
Runner, Scan, Sheet, Split, Spotlight, Timed, Utility). Picking one calls `writeVariant` ->
`localStorage["sero.prepare.briefVariant"]`, and `readVariant(storage, true)` replays it on every
later visit (preparation-lab.ts:366).

  WHAT SHIPS BY DEFAULT: variant L "Arc", rendered by `renderL` in preparation-brief.ts:169,
  styled by preparation.css. Guests and members get L and no switcher — `readVariant(storage,
  false)` short-circuits to DEFAULT_VARIANT (preparation-lab.ts:367), so a stored lab choice on
  a shared browser fails safe.

  ARE THE OTHER 11 REACHABLE? YES — by any manager or admin, in two clicks, and the choice
  STICKS across sessions. Variant H is a special case: `renderH` lives in the CUSTOMER bundle
  (preparation-brief.ts:235) while its `.pv-h*` styles live in the admin-only chunk, so H is
  reachable only when the lab has loaded — which is exactly the manager case.

  PLAIN VERDICT: **migrating preparation-lab.css is necessary, not theatre.** A manager who
  picked "Editorial" three weeks ago is on 18px confidence text today and would be the one
  person who does not see Phase 4 land. The honest scope reduction, if one is wanted, is not
  "skip the lab" — it is "retire the lab" (a separate decision for Carl: 945 lines and 11
  layouts kept alive for a picker no customer sees).

=====================================================================
7. LANE CHECK
=====================================================================
LANES.md today holds five rows: a6878b4e (stage-lookback), c9200bfa (backup scripts),
f1363886 (admin/src/stages/bank.js), c91a58a9 (coach-hints-live: backend + content/prompts),
and 1a2e5006 (type system — THIS session's id, per the scratchpad path).

  ALREADY MINE (row 1a2e5006): docs/plans/doing/type-system/, design/tokens.css, design/base.css,
  design/type.css, design/briefing.css, design/admin-tables.css, admin/tailwind.config.js,
  styles/design.css, frontend/src/stages/preparation-css.test.ts, scripts/lint-design-tokens.js,
  scripts/test-design-guard.js.

  UNCLAIMED BY ANYONE — free, but the lane row must be WIDENED before editing:
  design/stage-extras.css, design/about-stage.css, design/promise-agree.css,
  design/run-detail.css, design/buttons-inputs.css, design/layout.css, design/primitives.css,
  design/flow-kit.css, design/start-stage.css, design/design-stage.css, design/test-engine.css,
  design/member-runs.css, design/mobile.css, design/auth.css, styles/meeting-arcs.css,
  styles/finish-feedback-modal.css, styles/add-person-modal.css, styles/admin-pulse.css,
  frontend/src/stages/member-home.css, frontend/src/stages/guided/guided.css,
  frontend/src/stages/preparation.css, frontend/src/stages/preparation-lab.css,
  frontend/src/styles/team-card.css, admin/src/ui/finish-feedback-modal.test.ts.

  THE COLLISION IN plan.md:29 AND phase-4.md:15 HAS CLEARED. Session `080b9104` (brief star
  rating) is NO LONGER on the board, and its work has landed — the `.pv-rate` / `.pv-rate__q` /
  `.pv-rate__status` block is already in preparation.css:198-221 and `.star-rating` is in
  admin-tables.css:385. `admin/src/styles/feedback-inbox.css` (Phase 3's half of the same
  collision) is likewise unclaimed. **There is no lane collision for Phase 4. Do not surface
  one to Carl.** Re-read LANES.md at start-of-work anyway; a hook enforces it.

=====================================================================
8. GUARD + TEST TRIPWIRES THE BUILD WILL HIT
=====================================================================
  A. frontend/src/stages/preparation-css.test.ts:111 asserts
     `assert.ok(/font-size\s*:/.test(css))` over preparation.css + preparation-lab.css COMBINED,
     and :126 asserts `declarations.length > 0`. If Phase 4 strips EVERY font-size out of both
     sheets (the clean end-state), BOTH assertions fail. Test-first: retarget them at type.css
     or invert them to "no font-size survives in either sheet".
  B. admin/src/ui/finish-feedback-modal.test.ts:63 asserts `.ffm__q` exists in
     finish-feedback-modal.css. See 4e.
  C. admin/src/styles/design/chip-system.test.ts:40 forbids `border-radius|padding|font-size|
     font-weight` inside `.cl-badge` (stage-extras.css:190) and eight sibling chip families.
     Do not add a size to any of them while sweeping stage-extras.css.
  D. admin/src/ui/skeleton-presets.ts builds ghosts out of the REAL classes:
     `field-live-label__text` (:284), `rd-name` (:219), `lp-tile__value` (:198),
     `eyebrow` (:214, :230), `hint hint--kbd text-xs` (:291), `run-list__side` (:112).
     Every one of those is in Phase 4's or Phase 3's set — the ghost re-sizes with the real
     thing, which is the point (type.css:38-40), but it means a size change shows up in the
     loading state too.
  E. `scripts/test-design-guard.js:96 fontShorthandResetsNumeric: 0` is locked at ZERO. See T4.
  F. `admin/src/styles/design/mobile.css:349-352` REDEFINES `--type-display`, `--type-h1`,
     `--type-h2` inside a phone media query. mobile.css imports LAST (design.css:49), so those
     overrides beat everything. Any clamp site retired in Phase 5 has to account for its phone
     twin. Documented already in type.css:294-300.

=====================================================================
9. FOUR SURFACES NOTHING HERE REACHES (context, not scope)
=====================================================================
  admin/src/ui/recap-pdf.ts — 18 hardcoded pdfmake sizes, ALLOWLISTED at
  lint-design-tokens.js:80 so the guard is blind to it. Phase 6.
  backend/api/services/notifications/email-layout.ts — a fourth type system, outside SCAN_DIRS
  ("admin/src", "frontend/src") entirely. Phase 6.
  admin/src/ui/profile-badge.js:68 and admin/src/ui/account-sheet.ts — template-literal <style>
  blocks; the linter DOES scan .js/.ts, so their sizes are counted (profile-badge.js:60 is one
  of the 33 relativeFontSize hits).
  admin/src/stages/tests/* — five parked gallery prototypes, TYPE_EXEMPT at
  lint-design-tokens.js:99. The 14px floor and colour rules still apply to them; the structural
  type rules do not. Leave them.

## Work items (171)

| file | line | selector | today | role | kind | note |
|---|---|---|---|---|---|---|
| admin/src/styles/design/briefing.css | 40 | `.briefing-prose` | font-size: var(--type-body); line-height: 1.65; color: var(--color-ink); margin: 0; | .type-body | prose | The recap's main paragraph. Sits in a full-width .briefing-block inside .recap-page at --container-wide (72rem = 1152px) and declares no max-width, so it runs ~114 characters today. The single biggest reading-width win in the phase. |
| admin/src/styles/design/briefing.css | 257 | `.brutal__body` | font-size: var(--type-body); line-height: 1.55; color: var(--color-ink); | .type-body | prose | The brutal-truth paragraph, also full-width in .recap-page at 1152px. Second biggest width win. |
| admin/src/styles/design/briefing.css | 73 | `.bullets-host .bullet` | font-size: var(--type-body); line-height: 1.55; display: grid; grid-template-columns: 1rem 1fr; gap: .75rem; align-items: baseline; padding: .25rem 0; | .type-body | prose | Already ~556px inside .briefing-grid--pair, so this is a size/leading consistency fix, not a width fix. Keep the grid geometry in briefing.css. |
| admin/src/styles/design/briefing.css | 82 | `.bullet__mark` | color: var(--sero-lavender-700); font-size: var(--type-body-sm); line-height: inherit; | .type-body-sm + keep line-height: inherit | glyph | The lavender bullet dot, not text. P0 raised it from 0.65em to 14px. line-height: inherit is deliberate so the mark shares the sentence baseline; the role's fixed 20px leading would break that alignment, so this one cannot be grouped cleanly. |
| admin/src/styles/design/briefing.css | 142 | `.watch-item__text` | color: var(--color-ink); line-height: 1.55; font-size: var(--type-body); | .type-body | prose | Watch-for item body. In the pair grid, ~556px already. |
| admin/src/styles/design/briefing.css | 296 | `.action-body` | color: var(--color-ink); line-height: 1.55; font-size: var(--type-body); | .type-body | prose | Next-action body. Sits in an 8rem+1fr subgrid, so the measure will not bite; take the role for size/leading only. |
| admin/src/styles/design/briefing.css | 187 | `.questioning-card .question-desc, .flow-section .question-desc` | font-size: var(--type-body); line-height: 1.5; color: var(--color-ink-dim); | .type-body (join the existing group) | prose | type.css:131 already groups .cp-screen .question-desc into .type-body. These are its twins. Left behind, one class reads two ways depending on screen. This is the exact defect P2 fixed for .question-stem. |
| admin/src/styles/design/briefing.css | 166 | `.question-drill-hint` | padding: .5rem .75rem; border-radius: var(--radius-card); background: color-mix(...); line-height: 1.45; | .type-body-sm (join the existing group) | prose | type.css:147 groups .cp-screen .question-drill-hint into .type-body-sm; the bare class here is unowned and only carries a leading. Same split as .question-desc. |
| admin/src/styles/design/briefing.css | 156 | `.question-session-notes` | margin: 0; font-size: var(--type-body-sm); color: var(--color-ink-dim); font-style: italic; line-height: 1.45; max-width: 64ch; | .type-body-sm + keep font-style: italic | prose | The 'what you told Sero' echo. Already carries a 64ch measure, the only prose selector in the sheet that does. font-style is not a type property any role carries, so it stays. |
| admin/src/styles/design/briefing.css | 213 | `.question-source-answer` | margin: 0; padding: 8px 14px; border-left: 3px solid var(--color-primary-line); background: var(--color-bg); border-radius: var(--radius-input); font-size: var(--type-body-sm); line-height: 1.5; color: var(--color-ink-dim); | .type-body | prose | JUDGEMENT: the full previous answer, quoted so the thread-follow stem has context. It is a paragraph the manager reads, so it goes UP to 16 under the phase's own goal. .type-body-sm is the conservative alternative if Carl wants the quote quieter than the stem. |
| admin/src/styles/design/briefing.css | 193 | `.textarea--question` | font-size: var(--type-body); line-height: 1.55; min-height: 7rem; | .type-body + .type-body--full | control | A textarea does not inherit font-family, so the role has to supply it. Needs --full: the role's 608px max-width would narrow the answer box inside the 832px .stage-questioning shell. |
| admin/src/styles/design/briefing.css | 205 | `.field-live-label__text` | display: block; margin-bottom: 8px; font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold); color: var(--color-ink); | .type-label-strong | chrome | Ghosted by skeleton-presets.ts:284, so the loading state follows the change. |
| admin/src/styles/design/briefing.css | 123 | `.copy-snippet-btn__label` | font-size: var(--type-body-sm); | .type-label | chrome | Button label inside a 2rem control. Stays 14. |
| admin/src/styles/design/briefing.css | 286 | `.action-when` | font-size: var(--type-body-sm); color: var(--color-accent-dark); background: var(--color-accent-soft); padding: .15rem .5rem; border-radius: var(--sero-radius-full); font-weight: 500; justify-self: start; text-transform: lowercase; | .type-label + keep text-transform: lowercase | chrome | text-transform IS a type property and no role carries lowercase. It has to survive the strip or the date pill reads 'Next Tuesday' instead of 'next tuesday'. |
| admin/src/styles/design/briefing.css | 247 | `.brutal__eyebrow` | font-size: var(--type-body-sm); color: var(--color-ink-dim); font-weight: 500; margin-bottom: .35rem; display: flex; ... | .type-label | chrome | stage-extras.css:54 also declares .brutal__eyebrow (layout only). Two sheets, one class: sweep both together. |
| admin/src/styles/design/briefing.css | 4 | `.briefing-headline` | font-size: var(--type-display); line-height: 1.14; letter-spacing: -0.02em; font-weight: 600; color: var(--color-ink); max-width: 40rem; text-wrap: balance; | .type-display | heading | ONE OF THE 40 (clamp-off-rung: --type-display is clamp(1.875rem, 5vw, 2.625rem) = 30 to 42px, both endpoints off the rungs). Phase 5's job, listed so the count reconciles. |
| admin/src/styles/design/briefing.css | 60 | `.briefing-grid--pair > :only-child` | grid-column: 1 / -1; max-width: var(--measure); | keep a length | chrome | LAYOUT consumer of --measure, not prose. A grid-cell cap. Must keep 38rem if --measure ever moves. |
| admin/src/styles/design/stage-extras.css | 329 | `.notes-quote` | margin: 0 0 var(--sero-space-6); padding: .25rem 0 .25rem var(--sero-space-4); border-left: 3px solid var(--color-primary-line); font-size: var(--type-h4); line-height: 1.55; color: var(--color-ink); | .type-body-lg | prose | The manager's own note read back as a quote. This is the phase's lede case: 18/28 plus the lede measure (--measure-lede today, 72ch if the roles move to ch). |
| admin/src/styles/design/stage-extras.css | 340 | `.notes-quote--empty` | font-size: var(--type-body); color: var(--color-ink-mute); | .type-body | prose | The no-note state, deliberately quieter than the quote. Stays 16. |
| admin/src/styles/design/stage-extras.css | 290 | `.focus-point__label` | font-weight: var(--type-weight-semibold); color: var(--color-ink); | .type-heading-xs | heading | TRAP T1: declares no size, so it inherits 16 and is bold. .type-body would drop it to 400. heading-xs (16/600) is the only role that preserves both. |
| admin/src/styles/design/stage-extras.css | 291 | `.focus-point__reason` | font-size: var(--type-body-sm); color: var(--color-ink-dim); line-height: 1.5; | .type-body-sm | prose | JUDGEMENT: kept at 14, not raised. It is the second tier inside a selectable option card; raising it to 16 collapses the label/reason hierarchy the card is built on. |
| admin/src/styles/design/stage-extras.css | 292 | `.focus-point__evidence` | font-size: var(--type-body-sm); color: var(--color-ink-mute); | .type-body-sm | prose | Third tier under the reason. Stays 14 for the same reason. |
| admin/src/styles/design/stage-extras.css | 346 | `.focus-select-hint` | font-size: var(--type-body-sm); color: var(--color-ink-dim); | .type-body-sm | chrome | Helper line above the list. |
| admin/src/styles/design/stage-extras.css | 56 | `.brutal__badge` | font-size: var(--type-body-sm, 0.875rem); font-weight: var(--type-weight-semibold); letter-spacing: 0.02em; text-transform: uppercase; padding: .12rem .5rem; border-radius: var(--sero-radius-full); | .type-overline (tracking differs) | chrome | One of the 33 relativeFontSize hits: the var() fallback must go. .type-overline uses --type-tracking-caps-lg (0.08em) against this 0.02em, so grouping visibly widens the badge. Either accept the wider tracking or keep letter-spacing in the component sheet. |
| admin/src/styles/design/stage-extras.css | 67 | `.brutal__note` | margin-top: .4rem; font-size: var(--type-body-sm); color: var(--color-ink-mute); font-style: italic; | .type-body-sm + keep font-style: italic | prose | Quiet aside under the brutal card. |
| admin/src/styles/design/stage-extras.css | 137 | `.cl-phase-title h3` | margin: 0; font-size: var(--type-h4); font-weight: var(--type-weight-semibold); color: var(--color-ink); | .type-heading-sm | heading | 18/600 already; heading-sm is 18/600/28 base-family, an exact fit. Internal checklist screen. |
| admin/src/styles/design/stage-extras.css | 6 | `.pill` | font-size: var(--type-body-sm); font-weight: var(--type-weight-medium); padding: .4rem .85rem; ... | .type-label | chrome | Phase 3's stratum by size, but the sheet is on Phase 4's list, so sweep it in the same pass. |
| admin/src/styles/design/stage-extras.css | 40 | `.prep-timeline__num` | font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold); font-variant-numeric: tabular-nums; | .type-label-strong + keep font-variant-numeric AFTER | numeric | A numbered medallion. tabular-nums is outside the font shorthand and the role does not carry it; it must be re-declared after any composite. |
| admin/src/styles/design/stage-extras.css | 44 | `.prep-timeline__when` | font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold); color: var(--color-ink); margin-bottom: .25rem; | .type-label-strong | chrome | Step heading in the prep timeline. Also the slot label in lab variant C (preparation-lab.ts:91). |
| admin/src/styles/design/stage-extras.css | 176 | `.cl-tag` | display: inline-block; font-size: var(--type-body-sm); letter-spacing: .04em; text-transform: uppercase; ... | .type-overline (tracking differs) | chrome | Same tracking mismatch as .brutal__badge (0.04em vs the role's 0.08em). |
| admin/src/styles/design/stage-extras.css | 190 | `.cl-badge` | letter-spacing: 0.02em; vertical-align: middle; margin-left: 0.5rem; | leave alone | chrome | BLOCKED BY TEST: chip-system.test.ts:40 forbids border-radius/padding/font-size/font-weight inside .cl-badge. Its geometry comes from the shared .chip recipe in base.css. Do not add a size here. |
| admin/src/styles/design/stage-extras.css | 210 | `.cl-kick__lede, .cl-kick__saved, .cl-kick__preview, .cl-kick__preview pre, .cl-phase-tag, .cl-goal, .cl-count, .cl-means, .cl-meta div, .cl-step-no, .cl-overall__pct, .cl-num` | all font-size: var(--type-body-sm) (14px), several with font-variant-numeric: tabular-nums | .type-body-sm / .type-label / .type-code | chrome | Twelve 14px chrome selectors on the internal prototype-to-production checklist. Pure Phase 3 stratum work; listed as one row because they classify mechanically from the tuple they already declare. .cl-kick__preview pre goes to .type-code (it is the only --font-mono site in the sheet). |
| admin/src/styles/design/about-stage.css | 103 | `.about-how__title` | margin: 0; font-size: var(--type-body-lg); font-weight: var(--type-weight-semibold); line-height: var(--type-leading-tight); color: var(--color-ink); | .type-heading-xs | heading | ONE OF THE 40: --type-body-lg = 1.0625rem = 17px, off the ladder. It is a step title sitting UNDER a 20px .about-sec__title and BESIDE a 14px .about-chip on a baseline row. 16/600 is the rung that keeps it below the section title; 18 would tie it too close. DOWN from 17 to 16. |
| admin/src/styles/design/about-stage.css | 110 | `.about-how__line` | margin: 0; color: var(--color-ink-dim); line-height: var(--type-leading-normal); max-width: 52ch; | .type-body | prose | Declares no size, inherits 16. Already carries a 52ch measure, so it is the model for the whole phase. Only the leading changes (1.5 multiplier to a fixed 24px). |
| admin/src/styles/design/about-stage.css | 116 | `.about-how__you` | margin: 0; font-size: var(--type-body-sm); color: var(--color-ink-dim); line-height: var(--type-leading-normal); | .type-body | prose | JUDGEMENT: goes UP 14 to 16. It is the 'what you do' sentence under the step line, a reading block by the phase's own definition. Flagged because it removes a size distinction from its sibling above it; the <b> inside it (:122) still carries the emphasis. |
| admin/src/styles/design/about-stage.css | 46 | `.about-sec__sub` | margin: 0; font-size: var(--type-body-sm); color: var(--color-ink-dim); max-width: var(--measure); | .type-body | prose | JUDGEMENT: a section lede under a 20px title. Goes UP 14 to 16. Already a --measure consumer (prose, so a ch measure is right here). |
| admin/src/styles/design/about-stage.css | 13 | `.about-hero__lede` | margin: 0; color: var(--color-ink-dim); max-width: var(--measure); | .type-body | prose | No size declared, inherits 16. Prose consumer of --measure. |
| admin/src/styles/design/about-stage.css | 237 | `.about-duo__body` | margin: 0; color: var(--color-ink-dim); font-size: var(--type-body-sm); line-height: var(--type-leading-normal); | .type-body | prose | JUDGEMENT: the see/private explanation pair, two paragraphs of real copy. Goes UP 14 to 16. |
| admin/src/styles/design/about-stage.css | 184 | `.about-alpha` | display: flex; align-items: flex-start; gap: var(--sero-space-3); padding-left: var(--sero-space-4); border-left: 3px solid var(--sero-primary-400); color: var(--color-ink-dim); font-size: var(--type-body-sm); | .type-body-sm | prose | JUDGEMENT: stays 14. It is a quiet caveat row, deliberately below the page's reading tier, and it carries a link that must not grow with it. |
| admin/src/styles/design/about-stage.css | 233 | `.about-duo__title` | font-weight: var(--type-weight-semibold); color: var(--color-ink); | .type-heading-xs | heading | TRAP T1: bold at inherited 16. .type-body would flatten it to 400. |
| admin/src/styles/design/about-stage.css | 40 | `.about-sec__title` | margin: 0; font-size: var(--type-h3); font-weight: var(--type-weight-semibold); color: var(--color-ink); | .type-heading-md | heading | 20px, on the ladder. Phase 5's heading sweep, but note the role adds the display face, which this rule does not have today. |
| admin/src/styles/design/about-stage.css | 76 | `.about-cap span` | font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold); letter-spacing: var(--type-tracking-wider); text-transform: uppercase; color: var(--color-ink-mute); | .type-overline | chrome | Tracking is --type-tracking-wider (0.04em) against the role's --type-tracking-caps-lg (0.08em). Same call as .brutal__badge. |
| admin/src/styles/design/about-stage.css | 25 | `.about-hero__hint` | color: var(--color-ink-dim); font-size: var(--type-body-sm); | .type-body-sm | chrome | Hint beside the hero CTA. |
| admin/src/styles/design/about-stage.css | 126 | `.about-chip` | font-size: var(--type-body-sm); font-weight: var(--type-weight-medium); ... padding: 2px var(--sero-space-3); white-space: nowrap; | .type-label | chrome | Meta chip on the step row. |
| admin/src/styles/design/about-stage.css | 169 | `.about-step__n` | ... width/height 1.75rem; font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold); font-variant-numeric: tabular-nums; | .type-label-strong + keep font-variant-numeric AFTER | numeric | Step numeral in a 28px circle. Stays 14. |
| admin/src/styles/design/about-stage.css | 201 | `.about-alpha__link` | background: none; border: 0; padding: 0; font: inherit; color: var(--color-accent-dark); font-weight: var(--type-weight-medium); text-decoration: underline; ... | .type-body-sm (inherit its parent's role instead) | control | TRAP T4: font: inherit is a shorthand. On a <button> it is doing real work (buttons do not inherit type). If the role replaces it, the role must declare family, size, weight and leading together, exactly as .cp-seg does at type.css:175. |
| admin/src/styles/design/promise-agree.css | 53 | `.pa-input` | font: inherit; font-size: var(--type-body); line-height: 1.35; color: var(--color-ink); border: 1px solid transparent; ... white-space: pre-wrap; overflow-wrap: anywhere; | .type-body + .type-body--full | control | A contenteditable div carrying the promise text. TRAP T4 (font: inherit) and T2 (needs --full so a long promise is not capped at 608px inside the 832px shell). Its own comment says the self-contained font exists so it never inherits the questioning card's big answer size, which is exactly what the role guarantees. |
| admin/src/styles/design/promise-agree.css | 123 | `.pa-add__plus` | width: 32px; height: 32px; border-radius: var(--sero-radius-full); border: 1.5px dashed var(--color-primary-line); display: inline-flex; ... font-size: var(--type-h4); line-height: 1; color: var(--color-accent); | leave 18px, tokenise to var(--type-size-lg) | glyph | A '+' sign inside a 32px dashed circle. 18px is on the ladder so the guard is quiet; it is glyph geometry, not text, so no reading role applies. line-height: 1 is load-bearing for centring. |
| admin/src/styles/design/promise-agree.css | 27 | `.pa-av` | flex: none; width: 32px; height: 32px; ... font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold); cursor: pointer; | leave 14px, tokenise | glyph | The owner avatar: a single initial, or a 17px SVG (:47 sets width/height 17px explicitly, so the font-size does not drive it). Monogram geometry, not text. |
| admin/src/styles/design/promise-agree.css | 77 | `.pa-who` | font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold); | .type-label-strong | chrome | Owner name under the promise. |
| admin/src/styles/design/promise-agree.css | 80 | `.pa-when` | display: inline-flex; align-items: center; gap: var(--sero-space-1); font-size: var(--type-body-sm); color: var(--color-ink-dim); white-space: nowrap; | .type-label | chrome | Date chip. Its 14px SVG is explicitly sized at :88. |
| admin/src/styles/design/promise-agree.css | 159 | `.agreed-owner-label` | display: block; font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold); letter-spacing: var(--type-tracking-caps); text-transform: uppercase; color: var(--color-ink-mute); margin-top: var(--sero-space-3); | .type-overline (tracking differs) | chrome | --type-tracking-caps is 0.06em; the role uses 0.08em. Third instance of the same tracking mismatch across the phase, which is itself worth one decision rather than three. |
| admin/src/styles/design/promise-agree.css | 9 | `.pa-hint, .pa-cap, .pa-empty, .pa-loopnote, .agreed-note` | all font-size: var(--type-body-sm) (14px); .pa-empty adds font-style: italic | .type-body-sm | chrome | Five quiet 14px lines on the promises step (lines 9, 139, 140, 149, 169). Grouped as one row: they classify identically. Keep font-style on .pa-empty. |
| admin/src/styles/design/promise-agree.css | 109 | `.pa-add` | display: inline-flex; ... font: inherit; font-size: var(--type-body-sm); font-weight: var(--type-weight-medium); color: var(--color-accent-dark); background: none; border: 0; | .type-label | control | TRAP T4: font: inherit on a <button>. |
| admin/src/styles/design/run-detail.css | 7 | `.rd-avatar` | width: 52px; height: 52px; font-size: 1.125rem; | leave 18px, tokenise to var(--type-size-lg) | glyph | ONE OF THE 40 (literal-font-size, 1.125rem). It holds a single initial letter in a 52px circle (admin-user-detail.ts:74, recap-header.ts:35). Monogram geometry, not text: no reading role applies, but the literal must become a token. |
| admin/src/styles/design/run-detail.css | 90 | `.rd-turn__a` | font-size: var(--type-body-sm); | .type-body | prose | The ANSWER to a past 1:1 question: the longest block of words on the screen, and currently the smallest text on it. Goes UP 14 to 16. This is the phase's whole argument in one selector. |
| admin/src/styles/design/run-detail.css | 77 | `.rd-turn__q` | display: flex; align-items: baseline; justify-content: space-between; gap: var(--sero-space-3); font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold); margin-bottom: 0.25rem; | .type-heading-xs | heading | The question stem's fifth home (see findings §4f). 16/600 pairs it with the 16/400 answer below. Keep the flex geometry in run-detail.css. |
| admin/src/styles/design/run-detail.css | 62 | `.rd-digest` | font-size: var(--type-body); | .type-body | prose | The run's digest paragraph. Declares no measure and sits in an .l-container (608px), so the role's measure is a no-op there but correct if the shell ever widens. |
| admin/src/styles/design/run-detail.css | 40 | `.rd-tab__n` | color: var(--color-ink-mute); font-size: var(--type-body-sm, 14px); margin-left: 3px; | .type-body-sm (drop the fallback) | numeric | One of the 33 relativeFontSize hits. The answered-question count beside a tab label; the var() fallback is what the rule fires on and removing it can only lower the count. |
| admin/src/styles/design/run-detail.css | 21 | `.rd-name` | font-family: var(--type-family-display); font-size: var(--type-h3); font-weight: var(--type-weight-bold); line-height: 1.2; | .type-heading-md | heading | Phase 5. Two dependants: admin-tables.css:110 overrides it to --type-h2 inside .ud-nameline (a deliberate hierarchy fix), and skeleton-presets.ts:219 ghosts the class. Weight 700 to 600 under the role. |
| admin/src/styles/design/run-detail.css | 27 | `.rd-type-badge, .rd-when > span` | font-size: var(--type-body-sm); .rd-type-badge adds font-weight: var(--type-weight-medium) | .type-label / .type-body-sm | chrome | Badge and the date/duration row (lines 27 and 51). Stay 14. |
| admin/src/styles/meeting-arcs.css | 18 | `.arc-chip__sep` | color: var(--color-ink-dim); font-size: 1.1rem; | var(--type-size-base) (16px) | glyph | ONE OF THE 40, and it fires TWO rules (off-ladder 17.6px + literal 1.1rem). Content is a bare arrow: meeting-arcs.js:321 renders <span class="arc-chip__sep" aria-hidden="true">→</span>. A separator glyph between phase chips, never read. DOWN to 16 puts it on the ladder and keeps it slightly larger than the 14px chips it sits between. |
| admin/src/styles/meeting-arcs.css | 30 | `.arc-phase__intent` | font-size: var(--type-body); color: var(--color-ink-dim); margin-top: 3px; line-height: 1.5; | .type-body | prose | The phase intent sentence, the main reading text on the arcs screen. |
| admin/src/styles/meeting-arcs.css | 32 | `.arc-anti` | margin: 0; padding-left: 20px; color: var(--color-ink-dim); font-size: var(--type-body); line-height: 1.5; | .type-body | prose | The anti-patterns <ul>. Keep the padding-left in the component sheet. |
| admin/src/styles/meeting-arcs.css | 29 | `.arc-phase__label` | font-weight: 600; font-size: var(--type-body); color: var(--color-ink); | .type-heading-xs | heading | TRAP T1: 16/600. Grouping it into .type-body silently un-bolds it against the 16/400 intent line directly beneath, and the two become indistinguishable. |
| admin/src/styles/meeting-arcs.css | 31 | `.arc-phase__q` | flex: none; font-size: var(--type-body-sm); color: var(--color-ink-dim); white-space: nowrap; margin-top: 3px; | .type-body-sm | numeric | CORRECTION TO THE PLAN: this is NOT a question stem. meeting-arcs.js:359 renders `${Number(p.target_questions) || 0} q` — a per-phase question count. Stays 14. Treating it as a stem would put '3 q' at 16/600. |
| admin/src/styles/meeting-arcs.css | 15 | `.arc-chip` | font-size: var(--type-body); font-weight: 500; line-height: 1.4; padding: 4px 11px; border-radius: 7px; background: var(--sero-soft-200); ... | .type-label | chrome | A phase-id pill (meeting-arcs.js:320), not reading text. DOWN 16 to 14 to match every other chip in the app. Flagged because it is a visible shrink, on an internal admin screen no customer sees. |
| admin/src/styles/meeting-arcs.css | 53 | `.arc-edit .input` | font-size: var(--type-body); padding: 0.4rem 0; | .type-body + .type-body--full | control | Deliberately overrides .input's clamp(1.25rem, 3.5vw, 1.75rem) down to 16 for the dense editor rows. Keep the 16; the role just tokenises it. Needs --full so the field fills its column. |
| admin/src/styles/meeting-arcs.css | 56 | `.arc-edit__msg, .arc-update__msg` | font-size: var(--type-body); .arc-update__msg adds color: var(--color-ink-dim) | .type-body | prose | Save/refresh status sentences (lines 56 and 62). Sixteen already; take the role for leading and measure. |
| admin/src/styles/meeting-arcs.css | 11 | `.arc-card__meta, .arc-edited, .arc-phase__id, .arc-update__time` | all font-size: var(--type-body-sm) (14px); .arc-edited and .arc-phase__id add font-weight: 600 | .type-body-sm / .type-label-strong | chrome | Four 14px chrome selectors (lines 11, 12, 25, 65). .arc-update__time also carries a nested colour fallback var(--color-ink-mute, var(--color-ink-dim)) which is not a type property and stays. |
| admin/src/styles/meeting-arcs.css | 20 | `.arc-sec, .arc-field > span` | font-size: var(--type-body-sm); font-weight: 600; letter-spacing: .04em / .03em; text-transform: uppercase; color: var(--color-ink-dim); | .type-overline | chrome | Two eyebrow rivals in one sheet with two different trackings (0.04em at :20, 0.03em at :49). Both collapse onto the one overline recipe. |
| frontend/src/stages/member-home.css | 50 | `.member-req__text` | font-size: var(--type-body-sm); color: var(--color-ink); | .type-body | prose | The request sentence a member reads on their home screen. Goes UP 14 to 16. |
| frontend/src/stages/member-home.css | 68 | `.member-goal__text` | font-size: var(--type-body-sm); color: var(--color-ink); font-weight: var(--type-weight-medium); | .type-heading-xs | prose | JUDGEMENT: the goal sentence, 14/500 today. Going UP to 16 is right, but .type-body would drop the 500 to 400 and the goal would stop leading its own progress row. heading-xs (16/600) keeps a weight; .type-body is the alternative if Carl prefers it unweighted. |
| frontend/src/stages/member-home.css | 26 | `.member-empty__copy` | font-size: var(--type-body-sm); color: var(--color-ink-dim); max-width: var(--measure-tight); | .type-body | prose | The empty-state reassurance copy. Goes UP 14 to 16. It is the ONLY consumer of --measure-tight in the entire tree, so that token is free to change or retire. |
| frontend/src/stages/member-home.css | 22 | `.member-empty__head` | font-weight: var(--type-weight-semibold); color: var(--color-ink); | .type-heading-xs | heading | TRAP T1: bold at inherited 16. |
| frontend/src/stages/member-home.css | 95 | `.member-goal__pct` | font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold); color: var(--color-ink); min-width: 2.75rem; text-align: right; | .type-label-strong | numeric | A right-aligned percentage in a fixed 2.75rem column. Stays 14. It carries NO font-variant-numeric today, so the digits jitter as the value ticks; worth adding tabular-nums while the rule is open. |
| frontend/src/stages/guided/guided.css | 110 | `.gd-q__coach` | margin: 10px 0 0 30px; font-size: var(--type-body-md); line-height: 1.55; color: var(--sero-charcoal-700); | .type-body | prose | ONE OF THE 40. The coaching line under each question — the runner's main reading text. UP 15 to 16. |
| frontend/src/stages/guided/guided.css | 241 | `.gd-sum p, .gd-sum li` | font-size: var(--type-body-md); line-height: 1.6; | .type-body | prose | ONE OF THE 40. The drafted summary body and its bullets (guided-stages.ts:222). UP 15 to 16. |
| frontend/src/stages/guided/guided.css | 367 | `.gd-rec__block p, .gd-rec__block li` | font-size: var(--type-body-md); line-height: 1.6; | .type-body | prose | ONE OF THE 40. The finished-1:1 record body (record.component.ts:101). UP 15 to 16. |
| frontend/src/stages/guided/guided.css | 272 | `.gd-sugg__row` | display: flex; gap: 10px; padding: 10px 0; font-size: var(--type-body-md); line-height: 1.5; border-top: 1px solid var(--color-border); | .type-body | prose | ONE OF THE 40. A private suggestion line: tag + sentence (guided-stages.ts:264). UP 15 to 16. Keep the flex/border geometry. |
| frontend/src/stages/guided/guided.css | 142 | `.gd-prom__text` | flex: 1 1 14rem; min-width: 0; font-size: var(--type-body-md); | .type-body | prose | ONE OF THE 40. The promise sentence in the catch-up list. UP 15 to 16. |
| frontend/src/stages/guided/guided.css | 376 | `.gd-rec__scorerow, .gd-rec__item` | display: flex; align-items: center; gap: 10px; padding: 9px 0; border-top: 1px solid var(--color-border); font-size: var(--type-body-md); | .type-body | prose | ONE OF THE 40. Record rows carrying sentences and scores. UP 15 to 16. |
| frontend/src/stages/guided/guided.css | 93 | `.gd-q__n` | color: var(--sero-charcoal-700); font-size: var(--type-body-md); white-space: nowrap; | .type-body-sm | numeric | ONE OF THE 40. guided-stages.ts:56 renders `(${n}/${of})` — a question counter, never read as prose. DOWN 15 to 14. Named explicitly in phase-4.md as a do-not-sed case. |
| frontend/src/stages/guided/guided.css | 180 | `.gd-row__pct` | flex: none; font-weight: 700; color: var(--sero-primary-700); font-size: var(--type-body-md); | .type-label-strong | numeric | ONE OF THE 40. guided-stages.ts:118 and side-panel.component.ts:82 render `${item.progress}%`. DOWN 15 to 14. Named explicitly in phase-4.md. Weight 700 to 600 under the role; add tabular-nums (it has none today and the value ticks). |
| frontend/src/stages/guided/guided.css | 181 | `.gd-row__chev` | flex: none; color: var(--color-ink-mute); font-size: var(--type-body-lg); | .type-body-sm | glyph | ONE OF THE 40. guided-stages.ts:124 puts ICONS.chev inside it, and guided.css:9-16 sets `.gd svg { width: 1em; height: 1em }` while guided-icons.ts emits NO width/height attributes. So font-size IS the icon size: 17px today, 14px after. Named in phase-4.md as a do-not-sed case; flagging that the visible effect is an 18% smaller chevron, not smaller text. |
| frontend/src/stages/guided/guided.css | 108 | `.gd-q__clock` | flex: none; font: inherit; cursor: pointer; width: 28px; height: 28px; border-radius: var(--sero-radius-full); border: 0; display: inline-flex; ... font-size: var(--type-body-md); | .type-body-sm | glyph | ONE OF THE 40. A 28px round button whose only child is ICONS.clock at 1em (guided-stages.ts:58). DOWN 15 to 14 shrinks the clock glyph. Also TRAP T4: font: inherit on a <button>. |
| frontend/src/stages/guided/guided.css | 200 | `.gd-block__icon` | width: 38px; height: 38px; border-radius: var(--sero-radius-full); flex: none; background: var(--sero-primary-200); color: var(--sero-primary-800); display: inline-flex; ... font-size: var(--type-body-lg); | var(--type-size-base) (16px) | glyph | ONE OF THE 40. A 1em SVG inside a 38px medallion (guided-stages.ts:165). RECOMMEND 16, not 14: dropping to 14 leaves a 14px glyph rattling inside a 38px circle. The cleanest fix is to stop sizing it by font at all and set the svg to 20px explicitly, but that is more code than the phase needs. |
| frontend/src/stages/guided/guided.css | 328 | `.gd-panel__x` | font: inherit; cursor: pointer; width: 32px; height: 32px; border-radius: var(--radius-button); border: 0; ... font-size: var(--type-body-lg); | var(--type-size-base) (16px) | glyph | ONE OF THE 40. The side-panel close cross, ICONS.x at 1em in a 32px button (side-panel.component.ts:119). Same call as .gd-block__icon: 16 keeps the target legible. Also TRAP T4. |
| frontend/src/stages/guided/guided.css | 113 | `.gd-q--done .gd-q__stem` | font-size: var(--type-body-md); font-weight: 600; | .type-heading-xs | heading | ONE OF THE 40. The completed-question stem. UP 15 to 16, unifying it with the active stem at :94. The 'done' affordance survives via .gd-q--done { opacity: 0.75 } at :112. |
| frontend/src/stages/guided/guided.css | 178 | `.gd-row__text` | flex: 1; min-width: 0; font-size: var(--type-body-md); font-weight: 500; | .type-heading-xs | prose | ONE OF THE 40. The request/goal title inside a clickable row (guided-stages.ts:121). UP 15 to 16. JUDGEMENT: heading-xs rather than .type-body because the row's 500 weight is what separates the title from the 14px category chip and percentage beside it; .type-body would flatten it to 400. |
| frontend/src/stages/guided/guided.css | 122 | `.gd-notes textarea` | width: 100%; border: 0; outline: none; resize: vertical; min-height: 120px; font: inherit; font-size: var(--type-body-md); color: var(--color-ink); background: transparent; | .type-body + .type-body--full | control | ONE OF THE 40. UP 15 to 16, which also clears the iOS focus-zoom edge that mobile.css:298 exists to patch. TRAP T4 (font: inherit) and T2 (needs --full for a 100%-width textarea). |
| frontend/src/stages/guided/guided.css | 339 | `.gd-field select, .gd-field input, .gd-field textarea` | width: 100%; font: inherit; font-size: var(--type-body-md); padding: 10px 12px; border-radius: var(--radius-button); border: 1px solid var(--color-border); outline: none; background: var(--color-surface); | .type-body + .type-body--full | control | ONE OF THE 40. Side-panel form fields. UP 15 to 16, same iOS-zoom benefit. TRAP T4 and T2. |
| frontend/src/stages/guided/guided.css | 208 | `.gd-block__score` | margin-left: auto; font-family: var(--type-family-display); font-weight: 700; font-size: 30px; color: var(--color-ink); | .type-metric | numeric | ONE OF THE 40 (literal-font-size). A big display-face score, already on the 30px rung — only the literal is wrong. .type-metric is 30/36 display + tabular-nums, which this needs and lacks: the score ticks as the slider moves. Weight 700 to 600. |
| frontend/src/stages/guided/guided.css | 94 | `.gd-q__stem` | font-weight: 700; font-size: var(--type-body); color: var(--sero-charcoal-800); flex: 1; min-width: 0; | .type-heading-xs | heading | The question stem's first other home (findings §4a). Stays 16, weight 700 to 600. NOT heading-xl: guided stacks several question cards down one 608px column. |
| frontend/src/stages/guided/guided.css | 91 | `.gd-q__logo` | width: 22px; height: 22px; ... font-family: var(--type-family-display); font-weight: 700; font-size: var(--type-body-sm); | switch to var(--type-family-base), keep 14px | glyph | One of the 7 displayFaceBelow20 breaches: Bricolage at 14px, banned by DESIGN.md T6. It holds an 'S' monogram or ICONS.check in a 22px square. Changing the family is the fix; the size is already at the floor. |
| frontend/src/stages/guided/guided.css | 202 | `.gd-block__label` | font-weight: 700; font-size: var(--type-body); display: inline-flex; gap: 6px; align-items: center; | .type-heading-xs | heading | TRAP T1: 16/700. Its child rule at :203 sets font-size on the svg itself (14px glyph) and must stay a glyph size. |
| frontend/src/stages/guided/guided.css | 365 | `.gd-rec__block h3` | font-family: var(--type-family-display); font-size: var(--type-h4); margin: 0 0 10px; color: var(--color-ink); | .type-heading-sm | heading | Another displayFaceBelow20 breach: Bricolage at 18px. heading-sm is 18/600 in the BASE family, so taking the role fixes the breach as a side effect. Phase 5. |
| frontend/src/stages/guided/guided.css | 239 | `.gd-sum h3, .gd-panel__title` | font-family: var(--type-family-display); font-size: var(--type-h3) (20px); .gd-panel__title adds font-weight: 700; line-height: 1.25 | .type-heading-md | heading | Lines 239 and 331. Both 20px display, on the ladder. Phase 5. |
| frontend/src/stages/guided/guided.css | 31 | `.gd-stepper .stage-step` | font: inherit; font-size: var(--type-body-sm); font-weight: 500; line-height: 1; white-space: nowrap; ... | .type-label + keep line-height: 1 | chrome | TRAP T3: line-height: 1 sets the pill height. The role's fixed 20px leading grows every step in the stepper strip. TRAP T4 as well. |
| frontend/src/stages/guided/guided.css | 38 | `.gd-stepper .stage-step__check` | display: inline-flex; color: var(--color-accent); font-size: var(--type-body); | leave 16px, tokenise | glyph | A 1em tick inside the stepper. Glyph geometry. |
| frontend/src/stages/guided/guided.css | 261 | `.gd-eng button` | font: inherit; font-size: var(--type-body); cursor: pointer; width: 44px; height: 44px; border-radius: var(--sero-radius-full); ... | leave 16px, tokenise | numeric | A 1-to-5 engagement digit in a 44px round button. Numeric control, stays 16. TRAP T4. |
| frontend/src/stages/guided/guided.css | 221 | `.gd-lastmark::after` | content: "▾"; display: block; line-height: 0.7; | leave alone | glyph | A caret glyph whose 0.7 leading pins it to the slider track. No size declared, inherits its parent's 14px. |
| frontend/src/stages/guided/guided.css | 62 | `.gd-done-banner, .gd-owner, .gd-chip, .gd-row__cat, .gd-status, .gd-lastmark, .gd-slider__labels, .gd-block__note input, .gd-ainote, .gd-private, .gd-sugg__tag, .gd-finish-note, .gd-q__src, .gd-field label, .gd-hist, .gd-rec__delta` | all font-size: var(--type-body-sm) (14px); several add font-weight 600/700; .gd-sugg__tag adds text-transform: uppercase + letter-spacing .03em | .type-body-sm / .type-label / .type-label-strong / .type-overline | chrome | Sixteen 14px chrome selectors in guided.css (lines 62, 111, 139, 146, 179, 182, 217, 223, 228, 243, 248, 276, 284, 333, 350, 381). Pure Phase 3 stratum work, but the sheet must reach ZERO type declarations for the grouping pattern to hold, so they travel with Phase 4. .gd-chip carries font: inherit (T4). |
| frontend/src/stages/preparation.css | 89 | `.pv-l__confidence` | margin: 0; font-size: var(--type-body-sm); color: var(--color-ink-dim); | .type-body | prose | THE SHIPPED CONFIDENCE READOUT (variant L is the default every guest and member sees). One of the nine. UP 14 to 16. phase-4.md says 'label'; a full sentence is not a label. |
| frontend/src/stages/preparation.css | 83 | `.pv-l__mini p` | margin: 0; font-size: var(--type-body); line-height: var(--type-leading-normal); color: var(--color-ink); | .type-body | prose | The brief's slot paragraphs. Inside .stage-reading (--container-reading, 56rem = 896px) with no max-width, so this is the customer-side width fix. |
| frontend/src/stages/preparation.css | 103 | `.pv-l__tip p` | margin: 0; font-size: var(--type-body); line-height: var(--type-leading-relaxed); color: var(--color-ink); | .type-body | prose | The meeting-style coaching note. Also 896px wide today. |
| frontend/src/stages/preparation.css | 205 | `.pv-rate__q` | font-size: var(--type-body); font-weight: var(--type-weight-semibold); color: var(--color-ink); margin: 0; | .type-heading-xs | heading | TRAP T1: 16/600. The 'how good is this brief' question beside the stars. .type-body would un-bold it. Landed by session 080b9104, whose lane is now cleared. |
| frontend/src/stages/preparation.css | 124 | `.pv-l__hero-theme` | margin: 0; font-family: var(--type-family-display); font-size: var(--type-h3); font-weight: var(--type-weight-semibold); line-height: var(--type-leading-snug); color: var(--sero-offwhite-50); | .type-heading-md | heading | 20px display on the navy hero band. Phase 5. Colour stays in the component sheet. |
| frontend/src/stages/preparation.css | 62 | `.pv-l__name` | font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold); letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-accent-dark); | .type-overline (tracking differs) | chrome | 0.06em against the role's 0.08em. Fourth instance of the tracking mismatch. |
| frontend/src/stages/preparation.css | 69 | `.pv-l__sub, .pv-l__tab, .pv-rate__status` | all font-size: var(--type-body-sm); .pv-l__tab adds font-weight: medium, .pv-rate__status adds font-weight: semibold | .type-body-sm / .type-label / .type-label-strong | chrome | Three 14px chrome selectors (lines 69, 150, 216). .pv-l__tab is a phone-only segmented control button with min-height 40px, so its leading is not load-bearing. |
| frontend/src/stages/preparation-lab.css | 355 | `.pv-a__confidence` | margin: 0; font-size: var(--type-h4); line-height: var(--type-leading-relaxed); color: var(--color-ink); | .type-body | prose | One of the nine confidence readouts, the largest at 18px. Variant A is reachable by any manager (preparation.ts:52 gates on isAdmin, which returns true for role 'manager'). DOWN 18 to 16 to join the one role. |
| frontend/src/stages/preparation-lab.css | 470 | `.pv-e__lead` | margin: 0; font-size: var(--type-h4); line-height: var(--type-leading-relaxed); color: var(--color-ink); | .type-body-lg | prose | Variant E's confidence AND opener AND leave-with all share this class (preparation-lab.ts:138-140). JUDGEMENT: unlike the other eight, this class is E's deliberate 'top band reads louder' device, so it is the one genuine lede: .type-body-lg (18/28 + lede measure) keeps E's whole point. If Carl wants one confidence size everywhere without exception, it drops to .type-body and E loses its hierarchy. |
| frontend/src/stages/preparation-lab.css | 915 | `.pv-h__confidence` | margin: 0 0 var(--sero-space-6); max-width: var(--measure); font-size: var(--type-body); line-height: var(--type-leading-relaxed); color: var(--color-ink-dim); | .type-body | prose | One of the nine, already at 16 and already measured. This is the target shape the other eight collapse onto. |
| frontend/src/stages/preparation-lab.css | 384 | `.pv-b__confidence` | margin: 0; font-size: var(--type-body-sm); color: var(--color-ink-mute); | .type-body | prose | One of the nine. UP 14 to 16. |
| frontend/src/stages/preparation-lab.css | 522 | `.pv-f__confidence` | margin: 0; max-width: var(--measure); font-size: var(--type-body-sm); color: var(--color-ink-dim); | .type-body | prose | One of the nine. UP 14 to 16. A prose consumer of --measure, so the role's measure replaces it cleanly. |
| frontend/src/stages/preparation-lab.css | 615 | `.pv-g__confidence` | font-size: var(--type-body-sm); color: var(--color-ink-dim); | .type-body | prose | One of the nine. UP 14 to 16. Sits in a single-span bento cell, so the measure will not bite. |
| frontend/src/stages/preparation-lab.css | 744 | `.pv-i__confidence` | margin: 0; font-size: var(--type-body-sm); line-height: var(--type-leading-normal); color: var(--color-ink-dim); | .type-body | prose | One of the nine. UP 14 to 16. In a 1fr context rail of a 1fr/2fr split, so 16px may wrap harder there; worth an eye at 1280px. |
| frontend/src/stages/preparation-lab.css | 787 | `.pv-j__confidence` | margin: 0 0 var(--sero-space-2); font-size: var(--type-body-sm); color: var(--sero-offwhite-300); | .type-body | prose | One of the nine. UP 14 to 16. Off-white on J's navy band; the colour stays in the component sheet, which is the only thing left there. |
| frontend/src/stages/preparation-lab.css | 396 | `.pv-b__row p` | margin: 0; font-size: var(--type-body-sm); color: var(--color-ink); line-height: var(--type-leading-normal); | .type-body | prose | Variant B's compact labelled rows. Goes UP 14 to 16 under the phase's goal, which is a real densification cost for a layout whose whole premise is 'the whole brief in one 1440x900 view'. Flagged as a judgement. |
| frontend/src/stages/preparation-lab.css | 427 | `.pv-d__value` | font-size: var(--type-body); color: var(--color-ink); line-height: var(--type-leading-normal); | .type-body | prose | Variant D's row content. Already 16. |
| frontend/src/stages/preparation-lab.css | 489 | `.pv-e__low p` | margin: 0; font-size: var(--type-body); color: var(--color-ink-dim); line-height: var(--type-leading-normal); | .type-body | prose | Variant E's below-the-fold detail. Already 16. |
| frontend/src/stages/preparation-lab.css | 541 | `.pv-f__col p` | margin: 0; font-size: var(--type-body); line-height: var(--type-leading-normal); color: var(--color-ink); | .type-body | prose | Variant F's three support columns. Already 16; the role adds a measure that will not bite in a 1fr column. |
| frontend/src/stages/preparation-lab.css | 577 | `.pv-g__cell p` | margin: 0; font-size: var(--type-body); line-height: var(--type-leading-normal); color: var(--color-ink); | .type-body | prose | Bento cell body. Already 16. |
| frontend/src/stages/preparation-lab.css | 693 | `.pv-g__tick span` | font-size: var(--type-body); line-height: var(--type-leading-normal); color: var(--color-ink); | .type-body | prose | The listen-for checklist line. Already 16. Its <b> lead clause at :698 stays. |
| frontend/src/stages/preparation-lab.css | 755 | `.pv-i__slot p` | margin: 0; font-size: var(--type-body); line-height: var(--type-leading-normal); color: var(--color-ink); | .type-body | prose | Split's working-column paragraphs. Already 16. |
| frontend/src/stages/preparation-lab.css | 816 | `.pv-j__slot p` | margin: 0; font-size: var(--type-body); line-height: var(--type-leading-normal); color: var(--color-ink); | .type-body | prose | Contrast's on-white slots. Already 16. |
| frontend/src/stages/preparation-lab.css | 858 | `.pv-k__body p` | margin: 0; font-size: var(--type-body); line-height: var(--type-leading-normal); color: var(--color-ink); | .type-body | prose | Runner's row bodies. Already 16. |
| frontend/src/stages/preparation-lab.css | 930 | `.pv-h__section p` | margin: 0; font-size: var(--type-body); line-height: var(--type-leading-relaxed); color: var(--color-ink); | .type-body | prose | Sheet's section paragraphs. Already 16; .pv-h__section (:928) already caps at --measure, so the role's measure is redundant but harmless. |
| frontend/src/stages/preparation-lab.css | 366 | `.pv-a__opener` | margin: 0; border-left: 3px solid var(--color-accent); border-radius: 0; padding: var(--sero-space-1) 0 var(--sero-space-1) var(--sero-space-4); font-size: var(--type-body); font-weight: var(--type-weight-medium); line-height: var(--type-leading-relaxed); color: var(--color-ink); | .type-heading-xs | prose | JUDGEMENT: a quoted opener at 16/500. .type-body flattens it to 400 and it stops reading as a quote; heading-xs (16/600) keeps a weight. Alternative: keep the 500 in the component sheet, which breaks the zero-type rule for this one selector. |
| frontend/src/stages/preparation-lab.css | 936 | `.pv-h__opener` | font-size: var(--type-h4); font-weight: var(--type-weight-medium); line-height: var(--type-leading-normal); | .type-body-lg | prose | 18/500 lede inside the paper sheet. body-lg is 18/28/400: weight 500 to 400. If the opener must stay weighted, heading-sm (18/600) is the other rung. |
| frontend/src/stages/preparation-lab.css | 513 | `.pv-f__opener` | margin: 0; font-family: var(--type-family-display); font-size: var(--type-h2); font-weight: var(--type-weight-semibold); line-height: var(--type-leading-snug); letter-spacing: var(--type-tracking-tight); color: var(--color-ink); | .type-heading-lg or .type-display | heading | ONE OF THE 40 (clamp-off-rung: --type-h2 is clamp(1.75rem, 3.5vw, 2.25rem) = 28 to 36px, neither endpoint on a rung, and mobile.css:352 re-points --type-h2 to 1.35rem on phones). Variant F is a poster whose opener IS the page. Phase 5. |
| frontend/src/stages/preparation-lab.css | 599 | `.pv-g__opener` | font-family: var(--type-family-display); font-size: var(--type-h3); font-weight: var(--type-weight-medium); line-height: var(--type-leading-snug); text-wrap: pretty; | .type-heading-md | heading | 20px display, on the ladder. Weight 500 to 600 under the role. Phase 5. |
| frontend/src/stages/preparation-lab.css | 803 | `.pv-j__opener` | margin: 0; font-size: var(--type-h3); font-weight: var(--type-weight-medium); line-height: var(--type-leading-snug); color: var(--sero-offwhite-50); max-width: var(--measure); | .type-heading-md | heading | 20px on the navy band. A --measure consumer that is a HEADING, not body prose: if the roles move to character measures, a heading needs a shorter one (~45ch), not 66ch. Phase 5. |
| frontend/src/stages/preparation-lab.css | 118 | `.pv-tile__name` | font-size: var(--type-body-sm); font-weight: var(--type-weight-medium); line-height: 1; | .type-label + keep line-height: 1 | chrome | TRAP T3: line-height: 1 keeps the 3-across switcher tiles short. The role's fixed 20px leading grows every tile in the popover. |
| frontend/src/stages/preparation-lab.css | 14 | `.pv-switch__trigger, .pv-switch__label, .pv-switch__value, .pv-switch__poptitle` | all font-size: var(--type-body-sm); .pv-switch__value adds weight medium; .pv-switch__poptitle adds uppercase + letter-spacing .04em | .type-label / .type-body-sm / .type-overline | chrome | The switcher chip and popover title (lines 14, 40, 44, 80). Manager-and-admin-only furniture, stays 14. |
| frontend/src/stages/preparation-lab.css | 350 | `.pv-a` | max-width: var(--measure); display: flex; flex-direction: column; gap: var(--sero-space-8); | keep a length | chrome | LAYOUT consumer of --measure: variant A's whole column, not a prose block. Must keep 38rem if the token ever moves. |
| frontend/src/stages/preparation-lab.css | 928 | `.pv-h__section` | display: flex; flex-direction: column; gap: var(--sero-space-2); padding: var(--sero-space-5) 0; border-top: 1px solid var(--color-border-tinted); max-width: var(--measure); | keep a length | chrome | LAYOUT consumer of --measure: a section block holding lists and eyebrows, not one paragraph. |
| admin/src/styles/finish-feedback-modal.css | 15 | `.ffm__q` | font-size: var(--type-body, 16px); color: var(--color-ink); | .type-heading-xs | heading | The question stem's fourth home (findings §4e). Also one of the 33 relativeFontSize hits (var fallback). BLOCKED BY TEST: finish-feedback-modal.test.ts:63 asserts the selector exists in this sheet. Change the assertion first, watch it fail, then move the rule. |
| admin/src/styles/finish-feedback-modal.css | 6 | `.ffm__title` | font-size: var(--type-h4, 18px); font-weight: var(--type-weight-semibold, 600); color: var(--color-ink); margin-bottom: 14px; | .type-heading-sm | heading | 18/600, exact fit for heading-sm. Two var() fallbacks to drop (relativeFontSize). |
| admin/src/styles/finish-feedback-modal.css | 16 | `.ffm__body .input` | font-size: var(--type-body-sm, 14px); | .type-body-sm + .type-body--full | control | Overrides .input's clamp down to 14 inside the modal. One relativeFontSize hit. |
| admin/src/styles/design/buttons-inputs.css | 416 | `.cmp-q` | font-weight: 600; font-size: var(--type-body-sm); | .type-label-strong | heading | The question stem's third home (findings §4c). compare.js:370 renders it as the label half of a dense q-over-a diff row on an internal screen. The one deliberate exception that stays 14. |
| admin/src/styles/design/buttons-inputs.css | 62 | `.input` | width: 100%; background: transparent; border: none; outline: none; padding: 0.65rem 0; font-size: clamp(1.25rem, 3.5vw, 1.75rem); color: var(--color-ink); border-bottom: 1.5px solid var(--color-border-strong); | unclear (Phase 5) | control | ONE OF THE 40, firing TWO rules (clamp-off-rung 20-to-28 + literal-font-size). The app's one big underlined input. Retiring the clamp is a visible change to the front door and every intake field, and mobile.css:298 max(1rem, 1em) depends on it resolving above 16 on phones. Phase 5, and it needs Carl. |
| admin/src/styles/design/mobile.css | 298 | `input, select, textarea (max-width: 767.98px)` | font-size: max(1rem, 1em); | leave as-is | control | ONE OF THE 40 (literal-font-size). NOT a find-replace target: max(1rem, 1em) is an iOS focus-zoom guard that raises SMALL controls to 16 while leaving BIG ones alone. .input resolves to 20px on a 390px phone, so replacing this with a flat var(--type-size-base) would SHRINK the intake field from 20px to 16px. Leave it, or exempt it explicitly in the guard. |
| admin/src/styles/design/admin-tables.css | 386 | `.star-rating__star` | font-size: 1.75rem; line-height: 1; background: none; border: 0; padding: 0 0.1rem; color: var(--sero-gold-700); cursor: pointer; | replace with an explicit height | glyph | ONE OF THE 40, firing TWO rules (off-ladder 28px + literal 1.75rem). The sheet's comment says 'stars are ~28px so they clear the 14px floor' — but star-rating.js:22 calls icon(Star, { size: 26 }) and icon.js:31 writes width/height attributes, so the 28px font-size does NOT size the star. It only sets the button's line box. Honest fix: drop the font-size, set a height. TRAP T3 on line-height: 1. |
| admin/src/styles/design/design-stage.css | 512 | `.ds-star` | background: none; border: 0; padding: 0; font-size: 1.5rem; line-height: 1; cursor: pointer; color: var(--sero-gold-700); | var(--type-size-2xl) (24px) | glyph | ONE OF THE 40 (literal 1.5rem = 24px, which IS on the ladder). design.js:438 renders a literal '★' character, so unlike .star-rating__star the font-size genuinely drives it. Tokenise only, do not resize. |
| admin/src/styles/design/test-engine.css | 139 | `.joblex-remove` | border: 0; background: none; cursor: pointer; color: var(--color-ink-mute); font-size: 1.05rem; line-height: 1; padding: 0 0.3rem; margin-left: 0.2rem; vertical-align: middle; | var(--type-size-base) (16px) | glyph | ONE OF THE 40, firing TWO rules (off-ladder 16.8px + literal 1.05rem). job-lexicons.js:300 renders a bare '×' remove glyph. 16.8 to 16 is a 0.8px change nobody will see and it clears both rules. |
| admin/src/styles/add-person-modal.css | 20 | `.apm__title` | font-family: var(--type-family-display); font-size: 1.25rem; font-weight: var(--type-weight-semibold); line-height: 1.3; letter-spacing: -0.01em; color: var(--color-ink); | .type-heading-md | heading | ONE OF THE 40 (literal 1.25rem = 20px, on the ladder). A modal title in the display face. Tokenise only. Phase 5. |
| admin/src/styles/admin-pulse.css | 23 | `.lp-tile__value` | font-family: var(--type-family-display); font-size: 30px; font-weight: 600; line-height: 1.15; font-variant-numeric: tabular-nums; | .type-metric | numeric | ONE OF THE 40 (literal 30px, on the ladder). The KPI tile value. .type-metric is 30/36 display + tabular-nums, an exact fit — and it declares font-variant-numeric LAST on purpose. Ghosted by skeleton-presets.ts:198, so the loading tile follows. Phase 5. |
| admin/src/styles/design/member-runs.css | 59 | `.member-runs__when` | color: var(--color-ink-dim); font-size: 0.875rem; /* 14px floor */ white-space: nowrap; | .type-body-sm | chrome | ONE OF THE 40 (literal 0.875rem = 14px, on the ladder). A rem literal on a rung is the exact debt the literalFontSize rule exists to catch: it looks migrated and is not. Tokenise only. |
| admin/src/styles/design/member-runs.css | 66 | `.member-runs__meta` | display: block; margin-top: 0.15rem; color: var(--color-ink-dim); font-size: 0.875rem; /* 14px floor */ | .type-body-sm | chrome | ONE OF THE 40. Same as :59. |
| frontend/src/styles/team-card.css | 31 | `.team-card__avatar` | width: 44px; height: 44px; border-radius: var(--sero-radius-full); display: grid; place-items: center; font-family: var(--type-family-display); font-weight: var(--type-weight-semibold); font-size: var(--type-body-md); letter-spacing: -0.01em; color: var(--color-accent-dark); background: var(--color-accent-soft); | var(--type-size-base) (16px), family to base | glyph | ONE OF THE 40 (off-ladder 15px) AND one of the 7 displayFaceBelow20 breaches (Bricolage at 15px). It is an initials monogram in a 44px circle, not text. 16 puts it on the ladder; the family must drop to base either way. |
| frontend/src/styles/team-card.css | 47 | `.team-card__name-btn` | font-family: var(--type-family-display); font-weight: var(--type-weight-semibold); font-size: var(--type-body-lg); letter-spacing: -0.01em; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; text-align: left; | .type-heading-sm | heading | ONE OF THE 40 (off-ladder 17px) AND a displayFaceBelow20 breach (Bricolage at 17px). A person's name as a keyboard-openable button. heading-sm is 18/600 in the BASE family, which puts it on the ladder AND clears the breach in one move. UP 17 to 18. |
| admin/src/styles/design/admin-tables.css | 110 | `.ud-nameline .rd-name` | font-size: var(--type-h2); | .type-heading-lg | heading | ONE OF THE 40 (clamp-off-rung, --type-h2 = 28 to 36px). A deliberate hierarchy fix: the person's name must outrank the '1:1s' section title. Whatever rung it lands on has to stay ABOVE whatever .rd-name lands on. Phase 5. |
| admin/src/styles/design/auth.css | 48 | `.auth-brand__title` | font-family: var(--type-family-display); font-size: var(--type-h1); font-weight: var(--type-weight-bold); line-height: var(--type-leading-tight); text-wrap: balance; margin: 0; | .type-display | heading | ONE OF THE 40 (clamp-off-rung, --type-h1 = 32 to 44px). The front door's headline. Phase 5, and it is the first thing a new manager sees, so it wants a screenshot. |
| admin/src/styles/design/auth.css | 178 | `.auth-card .auth-brand__title` | font-size: var(--type-h2); | .type-heading-lg | heading | ONE OF THE 40 (clamp-off-rung). The brand block sizing down one step inside the 400px card. Must stay one rung below :48 whatever happens. |
| admin/src/styles/design/auth.css | 119 | `.join-hero` | font-size: var(--type-h2); font-weight: var(--type-weight-medium); | .type-heading-lg | heading | ONE OF THE 40 (clamp-off-rung). The invite-accept hero. Phase 5. |
| admin/src/styles/design/base.css | 56 | `.text-display` | font-family: var(--type-family-display); font-size: var(--type-display); font-weight: var(--type-weight-semibold); letter-spacing: var(--type-tracking-tighter); line-height: var(--type-leading-tight); text-wrap: balance; color: var(--color-ink); | .type-display | heading | ONE OF THE 40 (clamp-off-rung, --type-display = 30 to 42px). base.css:58. Phase 5, and this is where the 36-vs-40 hero decision lands. |
| admin/src/styles/design/base.css | 66 | `.h1` | font-family: var(--type-family-display); font-size: var(--type-display); font-weight: var(--type-weight-semibold); letter-spacing: var(--type-tracking-tighter); line-height: var(--type-leading-tight); text-wrap: balance; color: var(--color-ink); | .type-display | heading | ONE OF THE 40 (clamp-off-rung). base.css:68. The most-used heading class in both apps. Phase 5. |
| admin/src/styles/design/base.css | 75 | `.h2` | font-family: var(--type-family-display); font-size: var(--type-h2); font-weight: var(--type-weight-semibold); letter-spacing: var(--type-tracking-tight); line-height: 1.2; text-wrap: balance; color: var(--color-ink); | .type-heading-lg | heading | ONE OF THE 40 (clamp-off-rung). base.css:77. Phase 5. |
| admin/src/styles/design/base.css | 236 | `.conf` | display: inline-flex; align-items: center; gap: 8px; font-size: var(--type-body-sm); font-weight: var(--type-weight-medium); color: var(--color-accent-dark); background: var(--color-accent-soft); padding: 4px 11px 4px 9px; border-radius: var(--sero-radius-full); white-space: nowrap; | .type-label | chrome | The confidence DOT-METER pill, not the readout sentence. It sits beside the sentence and never replaces it (preparation-brief.ts:130-148). Stays 14 as chrome; do not fold it into the nine. |
| admin/src/styles/design/layout.css | 11 | `.l-container` | width: 100%; margin-inline: auto; padding-inline: var(--sero-space-4); max-width: var(--measure); | keep a length | chrome | THE reason --measure cannot become a character measure. Eighteen plain markup sites across both apps (plus 11 --wide and 1 --full). Changing the token moves every one of them. |
| admin/src/styles/design/primitives.css | 82 | `.page-header__lede` | font-size: var(--type-body-sm); color: var(--color-ink-dim); max-width: var(--measure); | .type-body-sm | prose | PROSE consumer of --measure. Every page's sub-headline. JUDGEMENT: leave at 14, or raise to 16 as the most-seen lede in the app. Phase 3 nominally owns it; Phase 4 owns the measure question. |
| admin/src/styles/design/flow-kit.css | 36 | `.flow-interstitial__skeleton` | width: 100%; max-width: var(--measure); | keep a length | chrome | LAYOUT consumer of --measure: a skeleton box width (flow-interstitial.ts:22), no text of its own. |
| admin/src/styles/design/start-stage.css | 178 | `.start-welcome__lede` | margin: 0; color: var(--color-ink-dim); max-width: var(--measure); | .type-body | prose | PROSE consumer of --measure at start-stage.css:181. No size declared, inherits 16. |
| admin/src/styles/design/start-stage.css | 279 | `.start-welcome__after` | margin: 0; color: var(--color-ink-dim); font-size: var(--type-body-sm); line-height: var(--type-leading-normal); max-width: var(--measure); text-wrap: pretty; | .type-body-sm | prose | PROSE consumer of --measure at start-stage.css:283. |
| admin/tailwind.config.js | 45 | `maxWidth.measure` | measure: "var(--measure)", // max-w-measure ×5 | point at the prose measure | chrome | All five markup sites are prose ledes, none is a layout container: intake.js:62, job-lexicons.js:26, lexicon-review.js:26, meeting-arcs.js:40, personas.js:62. So this utility CAN safely point at a character measure even though .l-container cannot. Verify the count is still 5 before relying on the comment. |
| frontend/src/stages/preparation-css.test.ts | 111 | `test("variant CSS exists and declares font sizes")` | assert.ok(/font-size\s*:/.test(css), "at least one font-size declared"); and :126 assert.ok(declarations.length > 0); | test-first change | control | HARD BLOCKER. Reads preparation.css + preparation-lab.css combined. The clean Phase 4 end-state (zero font-size in either sheet) FAILS both assertions. Change them first, watch them fail, then do the migration — the house TDD rule. |
| admin/src/ui/finish-feedback-modal.test.ts | 63 | `assert.match(CSS, /\.ffm__q\b/)` | assert.match(CSS, /\.ffm__q\b/, "The question needs its own reading-size rule."); | test-first change | control | HARD BLOCKER. Retarget at type.css before moving .ffm__q out of finish-feedback-modal.css. |
| admin/src/styles/design/type.css | 130 | `.type-body` | font-family: var(--type-family-base); font-size: var(--type-size-base); font-weight: var(--type-weight-regular); line-height: var(--type-leading-base); max-width: var(--measure); text-wrap: pretty; | add the ~55 grouped selectors + move max-width to 66ch | control | The one edit that lands most of the phase. Every prose selector above joins this grouped list, and the measure changes here (66ch) rather than in tokens.css, so no layout container moves. Keep it AFTER .type-body-lg and BEFORE .type-body--narrow: source order decides same-specificity ties inside this file. |
| admin/src/styles/design/type.css | 119 | `.type-body-lg` | font-family: var(--type-family-base); font-size: var(--type-size-lg); font-weight: var(--type-weight-regular); line-height: var(--type-leading-lg); max-width: var(--measure-lede); text-wrap: pretty; | add .notes-quote, .pv-e__lead, .pv-h__opener + move max-width to 72ch | control | --measure-lede has exactly ONE live consumer (this rule); the other seven are parked gallery files. So the token is free, and so is switching this to 72ch. |
| admin/src/styles/design/type.css | 108 | `.type-heading-xs` | font-family: var(--type-family-base); font-size: var(--type-size-base); font-weight: var(--type-weight-semibold); line-height: var(--type-leading-base); | add every 16px-semibold selector | control | The landing spot TRAP T1 needs. Currently matches nothing. Ten selectors join it across the phase: .gd-q__stem, .gd-q--done .gd-q__stem, .gd-row__text, .gd-block__label, .arc-phase__label, .pv-rate__q, .rd-turn__q, .ffm__q, .focus-point__label, .about-duo__title, .member-empty__head, .member-goal__text, .about-how__title, .pv-a__opener. |

## Risks
- THE ICON-SIZING TRAP IS THE ONE THAT BITES. guided.css:9-16 sets `.gd svg, .gd-portal svg { width: 1em; height: 1em }` and guided-icons.ts emits SVGs with NO width/height attributes. In the whole guided runner an icon's size IS its font-size. Six selectors are affected (.gd-row__chev 17px, .gd-block__icon 17px, .gd-panel__x 17px, .gd-q__clock 15px, .gd-block__label svg 14px, .gd-stepper .stage-step__check 16px). A blind 15/17 -> 16 sweep enlarges chrome across the customer app; a blind -> 14 shrinks the chevron and the close cross by 18%. Neither is a text change and neither will show up in a font-size audit.
- GROUPING A BOLD SELECTOR INTO .type-body SILENTLY UN-BOLDS IT. .type-body declares font-weight 400 and the pattern requires the component sheet to declare zero type, so there is nowhere left for the weight to live. Fourteen 16px-semibold selectors would flatten: .arc-phase__label (against the 16/400 intent line directly under it), .pv-rate__q, .gd-q__stem, .gd-block__label, .gd-row__text, .focus-point__label, .about-duo__title, .member-empty__head, .member-goal__text, .pv-a__opener and more. .type-heading-xs (16/600) is the correct home and currently matches nothing.
- TWO TESTS HARD-FAIL ON THE CLEAN END-STATE. preparation-css.test.ts:111 and :126 assert at least one font-size survives in preparation.css + preparation-lab.css combined; stripping both sheets fails them. finish-feedback-modal.test.ts:63 asserts .ffm__q exists in finish-feedback-modal.css. Both must be changed test-first, or the phase ends red on `npm test`.
- CHANGING --measure MOVES 18 SCREENS. layout.css:11 .l-container reads the same token as the prose roles. Retuning --measure from 38rem to 66ch (608px -> ~666px) widens every plain .l-container page column plus flow-kit.css:38, briefing.css:60, preparation-lab.css:350 and :928. The character measure belongs inside the roles in type.css, not in tokens.css.
- THREE SELECTORS DEPEND ON A line-height MULTIPLIER FOR THEIR GEOMETRY, and every role carries an absolute leading instead. .bullet__mark { line-height: inherit } keeps the bullet dot on the sentence's baseline; .pv-tile__name { line-height: 1 } keeps the switcher tiles short; .gd-stepper .stage-step { line-height: 1 } sets the stepper pill height. Taking the role without keeping the line silently changes three layouts.
- mobile.css:298 `input, select, textarea { font-size: max(1rem, 1em) }` LOOKS like a literal to fix and is not. It is an iOS focus-zoom guard that raises small controls to 16px while leaving big ones alone. .input resolves to 20px on a 390px phone, so replacing it with a flat 16px SHRINKS the intake field on the front door.
- THE FONT SHORTHAND CEILING IS LOCKED AT ZERO (test-design-guard.js:96). Eleven selectors in the phase-4 set carry `font: inherit` on a <button>, <textarea> or contenteditable, where it is doing real work. Removing it means the role must declare family, size, weight and leading together (the .cp-seg precedent at type.css:175); leaving it before a font-variant-numeric in the same rule breaks the build.
- FOUR EYEBROW SELECTORS IN THIS PHASE CARRY A DIFFERENT TRACKING FROM .type-overline (0.02em, 0.03em, 0.04em, 0.06em against the role's --type-tracking-caps-lg at 0.08em). Grouping them all in visibly widens four small-caps labels at once. That is one decision, not four, and it is a look change Carl will notice before he notices the sizes.
- preparation-lab.css IS NOT DEAD CODE. preparation.ts:52 gates the lab on isAdmin(), and state.ts:212 returns true for role 'manager'. Any manager gets the switcher and their pick persists in localStorage. Skipping the lab leaves whoever chose 'Editorial' three weeks ago as the one person who does not see Phase 4 land.
- THE PHASE'S OWN DONE-WHEN GREP IS NOT SUFFICIENT. `grep -rn "15px|17px|--type-body-md|--type-body-lg"` misses every literal (1.05rem, 1.1rem, 1.75rem, 1.5rem, 1.25rem, 1.125rem, 0.875rem, 30px) and every clamp. `node scripts/lint-design-tokens.js --json` is the honest check and it is free.

## Open questions
- THE CONFIDENCE READOUT'S ROLE. phase-4.md says all nine become `label`. .type-label is 14/500 with wide tracking, built for a field label; the readout is a full sentence a manager reads to decide how much to trust the brief. Recommend .type-body (16 + measure), which also satisfies the phase's own 'every reading block becomes 16px'. Options: (A*) .type-body for all nine — one size, matches the goal. (B) .type-body-sm for all nine — one size, stays quiet, but contradicts the goal. (C) .type-label as written — a sentence in a label recipe. Reversible either way. Recommend A.
- VARIANT E's .pv-e__lead IS THE ONE HONEST EXCEPTION. It carries E's confidence AND opener AND leave-with at 18px on purpose: 'visual weight = reading order' is that layout's entire premise. Collapsing it to 16 with the other eight kills the layout. Options: (A*) .type-body-lg (18) and accept nine-minus-one. (B) .type-body (16) and E becomes flat. Only affects managers who picked Timed. Recommend A.
- THE THREE GUIDED GLYPH BUTTONS: 14 OR 16? phase-4.md names .gd-row__chev as a 'goes down to 14' case, and .gd-block__icon and .gd-panel__x are the same mechanism. 14 makes the chevron 18% smaller than today and leaves a 14px glyph in a 38px medallion; 16 puts them on the ladder with a smaller visible change. Options: (A) all three to 14, exactly as the phase file says. (B*) chevron to 14 (it is inline with 14px chrome) but medallion and close button to 16 (they are targets). Reversible. Recommend B, and flag it to Carl as the one place the phase file's instruction was written before the 1em mechanism was known.
- DOES .rd-turn__a (THE ANSWER TO A PAST 1:1 QUESTION) GO UP TO 16? It is the longest block of words on the run-detail screen and currently the smallest text on it. Raising it makes the page taller. This is the clearest single illustration of the phase's argument, so it is worth Carl seeing it side by side rather than being decided in the build.
- THE FOUR EYEBROW TRACKINGS. .brutal__badge (0.02em), .cl-tag (0.04em), .about-cap span (0.04em), .agreed-owner-label (0.06em) and .pv-l__name (0.06em) all become .type-overline's 0.08em. Options: (A*) accept the one recipe, five small-caps labels widen slightly, and the app gains one eyebrow. (B) keep letter-spacing in each component sheet, which breaks the zero-type rule five times. Recommend A but it is a visible look change, not a mechanical one.
- SHOULD THE LAYOUT LAB BE RETIRED RATHER THAN MIGRATED? 945 lines and 11 alternative briefing layouts, reachable by any manager, kept alive behind a picker no customer sees. Migrating them is genuinely necessary while they ship. Retiring them removes roughly a third of Phase 4's work and a permanent maintenance tax. That is a product call, not a type-system one, and it is Carl's.
- WHERE DOES THE 66ch/72ch MEASURE LIVE? Options: (A*) change max-width inside .type-body / .type-body-lg in type.css — one edit, zero layout containers move, but it puts a length inside a role that already documents the measure as part of the role. (B) add --measure-body: 66ch and --measure-lede-ch: 72ch to tokens.css and point only the roles at them — more names, clearer intent. Either way --measure itself must NOT change. Recommend A for minimum code; B if Phase 5 will need the names anyway.
- phase-4.md CITES TWO FILE PATHS THAT DO NOT EXIST AND ONE SELECTOR THAT IS NOT WHAT IT SAYS (meeting-arcs.css and member-home.css are not under design/; .arc-phase__q is a question COUNT, not a stem; guided.css:433 does not exist). Should the build agent correct phase-4.md in place as part of the phase, or leave the plan file as the historical record and note the corrections in the proof? House habit is that trackers move together, which argues for correcting it.
