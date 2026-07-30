# Recon: p6-lock

_Read-only inventory, 2026-07-30. Source of truth for the build._

## PHASE 3 INVENTORY — the 14px stratum

### 0. Cascade facts a build agent must hold before writing a line

**Import order (measured, both apps).** `admin/src/main.js:3-4` and `frontend/src/main.js:9-10` import `styles/tailwind.css` FIRST, then `styles/design.css`. `design.css` then does tokens (16) → **type.css (23)** → base.css (24) → layout/primitives/cards/admin-tables/… → mobile.css (49). Code-split satellites (`coach-panel.css`, `design-stage.css`, `test-engine.css`, `run-log.css`, `error-log.css`, `feedback-inbox.css`, `row-menu.css`, `member-runs.css`, `stage-lookback.css`, `lexicon-review.css`, all of `frontend/src/stages/*.css`) are injected by Vite AFTER the main bundle. Two `<style>` blocks appended to `document.head` at runtime (`admin/src/ui/account-sheet.ts:36-75`, `admin/src/ui/profile-badge.js:~40-69`) load last of all.

Consequences:
- A `.type-*` role loses every same-specificity tie. Route (a) — group the component selector into the role's list in type.css AND strip every type property from the component sheet — is the only safe route. Half-doing it silently half-applies (P2 measured this).
- Tailwind's `.text-sm` / `.text-xs` utilities are the WEAKEST layer in the app. Any component class with a `font-size` beats them. This is why `text-xs` is largely inert today (see §5).

**RISK A — `.type-body-sm` carries a measure.** `type.css:146-156` gives `.type-body-sm` `max-width: var(--measure)` (= 38rem / 608px) and `text-wrap: pretty`. `.type-label`, `.type-label-strong`, `.type-overline` and `.type-code` carry NO max-width. So any chrome that must fill its container and lands on `.type-body-sm` will be capped at 608px. `.um-table` is the headline case: the people table would stop filling `.ud-panel` — exactly test scenario 1's failure. The fix already exists in the file: `type.css:226-230` `.type-body--full { max-width: none }`. Every full-width `.type-body-sm` consumer must be grouped into BOTH lists. Marked `+ --full` in the rows below.

**RISK B — roles carry a 20px leading; ~18 chrome selectors deliberately carry `line-height: 1` or `0`.** These centre a glyph or a label inside a fixed-height circle/pill. Taking a role replaces `1` with `1.25rem` and the box grows or the glyph drifts. Sites: `.um-trend` (admin-tables:50), `.ud-chev` (:138, lh 0), `.star-rating__star` (:385), `.row-menu-btn` (row-menu:5, lh 0), `.profile-badge__avatar` (app-nav:310), `.session-topbar__avatar` (session-topbar:215), `.session-topbar__stages .stage-step` (:73), `.stage-step__label` (:88), `.session-topbar__exit` (:154), `.fb-avatar` (feedback-inbox:44), `.run-step__dot` (test-engine:7), `.pv-tile__name` (preparation-lab:118), `.gd-stepper .stage-step` (guided:22), `.stage-review__close` (stage-review:69), `.axis__delta` (axes:102, 1.2), `.crumbs` (breadcrumb:9, 1.2), `.pa-add__plus` (promise-agree:123), `.joblex-remove` (test-engine:134). No role expresses "no leading". Decision needed — see open questions.

**RISK C — media-query and state rules cannot be grouped.** `session-topbar.css:287` sets `.session-topbar__count` type inside `@media (max-width: 767.98px)`. A role in type.css cannot reach it. Same for the ~9 state weight-bumps (`.um-menu__item.is-current`, `.app-nav__link.is-active`, `.session-topbar__stages .is-current`, `.notes-panel__tab.is-active`, `.fp-chip--changed`, `.gd-chip[data-selected]`, `.joblex-item.is-active`, `.rv-seg__btn.is-pass/.is-fail`, `.cl-badge`). A role has no "strong" variant; today they toggle weight in place.

---

### 1. Every already-14px selector, classified

Discriminator applied mechanically: `text-transform: uppercase` → **overline**; mono `font-family` → **code**; weight 600/700 → **label-strong**; weight 500 → **label**; no weight or 400 → **body-sm**.

Full row-by-row list is in `workItems` (137 rows). Totals by target role:
| role | rows |
|---|---|
| `.type-body-sm` (35 of them need `+ --full`) | 54 |
| `.type-label` | 33 |
| `.type-label-strong` | 22 |
| `.type-overline` | 17 |
| `.type-code` | 12 |
| unclear / needs a call | 9 |

Measured baseline from `node scripts/lint-design-tokens.js --json` (free, run today): `unsanctionedSizeToken 439`, `relativeFontSize 33`, `offLadderFont 22`, `literalFontSize 12`, `fontFamilyLiteral 8`, `displayFaceBelow20 7`, `clampOffRung 10`, `undefinedToken 3`, `fontShorthandResetsNumeric 0`, `nonTokenFont 7`. Predicted after Phase 3: `fontFamilyLiteral` 8 → **1** (only `base.css:24`, the body stack, is legitimate); `relativeFontSize` 33 → **4** (error-log 11 + feedback-inbox 8 + account-sheet 6 + profile-badge 1 + test-engine 1 + stage-extras 1 + run-detail 1 = 29 clearable; the 4 left are `finish-feedback-modal.css:7,15,16` and `ux-audit-fixes.css:26`, all non-14px); `literalFontSize` 12 → **10** (`member-runs.css:59,66` are the two `0.875rem` literals); `unsanctionedSizeToken` 439 → roughly **290**. Ceilings in `scripts/test-design-guard.js:83-97` must be lowered to the re-measured numbers, never raised.

---

### 2. The eyebrow family — ALL of it

`.eyebrow` recipe (`base.css:113-119`): `font-size: var(--type-body-sm)` · `font-weight: var(--type-weight-semibold)` · `letter-spacing: var(--type-tracking-caps-lg)` (0.08em) · `text-transform: uppercase` · `color: var(--color-accent-dark)`. No `line-height` → inherits body's 1.55 = 21.7px.
`.type-overline` (`type.css:190-198`): same four, plus `font-family: var(--type-family-base)` and `line-height: var(--type-leading-sm)` (20px). **So `.eyebrow` → `.type-overline` is byte-identical except the leading tightens 21.7 → 20px.** Route (a): add `.eyebrow` to the `.type-overline` selector list, strip the four type properties from `base.css:113-119`, leave `color: var(--color-accent-dark)` behind. 112 markup uses outside tests, zero markup edits.

`.eyebrow--slot` (`base.css:120-123`) keeps `color: var(--color-ink-dim)` + `letter-spacing: var(--type-tracking-caps)` (0.06em). base.css loads AFTER type.css so the override still wins — but a `letter-spacing` survives outside the two sanctioned files. Flagged.

Rivals, verified:

| selector | file:line | recipe today | identical to `.eyebrow`? |
|---|---|---|---|
| `.cp-eyebrow` | `type.css:191` + `coach-panel.css:63` | already grouped into `.type-overline` by P2; coach-panel keeps colour only | **done** |
| `.app-nav__group-label span` | `app-nav.css:209` | 14 / 600 / **tracking-wide 0.02em** / uppercase / rgba(255,255,255,.55) | tracking differs 4× (0.02 vs 0.08) |
| `.notes-panel__group-head` | `notes-panel.css:61` | 14 / **500** / **0.06em** / uppercase / ink-mute | weight and tracking differ |
| `.stage-io__label, .stage-io__block-title` | `notes-panel.css:216` | 14 / **500** / **0.06em** / uppercase / ink-mute | same as above |
| `.since__title` | `admin-tables.css:246` | 14 / 600 / **0.05em** / uppercase / accent-dark | tracking only |
| `.person-runs__heading` | `admin-tables.css:353` | 14 / 600 / **0.05em** / uppercase / ink-mute | tracking only |
| `.um-menu__label` | `admin-tables.css:175` | 14 / **no weight (→400)** / **0.04em** / uppercase / ink-mute | weight and tracking |
| `.about-cap span` | `about-stage.css:76` | 14 / 600 / **tracking-wider 0.04em** / uppercase / ink-mute | tracking only |
| `.cmp-row__label` | `buttons-inputs.css:280` | 14 / 600 / **0.04em** / uppercase / ink-mute | tracking only |
| `.agreed-owner-label` | `promise-agree.css:159` | 14 / 600 / **tracking-caps 0.06em** / uppercase / ink-mute | tracking only |
| `.run-list__grouphead` | `start-stage.css:78` | 14 / 600 / **0.04em** / uppercase / ink-mute | tracking only |
| `.start-point__label` | `start-stage.css:261` | 14 / 600 / **tracking-wide 0.02em** / uppercase / ink-mute | tracking only |
| `.joblex-group` | `test-engine.css:86` | 14 / 600 / **0.04em** / uppercase / ink-dim | tracking only |
| `.arc-sec` | `meeting-arcs.css:20` | 14 / 600 / **.04em** / uppercase | tracking only |
| `.arc-field > span` | `meeting-arcs.css:49` | 14 / 600 / **.03em** / uppercase | tracking only |
| `.pv-switch__poptitle` | `preparation-lab.css:80` | 14 / **no weight** / **0.04em** / uppercase / ink-mute | weight and tracking |
| `.pv-l__name` | `preparation.css:62` | 14 / 600 / **0.06em** / uppercase / accent-dark | tracking only |
| `.gd-sugg__tag` | `guided.css:274` | 14 / **700** / **0.03em** / uppercase / primary-800 | weight and tracking |

**Rivals that are NOT eyebrows and must NOT become overline:**
- **`.run-log__block-label`** (`run-log.css:95`) — 14 / 600 / `color: var(--color-ink)`, **no uppercase, no tracking**. phase-3.md names it as an eyebrow rival; it is not one. Its markup is sentence case: `run-debrief.js:84` "CLI replay", `:90` "Log on disk", `:174` "Your notes". Making it overline would render "CLI REPLAY / LOG ON DISK / YOUR NOTES". → `.type-label-strong`.
- **`.brutal__eyebrow`** (`briefing.css:247`) — 14 / **500**, ink-dim, **no uppercase, no tracking**. Named as a rival in phase-3.md; it is a label. → `.type-label`. Also note it is declared TWICE: `briefing.css:247` (type + flex) and `stage-extras.css:54` (flex only, duplicate). stage-extras imports later (`design.css:45` vs `:32`) so its layout wins; only briefing.css carries the type.
- `.brutal__badge` (`stage-extras.css:55`), `.cl-tag` (`:176`), `.cmp-verdict-tag` (`buttons-inputs.css:397`) are uppercase but are **pills** — `.cmp-verdict-tag` takes its 14/500 from the base.css:136 chip group. Overline would push them to 600 and 0.08em. Leave on the chip recipe; keep only their local `text-transform`/`letter-spacing` as an acknowledged exception, or promote all three to overline as one deliberate call.
- `.pv-j__eyebrow` (`preparation-lab.css:800`) and `.pv-g__cell--assume .eyebrow` (`:638`) and `.pv-l__hero .eyebrow` (`preparation.css:121`) declare **colour only** — they ride `.eyebrow` and need no change.

---

### 3. Mono — four stacks, 21 sites, one target

`--type-family-mono` (`tokens.css:367`) = `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`.

| stack | resolves to | sites |
|---|---|---|
| **S1** `var(--font-mono, ui-monospace, monospace)` | `ui-monospace, monospace` (the token IS defined at `tokens.css:270`, so the fallback is dead) | `buttons-inputs.css:215` `.script-alias`, `:303` `.cmp-id__meta`, `:378` `.fp-chip`; `stage-extras.css:227` `.cl-kick__preview pre`; `test-engine.css:254` `.guide-ref code`, `:288` `.guide-step__files`; `error-log.css:37` `.el-route`, `:75` `.el-detail__meta code`, `:80` `.el-stack`; `feedback-inbox.css:137` `.fb-pill--src`; `design-stage.css:109` `.ds-rulesgrid code` (bare `var(--font-mono)`) — **11** |
| **S2** `var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)` | identical to S1 — the longer fallback **never fires** | `notes-panel.css:236` `.stage-io__pre` — **1** |
| **S3** `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` (literal) | byte-identical to `--type-family-mono` | `run-log.css:36, 108, 126, 134, 148, 229` — **6** |
| **S4** `ui-monospace, SFMono-Regular, Menlo, monospace` (literal, no Consolas) | | `guide.css:29` `.sys-note code` — **1** |
| **JS `font:` shorthand**, S3 stack at 14px | | `admin/src/ui/build-stamp.js:34` `"font:14px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace"`; `admin/src/ui/dev-badge.js:23` `"font:14px/1.4 …"` — **2** |

**Why Carl sees two typewriter fonts (test scenario 4):** on Windows `ui-monospace` does not resolve, so S1/S2 fall through to generic `monospace` (Courier New), while S3 picks Consolas. Collapsing S1/S2/S4 onto `.type-code` moves 13 sites from Courier New to Consolas — a real, intended face change. S3's 6 run-log sites do not change face at all.

`--font-mono` (`tokens.css:270`) becomes dead once these move; `tokens.css:363-365` already anticipates the merge. Deleting it is Phase 3's job, but check `--font-mono` has no consumers left first.

**Size trap:** `.run-log__tip` (`run-log.css:220`) and `.el-detail__meta code` (`error-log.css:75`) declare a mono family with **no font-size**. `.run-log__tip` inherits 16px from body — taking `.type-code` drops it to 14px, a real size change inside a phase that promises none. `.el-detail__meta code` inherits 14px from its parent, so it is safe.

---

### 4. The two label recipes — the honest answer

| | `.field__label` (`primitives.css:11-15`) | `.label` (`base.css:268-274`) | `.type-label` (`type.css:161-167`) |
|---|---|---|---|
| size | `var(--type-body-sm)` | `var(--type-body-sm)` | `var(--type-size-sm)` (same 14px) |
| weight | `var(--type-weight-medium)` | `var(--type-weight-medium)` | `var(--type-weight-medium)` |
| tracking | *none* | `var(--type-tracking-wider)` 0.04em | `var(--type-tracking-wide)` 0.02em |
| leading | *none* → inherits 1.55 = 21.7px | `var(--type-leading-normal)` 1.5 = 21px | `var(--type-leading-sm)` 20px |
| colour | `var(--color-ink)` | `var(--color-ink-mute)` | *none* (roles carry no colour) |

**Consumers, counted from markup:**
- `.field__label` — **37** occurrences across 12 files: `admin/src/stages/design.js` ×13 (the Design-system specimen), `admin/src/ui/add-person-modal.ts` ×3, `invite-member-modal.ts` ×2, `delete-person-modal.ts` ×2, `give-access-modal.ts` ×1, `admin/src/stages/login.js` ×2, `forgot-password.js` ×1, `reset-password.js` ×1, `frontend/src/stages/join.js` ×3, plus tests (`auth-screens.test.ts` ×5, `join.test.js` ×1) and the parked `stages/tests/entry-redesign.js` ×3. So **~15 live product sites**: the auth screens and the four person/access modals.
- `.label` — **13** occurrences, **all in `admin/src/stages/design.js`** (lines 169, 291, 295, 299, 401, 403, 448, 451, 468, 471, 473, 604, 760). Zero uses anywhere else in either app. No `className = "label"` assignments either.

**Does collapsing them change any screen visibly? Honestly: no customer screen changes.**
- `.field__label` sites gain 0.02em tracking (imperceptible at 14px/500 on short strings like "Email", "Full name") and tighten leading 21.7 → 20px. On a single-line label that is zero visible change; `.field` already sets its own 8px gap, so the row does not move. Its `color: var(--color-ink)` must be left behind as a colour-only rule.
- `.label` sites are entirely on the internal Design-system reference screen. There the tracking halves (0.04 → 0.02em) and leading tightens 21 → 20px. That screen exists to show the house recipe, so it *should* change. `color: var(--color-ink-mute)` must be left behind.
- The one thing to preserve deliberately: the two carry **different inks** (ink vs ink-mute). That is not a type difference and roles do not own colour, so keep two colour-only rules, or delete `.label` outright and rewrite design.js's 13 sites to `type-label caption`-style. Recommend: keep both class names as colour-only shims this phase; delete in Phase 5's markup sweep.

Related: `.page-header__step` (`primitives.css:68-73`) is 14 / 500 / `var(--type-tracking-wide)` — **already `.type-label` exactly**. It is the cleanest first grouping and a good canary. `.caption` (`base.css:275-278`) is 14px with no weight — a third rival, 43 markup uses; it is `.type-body-sm` and should move in the same edit.

---

### 5. Tailwind `text-xs` — every site and what actually happens

`admin/tailwind.config.js:56`: `xs: ["var(--type-small)", { lineHeight: "1.5" }], // text-xs ×7`. **`--type-small` is defined nowhere in the repo.** An undefined `var()` with no fallback makes the declaration invalid at computed-value time; for `font-size` (an inherited property) that computes to `inherit`. The `line-height: 1.5` half of the utility DOES apply. And because tailwind.css is imported before design.css, any component class with a `font-size` beats the utility outright.

| # | file:line | markup | wins today | renders today | after `text-sm` |
|---|---|---|---|---|---|
| 1 | `admin/src/stages/questioning.js:289` | `<p class="hint hint--kbd text-xs text-ink-mute">` | `.hint` (`buttons-inputs.css:534`, `font-size: var(--type-body)`) — loads later | **16px / 1.5** | **no change** — `.hint` still wins. Only fixes when `.hint` moves onto a role. |
| 2 | `admin/src/stages/questioning.js:270` | `<div class="script-meta text-xs">` | nothing — `.script-meta` (`buttons-inputs.css:208`) declares no type | inherits `.questioning-card` → body **16px**, leading 1.5 | **14px / 20px** — a real shrink on the dev scripted-run strip |
| 3 | `admin/src/stages/questioning.js:290` | `<p class="text-xs">` (DEV only) | nothing | inherits **16px**, leading 1.5 | **14px** — dev-only |
| 4 | `admin/src/stages/lexicon-review.js:111` | `<div class="text-ink-mute text-xs mb-1">` | nothing — `.lex-row__body` and `.lex-row` (`start-stage.css:546`) declare no size | inherits **16px** | **14px** — the topLabel line above each phrase shrinks. Visible on the Lexicon review screen. |
| 5 | `admin/src/ui/notes-panel.js:45` | `<p class="notes-panel__helper text-ink-dim text-xs">` | nothing — `.notes-panel__helper` has no CSS anywhere in the repo | inherits `.notes-panel` → body **16px** | **14px** — the QA helper line under "Test notes" shrinks to match the panel |
| 6 | `admin/src/stages/design.js:705` | `<p class="hint hint--kbd text-xs text-ink-mute">` | `.hint` 16px | **16px** | no change (Design-system specimen) |
| 7 | `admin/src/ui/skeleton-presets.ts:291` | `${skLeaf("hint hint--kbd text-xs", "32ch")}` | `.hint` 16px | ghost sized off `.hint` | no change — but the class list must track the real markup or the ghost mis-sizes (`type.css:36-40`) |
| — | `admin/src/stages/tests/promises-loop.js:164` and `:241` | `<p class="hint hint--kbd text-xs text-ink-mute">` | parked gallery (`plan.md:67`) | | leave as-is, or sweep for tidiness |

So the config comment "×7" is right for shipped code (2 more in the parked gallery). Net effect of deleting the `xs` entry and rewriting to `text-sm`: **three screens visibly change** — the dev script strip and dev suggest link in questioning, the Lexicon review top label, and the notes-panel helper. All three go 16px → 14px, i.e. down to the chrome tier they belong in. None breaches the floor.

**The test-first assertion**, verbatim, `admin/src/ui/skeleton-presets.test.ts:229-243`:
```
    classes: [
      "questioning-card",
      // the 50/50 runner's bare column, which the flat variant mirrors
      "cp-q",
      "question-card-head",
      "question-card-head__text",
      "question-stem",
      "question-desc",
      "copy-snippet-btn",
      "field-live-label",
      "field-live-label__text",
      "hint",
      "hint--kbd",
      "text-xs",
    ],
```
Line **242** is the `"text-xs",` entry. Change it to `"text-sm",`, watch it fail against `skeleton-presets.ts:291`, then change the source. (`skeleton-presets.test.ts:178` and `:214` also assert `"text-sm"` — those are already correct and must not be touched.)

---

### 6. Lane check

`LANES.md` as it stands today (read this session):

| session | area | overlap with Phase 3 |
|---|---|---|
| `a6878b4e` | Stage look-back | **`admin/src/styles/design/stage-lookback.css`** — Phase 3 wants `:21 .lookback__band` (14px), `:38 .lookback__what strong` (600), `:42 .lookback__back` (`font: inherit; 600`). Claimed 2026-07-27, so **3 days old and stale by the board's own 2-day rule**, but the row is still on the board. Surface to Carl; do not edit through. |
| `1a2e5006` | Type system P2 — **this session** | Already holds tokens.css, type.css, base.css, design.css, admin-tables.css, briefing.css, coach-panel.css, tailwind.config.js, the guard scripts, questioning.js, preparation-css.test.ts. **The lane row must be widened before Phase 3 starts** — it does not yet cover primitives.css, notes-panel.css, session-topbar.css, app-nav.css, breadcrumb.css, run-log.css, error-log.css, row-menu.css, buttons-inputs.css, start-stage.css, stage-extras.css, promise-agree.css, stage-review.css, about-stage.css, axes.css, test-engine.css, design-stage.css, shared-components.css, flow-kit.css, save-pip.css, member-runs.css, persona-bench.css, admin-pulse.css, pulse-drilldowns.css, add-person-modal.css, meeting-arcs.css, guide.css, test-gallery.css, lexicon-review.css, feedback-inbox.css, finish-feedback-modal.css, promise-checkin.css, run-detail.css, skeleton-presets.ts/.test.ts, notes-panel.js, lexicon-review.js, account-sheet.ts, profile-badge.js, build-stamp.js, dev-badge.js, and the frontend sheets. |
| `f1363886` | `admin/src/stages/bank.js` | none |
| `c9200bfa` | `scripts/backup-*` | none |
| `c91a58a9` | backend sessions + prompts | none |

**The collision the plan predicted has cleared.** `plan.md:29` and `phase-3.md:17` warn that `admin/src/styles/feedback-inbox.css` and `frontend/src/stages/preparation.css` are claimed by session `080b9104` (brief star rating). **That row is no longer on LANES.md** — both files are unclaimed and safe to take. Update `phase-3.md:17` and `phase-4.md:15` so the stale warning does not stop a later agent.

---

### 7. Files that CANNOT reach "zero type declarations" without importing later-phase work

`phase-3.md:25` demands zero in eight files. Measured, only **`breadcrumb.css`** can reach zero on Phase 3's own rules. The blockers:

| file | selector left behind | why |
|---|---|---|
| `admin-tables.css` | `:110 .ud-nameline .rd-name` `font-size: var(--type-h2)` | clamp(28–36px), off-ladder → Phase 5 |
| | `:153 .um-menu-btn` `font-size: var(--type-h4); line-height: 1; letter-spacing: 1px` | 18px glyph button → Phase 5 + Risk B |
| | `:385 .star-rating__star` `font-size: 1.75rem; line-height: 1` | 28px glyph, off-ladder → Phase 5 |
| | `:138 .ud-chev` `line-height: 0` | Risk B |
| `notes-panel.css` | `:69 .notes-panel__item`, `:105 .notes-panel__edit/textarea` (16px prose) | Phase 4 |
| | `:384 .modal__message` `var(--type-h4)` | Phase 5 (and `.modal` living in notes-panel.css is itself odd) |
| `session-topbar.css` | `:49 .session-topbar__brand-word` `var(--type-h4)` | Phase 5 |
| | `:88 .stage-step__label` `line-height: 1`, `:287` the `@media` block | Risk B + Risk C |
| `app-nav.css` | `:147 .app-nav__word` `var(--type-h4)` | Phase 5 |
| `run-log.css` | `:76 .run-log__stat-value` `var(--type-h3)` | Phase 5 metric |
| `row-menu.css` | `:5 .row-menu-btn` `line-height: 0` | Risk B |
| `error-log.css` | `:48 .el-anon { font-style: italic }` | no role carries `font-style` |

Note `--type-h3` = `1.25rem` = 20px and `--type-h4` = `1.125rem` = 18px are both exactly on the ladder (`--type-size-xl` / `--type-size-lg`), so `.type-heading-md` / `.type-heading-sm` would land those four selectors with zero size change — but `.type-heading-*` adds the display family and `text-wrap: balance`, which is a Phase 5 decision, not a Phase 3 one.

---

### 8. Properties no role can express (they will survive the sweep)

`font-style: italic` — `admin-tables.css:343 .axis-mem__nr`, `error-log.css:48 .el-anon`, `buttons-inputs.css:289 .cmp-cell--muted`, `:409 .cmp-verdict--none`, `stage-extras.css:67 .brutal__note`, `promise-agree.css:140 .pa-empty`, `guided.css:284 .gd-finish-note`, `briefing.css:156 .question-session-notes`.
`text-transform: capitalize` / `lowercase` — `admin-tables.css:182 .um-menu__item`, `briefing.css:286 .action-when`.
`font-variant-numeric: tabular-nums` on non-metric chrome — `notes-panel.css:95 .notes-panel__ts`, `feedback-inbox.css:71 .fb-time`, `:146 .fb-stars`, `axes.css:65/89/102`, `buttons-inputs.css:346`, `stage-extras.css:76/120/142/165/268`, `start-stage.css:557`, `pulse-drilldowns.css:16/19/21/33`, `admin-pulse.css:46`. `base.css:46 .num-tabular` is the sanctioned escape hatch — pair the class in markup rather than keeping the declaration.
`line-height: 0 | 1 | 1.2` on glyph containers — Risk B list above.

---

### 9. Surfaces a stylesheet sweep cannot reach (all 14px, all in scope)

- `admin/src/ui/account-sheet.ts:36-75` — a template-literal `<style>` appended to `document.head`, so it beats everything. Six `font-size: var(--type-body-sm, 14px)` at lines 48, 53, 60, 67, 69, 70 (`.acct-back`, `.acct-dots`, `.acct-input`, `.acct-hint`, `.acct-page .btn`, `.acct-label`).
- `admin/src/ui/profile-badge.js:56-61` — same pattern; `.profile-badge__mi` `font: inherit; font-size: var(--type-body-sm, 14px)`.
- `admin/src/ui/build-stamp.js:34` and `admin/src/ui/dev-badge.js:23` — `el.style.cssText` with the `font:` shorthand carrying the S3 mono stack at 14px. Inline style, unbeatable by any class. These are the two sites `--type-role-code` (`type.css:271`) exists for; `type.css:237-256` warns the shorthand resets `font-feature-settings`/`font-variant-ligatures`, which is acceptable on a debug chip.


## Work items (396)

| file | line | selector | today | role | kind | note |
|---|---|---|---|---|---|---|
| admin/src/styles/design/base.css | 113 | `.eyebrow` | font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold); letter-spacing: var(--type-tracking-caps-lg); text-transform: uppercase; color: var(--color-accent-dark) | .type-overline | heading | The keystone edit. Group into type.css:190 and strip the four type props; leave the colour behind. 112 live markup uses, zero markup churn. Only change: leading 21.7px -> 20px. |
| admin/src/styles/design/base.css | 120 | `.eyebrow--slot` | letter-spacing: var(--type-tracking-caps); color: var(--color-ink-dim) | colour-only shim (letter-spacing survives) | unclear | base.css loads after type.css so the 0.06em override still wins, but it is a type property outside the two sanctioned files. Either accept it with a cited comment or fold the slot tier into colour alone. |
| admin/src/styles/design/base.css | 268 | `.label` | font-size: var(--type-body-sm); font-weight: var(--type-weight-medium); letter-spacing: var(--type-tracking-wider); line-height: var(--type-leading-normal); color: var(--color-ink-mute) | .type-label | chrome | Rival label recipe B. 13 markup uses, ALL in admin/src/stages/design.js. Collapsing changes no customer screen; tracking halves 0.04 -> 0.02em on the Design specimen only. Keep colour as a shim. |
| admin/src/styles/design/primitives.css | 11 | `.field__label` | font-size: var(--type-body-sm); font-weight: var(--type-weight-medium); color: var(--color-ink) | .type-label | chrome | Rival label recipe A. ~15 live sites (auth screens + 4 person/access modals). Gains 0.02em tracking and 20px leading: invisible on one-line labels. Keep colour: var(--color-ink). |
| admin/src/styles/design/primitives.css | 68 | `.page-header__step` | font-size: var(--type-body-sm); font-weight: var(--type-weight-medium); letter-spacing: var(--type-tracking-wide); color: var(--color-ink-mute) | .type-label | chrome | Already .type-label's exact recipe minus the leading. Cleanest first grouping; use it as the canary before touching anything else. |
| admin/src/styles/design/primitives.css | 17 | `.field__hint` | font-size: var(--type-body-sm); line-height: var(--type-leading-normal) | .type-body-sm | prose | Field hints read as short prose; the 608px measure is welcome here. |
| admin/src/styles/design/primitives.css | 22 | `.field__error` | font-size: var(--type-body-sm) | .type-body-sm | prose | Error line under a field. Keep colour: var(--color-negative-text). |
| admin/src/styles/design/primitives.css | 79 | `.page-header__lede` | font-size: var(--type-body-sm); max-width: var(--measure) | .type-body-sm | prose | Already carries var(--measure), so the role's max-width is a no-op. Free win. |
| admin/src/styles/design/base.css | 275 | `.caption` | font-size: var(--type-body-sm); color: var(--color-ink-mute) | .type-body-sm | chrome | Third label rival, 43 markup uses. No weight, so body-sm. Group in the same edit as .label so the trio lands together. |
| admin/src/styles/design/base.css | 136 | `.chip, .um-badge, .pd-pill, .el-pill, .fb-pill, .fb-verdict, .fb-type, .cl-badge, .lib-badge, .cmp-verdict-tag` | font-size: var(--type-body-sm); font-weight: var(--type-weight-medium) | .type-label | chrome | Ten chip families in one rule. .type-label adds 0.02em tracking and 20px leading to every pill in the app; the pills have 5px vertical padding so height is unaffected. Highest-blast-radius single row in the phase. |
| admin/src/styles/design/base.css | 204 | `.seg__btn, .el-filter, .rv-seg__btn` | font: inherit; font-size: var(--type-body-sm); font-weight: var(--type-weight-medium); line-height: 1.4 | .type-label | control | Three segmented controls. Leading 1.4 (19.6px) -> 20px, so the pill grows ~0.4px. Dropping `font: inherit` restores Inter's ss01/cv11 on these buttons, which base.css:33 alone would not give them. |
| admin/src/styles/design/base.css | 236 | `.conf` | font-size: var(--type-body-sm); font-weight: var(--type-weight-medium) | .type-label | chrome | Confidence dot-meter pill. Same treatment as the chip group. |
| admin/src/styles/design/base.css | 279 | `.kbd` | font-size: var(--type-body-sm); font-family: inherit; line-height: 1.5 | .type-body-sm | unclear | A keycap that deliberately declares font-family: inherit so it does NOT go mono. .type-code would change its face. Recommend body-sm; flag to Carl that a keycap arguably wants code. |
| admin/src/styles/design/base.css | 344 | `.stage-step` | letter-spacing: 0.01em; font-weight: 500; color: var(--color-ink-mute) | .type-label | chrome | Rival to session-topbar.css:73, which styles the same class. Two sheets own one class; the role must absorb both or they keep drifting. Tracking 0.01 -> 0.02em. |
| admin/src/styles/design/admin-tables.css | 6 | `.um-table` | font-size: var(--type-body-sm) | .type-body-sm + .type-body--full | chrome | MUST also join .type-body--full (type.css:230). Without it the 38rem measure caps the people table and test scenario 1 fails on sight. |
| admin/src/styles/design/admin-tables.css | 12 | `.um-table th` | font-weight: var(--type-weight-semibold) | .type-label-strong | chrome | Column header. Inherits 14px from .um-table today; the role restates the size, which is fine and makes the header self-describing. |
| admin/src/styles/design/admin-tables.css | 31 | `.um-user__open` | font: inherit; font-weight: var(--type-weight-semibold) | .type-label-strong | control | The person's name as a button. Dropping `font: inherit` for the role is a net win: the shorthand was resetting font-variant-numeric and Inter's feature settings for this button. |
| admin/src/styles/design/admin-tables.css | 50 | `.um-trend` | font-size: var(--type-body-sm); line-height: 1 | .type-body-sm (leading conflict) | glyph | RISK B. The line-height: 1 is deliberate: this is the arrow mark inside a 14px table row, and P0 already fixed it once from 0.85em. A role forces 20px leading on 37 rows. Needs the glyph decision. |
| admin/src/styles/design/admin-tables.css | 85 | `.um-group__name` | font-weight: var(--type-weight-semibold) | .type-label-strong | chrome | Company name in the group head band. |
| admin/src/styles/design/admin-tables.css | 175 | `.um-menu__label` | font-size: var(--type-body-sm); text-transform: uppercase; letter-spacing: 0.04em | .type-overline | heading | Eyebrow rival. No font-weight declared, so it renders 400 today; overline takes it to 600 and tracking 0.04 -> 0.08em. Visible on the row-role menu. |
| admin/src/styles/design/admin-tables.css | 182 | `.um-menu__item` | font: inherit; font-size: var(--type-body-sm); text-transform: capitalize | .type-body-sm + .type-body--full | unclear | text-transform: capitalize is content-shaping and no role carries it. Either keep one transform declaration here (breaks the zero-declaration goal) or capitalise in JS. |
| admin/src/styles/design/admin-tables.css | 197 | `.um-menu__item.is-current` | font-weight: var(--type-weight-semibold) | state bump — no role | unclear | RISK C. A role has no strong variant. Leave the weight toggle or add .type-label-strong in JS on the current item. |
| admin/src/styles/design/admin-tables.css | 216 | `.person-summary` | font-size: var(--type-body-sm) | .type-body-sm + .type-body--full | chrome | A wrapping flex row of role/count/separator. Needs --full or it wraps earlier than today. |
| admin/src/styles/design/admin-tables.css | 224 | `.person-summary__role` | font-weight: var(--type-weight-medium) | .type-label | chrome | Inline emphasis inside a body-sm row. |
| admin/src/styles/design/admin-tables.css | 235 | `.person-summary b` | font-weight: var(--type-weight-semibold) | .type-label-strong | chrome | A weight-only rule on a bare <b>. Grouping an element selector into a role list is legal but noisy; consider leaving as a weight rule with a cited exception. |
| admin/src/styles/design/admin-tables.css | 246 | `.since__title` | font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold); letter-spacing: 0.05em; text-transform: uppercase | .type-overline | heading | Eyebrow rival, accent-dark like .eyebrow. Tracking 0.05 -> 0.08em. Keep colour: var(--color-accent-dark). |
| admin/src/styles/design/admin-tables.css | 255 | `.since__label` | font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold) | .type-label-strong | chrome | Uses gap: 0.45em for its dot; em-based gap tracks font-size, which does not change. |
| admin/src/styles/design/admin-tables.css | 281 | `.since__list li` | font-size: var(--type-body-sm); line-height: 1.55 | .type-body-sm | prose | Leading 21.7 -> 20px. The ::before bullet is positioned at top: 0.62em, which is em-based and unaffected. |
| admin/src/styles/design/admin-tables.css | 298 | `.since__when` | font-weight: var(--type-weight-semibold) | .type-label-strong | chrome | Inline date emphasis inside a since list item. |
| admin/src/styles/design/admin-tables.css | 316 | `.promise-row__who` | font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold) | .type-label-strong | chrome | flex: none owner tag on a promise row. |
| admin/src/styles/design/admin-tables.css | 322 | `.promise-row__action` | font-size: var(--type-body-sm); line-height: 1.55 | .type-body-sm + .type-body--full | prose | flex: 1 with min-width: 0. The measure would fight the flex basis; add --full. |
| admin/src/styles/design/admin-tables.css | 332 | `.axis-mem` | font-size: var(--type-body-sm) | .type-body-sm + .type-body--full | chrome | A two-column grid. Capping it at 38rem would reflow the axis memory rows. |
| admin/src/styles/design/admin-tables.css | 341 | `.axis-mem__series b` | font-weight: var(--type-weight-semibold) | .type-label-strong | chrome | Weight-only on <b> inside the series. |
| admin/src/styles/design/admin-tables.css | 343 | `.axis-mem__nr` | font-style: italic | none — font-style has no role | unclear | See findings section 8. font-style survives the sweep or moves to a sanctioned one-property utility. |
| admin/src/styles/design/admin-tables.css | 346 | `.axis-mem__scale` | font-size: var(--type-body-sm); line-height: var(--type-leading-normal) | .type-body-sm | chrome | The 'out of what?' legend under the axis bars. |
| admin/src/styles/design/admin-tables.css | 353 | `.person-runs__heading` | font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold); letter-spacing: 0.05em; text-transform: uppercase | .type-overline | heading | Eyebrow rival. Tracking 0.05 -> 0.08em. |
| admin/src/styles/design/admin-tables.css | 408 | `.list-toolbar__search` | font-size: var(--type-body-sm) | .type-body-sm + .type-body--full | control | An <input>. base.css:33 gives inputs 16px, so this 14px rule is load-bearing: strip it without grouping and every list search box jumps to 16px. |
| admin/src/styles/design/admin-tables.css | 427 | `.list-toolbar__filter` | font-size: var(--type-body-sm); font-weight: var(--type-weight-medium) | .type-label | control | Filter chip button in the shared list toolbar. |
| admin/src/styles/design/admin-tables.css | 442 | `.list-toolbar__count` | font-size: var(--type-body-sm) | .type-body-sm | numeric | The right-hand result count. No weight declared, so body-sm. |
| admin/src/styles/design/admin-tables.css | 110 | `.ud-nameline .rd-name` | font-size: var(--type-h2) | PHASE 5 (clamp, off-ladder) | heading | Blocks the zero-declaration goal for this file. clamp(1.75rem, 3.5vw, 2.25rem) is off the ladder in both endpoints. |
| admin/src/styles/design/admin-tables.css | 138 | `.ud-chev` | line-height: 0 | glyph — no role | glyph | RISK B. line-height: 0 collapses the chevron cell. No role can express it. |
| admin/src/styles/design/admin-tables.css | 153 | `.um-menu-btn` | font-size: var(--type-h4); line-height: 1; letter-spacing: 1px | PHASE 5 glyph | glyph | 18px is on the ladder but the letter-spacing: 1px spaces the three dots of the ellipsis glyph. Out of scope here. |
| admin/src/styles/design/admin-tables.css | 385 | `.star-rating__star` | font-size: 1.75rem; line-height: 1 | PHASE 5 glyph | glyph | 28px, off-ladder, and a literal (guard's literalFontSize key). Stars are a tap target; do not shrink. |
| admin/src/styles/design/admin-tables.css | 361 | `.person-run` | font: inherit | remove once the row's children hold roles | chrome | A <button> reset. Once .person-run__type/__when take roles the shorthand is redundant; the markup at frontend/src/stages/person-detail.ts:157 also carries text-sm. |
| admin/src/styles/design/admin-tables.css | 450 | `.lt-sort` | font: inherit | remove once .um-table th holds the role | control | The sortable-header button inherits the th's style by design. If th joins .type-label-strong the inherit is still needed for colour, so keep the rule minus the font shorthand. |
| admin/src/styles/design/app-nav.css | 156 | `.app-nav__link` | font-size: var(--type-body-sm); font-weight: var(--type-weight-medium) | .type-label | chrome | The nav rail rows. Fixed 44px height, so the 20px leading cannot move them. |
| admin/src/styles/design/app-nav.css | 209 | `.app-nav__group-label span` | font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold); letter-spacing: var(--type-tracking-wide); text-transform: uppercase; color: rgba(255,255,255,0.55) | .type-overline | heading | Eyebrow rival named in phase-3.md. Tracking widens 4x (0.02 -> 0.08em) — the most visible eyebrow change in the phase, and the point of test scenario 3. Colour must stay in app-nav.css (dark rail). |
| admin/src/styles/design/app-nav.css | 152 | `.app-nav__tagline` | font-weight: var(--type-weight-regular) | weight-only override | unclear | Sits inside .app-nav__word (18px bold). Cannot resolve until Phase 5 moves the brand word. |
| admin/src/styles/design/app-nav.css | 186 | `.app-nav__link.is-active` | font-weight: var(--type-weight-semibold) | state bump — no role | unclear | RISK C. |
| admin/src/styles/design/app-nav.css | 310 | `.profile-badge__avatar` | font-size: var(--type-body-sm); font-weight: var(--type-weight-bold); line-height: 1 | .type-label-strong (weight + leading conflict) | glyph | RISK B and a weight drop 700 -> 600. Initials centred in a 28px circle by display: grid + place-items: center, so the leading may be harmless — must be measured, not reasoned about. |
| admin/src/styles/design/app-nav.css | 323 | `.profile-badge__email` | font-size: var(--type-body-sm) | .type-body-sm | chrome | Truncating email in the profile chip. Sits inside a max-width chip so the measure is inert; no --full needed. |
| admin/src/styles/design/app-nav.css | 147 | `.app-nav__word` | font-weight: var(--type-weight-bold); font-size: var(--type-h4); letter-spacing: var(--type-tracking-tight) | PHASE 5 (18px brand word) | heading | Blocks zero for this file. |
| admin/src/styles/design/session-topbar.css | 56 | `.session-topbar__row` | font-size: var(--type-body-sm) | .type-body-sm + .type-body--full | chrome | width: 100% with overflow/text-overflow: ellipsis. A 38rem cap would truncate far earlier than today. |
| admin/src/styles/design/session-topbar.css | 64 | `.session-topbar .is-strong` | font-weight: 500 | .type-label | chrome | Descendant selector; groups fine. Note notes-panel.css:29 styles the SAME .is-strong at weight 600 in a different scope — two recipes for one class. |
| admin/src/styles/design/session-topbar.css | 73 | `.session-topbar__stages .stage-step` | font: inherit; font-size: var(--type-body-sm); font-weight: 500; line-height: 1 | .type-label (leading conflict) | control | RISK B. 0.34rem vertical padding on a 50px bar; 20px leading grows the pill ~6px and could clip against the bar height. Measure at 1280 and 375 before committing. |
| admin/src/styles/design/session-topbar.css | 88 | `.session-topbar__stages .stage-step__label` | line-height: 1 | glyph — no role | glyph | RISK B, and the reason the parent's leading matters. |
| admin/src/styles/design/session-topbar.css | 104 | `.session-topbar__stages .is-current` | font-weight: 600 | state bump — no role | unclear | RISK C. |
| admin/src/styles/design/session-topbar.css | 154 | `.session-topbar__exit` | font: inherit; font-size: var(--type-body-sm); font-weight: var(--type-weight-medium); line-height: 1 | .type-label (leading conflict) | control | RISK B. This is the only way out of a run lane and squares to 34px when tight; growing it must not break the icon-only state. |
| admin/src/styles/design/session-topbar.css | 215 | `.session-topbar__avatar` | font-size: var(--type-body-sm); font-weight: var(--type-weight-bold); line-height: 1 | .type-label-strong (weight + leading conflict) | glyph | RISK B, weight 700 -> 600, inside a 26px circle. Twin of .profile-badge__avatar and .fb-avatar — decide all three together. |
| admin/src/styles/design/session-topbar.css | 228 | `.session-topbar__email` | font-size: var(--type-body-sm) | .type-body-sm | chrome | Truncating email; inside a max-width: min(40vw,280px) chip so the measure is inert. |
| admin/src/styles/design/session-topbar.css | 287 | `.session-topbar__count (inside @media max-width: 767.98px)` | font-size: var(--type-body-sm); font-weight: 500 | .type-label — UNREACHABLE by grouping | unclear | RISK C. A role in type.css cannot reach a rule nested in a media query. Either the markup gains .type-label (and the media rule keeps only display/margin), or this declaration is a documented exception. |
| admin/src/styles/design/session-topbar.css | 49 | `.session-topbar__brand-word` | font-family: var(--type-family-display, inherit); font-weight: var(--type-weight-bold); font-size: var(--type-h4); letter-spacing: var(--type-tracking-tight) | PHASE 5 | heading | 18px display face; also a displayFaceBelow20 guard hit. Blocks zero for this file. |
| admin/src/styles/design/breadcrumb.css | 9 | `.crumbs` | font-size: var(--type-body-sm); line-height: 1.2 | .type-body-sm + .type-body--full | chrome | RISK B (mild). Leading 16.8 -> 20px raises the trail ~3px. It is a wrapping flex row, so it also needs --full. This file CAN reach zero declarations. |
| admin/src/styles/design/breadcrumb.css | 17 | `.crumb--link` | font: inherit; font-weight: var(--type-weight-medium) | .type-label | control | Dropping `font: inherit` for the role restores Inter's feature settings on the crumb buttons. |
| admin/src/styles/design/breadcrumb.css | 34 | `.crumb--current` | font-weight: var(--type-weight-semibold) | .type-label-strong | chrome | The current crumb. |
| admin/src/styles/row-menu.css | 32 | `.row-menu__item` | font: inherit; font-size: var(--type-body-sm) | .type-body-sm + .type-body--full | control | display: block; width: 100% inside a 160px-min menu. Needs --full. Code-split file, so it beats type.css — the declaration MUST be removed, not just overridden. |
| admin/src/styles/row-menu.css | 5 | `.row-menu-btn` | line-height: 0 | glyph — no role | glyph | RISK B. Blocks zero for this file. |
| admin/src/styles/design/notes-panel.css | 22 | `.ctx-segments` | font-size: var(--type-body-sm); line-height: 1.45 | .type-body-sm + .type-body--full | chrome | Sits in a 400px (320px at <=1280) rail; word-break: break-word. --full keeps the rail behaviour identical. |
| admin/src/styles/design/notes-panel.css | 29 | `.ctx-segments .is-strong` | font-weight: 600 | .type-label-strong | chrome | Second recipe for .is-strong (session-topbar.css:64 uses 500). Unifying them is a visible change in one of the two places — flag which. |
| admin/src/styles/design/notes-panel.css | 51 | `.notes-panel__empty` | font-size: var(--type-body-sm); line-height: 1.5 | .type-body-sm | prose | Empty-state chrome in the notes rail. |
| admin/src/styles/design/notes-panel.css | 61 | `.notes-panel__group-head` | font-size: var(--type-body-sm); letter-spacing: 0.06em; text-transform: uppercase; font-weight: 500 | .type-overline | heading | Eyebrow rival. Weight 500 -> 600 and tracking 0.06 -> 0.08em. One of the two 'small caps labels' Carl checks in test scenario 3. |
| admin/src/styles/design/notes-panel.css | 95 | `.notes-panel__ts` | font-variant-numeric: tabular-nums; font-size: var(--type-body-sm) | .type-body-sm + .num-tabular in markup | numeric | Only .type-metric carries tabular figures. Pair the role with base.css:46's .num-tabular in the markup rather than keeping the declaration. |
| admin/src/styles/design/notes-panel.css | 129 | `.notes-panel__delete` | font: inherit; font-size: var(--type-body-sm) | .type-body-sm | control | Underlined text button; no weight, so body-sm not label. |
| admin/src/styles/design/notes-panel.css | 154 | `.notes-panel__error` | font-size: var(--type-body-sm) | .type-body-sm | prose | Error line in the notes rail. |
| admin/src/styles/design/notes-panel.css | 168 | `.notes-panel__tab` | font: inherit; font-size: var(--type-body-sm) | .type-body-sm | control | Four rail tabs. No weight declared today; .is-active bumps to 600 (RISK C). |
| admin/src/styles/design/notes-panel.css | 181 | `.notes-panel__tab.is-active` | font-weight: 600 | state bump — no role | unclear | RISK C. |
| admin/src/styles/design/notes-panel.css | 200 | `.stage-io` | font-size: var(--type-body-sm) | .type-body-sm + .type-body--full | chrome | A flex: 1 scroll pane in the rail. |
| admin/src/styles/design/notes-panel.css | 208 | `.stage-io__empty, .stage-io__note` | font-size: var(--type-body-sm); line-height: 1.5 | .type-body-sm | prose | Empty-state chrome. |
| admin/src/styles/design/notes-panel.css | 216 | `.stage-io__label, .stage-io__block-title` | font-size: var(--type-body-sm); letter-spacing: 0.06em; text-transform: uppercase; font-weight: 500 | .type-overline | heading | Eyebrow rival named in the brief. Same recipe as .notes-panel__group-head; the two must land together or the rail shows two small-caps styles. |
| admin/src/styles/design/notes-panel.css | 230 | `.stage-io__pre` | font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); font-size: var(--type-body-sm); line-height: 1.5 | .type-code + .type-body--full | chrome | Mono stack S2 — the ONLY site with this fallback, and the fallback is dead because --font-mono is defined. It renders identically to S1 today. Gains Consolas on Windows. |
| admin/src/styles/design/notes-panel.css | 254 | `.stage-io__copy` | font: inherit; font-size: var(--type-body-sm) | .type-body-sm | control | Small copy button; 0.15rem vertical padding, so 20px leading grows it ~3px. |
| admin/src/styles/design/notes-panel.css | 269 | `.stage-io__details > .stage-io__summary` | font-size: var(--type-body-sm) | .type-body-sm | control | Child-combinator selector; groups fine. |
| admin/src/styles/design/notes-panel.css | 321 | `.notes-panel__toggle` | font-size: var(--type-body-sm); font-weight: 500 | .type-label | control | The off-canvas rail toggle. |
| admin/src/styles/design/notes-panel.css | 69 | `.notes-panel__item` | font-size: var(--type-body); line-height: 1.55 | PHASE 4 (16px prose) | prose | Blocks zero for this file. |
| admin/src/styles/design/notes-panel.css | 105 | `.notes-panel__edit, .notes-panel__compose textarea` | font: inherit; font-size: var(--type-body); line-height: 1.5 | PHASE 4 (16px input) | control | Blocks zero for this file. |
| admin/src/styles/design/notes-panel.css | 384 | `.modal__message` | font-size: var(--type-h4); font-weight: var(--type-weight-semibold); line-height: 1.4 | PHASE 5 (18px = .type-heading-sm) | heading | Blocks zero for this file. Also note .modal/.modal__message living in notes-panel.css is a filing error worth raising separately. |
| admin/src/styles/error-log.css | 18 | `.el-table th` | font-size: var(--type-body-sm, 14px); font-weight: var(--type-weight-semibold, 600) | .type-label-strong | chrome | Code-split sheet — the declaration must be deleted, not overridden. The `, 14px` fallback is one of 11 relativeFontSize guard hits in this file. |
| admin/src/styles/error-log.css | 36 | `.el-sub, .el-src` | font-size: var(--type-body-sm, 14px) | .type-body-sm | chrome | Row metadata under the message. |
| admin/src/styles/error-log.css | 37 | `.el-route` | font-family: var(--font-mono, ui-monospace, monospace); font-size: var(--type-body-sm, 14px) | .type-code | chrome | Mono stack S1. Face changes Courier New -> Consolas on Windows. This is exactly what test scenario 4 asks Carl to check. |
| admin/src/styles/error-log.css | 63 | `.el-control__label` | font-size: var(--type-body-sm, 14px); font-weight: var(--type-weight-medium, 500) | .type-label | chrome | Filter control label. |
| admin/src/styles/error-log.css | 65 | `.el-envnote` | font-size: var(--type-body-sm, 14px) | .type-body-sm | prose | The local-only explanatory note. |
| admin/src/styles/error-log.css | 68 | `.el-filter__n` | font-size: var(--type-body-sm, 14px) | .type-body-sm | numeric | Status count beside a filter tab. |
| admin/src/styles/error-log.css | 73 | `.el-detail__meta` | font-size: var(--type-body-sm, 14px) | .type-body-sm + .type-body--full | chrome | A wrapping flex row with gap 4px 20px; needs --full. |
| admin/src/styles/error-log.css | 74 | `.el-detail__meta b` | font-weight: var(--type-weight-medium, 500) | .type-label | chrome | Weight-only on <b>. |
| admin/src/styles/error-log.css | 75 | `.el-detail__meta code` | font-family: var(--font-mono, ui-monospace, monospace) | .type-code | chrome | Mono S1 with NO size — inherits 14px from .el-detail__meta, so .type-code is size-neutral here. Face changes only. |
| admin/src/styles/error-log.css | 76 | `.el-detail__msg` | font-size: var(--type-body-sm, 14px) | .type-body-sm | prose | The full error message in the opened row. |
| admin/src/styles/error-log.css | 77 | `.el-stack` | font-family: var(--font-mono, ui-monospace, monospace); font-size: var(--type-body-sm, 14px); line-height: 1.5 | .type-code + .type-body--full | chrome | A <pre> stack trace with max-height 260px and overflow auto. .type-code has no max-width so --full is belt-and-braces, but the leading tightens 21 -> 20px across a long trace. |
| admin/src/styles/error-log.css | 83 | `.el-ua` | font-size: var(--type-body-sm, 14px) | .type-body-sm | chrome | User-agent line. |
| admin/src/styles/error-log.css | 95 | `.el-pager__at` | font-size: var(--type-body-sm, 14px) | .type-body-sm | numeric | 'Page N of M'. white-space: nowrap, so the measure is inert. |
| admin/src/styles/error-log.css | 48 | `.el-anon` | font-style: italic | none — font-style has no role | unclear | Blocks zero for this file. See findings section 8. |
| admin/src/styles/design/run-log.css | 35 | `.run-log__id` | font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: var(--type-body-sm); max-width: 100% | .type-code | chrome | Mono S3 — byte-identical to --type-family-mono, so ZERO face change. Keep max-width: 100% (layout, not type). |
| admin/src/styles/design/run-log.css | 95 | `.run-log__block-label` | font-size: var(--type-body-sm); font-weight: 600; color: var(--color-ink) | .type-label-strong | chrome | phase-3.md:12 names this an eyebrow rival and routes it to overline. It is NOT one: no uppercase, no tracking. Its markup (run-debrief.js:84,90,174) is sentence case — 'CLI replay', 'Log on disk', 'Your notes'. Overline would shout them. |
| admin/src/styles/design/run-log.css | 101 | `.run-log__disclaimer` | font-size: var(--type-body-sm); line-height: 1.45 | .type-body-sm | prose | Explanatory line above the CLI block. |
| admin/src/styles/design/run-log.css | 107 | `.run-log__commands` | font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: var(--type-body-sm); line-height: 1.5 | .type-code + .type-body--full | chrome | Mono S3, no face change. A dark full-width code block; leading 21 -> 20px. |
| admin/src/styles/design/run-log.css | 120 | `.run-log__scenario-pill` | font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: var(--type-body-sm) | .type-code | chrome | Mono S3 pill; 0.15rem vertical padding, so the 20px leading grows it ~3px. |
| admin/src/styles/design/run-log.css | 130 | `.run-log__path` | font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: var(--type-body-sm) | .type-code + .type-body--full | control | display: block; width: 100%; word-break: break-all. Needs --full. |
| admin/src/styles/design/run-log.css | 147 | `.run-log__tree` | font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: var(--type-body-sm); line-height: 1.55 | .type-code | chrome | Mono S3. An ASCII tree relies on even leading; 21.7 -> 20px tightens it uniformly, which is fine, but eyeball it. |
| admin/src/styles/design/run-log.css | 154 | `.run-log__tree-line--stage` | font-weight: 500 | .type-label | chrome | A weight bump inside a mono block. .type-label would also change the family back to base — WRONG. Keep the weight declaration or add a mono-strong variant. Genuine conflict. |
| admin/src/styles/design/run-log.css | 173 | `.run-log__note-row` | font-size: var(--type-body-sm); line-height: 1.4 | .type-body-sm + .type-body--full | chrome | A three-column grid; the measure must not cap it. |
| admin/src/styles/design/run-log.css | 195 | `.run-log__note-stage` | font-size: var(--type-body-sm); font-weight: 500 | .type-label | chrome | A justify-self: start pill with 0.1rem padding; 20px leading grows it ~5px. |
| admin/src/styles/design/run-log.css | 220 | `.run-log__tip` | font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace | .type-code — CHANGES SIZE | unclear | Mono with NO font-size: it inherits 16px from body today. .type-code drops it to 14px. That breaks the phase's 'nothing changes size' promise. Either accept and record it, or add font-size: var(--type-body) here first and defer to Phase 4. |
| admin/src/styles/design/run-log.css | 76 | `.run-log__stat-value` | font-size: var(--type-h3); font-weight: 600; line-height: 1.2 | PHASE 5 (.type-metric or .type-heading-md) | numeric | Blocks zero for this file. 20px is on the ladder but this is a metric, which is a Phase 5 call. |
| admin/src/styles/design/buttons-inputs.css | 214 | `.script-alias` | font-family: var(--font-mono, ui-monospace, monospace) | .type-code | chrome | Mono S1, no size — inherits from .script-meta's parent (16px today, 14px once questioning.js:270's text-xs becomes text-sm). Sequence these two edits together or the alias changes size twice. |
| admin/src/styles/design/buttons-inputs.css | 301 | `.cmp-id__meta` | font-family: var(--font-mono, ui-monospace, monospace); font-size: var(--type-body-sm) | .type-code | chrome | Mono S1. Face change on the Compare screen. |
| admin/src/styles/design/buttons-inputs.css | 376 | `.fp-chip` | font-size: var(--type-body-sm); font-family: var(--font-mono, ui-monospace, monospace) | .type-code | chrome | Mono S1 code chip. base.css:130-135 deliberately excludes it from the chip recipe — keep it out. |
| admin/src/styles/design/buttons-inputs.css | 384 | `.fp-chip--label` | font-family: inherit | drop the mono, take .type-label | chrome | A deliberate opt-OUT of mono on a code-chip variant. Once .fp-chip takes .type-code this override still works, but it is a font-family outside the two files. |
| admin/src/styles/design/buttons-inputs.css | 280 | `.cmp-row__label` | font-size: var(--type-body-sm); font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase | .type-overline | heading | Eyebrow rival. Tracking 0.04 -> 0.08em. |
| admin/src/styles/design/buttons-inputs.css | 288 | `.cmp-cell` | font-size: var(--type-body-sm) | .type-body-sm + .type-body--full | chrome | A grid cell with min-width: 0; the measure would fight the track sizing. |
| admin/src/styles/design/buttons-inputs.css | 300 | `.cmp-id__headline` | font-weight: 600; font-size: var(--type-body-sm) | .type-label-strong | chrome |  |
| admin/src/styles/design/buttons-inputs.css | 308 | `.cmp-tag` | font-size: var(--type-body-sm); font-weight: 700 | .type-label-strong | glyph | An A/B identity mark in a 1.3rem circle, display: inline-grid + place-items: center. Weight 700 -> 600 and 20px leading in a 20.8px box — measure before committing. |
| admin/src/styles/design/buttons-inputs.css | 336 | `.cmp-axis__label` | font-size: var(--type-body-sm); font-weight: 500 | .type-label | chrome |  |
| admin/src/styles/design/buttons-inputs.css | 346 | `.cmp-axis__read` | font-size: var(--type-body-sm); font-variant-numeric: tabular-nums | .type-body-sm + .num-tabular | numeric | Tabular figures must move to the .num-tabular class in markup. |
| admin/src/styles/design/buttons-inputs.css | 324 | `.cmp-legend` | font-size: var(--type-body-sm) | .type-body-sm + .type-body--full | chrome | A flex legend row. |
| admin/src/styles/design/buttons-inputs.css | 359 | `.cmp-input` | font: inherit; font-size: var(--type-body-sm) | .type-body-sm + .type-body--full | control | width: 100% input; base.css:33 would push it to 16px if the rule is stripped without grouping. |
| admin/src/styles/design/buttons-inputs.css | 182 | `.bench-flow__tag` | font-size: var(--type-body-sm); font-weight: 500; letter-spacing: 0.02em | .type-label | chrome | Already carries tracking 0.02em — an exact .type-label match. |
| admin/src/styles/design/buttons-inputs.css | 196 | `.bench-flow__meta` | font-size: var(--type-body-sm); line-height: 1.35 | .type-body-sm | chrome |  |
| admin/src/styles/design/buttons-inputs.css | 261 | `.cmp-warn` | font-size: var(--type-body-sm) | .type-body-sm | prose |  |
| admin/src/styles/design/buttons-inputs.css | 358 | `.cmp-act-col__name` | font-weight: 600; font-size: var(--type-body-sm) | .type-label-strong | chrome |  |
| admin/src/styles/design/buttons-inputs.css | 394 | `.cmp-verdict` | font-size: var(--type-body-sm) | .type-body-sm | chrome |  |
| admin/src/styles/design/buttons-inputs.css | 401 | `.cmp-verdict-issue` | font-size: var(--type-body-sm) | .type-body-sm | chrome |  |
| admin/src/styles/design/buttons-inputs.css | 411 | `.cmp-verdict-edit .js-verdict` | font-size: var(--type-body-sm) | .type-body-sm | control | A js- hook in a selector; grouping a js- class into a role is against house style. Prefer renaming or leaving. |
| admin/src/styles/design/buttons-inputs.css | 416 | `.cmp-q` | font-weight: 600; font-size: var(--type-body-sm) | .type-label-strong | chrome |  |
| admin/src/styles/design/buttons-inputs.css | 417 | `.cmp-a` | font-size: var(--type-body-sm) | .type-body-sm | prose |  |
| admin/src/styles/design/buttons-inputs.css | 420 | `.cmp-fix-out` | font-size: var(--type-body-sm) | .type-body-sm + .type-body--full | chrome | white-space: pre-wrap output block. |
| admin/src/styles/design/buttons-inputs.css | 491 | `.meeting-card__badge` | font-size: var(--type-body-sm); font-weight: 500 | .type-label | chrome |  |
| admin/src/styles/design/buttons-inputs.css | 501 | `.meeting-card__meta` | font-size: var(--type-body-sm) | .type-body-sm | chrome |  |
| admin/src/styles/design/buttons-inputs.css | 514 | `.suggest-row` | font-size: var(--type-body-sm); line-height: 1.45 | .type-body-sm + .type-body--full | control | display: block; width: 100% dev-aid button. |
| admin/src/styles/design/buttons-inputs.css | 397 | `.cmp-verdict-tag` | text-transform: uppercase; letter-spacing: 0.03em | chip recipe + local caps (or promote to overline) | unclear | It takes 14/500 from the base.css:136 chip group and only adds caps here. Overline would push it to 600/0.08em. Decide alongside .brutal__badge and .cl-tag. |
| admin/src/styles/design/briefing.css | 247 | `.brutal__eyebrow` | font-size: var(--type-body-sm); font-weight: 500; color: var(--color-ink-dim) | .type-label | chrome | phase-3.md:12 routes this to overline. It is NOT an eyebrow recipe: no uppercase, no tracking. Also declared a second time at stage-extras.css:54 (layout only) — two sheets, one class. |
| admin/src/styles/design/briefing.css | 123 | `.copy-snippet-btn__label` | font-size: var(--type-body-sm) | .type-body-sm | control | Also asserted in skeleton-presets.test.ts:237 as a ghost class — keep the two in step. |
| admin/src/styles/design/briefing.css | 204 | `.field-live-label__text` | font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold) | .type-label-strong | chrome | 'What Ming said' above the answer box. Asserted at skeleton-presets.test.ts:239. |
| admin/src/styles/design/briefing.css | 213 | `.question-source-answer` | font-size: var(--type-body-sm); line-height: 1.5 | .type-body-sm | prose | The quoted previous answer beside a thread-follow. |
| admin/src/styles/design/briefing.css | 82 | `.bullet__mark` | font-size: var(--type-body-sm); line-height: inherit | .type-body-sm (leading conflict) | glyph | P0 fixed this from 0.65em to the 14px token. line-height: inherit deliberately matches the 1.55 of the bullet it marks; a role's 20px would desync the mark from its line. |
| admin/src/styles/design/briefing.css | 286 | `.action-when` | font-size: var(--type-body-sm); font-weight: 500; text-transform: lowercase | .type-label + local transform | unclear | text-transform: lowercase is content-shaping; no role carries it. |
| admin/src/styles/design/briefing.css | 156 | `.question-session-notes` | font-size: var(--type-body-sm); font-style: italic; line-height: 1.45; max-width: 64ch | .type-body-sm (+ keep font-style) | prose | Its own 64ch measure would be replaced by the role's 38rem — narrower. A deliberate call, not a mechanical one. |
| admin/src/styles/design/start-stage.css | 78 | `.run-list__grouphead` | font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold); letter-spacing: 0.04em; text-transform: uppercase | .type-overline | heading | Eyebrow rival named in the brief. Tracking 0.04 -> 0.08em. Visible on Past 1:1s. |
| admin/src/styles/design/start-stage.css | 261 | `.start-point__label` | font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold); letter-spacing: var(--type-tracking-wide); text-transform: uppercase | .type-overline | heading | Eyebrow rival. Tracking 0.02 -> 0.08em — a 4x widen, same as the nav group label. |
| admin/src/styles/design/start-stage.css | 41 | `.run-list__avatar` | font-size: var(--type-body-sm) | .type-body-sm | glyph | Initials in a circle; no line-height declared so it already inherits 1.55. Safe. |
| admin/src/styles/design/start-stage.css | 53 | `.run-list__name` | font-weight: var(--type-weight-semibold) | .type-label-strong | chrome | Inherits 16px from body today. Taking .type-label-strong drops it to 14px — A SIZE CHANGE. Verify against the mockup; may belong to Phase 4. |
| admin/src/styles/design/start-stage.css | 61 | `.run-list__sub` | font-size: var(--type-body-sm) | .type-body-sm | chrome | 'Weekly check-in · 2 days ago'. |
| admin/src/styles/design/start-stage.css | 87 | `.run-list__empty` | font-size: var(--type-body-sm) | .type-body-sm | chrome | Empty-state chrome for the toolbar search. |
| admin/src/styles/design/start-stage.css | 104 | `.run-list__status` | font-size: var(--type-body-sm); font-weight: var(--type-weight-medium) | .type-label | chrome |  |
| admin/src/styles/design/start-stage.css | 117 | `.run-list__example` | font-size: var(--type-body-sm); font-weight: var(--type-weight-medium) | .type-label | chrome |  |
| admin/src/styles/design/start-stage.css | 129 | `.start-seeall` | font: inherit; font-size: var(--type-body-sm); font-weight: var(--type-weight-medium) | .type-label | control |  |
| admin/src/styles/design/start-stage.css | 213 | `.start-brief__who` | font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold) | .type-label-strong | chrome |  |
| admin/src/styles/design/start-stage.css | 220 | `.start-brief__tag` | font-size: var(--type-body-sm); font-weight: var(--type-weight-medium) | .type-label | chrome |  |
| admin/src/styles/design/start-stage.css | 244 | `.start-point__n` | font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold) | .type-label-strong | numeric |  |
| admin/src/styles/design/start-stage.css | 278 | `.start-welcome__after` | font-size: var(--type-body-sm); line-height: var(--type-leading-normal); max-width: var(--measure); text-wrap: pretty | .type-body-sm | prose | Already declares the exact measure and text-wrap the role carries. A clean, zero-change grouping. |
| admin/src/styles/design/start-stage.css | 297 | `.start-quiet__link` | font: inherit; font-size: var(--type-body-sm); font-weight: var(--type-weight-medium) | .type-label | control |  |
| admin/src/styles/design/start-stage.css | 338 | `.btn--sm` | font-size: var(--type-body-sm) | .type-body-sm | control | A button size variant living in start-stage.css rather than buttons-inputs.css. Filing oddity worth noting. |
| admin/src/styles/design/start-stage.css | 388 | `.session-topbar__stages` | font-size: var(--type-body-sm) | .type-body-sm + .type-body--full | chrome | A THIRD file styling session-topbar classes (base.css:344 and session-topbar.css:73 are the others). Consolidate or the stepper keeps three owners. |
| admin/src/styles/design/start-stage.css | 446 | `.intake-or` | font-size: var(--type-body-sm) | .type-body-sm | chrome |  |
| admin/src/styles/design/start-stage.css | 485 | `.intake-firstrun__n` | font-size: var(--type-body-sm); font-weight: var(--type-weight-medium) | .type-label | numeric |  |
| admin/src/styles/design/start-stage.css | 557 | `.lex-row__num` | font-variant-numeric: tabular-nums; font-weight: 600 | .type-label-strong + .num-tabular | numeric | Inherits 16px today; the role drops it to 14px. Check against lexicon-review.js:109's markup. |
| admin/src/styles/design/start-stage.css | 563 | `.lex-row__phrase` | font-weight: 500; line-height: 1.45 | PHASE 4 (16px prose) | prose | Inherits 16px; leave it there. |
| admin/src/styles/design/stage-extras.css | 5 | `.pill` | font-size: var(--type-body-sm); font-weight: var(--type-weight-medium) | .type-label | control | base.css:130-135 deliberately keeps .pill OUT of the chip recipe because it is a tap target. It can still take .type-label (size/weight only). |
| admin/src/styles/design/stage-extras.css | 35 | `.prep-timeline__num` | font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold); font-variant-numeric: tabular-nums | .type-label-strong + .num-tabular | numeric |  |
| admin/src/styles/design/stage-extras.css | 44 | `.prep-timeline__when` | font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold) | .type-label-strong | chrome | A timestamp. |
| admin/src/styles/design/stage-extras.css | 55 | `.brutal__badge` | font-size: var(--type-body-sm, 0.875rem); font-weight: var(--type-weight-semibold); letter-spacing: 0.02em; text-transform: uppercase | .type-overline (or keep as a badge) | unclear | Uppercase but it is a pill, not an eyebrow. Also the only relativeFontSize hit in this file. Decide with .cl-tag and .cmp-verdict-tag. |
| admin/src/styles/design/stage-extras.css | 176 | `.cl-tag` | font-size: var(--type-body-sm); letter-spacing: 0.04em; text-transform: uppercase | .type-overline (or keep as a badge) | unclear | No weight declared today (renders 400). Overline takes it to 600. |
| admin/src/styles/design/stage-extras.css | 227 | `.cl-kick__preview pre` | font-family: var(--font-mono, ui-monospace, monospace); font-size: var(--type-body-sm); line-height: 1.5 | .type-code + .type-body--full | chrome | Mono S1. Face change on the changelog kick preview. |
| admin/src/styles/design/stage-extras.css | 67 | `.brutal__note` | font-size: var(--type-body-sm); font-style: italic | .type-body-sm (+ keep font-style) | prose |  |
| admin/src/styles/design/stage-extras.css | 76 | `.cl-overall__pct` | font-variant-numeric: tabular-nums; font-weight: var(--type-weight-semibold); font-size: var(--type-body-sm) | .type-label-strong + .num-tabular | numeric |  |
| admin/src/styles/design/stage-extras.css | 138 | `.cl-phase-tag` | font-weight: 400; font-size: var(--type-body-sm) | .type-body-sm | chrome | Explicit weight 400 — an unambiguous body-sm. |
| admin/src/styles/design/stage-extras.css | 139 | `.cl-goal` | font-size: var(--type-body-sm) | .type-body-sm | prose |  |
| admin/src/styles/design/stage-extras.css | 142 | `.cl-count` | font-size: var(--type-body-sm); font-variant-numeric: tabular-nums | .type-body-sm + .num-tabular | numeric |  |
| admin/src/styles/design/stage-extras.css | 159 | `.cl-means` | font-size: var(--type-body-sm) | .type-body-sm | prose |  |
| admin/src/styles/design/stage-extras.css | 161 | `.cl-meta div` | font-size: var(--type-body-sm) | .type-body-sm | chrome | An element-descendant selector; groups fine but is broad. |
| admin/src/styles/design/stage-extras.css | 165 | `.cl-step-no` | font-size: var(--type-body-sm); font-variant-numeric: tabular-nums | .type-body-sm + .num-tabular | numeric |  |
| admin/src/styles/design/stage-extras.css | 210 | `.cl-kick__lede` | font-size: var(--type-body-sm) | .type-body-sm | prose |  |
| admin/src/styles/design/stage-extras.css | 212 | `.cl-kick__saved` | font-size: var(--type-body-sm) | .type-body-sm | chrome |  |
| admin/src/styles/design/stage-extras.css | 219 | `.cl-kick__preview` | font-size: var(--type-body-sm) | .type-body-sm + .type-body--full | chrome |  |
| admin/src/styles/design/stage-extras.css | 268 | `.focus-point__num` | font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold); font-variant-numeric: tabular-nums | .type-label-strong + .num-tabular | numeric | Ghosted by skeleton-presets.ts's focusPoints preset — keep the class list in step. |
| admin/src/styles/design/stage-extras.css | 291 | `.focus-point__reason` | font-size: var(--type-body-sm); line-height: 1.5 | .type-body-sm | prose |  |
| admin/src/styles/design/stage-extras.css | 292 | `.focus-point__evidence` | font-size: var(--type-body-sm) | .type-body-sm | prose |  |
| admin/src/styles/design/stage-extras.css | 346 | `.focus-select-hint` | font-size: var(--type-body-sm) | .type-body-sm | prose |  |
| admin/src/styles/design/promise-agree.css | 159 | `.agreed-owner-label` | font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold); letter-spacing: var(--type-tracking-caps); text-transform: uppercase | .type-overline | heading | Eyebrow rival. Tracking 0.06 -> 0.08em. |
| admin/src/styles/design/promise-agree.css | 9 | `.pa-hint` | font-size: var(--type-body-sm) | .type-body-sm | prose |  |
| admin/src/styles/design/promise-agree.css | 27 | `.pa-av` | font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold) | .type-label-strong | glyph | An avatar initial; check for a fixed-size box before applying the 20px leading. |
| admin/src/styles/design/promise-agree.css | 77 | `.pa-who` | font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold) | .type-label-strong | chrome |  |
| admin/src/styles/design/promise-agree.css | 79 | `.pa-who--them` | font-weight: var(--type-weight-medium) | .type-label | chrome | A weight-only variant of a role'd base. Two roles on one element by modifier — needs the same call as the state bumps. |
| admin/src/styles/design/promise-agree.css | 80 | `.pa-when` | font-size: var(--type-body-sm) | .type-body-sm | chrome | A timestamp. |
| admin/src/styles/design/promise-agree.css | 109 | `.pa-add` | font: inherit; font-size: var(--type-body-sm); font-weight: var(--type-weight-medium) | .type-label | control |  |
| admin/src/styles/design/promise-agree.css | 139 | `.pa-cap` | font-size: var(--type-body-sm) | .type-body-sm | chrome |  |
| admin/src/styles/design/promise-agree.css | 140 | `.pa-empty` | font-size: var(--type-body-sm); font-style: italic | .type-body-sm (+ keep font-style) | chrome | Empty-state chrome. |
| admin/src/styles/design/promise-agree.css | 149 | `.pa-loopnote` | font-size: var(--type-body-sm) | .type-body-sm | prose |  |
| admin/src/styles/design/promise-agree.css | 169 | `.agreed-note` | font-size: var(--type-body-sm) | .type-body-sm | prose |  |
| admin/src/styles/design/promise-agree.css | 123 | `.pa-add__plus` | font-size: var(--type-h4); line-height: 1 | PHASE 5 glyph | glyph | 18px '+' with line-height 1. RISK B. |
| admin/src/styles/design/promise-checkin.css | 28 | `.pck-when` | font-size: var(--type-body-sm) | .type-body-sm | chrome | A timestamp. |
| admin/src/styles/design/promise-checkin.css | 37 | `.pck-tap` | font: inherit; font-size: var(--type-body-sm) | .type-body-sm | control |  |
| admin/src/styles/design/promise-checkin.css | 27 | `.pck-action` | font-weight: var(--type-weight-semibold) | .type-label-strong | chrome | Inherits 16px today; the role drops it to 14px. Verify. |
| admin/src/styles/design/promise-checkin.css | 48 | `.pck-tap.is-active` | font-weight: var(--type-weight-semibold) | state bump — no role | unclear | RISK C. |
| admin/src/styles/design/stage-review.css | 48 | `.stage-review__tab` | font: inherit; font-size: var(--type-body-sm) | .type-body-sm | control |  |
| admin/src/styles/design/stage-review.css | 69 | `.stage-review__close` | font: inherit; font-size: var(--type-body-sm); line-height: 1 | .type-body-sm (leading conflict) | glyph | RISK B. |
| admin/src/styles/design/stage-review.css | 108 | `.stage-review__facts dt` | font-size: var(--type-body-sm) | .type-body-sm | chrome |  |
| admin/src/styles/design/stage-review.css | 121 | `.stage-review__num` | font-size: var(--type-body-sm); font-weight: 600 | .type-label-strong | numeric |  |
| admin/src/styles/design/stage-review.css | 134 | `.stage-review__row-sub` | font-size: var(--type-body-sm); line-height: 1.5 | .type-body-sm | chrome |  |
| admin/src/styles/design/stage-review.css | 169 | `.run-row__review` | font-size: var(--type-body-sm) | .type-body-sm | chrome |  |
| admin/src/styles/design/stage-review.css | 184 | `.rv-status` | font-size: var(--type-body-sm) | .type-body-sm | chrome |  |
| admin/src/styles/design/stage-review.css | 208 | `.rv-row__label` | font-size: var(--type-body-sm) | .type-body-sm | chrome | No weight — despite the name it is body-sm, not label. |
| admin/src/styles/design/stage-review.css | 209 | `.rv-row__hint` | font-size: var(--type-body-sm) | .type-body-sm | prose |  |
| admin/src/styles/design/stage-review.css | 215 | `.rv-note` | font-size: var(--type-body-sm); line-height: 1.45 | .type-body-sm | prose |  |
| admin/src/styles/design/stage-review.css | 226 | `.rv-keys` | font-size: var(--type-body-sm) | .type-body-sm | chrome | Keyboard-shortcut hint row. |
| admin/src/styles/design/stage-review.css | 244 | `.rv-ov__btn` | font: inherit; font-size: var(--type-body-sm) | .type-body-sm | control |  |
| admin/src/styles/design/about-stage.css | 76 | `.about-cap span` | font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold); letter-spacing: var(--type-tracking-wider); text-transform: uppercase | .type-overline | heading | Eyebrow rival. Tracking 0.04 -> 0.08em. |
| admin/src/styles/design/about-stage.css | 25 | `.about-hero__hint` | font-size: var(--type-body-sm) | .type-body-sm | prose |  |
| admin/src/styles/design/about-stage.css | 46 | `.about-sec__sub` | font-size: var(--type-body-sm); max-width: var(--measure) | .type-body-sm | prose | Already carries the exact measure — zero-change grouping. |
| admin/src/styles/design/about-stage.css | 116 | `.about-how__you` | font-size: var(--type-body-sm); line-height: var(--type-leading-normal) | .type-body-sm | prose |  |
| admin/src/styles/design/about-stage.css | 122 | `.about-how__you b` | font-weight: var(--type-weight-semibold) | .type-label-strong | chrome | Weight-only on <b>. |
| admin/src/styles/design/about-stage.css | 126 | `.about-chip` | font-size: var(--type-body-sm); font-weight: var(--type-weight-medium) | .type-label | chrome |  |
| admin/src/styles/design/about-stage.css | 169 | `.about-step__n` | font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold); font-variant-numeric: tabular-nums | .type-label-strong + .num-tabular | numeric |  |
| admin/src/styles/design/about-stage.css | 184 | `.about-alpha` | font-size: var(--type-body-sm) | .type-body-sm | prose |  |
| admin/src/styles/design/about-stage.css | 237 | `.about-duo__body` | font-size: var(--type-body-sm); line-height: var(--type-leading-normal) | .type-body-sm | prose |  |
| admin/src/styles/design/axes.css | 16 | `.axis__label` | font-size: var(--type-body-sm); font-weight: 600 | .type-label-strong | chrome | axes.css is already modified in the working tree (git status M) — rebase carefully. |
| admin/src/styles/design/axes.css | 65 | `.axis__thumb` | font-size: var(--type-body-sm); font-weight: 700; font-variant-numeric: tabular-nums | .type-label-strong + .num-tabular | glyph | Weight 700 -> 600 inside a 24px-high chip centred with display: grid. type.css:181 already groups its runner twin .coach-meter__thumb into .type-label-strong, so this matches P2's precedent exactly. |
| admin/src/styles/design/axes.css | 97 | `.axis__value--baseline` | font-weight: 500; font-size: var(--type-body-sm) | .type-label | numeric |  |
| admin/src/styles/design/axes.css | 102 | `.axis__delta` | font-size: var(--type-body-sm); line-height: 1.2; font-variant-numeric: tabular-nums | .type-label-strong (leading conflict) + .num-tabular | glyph | RISK B (mild). A 0.05rem-padded pill; 16.8 -> 20px leading grows it ~3px. type.css:181 puts its runner twin .coach-row__delta on label-strong. |
| admin/src/styles/design/axes.css | 116 | `.axis__caret` | font-weight: 700; font-size: var(--type-body-sm) | .type-label-strong | glyph | An absolutely-positioned caret with transform: translateY(-50%); leading change is harmless. |
| admin/src/styles/design/axes.css | 126 | `.axis__offscale` | font-size: var(--type-body-sm) | .type-body-sm | chrome |  |
| admin/src/styles/design/axes.css | 89 | `.axis__value` | font-variant-numeric: tabular-nums; font-weight: 600 | .type-label-strong | numeric | Inherits 16px today; the role drops it to 14px against its --baseline sibling which is already 14px. Check the pair renders as one. |
| admin/src/styles/design/shared-components.css | 67 | `.ds-tab` | font: inherit; font-size: var(--type-body-sm); font-weight: var(--type-weight-medium) | .type-label | control |  |
| admin/src/styles/design/shared-components.css | 50 | `.ds-avatar` | font-weight: var(--type-weight-semibold) | .type-label-strong | glyph | Asserted as a ghost class at skeleton-presets.test.ts:214. Inherits 16px today; the role would drop it to 14px inside the avatar circle. |
| admin/src/styles/design/shared-components.css | 88 | `.ds-btn-quiet` | font: inherit; font-weight: var(--type-weight-medium) | .type-label | control | Inherits 16px; the role drops it to 14px. Verify against the quiet-button spec. |
| admin/src/styles/design/flow-kit.css | 21 | `.wizard-footer__note` | font-size: var(--type-body-sm) | .type-body-sm | chrome | Only type declaration in the file — it can reach zero. |
| admin/src/styles/design/save-pip.css | 6 | `.save-pip` | font-size: var(--type-body-sm) | .type-body-sm | chrome | Only type declaration in the file — it can reach zero. |
| admin/src/styles/design/persona-bench.css | 40 | `.bench-turn__who` | font-size: var(--type-body-sm) | .type-body-sm | chrome |  |
| admin/src/styles/design/persona-bench.css | 41 | `.bench-turn__text` | font-size: var(--type-body-sm); line-height: 1.5 | .type-body-sm | prose |  |
| admin/src/styles/design/persona-bench.css | 45 | `.bench-status--good` | font-weight: var(--type-weight-medium) | .type-label | chrome | File can reach zero with these three. |
| admin/src/styles/design/member-runs.css | 57 | `.member-runs__when` | font-size: 0.875rem | .type-body-sm | chrome | A raw 0.875rem literal — one of the two literalFontSize hits Phase 3 can clear (guard reports it at line 59). |
| admin/src/styles/design/member-runs.css | 62 | `.member-runs__meta` | font-size: 0.875rem | .type-body-sm | chrome | The second 0.875rem literal (guard line 66). |
| admin/src/styles/design/member-runs.css | 53 | `.member-runs__type` | font-weight: 600 | .type-label-strong | chrome | Inherits 16px; the role drops it to 14px, matching its __when sibling on the same baseline row. Probably desirable — confirm. |
| admin/src/styles/design/run-detail.css | 27 | `.rd-type-badge` | font-size: var(--type-body-sm); font-weight: var(--type-weight-medium) | .type-label | chrome |  |
| admin/src/styles/design/run-detail.css | 40 | `.rd-tab__n` | font-size: var(--type-body-sm, 14px) | .type-body-sm | numeric | Status count on a tab; the only relativeFontSize hit in this file. |
| admin/src/styles/design/run-detail.css | 51 | `.rd-when > span` | font-size: var(--type-body-sm) | .type-body-sm | chrome | A timestamp. |
| admin/src/styles/design/run-detail.css | 77 | `.rd-turn__q` | font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold) | .type-label-strong | chrome | phase-4.md:13 lists run-detail.css among the question stem's other homes — coordinate so this is not moved twice. |
| admin/src/styles/design/run-detail.css | 90 | `.rd-turn__a` | font-size: var(--type-body-sm) | PHASE 4 (reading text) | prose | The answer body. phase-4.md owns the reading surfaces; leave it. |
| admin/src/styles/design/test-engine.css | 86 | `.joblex-group` | font-size: var(--type-body-sm); font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase | .type-overline | heading | Eyebrow rival named in the brief. Tracking 0.04 -> 0.08em. |
| admin/src/styles/design/test-engine.css | 254 | `.guide-ref code` | font-family: var(--font-mono, ui-monospace, monospace); font-size: var(--type-body-sm) | .type-code | chrome | Mono S1; face change. |
| admin/src/styles/design/test-engine.css | 288 | `.guide-step__files` | font-family: var(--font-mono, ui-monospace, monospace); font-size: var(--type-body-sm) | .type-code | chrome | Mono S1; face change. |
| admin/src/styles/design/test-engine.css | 7 | `.run-step__dot` | font-size: var(--type-body-sm); font-weight: 700; line-height: 1 | .type-label-strong (leading conflict) | glyph | RISK B and weight 700 -> 600. |
| admin/src/styles/design/test-engine.css | 15 | `.run-step__label` | font-size: var(--type-body-sm, 14px) | .type-body-sm | chrome | The only relativeFontSize hit in this file. |
| admin/src/styles/design/test-engine.css | 124 | `.joblex-yours` | font-size: var(--type-body-sm); font-weight: 600 | .type-label-strong | chrome |  |
| admin/src/styles/design/test-engine.css | 146 | `.joblex-error` | font-size: var(--type-body-sm) | .type-body-sm | prose |  |
| admin/src/styles/design/test-engine.css | 168 | `.joblex-hidden__head` | font-size: var(--type-body-sm); font-weight: 600 | .type-label-strong | chrome |  |
| admin/src/styles/design/test-engine.css | 177 | `.joblex-restore` | font-size: var(--type-body-sm); font-weight: 600 | .type-label-strong | control |  |
| admin/src/styles/design/test-engine.css | 222 | `.guide-toc__status` | font-size: var(--type-body-sm) | .type-body-sm | chrome |  |
| admin/src/styles/design/test-engine.css | 227 | `.guide-toc a` | font-size: var(--type-body-sm) | .type-body-sm | control |  |
| admin/src/styles/design/test-engine.css | 242 | `.guide-ref` | font-size: var(--type-body-sm) | .type-body-sm | prose |  |
| admin/src/styles/design/test-engine.css | 274 | `.guide-step__n` | font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold) | .type-label-strong | numeric |  |
| admin/src/styles/design/test-engine.css | 287 | `.guide-step__body p` | font-size: var(--type-body-sm) | .type-body-sm | prose |  |
| admin/src/styles/design/test-engine.css | 295 | `.guide-gaps li` | font-size: var(--type-body-sm) | .type-body-sm | prose |  |
| admin/src/styles/design/design-stage.css | 109 | `.ds-rulesgrid code` | font-family: var(--font-mono); font-size: var(--type-body-sm) | .type-code | chrome | The ONLY bare var(--font-mono) with no fallback. Face change on the internal Design screen. |
| admin/src/styles/design/design-stage.css | 51 | `.ds-rail__link` | font-size: var(--type-body-sm); font-weight: var(--type-weight-medium) | .type-label | control | Internal Design-system screen; low customer risk but it is the screen Carl reads the system off, so it must be right. |
| admin/src/styles/design/design-stage.css | 130 | `.ds-swatch__name` | font-size: var(--type-body-sm); font-weight: var(--type-weight-medium) | .type-label | chrome |  |
| admin/src/styles/design/design-stage.css | 135 | `.ds-swatch__meta` | font-size: var(--type-body-sm) | .type-body-sm | chrome |  |
| admin/src/styles/design/design-stage.css | 162 | `.ds-ramp__name` | font-size: var(--type-body-sm); font-weight: var(--type-weight-medium) | .type-label | chrome |  |
| admin/src/styles/design/design-stage.css | 177 | `.ds-ramp__step` | font-size: var(--type-body-sm) | .type-body-sm | chrome |  |
| admin/src/styles/design/design-stage.css | 203 | `.ds-link` | font: inherit; font-size: var(--type-body-sm); font-weight: var(--type-weight-medium) | .type-label | control |  |
| admin/src/styles/design/design-stage.css | 263 | `.ds-tag` | font-size: var(--type-body-sm); font-weight: var(--type-weight-medium) | .type-label | chrome |  |
| admin/src/styles/design/design-stage.css | 272 | `.ds-scorepill` | font-size: var(--type-body-sm); font-weight: var(--type-weight-medium) | .type-label | chrome |  |
| admin/src/styles/design/design-stage.css | 287 | `.ds-count` | font-size: var(--type-body-sm); font-weight: var(--type-weight-medium) | .type-label | numeric |  |
| admin/src/styles/design/design-stage.css | 322 | `.ds-input` | font-size: var(--type-body-sm) | .type-body-sm + .type-body--full | control | base.css:33 would push it to 16px if stripped without grouping. |
| admin/src/styles/design/design-stage.css | 472 | `.ds-crumb` | font-size: var(--type-body-sm); font-weight: var(--type-weight-medium) | .type-label | chrome | A second breadcrumb build alongside breadcrumb.css — worth flagging as duplication. |
| admin/src/styles/design/design-stage.css | 483 | `.ds-crumb__now` | font-weight: var(--type-weight-semibold) | .type-label-strong | chrome |  |
| admin/src/styles/design/design-stage.css | 566 | `.ds-goalcard` | font-size: var(--type-body-sm) | .type-body-sm | chrome |  |
| admin/src/styles/design/design-stage.css | 577 | `.ds-legend` | font-size: var(--type-body-sm) | .type-body-sm | chrome |  |
| admin/src/styles/design/design-stage.css | 642 | `.ds-menu__item` | font: inherit; font-size: var(--type-body-sm) | .type-body-sm + .type-body--full | control |  |
| admin/src/styles/design/design-stage.css | 838 | `.ds-tooltip` | font-size: var(--type-body-sm) | .type-body-sm | chrome | The only tooltip recipe in the repo. |
| admin/src/styles/design/design-stage.css | 877 | `.ds-checklist` | font-size: var(--type-body-sm) | .type-body-sm | chrome |  |
| admin/src/styles/error-log.css | 63 | `.el-control__label (duplicate row guard)` | font-size: var(--type-body-sm, 14px); font-weight: var(--type-weight-medium, 500) | .type-label | chrome | Listed once above; repeated here only to note the `, 500` fallback also clears a guard hit when removed. |
| admin/src/styles/feedback-inbox.css | 28 | `.fb-preview` | font-size: var(--type-body-sm, 14px) | .type-body-sm + .type-body--full | chrome | Lane now CLEAR — session 080b9104 is no longer on LANES.md. Truncating one-line preview needs --full. |
| admin/src/styles/feedback-inbox.css | 41 | `.fb-tab__n` | font-size: var(--type-body-sm, 14px) | .type-body-sm | numeric | Status count beside a tab. |
| admin/src/styles/feedback-inbox.css | 44 | `.fb-avatar` | font-size: var(--type-body-sm, 15px); font-weight: var(--type-weight-bold, 700); line-height: 1 | .type-label-strong (leading conflict) | glyph | RISK B. Note the fallback says 15px while the token is 14px — a latent inconsistency that disappears with the role. Third avatar in the trio. |
| admin/src/styles/feedback-inbox.css | 68 | `.fb-name` | font-weight: var(--type-weight-medium, 500) | .type-label | chrome | Inherits 16px; the role drops it to 14px next to .fb-company which is already 14px. |
| admin/src/styles/feedback-inbox.css | 69 | `.fb-company` | font-size: var(--type-body-sm, 14px) | .type-body-sm | chrome |  |
| admin/src/styles/feedback-inbox.css | 71 | `.fb-time` | font-size: var(--type-body-sm, 14px); font-variant-numeric: tabular-nums | .type-body-sm + .num-tabular | numeric | A timestamp. |
| admin/src/styles/feedback-inbox.css | 83 | `.fb-who__mail` | font-size: var(--type-body-sm, 14px) | .type-body-sm + .type-body--full | chrome | flex: 0 1 auto with ellipsis; needs --full. |
| admin/src/styles/feedback-inbox.css | 94 | `.fb-copy` | font: inherit; font-size: var(--type-body-sm, 14px); font-weight: var(--type-weight-medium, 500); line-height: 1.3 | .type-label | control | 3px vertical padding; leading 18.2 -> 20px grows the button ~2px. |
| admin/src/styles/feedback-inbox.css | 121 | `.fb-note` | font-size: var(--type-body-sm, 14px); line-height: 1.55 | .type-body-sm + .type-body--full | prose | white-space: pre-wrap tester note; --full keeps it filling the card. |
| admin/src/styles/feedback-inbox.css | 137 | `.fb-pill--src` | font-family: var(--font-mono, ui-monospace, monospace) | .type-code | chrome | Mono S1 with no size — it takes 14/500 from the chip group. .type-code would also drop the weight to 400. Needs a call. |
| admin/src/styles/meeting-arcs.css | 20 | `.arc-sec` | font-size:var(--type-body-sm); font-weight:600; letter-spacing:.04em; text-transform:uppercase | .type-overline | heading | Eyebrow rival named in the brief. Tracking .04 -> .08em. |
| admin/src/styles/meeting-arcs.css | 49 | `.arc-field > span` | font-size:var(--type-body-sm); font-weight:600; letter-spacing:.03em; text-transform:uppercase | .type-overline | heading | Sibling eyebrow rival in the same file at a THIRD tracking value (.03em). The two must land together. |
| admin/src/styles/meeting-arcs.css | 11 | `.arc-card__meta` | font-size: var(--type-body-sm) | .type-body-sm | chrome |  |
| admin/src/styles/meeting-arcs.css | 12 | `.arc-edited` | font-size: var(--type-body-sm); font-weight: 600 | .type-label-strong | chrome |  |
| admin/src/styles/meeting-arcs.css | 25 | `.arc-phase__id` | font-size: var(--type-body-sm); font-weight: 600 | .type-label-strong | chrome |  |
| admin/src/styles/meeting-arcs.css | 31 | `.arc-phase__q` | font-size: var(--type-body-sm) | .type-body-sm | prose |  |
| admin/src/styles/meeting-arcs.css | 65 | `.arc-update__time` | font-size: var(--type-body-sm) | .type-body-sm | chrome | A timestamp. |
| admin/src/styles/guide.css | 29 | `.sys-note code` | font-family:ui-monospace, SFMono-Regular, Menlo, monospace | .type-code | chrome | Mono stack S4 — the ONLY site missing Consolas. A fontFamilyLiteral guard hit. No size declared: inherits 14px from .sys-note, so size-neutral. |
| admin/src/styles/guide.css | 8 | `.g-arc__meta` | font-size: var(--type-body-sm) | .type-body-sm | chrome |  |
| admin/src/styles/guide.css | 10 | `.g-arc-chip` | font-size: var(--type-body-sm); font-weight: 500 | .type-label | chrome |  |
| admin/src/styles/guide.css | 13 | `.g-arc-edited` | font-size: var(--type-body-sm); font-weight: 600 | .type-label-strong | chrome |  |
| admin/src/styles/guide.css | 15 | `.g-arc-note` | font-size: var(--type-body-sm) | .type-body-sm | prose |  |
| admin/src/styles/guide.css | 18 | `.sys-note` | font-size: var(--type-body-sm) | .type-body-sm | prose |  |
| admin/src/styles/guide.css | 25 | `.sys-note__title` | font-weight: 600 | .type-label-strong | chrome |  |
| admin/src/styles/admin-pulse.css | 8 | `.lp-range__btn` | font: inherit; font-size: var(--type-body-sm); font-weight: 500 | .type-label | control |  |
| admin/src/styles/admin-pulse.css | 22 | `.lp-tile__label` | font-size: var(--type-body-sm); font-weight: 500 | .type-label | chrome |  |
| admin/src/styles/admin-pulse.css | 25 | `.lp-tile__delta` | font-size: var(--type-body-sm) | .type-body-sm | numeric |  |
| admin/src/styles/admin-pulse.css | 26 | `.lp-delta` | font-size: var(--type-body-sm); font-weight: 600 | .type-label-strong | numeric |  |
| admin/src/styles/admin-pulse.css | 29 | `.lp-tile__note` | font-size: var(--type-body-sm) | .type-body-sm | prose |  |
| admin/src/styles/admin-pulse.css | 37 | `.lp-card .lp-hnote` | font-size: var(--type-body-sm) | .type-body-sm | prose |  |
| admin/src/styles/admin-pulse.css | 38 | `.lp-viewall` | font: inherit; font-size: var(--type-body-sm); font-weight: 500 | .type-label | control |  |
| admin/src/styles/admin-pulse.css | 41 | `.lp-bar` | font-size: var(--type-body-sm) | .type-body-sm + .type-body--full | chrome |  |
| admin/src/styles/admin-pulse.css | 47 | `.lp-pill` | font-size: var(--type-body-sm); font-weight: 600 | .type-label-strong | chrome |  |
| admin/src/styles/admin-pulse.css | 53 | `.lp-avatar` | font-size: var(--type-body-sm); font-weight: 600 | .type-label-strong | glyph | A fourth avatar recipe. Check for a fixed box. |
| admin/src/styles/admin-pulse.css | 54 | `.lp-who .lp-co` | font-size: var(--type-body-sm) | .type-body-sm | chrome |  |
| admin/src/styles/admin-pulse.css | 57 | `.lp-feed__meta` | font-size: var(--type-body-sm) | .type-body-sm | chrome | Row metadata. |
| admin/src/styles/admin-pulse.css | 58 | `.lp-empty` | font-size: var(--type-body-sm) | .type-body-sm | chrome | Empty-state chrome. |
| admin/src/styles/pulse-drilldowns.css | 15 | `.pd-count` | font-size: var(--type-body-sm) | .type-body-sm | numeric | Status count. |
| admin/src/styles/pulse-drilldowns.css | 18 | `.pd-sub` | font-size: var(--type-body-sm) | .type-body-sm | chrome | Row metadata. |
| admin/src/styles/pulse-drilldowns.css | 27 | `.pd-hist__row` | font-size: var(--type-body-sm) | .type-body-sm + .type-body--full | chrome |  |
| admin/src/styles/pulse-drilldowns.css | 28 | `.pd-hist__label` | font-weight: 500 | .type-label | chrome | Inherits 14px from .pd-hist__row, so size-neutral. |
| admin/src/styles/pulse-drilldowns.css | 33 | `.pd-hist__n` | font-variant-numeric: tabular-nums; font-weight: 600 | .type-label-strong + .num-tabular | numeric |  |
| admin/src/styles/add-person-modal.css | 26 | `.apm__sub` | font-size: var(--type-body-sm); line-height: 1.5 | .type-body-sm | prose |  |
| admin/src/styles/add-person-modal.css | 45 | `.apm-field__label` | font-size: var(--type-body-sm); font-weight: var(--type-weight-medium) | .type-label | chrome | A FOURTH label recipe alongside .field__label, .label and .caption. Same 14/500. Fold it in with the other two. |
| admin/src/styles/add-person-modal.css | 50 | `.apm-field__opt` | font-weight: 400 | .type-body-sm | chrome | The '(optional)' suffix — an explicit un-bolding of the label. |
| admin/src/styles/add-person-modal.css | 54 | `.apm-field__input` | font-size: var(--type-body-sm) | .type-body-sm + .type-body--full | control | base.css:33 would push it to 16px if stripped without grouping. |
| admin/src/styles/add-person-modal.css | 78 | `.apm__err` | font-size: var(--type-body-sm) | .type-body-sm | prose |  |
| admin/src/styles/add-person-modal.css | 92 | `.apm-invite__check` | font-size: var(--type-body-sm) | .type-body-sm | chrome |  |
| admin/src/styles/test-gallery.css | 28 | `.tg-card__blurb` | font-size: var(--type-body-sm); line-height: 1.5 | .type-body-sm | prose |  |
| admin/src/styles/test-gallery.css | 29 | `.tg-card__meta` | font-size: var(--type-body-sm) | .type-body-sm | chrome |  |
| admin/src/styles/test-gallery.css | 31 | `.tg-tag` | font-size: var(--type-body-sm) | .type-body-sm | chrome |  |
| admin/src/styles/test-gallery.css | 33 | `.tg-note` | font-size: var(--type-body-sm) | .type-body-sm | chrome |  |
| admin/src/styles/test-gallery.css | 24 | `.tg-card__ext` | font-weight: 400 | .type-body-sm | chrome |  |
| admin/src/styles/test-gallery.css | 25 | `.tg-card__link` | font-weight: 600 | .type-label-strong | control | Inherits 16px; role drops to 14px. |
| admin/src/styles/lexicon-review.css | 19 | `.lex-selectall` | font-size: var(--type-body-sm) | .type-body-sm | control | Only type declaration in the file — it can reach zero. |
| admin/src/styles/design/stage-lookback.css | 21 | `.lookback__band` | font-size: var(--type-body-sm) | .type-body-sm + .type-body--full | chrome | LANE COLLISION: session a6878b4e claims this file (claimed 2026-07-27, stale by the board's 2-day rule but still listed). Surface to Carl; do not edit through. |
| admin/src/styles/design/stage-lookback.css | 38 | `.lookback__what strong` | font-weight: 600 | .type-label-strong | chrome | Same lane collision. |
| admin/src/styles/design/stage-lookback.css | 42 | `.lookback__back` | font: inherit; font-weight: 600 | .type-label-strong | control | Same lane collision. |
| frontend/src/stages/preparation.css | 62 | `.pv-l__name` | font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold); letter-spacing: 0.06em; text-transform: uppercase | .type-overline | heading | Eyebrow rival. Lane is now CLEAR (080b9104 gone from LANES.md), contrary to phase-3.md:17 / phase-4.md:15. |
| frontend/src/stages/preparation.css | 69 | `.pv-l__sub` | font-size: var(--type-body-sm) | .type-body-sm | chrome |  |
| frontend/src/stages/preparation.css | 89 | `.pv-l__confidence` | font-size: var(--type-body-sm) | PHASE 4 (.type-label) | unclear | phase-4.md:11 explicitly owns the nine confidence readouts as one set. Leave it to Phase 4 or the set splits across two phases. |
| frontend/src/stages/preparation.css | 150 | `.pv-l__tab` | font-size: var(--type-body-sm); font-weight: var(--type-weight-medium) | .type-label | control |  |
| frontend/src/stages/preparation.css | 216 | `.pv-rate__status` | font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold) | .type-label-strong | chrome |  |
| frontend/src/stages/preparation-lab.css | 80 | `.pv-switch__poptitle` | font-size: var(--type-body-sm); letter-spacing: 0.04em; text-transform: uppercase | .type-overline | heading | Eyebrow rival. No weight today (renders 400) — overline takes it to 600. |
| frontend/src/stages/preparation-lab.css | 14 | `.pv-switch__trigger` | font-size: var(--type-body-sm) | .type-body-sm | control |  |
| frontend/src/stages/preparation-lab.css | 40 | `.pv-switch__label` | font-size: var(--type-body-sm) | .type-body-sm | chrome |  |
| frontend/src/stages/preparation-lab.css | 44 | `.pv-switch__value` | font-size: var(--type-body-sm); font-weight: var(--type-weight-medium) | .type-label | chrome |  |
| frontend/src/stages/preparation-lab.css | 118 | `.pv-tile__name` | font-size: var(--type-body-sm); font-weight: var(--type-weight-medium); line-height: 1 | .type-label (leading conflict) | glyph | RISK B. |
| frontend/src/stages/preparation-lab.css | 384 | `.pv-b__confidence` | font-size: var(--type-body-sm) | PHASE 4 (.type-label) | unclear | One of the nine confidence readouts phase-4.md:11 owns. |
| frontend/src/stages/preparation-lab.css | 615 | `.pv-g__confidence` | font-size: var(--type-body-sm) | PHASE 4 (.type-label) | unclear | Same set. |
| frontend/src/stages/preparation-lab.css | 744 | `.pv-i__confidence` | font-size: var(--type-body-sm); line-height: var(--type-leading-normal) | PHASE 4 (.type-label) | unclear | Same set. |
| frontend/src/stages/preparation-lab.css | 787 | `.pv-j__confidence` | font-size: var(--type-body-sm) | PHASE 4 (.type-label) | unclear | Same set. |
| frontend/src/stages/preparation-lab.css | 522 | `.pv-f__confidence` | max-width: var(--measure); font-size: var(--type-body-sm) | PHASE 4 (.type-label) | unclear | Same set; already carries the measure. |
| frontend/src/stages/preparation-lab.css | 396 | `.pv-b__row p` | font-size: var(--type-body-sm); line-height: var(--type-leading-normal) | .type-body-sm | prose |  |
| frontend/src/stages/guided/guided.css | 274 | `.gd-sugg__tag` | font-size: var(--type-body-sm); font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em | .type-overline | heading | Eyebrow rival. Weight 700 -> 600, tracking 0.03 -> 0.08em. Width is fixed at 82px, so widening the tracking may wrap the tag. |
| frontend/src/stages/guided/guided.css | 22 | `.gd-stepper .stage-step` | font: inherit; font-size: var(--type-body-sm); font-weight: 500; line-height: 1 | .type-label (leading conflict) | control | RISK B. A FOURTH file styling .stage-step (base.css:344, session-topbar.css:73, start-stage.css:388 are the others). |
| frontend/src/stages/guided/guided.css | 58 | `.gd-done-banner` | font-size: var(--type-body-sm); font-weight: 600 | .type-label-strong | chrome |  |
| frontend/src/stages/guided/guided.css | 111 | `.gd-q__src` | font-size: var(--type-body-sm) | .type-body-sm | chrome |  |
| frontend/src/stages/guided/guided.css | 139 | `.gd-owner` | font-size: var(--type-body-sm); font-weight: 600 | .type-label-strong | chrome |  |
| frontend/src/stages/guided/guided.css | 144 | `.gd-chip` | font: inherit; font-size: var(--type-body-sm) | .type-body-sm | control |  |
| frontend/src/stages/guided/guided.css | 179 | `.gd-row__cat` | font-size: var(--type-body-sm); font-weight: 600 | .type-label-strong | chrome | phase-4.md:12 warns never to sed this block — .gd-row__pct and .gd-row__chev in the same run are numeric/glyph and go DOWN to 14 in Phase 4. |
| frontend/src/stages/guided/guided.css | 182 | `.gd-status` | font-size: var(--type-body-sm); font-weight: 600 | .type-label-strong | chrome |  |
| frontend/src/stages/guided/guided.css | 212 | `.gd-lastmark` | font-size: var(--type-body-sm) | .type-body-sm | chrome | Has a ::after with line-height: 0.7 at :221 — a glyph leading that no role expresses. |
| frontend/src/stages/guided/guided.css | 223 | `.gd-slider__labels` | font-size: var(--type-body-sm) | .type-body-sm + .type-body--full | chrome |  |
| frontend/src/stages/guided/guided.css | 225 | `.gd-block__note input` | font: inherit; font-size: var(--type-body-sm) | .type-body-sm + .type-body--full | control |  |
| frontend/src/stages/guided/guided.css | 243 | `.gd-ainote` | font-size: var(--type-body-sm) | .type-body-sm | prose |  |
| frontend/src/stages/guided/guided.css | 244 | `.gd-private` | font-size: var(--type-body-sm); font-weight: 600 | .type-label-strong | chrome |  |
| frontend/src/stages/guided/guided.css | 284 | `.gd-finish-note` | font-size: var(--type-body-sm); font-style: italic | .type-body-sm (+ keep font-style) | prose |  |
| frontend/src/stages/guided/guided.css | 333 | `.gd-field label` | font-size: var(--type-body-sm); font-weight: 600 | .type-label-strong | chrome | A fifth label recipe, at weight 600 rather than 500. |
| frontend/src/stages/guided/guided.css | 350 | `.gd-hist` | font-size: var(--type-body-sm) | .type-body-sm | chrome |  |
| frontend/src/stages/guided/guided.css | 381 | `.gd-rec__delta` | font-size: var(--type-body-sm) | .type-body-sm | numeric |  |
| frontend/src/stages/guided/guided.css | 78 | `.gd-q__logo` | font-family: var(--type-family-display); font-weight: 700; font-size: var(--type-body-sm) | unclear — display face at 14px | unclear | A displayFaceBelow20 guard hit: Bricolage at 14px, banned by DESIGN.md T6. No 14px role carries the display family, so this needs a deliberate call, not a mechanical one. |
| frontend/src/stages/member-home.css | 26 | `.member-empty__copy` | font-size: var(--type-body-sm); max-width: var(--measure-tight) | .type-body-sm | prose | Its own 32rem measure is NARROWER than the role's 38rem — the role would widen it. Deliberate call needed. |
| frontend/src/stages/member-home.css | 50 | `.member-req__text` | font-size: var(--type-body-sm) | .type-body-sm | prose |  |
| frontend/src/stages/member-home.css | 68 | `.member-goal__text` | font-size: var(--type-body-sm); font-weight: var(--type-weight-medium) | .type-label | chrome |  |
| frontend/src/stages/member-home.css | 95 | `.member-goal__pct` | font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold) | .type-label-strong | numeric |  |
| frontend/src/stages/member-home.css | 22 | `.member-empty__head` | font-weight: var(--type-weight-semibold) | PHASE 5 (inherits 16px) | heading | An empty-state heading at body size; belongs with the heading ladder. |
| frontend/src/styles/team-card.css | 42 | `.team-card__name` | font-size: var(--type-body-sm) | .type-body-sm | chrome |  |
| frontend/src/styles/team-card.css | 68 | `.team-card__meta` | font-size: var(--type-body-sm) | .type-body-sm | chrome | Row metadata. |
| frontend/src/styles/team-card.css | 84 | `.team-pill` | font-size: var(--type-body-sm); font-weight: var(--type-weight-medium) | .type-label | chrome |  |
| frontend/src/styles/team-card.css | 100 | `.team-link` | font: inherit; font-size: var(--type-body-sm); font-weight: var(--type-weight-semibold) | .type-label-strong | control |  |
| admin/tailwind.config.js | 56 | `theme.extend.fontSize.xs` | xs: ["var(--type-small)", { lineHeight: "1.5" }], // text-xs ×7 | DELETE the entry | control | --type-small is undefined repo-wide, so font-size is invalid at computed-value time and every text-xs element silently inherits. Delete the key and rewrite the 7 shipped call sites to text-sm. |
| admin/src/ui/skeleton-presets.test.ts | 242 | `question preset classes[] entry` |       "text-xs", | "text-sm" | control | TEST-FIRST. Change this first, watch it fail against skeleton-presets.ts:291, then change the source. Do NOT touch the correct "text-sm" assertions at :178 and :214. |
| admin/src/ui/skeleton-presets.ts | 291 | `skLeaf("hint hint--kbd text-xs", "32ch")` |       ${skLeaf("hint hint--kbd text-xs", "32ch")} | text-sm | control | The ghost must mirror the real markup at questioning.js:289 or motion.css:153's skeleton sizes drift from the card they stand in for (type.css:36-40). |
| admin/src/stages/questioning.js | 289 | `<p class="hint hint--kbd text-xs text-ink-mute">` | class="hint hint--kbd text-xs text-ink-mute" | text-sm | control | Renders 16px today because .hint (buttons-inputs.css:534) beats the utility. Swapping to text-sm changes nothing on screen until .hint moves onto a role. |
| admin/src/stages/questioning.js | 270 | `<div class="script-meta text-xs">` | class="script-meta text-xs" | text-sm | control | Nothing else sets a size, so it inherits 16px today. Becomes a real 16 -> 14px shrink on the scripted-run strip. Sequence with .script-alias (buttons-inputs.css:214), which inherits from it. |
| admin/src/stages/questioning.js | 290 | `<p class="text-xs"> (DEV only)` | class="text-xs" | text-sm | control | Inherits 16px today; becomes 14px. DEV-gated, so no customer impact. |
| admin/src/stages/lexicon-review.js | 111 | `<div class="text-ink-mute text-xs mb-1">` | class="text-ink-mute text-xs mb-1" | text-sm | control | Neither .lex-row nor .lex-row__body sets a size, so the topLabel inherits 16px today. Becomes a visible 14px on the Lexicon review screen. |
| admin/src/ui/notes-panel.js | 45 | `<p class="notes-panel__helper text-ink-dim text-xs">` | class="notes-panel__helper text-ink-dim text-xs" | text-sm | control | .notes-panel__helper has NO CSS anywhere in the repo, so this inherits body's 16px. Becomes 14px, matching the rest of the rail. |
| admin/src/stages/design.js | 705 | `<p class="hint hint--kbd text-xs text-ink-mute">` | class="hint hint--kbd text-xs text-ink-mute" | text-sm | control | .hint wins at 16px, so no visual change. Internal Design-system specimen. |
| admin/src/ui/account-sheet.ts | 48 | `.acct-back (template-literal <style>)` | font: inherit; font-size: var(--type-body-sm, 14px) | .type-label | chrome | A <style> appended to document.head at runtime, so it beats every sheet. Six 14px declarations here (48, 53, 60, 67, 69, 70) — all relativeFontSize guard hits. Use the .type-role-* composites (type.css:258-273) or add the role classes to the markup. |
| admin/src/ui/profile-badge.js | 60 | `.profile-badge__mi (template-literal <style>)` | font: inherit; font-size: var(--type-body-sm, 14px) | .type-body-sm | chrome | Same runtime-injected pattern; one relativeFontSize hit. Also the home of the undefinedToken guard hit --color-ink-subtle. |
| admin/src/ui/build-stamp.js | 34 | `el.style.cssText font shorthand` | "font:14px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" | font: var(--type-role-code) | chrome | Mono S3 in an inline style — unbeatable by any class, so the composite is the only route. type.css:237-256 warns the shorthand resets font-feature-settings; acceptable on a debug chip. Note 1.2 leading becomes 20px. |
| admin/src/ui/dev-badge.js | 23 | `el.style.cssText font shorthand` | "font:14px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" | font: var(--type-role-code) | chrome | Same as build-stamp.js. Leading 1.4 -> 20px. |
| admin/src/styles/design/tokens.css | 270 | `:root --font-mono` | --font-mono: ui-monospace, monospace;            /* code / meta text */ | DELETE once the 13 S1/S2 sites move | control | tokens.css:363-365 already says the two mono tokens merge when its sites move onto a role. Phase 3 is that move. Grep for --font-mono before deleting. |
| scripts/test-design-guard.js | 83 | `CEILINGS` | relativeFontSize: 33, offLadderFont: 22, unsanctionedSizeToken: 439, literalFontSize: 12, undefinedToken: 3, clampOffRung: 10, displayFaceBelow20: 7, fontFamilyLiteral: 8, fontShorthandResetsNumeric: 0 | lower to the re-measured numbers | control | Re-run `node scripts/lint-design-tokens.js --json` AFTER the edits and paste the real numbers; never predict them. Expected: fontFamilyLiteral 8 -> 1, relativeFontSize 33 -> 4, literalFontSize 12 -> 10, unsanctionedSizeToken 439 -> ~290. Ceilings may only fall. |

## Risks
- RISK A (highest, and it will show on Carl's first screen): .type-body-sm carries max-width: var(--measure) = 38rem. Thirty-five chrome selectors in this phase must fill their container. If .um-table joins .type-body-sm without also joining .type-body--full (type.css:230), the Team table stops filling its card and test scenario 1 fails on sight. Same for .el-table, .crumbs, .session-topbar__row, .axis-mem, .person-summary, .stage-io, .run-log__note-row, every 100%-width input and every block-level menu item.
- RISK B: every role sets line-height: var(--type-leading-sm) = 20px, but ~18 chrome selectors deliberately declare line-height 1 or 0 to centre a glyph inside a fixed-size circle or pill (.um-trend, .ud-chev, .row-menu-btn, .session-topbar__avatar, .profile-badge__avatar, .fb-avatar, .session-topbar__stages .stage-step, .stage-step__label, .session-topbar__exit, .run-step__dot, .pv-tile__name, .gd-stepper .stage-step, .stage-review__close, .crumbs, .axis__delta, .star-rating__star, .pa-add__plus, .cmp-tag). No role expresses 'no leading'. Taking a role grows those boxes by up to 6px, and the session topbar is a fixed 50px bar with a 34px thumb target — a growing exit button is the one control that must never clip.
- RISK C: rules inside a media query or on a state class cannot be reached by grouping a selector into type.css. session-topbar.css:287 (.session-topbar__count) sets its type inside @media (max-width: 767.98px); nine state rules bump weight in place (.um-menu__item.is-current, .app-nav__link.is-active, .session-topbar__stages .is-current, .notes-panel__tab.is-active, .pck-tap.is-active, .fp-chip--changed, .joblex-item.is-active, .rv-seg__btn.is-pass/.is-fail, .gd-chip[data-selected]). These will survive any sweep and quietly break the 'font-size in exactly two files' goal at Phase 6.
- Phase 3's own Done-when contradicts its own Not-in-this-phase. phase-3.md:25 demands zero type declarations in eight files, but seven of the eight hold non-14px selectors (--type-h2/--type-h3/--type-h4, 1.75rem, 16px prose) that phase-3.md:22 explicitly defers to Phases 4 and 5. Only breadcrumb.css can reach zero on this phase's own rules. Left unaddressed, the phase either self-certifies a false green or silently pulls Phase 5 work forward.
- Three selectors change SIZE, breaking the phase's 'nothing changes size' promise to Carl: .run-log__tip (run-log.css:220) is mono with no font-size and inherits 16px, so .type-code drops it to 14px; .run-list__name (start-stage.css:53) and .pck-action (promise-checkin.css:27) are weight-only rules inheriting 16px that .type-label-strong drops to 14px. Also .ds-avatar, .lex-row__num, .fb-name, .member-runs__type, .axis__value, .ds-btn-quiet and .tg-card__link are in the same shape. Each needs a yes/no, not a sed.
- The eyebrow unification widens tracking by up to 4x on two rivals (.app-nav__group-label span and .start-point__label go 0.02em -> 0.08em) and adds 100 extra weight to five (.notes-panel__group-head, .stage-io__label/.stage-io__block-title, .um-menu__label, .pv-switch__poptitle, .cl-tag go 400/500 -> 600). .gd-sugg__tag sits in a fixed 82px column and may wrap once its tracking widens. This IS test scenario 3, so it is the phase's most-inspected change.
- Two named eyebrow rivals in phase-3.md:12 are misclassified. .run-log__block-label is 14/600 with no caps and no tracking, and its markup reads 'CLI replay', 'Log on disk', 'Your notes' — overline would shout them. .brutal__eyebrow is 14/500 with no caps either. Following the phase file literally would uppercase five sentence-case labels on the run log and the briefing.
- Removing a font-size from a component sheet without grouping the selector into a role is not a no-op for form controls: base.css:33 sets input, textarea, button, select to var(--type-body) = 16px. Nine 14px controls (.list-toolbar__search, .cmp-input, .ds-input, .apm-field__input, .acct-input, .gd-block__note input, .row-menu__item, .um-menu__item, .ds-menu__item) would jump to 16px the moment their rule is deleted. Strip and group in the same edit, never separately.
- Four sheets in scope are code-split satellites injected AFTER the main bundle (error-log.css, run-log.css, feedback-inbox.css, row-menu.css, plus everything under frontend/src/stages/). A role grouped in type.css cannot beat them at the same specificity. P2 measured this exact failure on coach-panel.css: the stem stayed at 32px and only the one property coach-panel never declared came through. Half-applied is the failure mode and nothing warns you.
- font-style, text-transform: capitalize/lowercase, and font-variant-numeric on non-metric chrome have no role that expresses them (~25 sites). They survive any sweep. Unless a decision is recorded now, Phase 6's lint-as-error will fail on properties nobody ever intended to migrate.
- admin/src/styles/design/axes.css and admin/src/stages/design.js are already modified in the working tree (git status). Editing them for Phase 3 risks tangling with in-flight work from this same session; check the diff before touching.
- The lane row for this session (1a2e5006) covers roughly a dozen files. Phase 3 touches over forty. Editing outside the claimed lane trips the hook, and widening the lane mid-phase while other chats are live is exactly the collision the board exists to prevent. Widen the row BEFORE the first edit.

## Open questions
- The glyph-leading question (Risk B) is the one call that must be made before any code is written. Roles carry a 20px leading; ~18 chrome selectors deliberately carry line-height 1 or 0 so a glyph or initial sits centred in a fixed-size circle or pill. Three options: (a) let those selectors keep a single line-height declaration in their component sheet, with a comment citing this finding, and exempt line-height from Phase 6's lint-as-error; (b) add one sanctioned utility, .type-lh-none { line-height: 1 }, in type.css and pair it in markup; (c) leave those selectors off roles entirely this phase. (a) is smallest and honest, (b) is cleanest for Phase 6, (c) leaves the phase visibly unfinished. Carl's call, because it decides what 'font-size exists in exactly two files' actually means.
- phase-3.md:25 asks for zero type declarations in eight files, but seven of them hold --type-h2/h3/h4, 1.75rem or 16px selectors that phase-3.md:22 defers to Phases 4 and 5. Only breadcrumb.css can reach zero. Either reword the bullet to 'zero 14px type declarations' (recommended, keeps the phase boundary honest), or pull the four --type-h3/--type-h4 selectors forward — 18px and 20px are exactly on the ladder, so .type-heading-sm/.type-heading-md would land them with no size change, but they also add the Bricolage display face and text-wrap: balance, which is a Phase 5 design decision.
- Do the seven weight-only chrome selectors that inherit 16px today go DOWN to 14px in this phase? .run-list__name, .pck-action, .lex-row__num, .fb-name, .member-runs__type, .ds-avatar, .axis__value, .ds-btn-quiet and .tg-card__link all declare a weight and no size. Taking a 14px role shrinks them. Several sit on a shared baseline beside a sibling that is already 14px (.member-runs__when, .fb-company), so shrinking probably improves them — but it is a size change in a phase Carl has been told changes no sizes. Recommend: take them, and tell him plainly in the phase note which ones moved and why.
- Should the uppercase PILLS join .type-overline or stay on the chip recipe? .cmp-verdict-tag, .brutal__badge and .cl-tag are uppercase but they are badges, not section eyebrows. Overline would push them from 400/500 to 600 and widen tracking to 0.08em inside a tight pill. Recommend keeping them on the base.css chip recipe with their local text-transform as a recorded exception, but this is a taste call and it decides whether 'one eyebrow recipe' in the Done-when is literally true.
- Delete .label (base.css:268) outright, or keep it as a colour-only shim? It has exactly 13 markup uses and all thirteen are on the internal Design-system screen (admin/src/stages/design.js). Deleting it and rewriting those thirteen to .type-label is the honest end state and costs one file's edits; keeping a shim defers the work to Phase 5's markup sweep. Same question for .caption (43 uses, real product screens) and the fourth and fifth label recipes .apm-field__label and .gd-field label.
- frontend/src/stages/guided/guided.css:78 .gd-q__logo sets font-family: var(--type-family-display) at 14px — Bricolage below 20px, banned by DESIGN.md T6 and already one of the seven displayFaceBelow20 guard hits. No 14px role carries the display face, deliberately (type.css:25-27). Does the logo drop to the base family (a visible brand change on the customer guided screen), stay as a documented deviation, or become an image?
- The nine confidence readouts in frontend/src/stages/preparation.css and preparation-lab.css: five of them (.pv-b__, .pv-f__, .pv-g__, .pv-i__, .pv-j__confidence) are ALREADY 14px, so by Phase 3's own rule they belong here — but phase-4.md:11 claims all nine as one set precisely so they stop rendering at three different sizes. Splitting the set across two phases means Carl sees them mismatched at the end of Phase 3. Recommend leaving all nine to Phase 4 and saying so in phase-3.md.
- admin/src/styles/design/stage-lookback.css is claimed by session a6878b4e, claimed 2026-07-27 — three days old, so stale by LANES.md's own two-day rule, but the row is still on the board. Phase 3 wants three selectors in it. Treat as live and skip the file, or treat as stale and take it? House rule says surface it to Carl and let him decide, never edit through.
- The two collision warnings in phase-3.md:17 and phase-4.md:15 name session 080b9104 as holding feedback-inbox.css and preparation.css. That row is gone from LANES.md, so both files are free. Should the stale warnings be struck from the phase files now, so a later agent does not stop on a collision that no longer exists?
- scripts/test-design-guard.js's nine type ceilings must be lowered to whatever the linter actually reports after the edits, not to a predicted number. Who re-measures and records it — the build agent as part of the phase, or a separate verification pass? The file's own comment (lines 52-55) insists P2 re-measured rather than predicted, so the same discipline should be written into the phase's Done-when.
