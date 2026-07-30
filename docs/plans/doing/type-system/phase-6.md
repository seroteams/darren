# Phase 6 — Lock it

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built, awaiting Carl

## What landed (2026-07-31)

**Nine of the ten type rules are now ERRORS at zero.** They were flipped only after
every one of them measured zero, so the flip could not red the build for the parallel
sessions sharing this checkout. Measured with `node scripts/lint-design-tokens.js
--json` immediately before the flip, not predicted:

| rule | P1 baseline | at the flip | now |
|---|---|---|---|
| `unsanctionedSizeToken` | 451 | 0 | **error** |
| `relativeFontSize` | 33 | 0 | **error** |
| `offLadderFont` | 28 | 0 | **error** |
| `literalFontSize` | 18 | 0 | **error** |
| `clampOffRung` | 12 | 0 | **error** |
| `fontFamilyLiteral` | 8 | 0 | **error** |
| `displayFaceBelow20` | 7 | 0 | **error** |
| `undefinedToken` | 3 | 0 | **error** |
| `fontShorthandResetsNumeric` | 0 | 0 | **error** |
| `nonTokenFont` | 68 | 5 | **retired, not paid** |

Their ceilings are deleted: an error needs no ceiling, because zero is the only
passing value. **Proved it bites:** adding `.p6-probe { font-size: 15px }` to
`breadcrumb.css` turned `lint:tokens` from PASS to a 2-violation FAIL, and failed
`test-design-guard.js` with it. Reverted.

Three counts had to be cleared by hand first: two `--sero-radius-pill` typos in
`start-stage.css` (undefined, so both declarations were being **dropped at render**),
one `--color-ink-subtle` in `profile-badge.js` (painting only through its fallback),
and a stated waiver on `mobile.css`'s `font-size: max(1rem, 1em)`.

`nonTokenFont` was **retired rather than paid**, as its own comment always said P6
would. It was px-only and its hits were a strict subset of `literal-font-size`'s, so
keeping it meant two ceilings that could disagree about one debt.

### The headline invariant, replaced and then measured

`plan.md` said "`font-size` exists in exactly two files in the whole repo", checked by
grep. **That can never pass.** `tokens.css` contains the string zero times (it defines
`--type-size-*` and never uses the property), and about seventeen files match it
legitimately for ever after: five test files that assert ON the string, `design.js`,
the parked gallery, `orb.css`, `app-nav.css`, and two where it appears only in a
comment. The floor for that grep is ~17, not 2.

It is replaced by a real rule, **`type-property-outside-type-layer`**, which had to be
written from scratch: nothing in the linter counted `line-height`, `font-weight`,
`text-transform` or `font-variant-numeric` anywhere. It reads **declarations**, not
text, so a comment, a test assertion and a JS object key cannot trip it, and it names
the exact line when something does.

**It reports 142, not zero, and this phase does not pretend otherwise.** Every
exemption is listed and reasoned in the linter header. What the 142 is made of:

| where | count |
|---|---|
| `buttons-inputs.css` | 25 |
| `design-stage.css` | 14 |
| `stage-extras.css` | 12 |
| `stage-review.css`, `test-engine.css` | 8 each |
| `admin-pulse.css`, `start-stage.css`, `pulse-drilldowns.css` | 7 each |
| 26 more sheets | 1 to 5 each |

Three groups dominate and **none of them is a mechanical fix**: weight-only rules on
objects that inherit 16px (a 14px role would shrink them, so each is a design
decision); `font-variant-numeric: tabular-nums` on ~20 non-metric chrome selectors
(the fix is pairing `.num-tabular` in markup, not a role); and `line-height` on glyph
containers plus `text-transform: capitalize/lowercase`, which no role expresses.

**Sixteen of those sheets are named in no phase file of this plan.** The P6 recon
called that the largest hole in the plan, and it was right. Clearing them is a Phase
5b sweep, not a lock: it changes sizes on screens someone has to look at. Landing the
rule as an error at 142 would have redded the build for every parallel session on the
day it shipped, which is exactly what the ceiling mechanism exists to prevent.

### The recap PDF is on a derived print ladder

Eight free-floating pt values (8, 8.5, 9, 9.5, 10, 10.5, 15, 20) with **three
different `characterSpacing` values for what is one object** became one `PRINT` const
block. `pt = px × 0.75` (1pt = 1/72in, CSS 1px = 1/96in); the file was already half on
that conversion by accident, which is the evidence for adopting it: `defaultStyle` was
10.5pt / 1.4, and 10.5pt **is** 14px with a 20/14 leading, so the PDF's body copy was
`.type-body-sm` all along.

pdfmake's `lineHeight` is a multiplier (`leadingPx ÷ sizePx`) and its
`characterSpacing` is absolute points (`em × sizePt`), so both are derived rather than
copied. **Role weights with no PDF equivalent are named, not invented.** Only three
static faces ship: Inter 600 (four roles) falls to bold 700, Inter 500 falls to 400 so
`label` is not used at all, `.type-code` has no mono TTF, and `.type-metric`'s tabular
figures cannot be delivered because pdfmake exposes no font-feature control.

Four tests hold it, because the CSS guard is allowlisted out of this file. **Proved
they bite:** reintroducing the old 8.5pt folio failed two of them with `off-ladder pt
sizes: 8.5`. The two `width: 66` when-columns were widened to 72 for "Next 1:1" at the
bigger size, and the axis-name column 78 to 86.

### The email shell was a fourth type system nobody had ever checked

`backend/` was outside `SCAN_DIRS` entirely and no test referenced the file. It held
`font-size` 11, 12, 12.5, 14, 15, 22 and 23px. **Three of those are below the 14px
floor**, not the one `plan.md` flagged: the 11px eyebrow, the 12px footer and the
12.5px fine print. It shipped like that to real managers.

New `email-type.ts` holds the seven roles email uses as literals, with `emailType()`
emitting the whole pair so no call site can write a size without its leading. New
`email-layout.test.ts` parses the **real** `design/tokens.css` and asserts every entry
still matches its rung. Notable calls:

- heading 22 → **24/32** and wordmark 23 → **20/28**, so the content is now louder
  than the brand. They used to sit 1px apart, which is the T2 defect exactly.
- CTA label 15 → **heading-xs 16/24/600**, not label-strong 14: email has no media
  query, so a 14px primary button cannot grow on a phone.
- `font-size:0` on the two `&nbsp;` struts is left alone and the test allows exactly 0.

`backend/api/services/notifications` joined `SCAN_DIRS` so the hole cannot reopen.

### The two runtime-injected style blocks

Measured live, after: `profile-badge.js`'s block holds **zero** type declarations and
`account-sheet.ts`'s holds **one**, `letter-spacing: 3px`, which spreads the masked
password's bullets and is decoration rather than tracking. It carries a
`lint-tokens-ignore` with that reason.

These took **role classes in markup**, not grouping. They are appended to
`document.head` at runtime, so they load after every stylesheet and a grouped role
could never beat them: that is the half-application P2 measured on `coach-panel.css`.
Measured after: `.acct-back` 14/20/400, `.acct-input` 14/20/400, `.acct-label`
14/20/500, `.profile-badge__mi` 14/20/400. `.acct-page .btn`'s `font-size` override
was **deleted** rather than repointed, and the five buttons ask for `size: "sm"`
instead, so they carry `.btn.btn--sm`, which is a real role. Measured: 14/20/500,
unchanged from the override it replaced.

### DESIGN.md §3 and the in-app design sheet

§3 is rewritten. The ladder tops at **36 not 40**, T4 is stated as absolute leadings on
the 4px grid rather than falling ratios (the old T4 said 20→1.3 while `heading-md` is
20/28 = 1.4, and its premise was broken anyway: 18px takes 28, looser than 16px's 1.5),
and the "Known drift (2026-07-26, reported not fixed)" block is **deleted** because it
describes fixed work. Two sections that did not exist are added: **where type may be
declared**, and **how a screen joins a role**. §6 rule 14 and the exemptions list
follow, including the parked gallery, which was in the code but not in DESIGN.md, so
the stated twinning was already broken.

`stages/design.js` is guard-allowlisted, and it had drifted exactly as predicted: it
showed **five** specimen lines off the OLD system, four of whose tokens P5 deleted, and
captioned `.h3` as "Inter semibold" after P5 changed that rung to Bricolage. It now
renders the seven rungs and all fourteen roles **in their own real classes**, so the
sheet IS the system rather than a description of it. Measured live: all fourteen match
the DESIGN.md table exactly.

Its two inline `font-size` avatar demos became `.ds-avatar--lg` / `.ds-brandbadge--lg`,
grouped into `.type-heading-sm` with a **two-class** selector, because the plain
`.ds-avatar` is already claimed by `.type-label-strong` further down `type.css` and a
single class loses on source order. Measured: 18/28 in a 56px and a 40px box, which is
what the inline styles gave. The brand badge needed both classes named in the brand
weight rule too: with one it rendered 600 while the real badge renders 700, so the page
documenting the system would have shown the wrong weight.

## The P5 leftovers, fixed

- **`.input` had a size without its leading**. 24px on a 37.2px line box instead of
  the locked 24/32, in the same commit that wrote the note calling that exactly this
  mistake. Paired.
- **Tailwind's `fontSize` sat under `theme.extend`**, so the full default scale was
  still live including `text-xs` at **12px, below the floor**, while the comment on the
  block said "No `xs`". Both `fontSize` and `lineHeight` now REPLACE the scale.
  Measured live after: `text-xs`, `text-xl` and `text-2xl` are inert; `text-sm` is
  14/20.
- **`main.js`'s `<h1 class="text-xl">`** was the last heading in either app sized by a
  raw utility. It takes `.type-heading-md`: both are 20px, so nothing moves.
- **`tokens.css`'s "WATCH THE SUFFIX" note** pointed at four tokens that are no longer
  in that file. Rewritten to say where they actually are.
- **`tokens.css`'s `--type-family-mono` note** claimed the old stacks rendered as two
  typewriter faces on Windows. **Width-probing does not reproduce that**, so the claim
  is withdrawn rather than left standing as a measurement nobody took.
- **`guided.css`'s three flex rows** (`.gd-sugg__row`, `.gd-rec__scorerow`,
  `.gd-rec__item`) carried `.type-body`'s reading measure. They take
  `.type-body--full`.
- **`phase-5.md`'s "one markup line" claim** was false: seven lines across four files,
  four of them genuine class changes. Corrected in place.
- **`LANES.md`** claimed a whole directory that swallowed another session's
  specifically-claimed file. Narrowed to the files P6 actually touches.

**One reported defect did not reproduce.** The Pulse KPI skeleton ghost was said to be
4px shorter than the element it stands in for. Measured in the running app against the
real stylesheets, ghost and real are **both 36px**, including the `/10` denominator
case. Nothing changed; saying so is more useful than a fix.

## Still open for Carl

- **`type-property-outside-type-layer` is 142, not 0.** It is honestly counted and
  frozen, and the file list is in `test-design-guard.js`. A Phase 5b would clear it.
- **The Tailwind `leading-*` utilities** are 62 markup sites setting a line-height from
  markup. P6 did **not** retire them, and corrected the config comment that promised it
  would.
- **Two customer-facing HTML docs** (`docs/reports/sero-how-it-works.html`, 53
  font-sizes; `sero-changelog.html`, 21) are a fifth type system this phase does not
  touch, so "two files in the whole repo" stays untrue for the repo.
- **Four email colours fail the 4.5:1 contrast bar** (eyebrow ~2.2:1, footer ~2.4:1,
  fine print ~2.9:1, detail key ~3.6:1), and eleven of its fourteen hex values match no
  Sero token. `#e9f3fc`, the background, is **one digit** off `--sero-primary-200`.
  Colour decisions, so flagged rather than silently repainted.
- **The PDF grows by roughly a page.** Everything at 8 to 10pt rises to 10.5pt, because
  the screen ladder has no rung below 14px. That includes the footer credit and the
  page folio; a documented print-chrome waiver at 8.5pt for the footer band only is the
  alternative, and it is a taste call.
- **The phone heading collapse** carried over from P5 (see that phase file).

## Done when
- [x] `type-property-outside-type-layer` exists, is measured, and every exemption is
      listed and reasoned in the linter header. **Not at zero: 142, stated above**
- [x] Every other type rule is an error at zero; `lint:tokens` passes
- [x] The recap PDF and the email both match the role table, each held by a test
- [x] `DESIGN.md` §3 describes what the code actually does
- [x] `npm test` 220/220, `npm run typecheck`, `npm run lint:tokens`, `npm run
      lint:copy`, `node scripts/test-design-guard.js` all clean
- [ ] Screenshots. **Not possible in this session:** the Browser pane will not
      composite a frame here, so every screenshot times out. Every number claimed above
      is a computed style read off the live page instead, and it says so where claimed
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
**Setup:** `local > Start Sero.bat > localhost:3000 > Dev login: Manager`

1. **The recap PDF**. finish a run and download the recap PDF. Headings, body text and
   labels should look like a printed version of the app. **Expect it to be longer than
   before**: the small print grew. ❌ Not OK if the text is tiny, or if a heading is
   barely bigger than the body.
2. **An email**. trigger a notification email and open it on your phone. Every line
   readable without zooming. ❌ Not OK if the little uppercase heading at the top is too
   small, or if the big heading crowds the card.
3. **The design sheet**. the internal **Design** page. It should show the seven rungs
   and all fourteen roles, each rendered in its own style. ❌ Not OK if it shows sizes
   you cannot find anywhere in the app.
4. **Your account menu**. click your avatar, open the account panel, open the password
   form. Text sizes match the rest of the app. ❌ Not OK if anything looks off-size.
5. **The whole tour**. Sign in → Welcome → Team → a person → a run → recap. It should
   read as one product. ❌ Not OK if any screen still feels like a different app.
