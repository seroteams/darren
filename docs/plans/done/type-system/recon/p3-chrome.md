# Recon: p3-chrome

_Read-only inventory, 2026-07-30. Source of truth for the build._

PHASE 6 INVENTORY — "the lock and the three non-CSS type surfaces"
Measured 2026-07-30 against the working tree. Read-only pass, nothing written.
Guard run: `node scripts/lint-design-tokens.js --json` (free, 207 files scanned, 0 errors).

================================================================================
0. HEADLINE FINDING FIRST: the Phase 6 done-when check is not runnable as written
================================================================================
phase-6.md line 21 says:
  grep -rln "font-size" admin/src frontend/src --include=*.css --include=*.js --include=*.ts
  → must list EXACTLY TWO files.

Run today it lists 67 files. But the target of two is unreachable AND wrong in both directions:

(a) `admin/src/styles/design/tokens.css` contains ZERO occurrences of the string "font-size"
    (verified: `grep -c font-size` = 0). It defines --type-size-* but never uses the property.
    So the sanctioned pair can only ever produce ONE grep hit, not two.

(b) Six categories of file will still legitimately match after Phase 6 and cannot be removed:
    - the 5 test files that assert ON the string: admin/src/stages/about.test.ts:99,
      intake-firstrun.test.ts:74, start-welcome.test.ts:158,
      admin/src/styles/design/chip-system.test.ts:40,
      frontend/src/stages/preparation-css.test.ts:112/123
    - admin/src/stages/design.js (guard-allowlisted, item 7 below)
    - the 8 parked gallery files under admin/src/stages/tests/ (permanently exempt)
    - admin/src/styles/design/orb.css:45 and app-nav.css:149/157/211/319/324 (allowlisted)
    - admin/src/ui/skeleton-parts.ts:6 — the words "font-size" in a COMMENT only
    - admin/src/styles/tailwind.css:11 — "font-size" inside a comment
    Floor for the grep as written: ~17 files.

(c) The grep is blind to the two surfaces this phase exists for.
    admin/src/ui/recap-pdf.ts uses `fontSize` (camelCase) — never matched, never will.
    backend/api/services/notifications/email-layout.ts is outside the search path entirely.

REPLACEMENT INVARIANT the build should adopt instead (three parts, all runnable):
  1. The guard's own new rule (see §4) reports `typePropOutsideSanctioned: 0`.
     That rule reads code, not raw text, so comments and test assertions cannot trip it.
  2. `node scripts/lint-design-tokens.js --json | typeWarnDetail` is empty.
  3. Two new unit tests hold the two surfaces the CSS guard cannot see:
     admin/src/ui/recap-pdf.test.ts (every fontSize is a print rung) and
     backend/api/services/notifications/email-layout.test.ts (every px matches the role table).

TRUE REMAINING SURFACE, measured today.
1,484 type-property declarations across 67 files (font-size, line-height, font-weight,
letter-spacing, font-family, text-transform, font-variant-numeric, and the `font:` shorthand).
type.css holds 69 of them. recap-pdf.ts contributes 2 false positives (`font: "Inter"` /
`font: "Bricolage"` are pdfmake object keys, not CSS). So ~1,413 declarations outside the two
sanctioned files must go to zero.

Full file list, biggest first (count · file · breakdown):
  86 frontend/src/stages/guided/guided.css — size43 lh7 wt20 ls1 fam5 tt1 font9
  85 admin/src/stages/tests/welcome-redesign.js  [PARKED GALLERY]
  69 admin/src/styles/design/buttons-inputs.css — size34 lh5 wt19 ls3 fam4 tt2 fvn1 font1
  69 admin/src/styles/design/type.css  [SANCTIONED]
  66 admin/src/stages/tests/how-it-works.js  [PARKED]
  62 admin/src/stages/tests/welcome-lean.js  [PARKED]
  62 frontend/src/stages/preparation-lab.css
  60 admin/src/styles/design/base.css
  57 admin/src/stages/tests/welcome-options.js  [PARKED]
  51 admin/src/styles/design/admin-tables.css
  50 admin/src/styles/design/stage-extras.css
  46 admin/src/styles/design/design-stage.css   ← NOT NAMED IN ANY PHASE
  46 admin/src/styles/design/start-stage.css    ← NOT NAMED IN ANY PHASE
  41 admin/src/styles/design/notes-panel.css
  39 admin/src/styles/design/stage-review.css   ← NOT NAMED IN ANY PHASE
  37 admin/src/styles/admin-pulse.css
  35 admin/src/styles/design/briefing.css
  34 admin/src/styles/design/test-engine.css    ← NOT NAMED IN ANY PHASE
  33 admin/src/stages/tests/entry-redesign.js  [PARKED]
  31 admin/src/stages/tests/runner-v2.js  [PARKED]
  29 admin/src/styles/meeting-arcs.css
  26 admin/src/styles/design/about-stage.css
  25 admin/src/styles/design/run-log.css
  23 admin/src/styles/design/auth.css           ← NOT NAMED IN ANY PHASE
  23 admin/src/styles/design/promise-agree.css
  22 admin/src/styles/design/session-topbar.css
  20 frontend/src/stages/preparation.css        [LANE-BLOCKED, session 080b9104]
  18 admin/src/styles/error-log.css
  18 admin/src/styles/feedback-inbox.css        [LANE-BLOCKED, session 080b9104]
  15 admin/src/styles/design/app-nav.css        [ALLOWLISTED]
  15 admin/src/styles/design/axes.css           ← NOT NAMED IN ANY PHASE
  15 frontend/src/styles/team-card.css          ← NOT NAMED IN ANY PHASE
  13 admin/src/styles/add-person-modal.css      ← NOT NAMED
  13 admin/src/styles/design/run-detail.css
  12 admin/src/stages/tests/promises-before-recap.js  [PARKED]
  12 admin/src/styles/pulse-drilldowns.css      ← NOT NAMED
  11 admin/src/stages/tests/promises-loop.js  [PARKED]
  11 admin/src/styles/test-gallery.css          ← NOT NAMED
   9 admin/src/styles/design/primitives.css     ← NOT NAMED
   9 admin/src/styles/guide.css                 ← NOT NAMED
   9 admin/src/ui/account-sheet.ts              [PHASE 6]
   7 admin/src/stages/design.js                 [ALLOWLISTED, PHASE 6]
   7 admin/src/styles/design/shared-components.css ← NOT NAMED
   7 frontend/src/stages/member-home.css
   5 admin/src/styles/design/breadcrumb.css
   5 admin/src/styles/design/promise-checkin.css ← NOT NAMED
   4 admin/src/styles/design/mobile.css
   4 admin/src/styles/design/persona-bench.css  ← NOT NAMED
   4 admin/src/styles/design/stage-lookback.css ← NOT NAMED (and lane a6878b4e)
   4 admin/src/styles/finish-feedback-modal.css
   3 admin/src/stages/meeting-arcs.js
   3 admin/src/styles/design/member-runs.css    ← NOT NAMED
   3 admin/src/styles/row-menu.css
   3 admin/src/styles/tailwind.css
   3 admin/src/ui/dev-badge.js                  [ALLOWLISTED]
   2 admin/src/styles/design/orb.css            [ALLOWLISTED]
   2 admin/src/styles/ux-audit-fixes.css        ← NOT NAMED
   2 admin/src/ui/profile-badge.js              [PHASE 6]
   2 admin/src/ui/recap-pdf.ts                  [false positives]
   1 each: about.test.ts, intake-firstrun.test.ts, start-welcome.test.ts,
           design/flow-kit.css, design/save-pip.css, lexicon-review.css,
           ui/build-stamp.js [ALLOWLISTED], guided/guided.page.ts:345

SIXTEEN files carrying type are named in NO phase file (3, 4, 5 or 6). They hold ~104 of the
439 unsanctioned-size-token hits. Unless Phase 3's "~150 chrome selectors" is read as covering
them, the guard flip cannot reach zero. This is the single biggest hole in the plan.

A FIFTH type system exists outside all of it: docs/reports/sero-how-it-works.html (53 font-size)
and docs/reports/sero-changelog.html (21). Both are customer-facing pages Carl keeps updated.
Out of scope for Phase 6 as written; flagged so the lock is not claimed to cover them.

================================================================================
1. admin/src/ui/recap-pdf.ts — the PDF
================================================================================
Allowlisted at scripts/lint-design-tokens.js:79 (`/(^|[\\/])recap-pdf\.ts$/`) and in
DESIGN.md §6 Exemptions line 368. The exemption is real: pdfmake cannot read CSS variables.

EVERY fontSize (20 sites, not 18 as plan.md says). 8 distinct values: 8, 8.5, 9, 9.5, 10, 10.5, 15, 20.
  L127   8.5   eyebrow() helper — EVERY section eyebrow: "1:1 RECAP", "WHAT STOOD OUT",
                "WHAT WE UNDERSTOOD", "FINAL READ", "THE HONEST READ", "HOW ENGAGED THEY SEEM",
                "WHAT YOU AGREED", "SERO'S SUGGESTIONS", "REMINDERS". bold, uppercase, accentDark.
  L207  15     the "Sero" wordmark in the header band. bold, accentDark, Inter.
  L208   9     the date line, right-aligned in the header band. inkMute.
  L221   8     "WHO THIS WAS FOR" label inside the intake tinted box. bold, uppercase.
  L228   9.5   "Meeting: <type>" inside the intake box. inkDim.
  L231   8     "WHAT SERO WAS TOLD GOING IN" label. bold, uppercase.
  L238  20     the briefing HEADLINE. font "Bricolage", lineHeight 1.12, ink.
  L263  10     an axis NAME in the Final read row (width 78, bold).
  L270  10     an axis SCORE, right-aligned (width 26, bold, mint/coral/dim by sign).
  L278   9.5   an axis MEANING line. inkDim.
  L289   9.5   the "…Not enough signal to read this session." unread-axes line. inkMute.
  L301   8.5   "Honest read:<name>  ·  OK to share" label in the mint box. bold, cs 0.5, mintText.
  L307   8.5   "Honest read:You  ·  Private, just for you" label in the gold box. bold, goldText.
  L316   9.5   the "Your move  " inline lead-in on the engagement line. bold, accentDark.
  L336   8     the promise GROUP label ("YOU PROMISED" / "<NAME> PROMISED"). bold, uppercase.
  L347   9     the promise WHEN pill ("Today" / "Next 1:1"), width 66. bold, accentDark.
  L366   9     the suggestion WHEN pill, width 66. bold, accentDark. (twin of L347)
  L388  10.5   defaultStyle — every unstyled text node: summary bullets (L244), the
                understanding paragraph (L252), the quoted intake notes (L232), the honest-read
                bodies (L302/L308), promise and suggestion actions (L349/L368), reminders (L380),
                and the name/role line (L224). This is the PDF's body copy.
  L392   8.5   footer credit "Made with Sero · seroapp.com". inkMute.
  L393   8.5   footer folio "<n> / <total>". inkMute.

EVERY lineHeight (2 sites). pdfmake's lineHeight is a MULTIPLIER, not an absolute length.
  L238  1.12   on the 20pt headline.
  L388  1.4    on defaultStyle — inherited by every text node without its own.

EVERY characterSpacing (6 sites). pdfmake's characterSpacing is ABSOLUTE POINTS, not em.
  L130  1.2    the eyebrow() helper (at 8.5pt → 0.141em).
  L221  1      "WHO THIS WAS FOR" (at 8pt → 0.125em).
  L231  1      "WHAT SERO WAS TOLD GOING IN" (at 8pt → 0.125em).
  L301  0.5    the mint honest-read label (at 8.5pt → 0.059em).
  L307  0.5    the gold honest-read label (at 8.5pt → 0.059em).
  L339  1      the promise group label (at 8pt → 0.125em).
  Three different tracking values for what is one object (an uppercase eyebrow) is the same
  T2 defect the screen migration is fixing.

STATIC FONT FILES AT admin/src/assets/pdf-fonts/ — confirmed by `ls`, three only:
  bricolage-semibold.ttf  48,400 bytes
  inter-bold.ttf          66,640 bytes
  inter-regular.ttf       66,416 bytes
Registered at recap-pdf.ts:404-407; fetched at :424-428.
Bricolage's `normal` and `bold` both point at bricolage-semibold.ttf, so pdfmake's `bold:true`
on Bricolage is a no-op (no synthetic emboldening). That is correct and should stay.

ROLE WEIGHTS WITH NO PDF EQUIVALENT:
  weight 500 (--type-weight-medium) — used by .type-label. NO inter-medium.ttf. A label in the
    PDF must fall to 400 (loses its separation from body-sm) or 700 (too heavy).
  weight 600 (--type-weight-semibold) on the INTER side — used by .type-heading-sm (18px),
    .type-heading-xs (16px), .type-label-strong, .type-overline. NO inter-semibold.ttf.
    All four fall to inter-bold (700). Visibly heavier than the screen.
  weight 600 on the BRICOLAGE side — covered exactly (display, heading-xl/lg/md, metric). ✓
  weight 400 Inter — covered exactly (body-lg, body, body-sm). ✓
  .type-code — NO MONO FONT SHIPS AT ALL. The role has no PDF form. (No code renders in the
    recap today, so it is a gap, not a bug. Say so rather than pretending it is covered.)
  .type-metric's tabular figures — pdfmake exposes no font-feature control, so tabular-nums
    cannot be delivered. The Final read column is one digit wide, so it does not bite.

THE CONVERSION, and why.
pdfmake measures in POINTS. 1pt = 1/72 inch; CSS 1px = 1/96 inch. Therefore pt = px × 0.75
(and px = pt ÷ 0.75). Nothing else is defensible: any other factor makes the printed page a
different size from the screen for no stated reason.
This conversion is already half-true in the file by accident, which is the strongest evidence
for adopting it: defaultStyle is fontSize 10.5 / lineHeight 1.4, and 10.5pt = 14px with
20/14 = 1.4286 leading. The PDF's body copy is ALREADY .type-body-sm. Likewise the "Sero"
wordmark at 15pt = 20px = exactly .type-heading-md.
pdfmake lineHeight is a multiplier, so it is leadingPx ÷ sizePx, not the absolute leading.
pdfmake characterSpacing is absolute pt, so it is emValue × sizeInPt.

THE PRINT LADDER (derived, to be written into recap-pdf.ts as a documented const block):
  role           screen      pt      lineHeight   font        weight     tracking (pt)
  display        36/40       27      1.111        Bricolage   600 ✓      -0.54
  heading-xl     30/36       22.5    1.2          Bricolage   600 ✓      -0.225
  heading-lg     24/32       18      1.333        Bricolage   600 ✓      -0.18
  heading-md     20/28       15      1.4          Bricolage   600 ✓      0
  heading-sm     18/28       13.5    1.556        Inter       600 ✗→700  0
  heading-xs     16/24       12      1.5          Inter       600 ✗→700  0
  body-lg        18/28       13.5    1.556        Inter       400 ✓      0
  body           16/24       12      1.5          Inter       400 ✓      0
  body-sm        14/20       10.5    1.429        Inter       400 ✓      0
  label          14/20       10.5    1.429        Inter       500 ✗      0.21
  label-strong   14/20       10.5    1.429        Inter       600 ✗→700  0
  overline       14/20       10.5    1.429        Inter       600 ✗→700  0.84  (uppercase)
  code           14/20       10.5    1.429        —— NO FONT SHIPS ——
  metric         30/36       22.5    1.2          Bricolage   600 ✓      -0.225 (no tabular)

CONSEQUENCE, stated plainly: the ladder has no rung below 14px, so it has no print rung below
10.5pt. Six of the eight sizes in the file today (8, 8.5, 9, 9.5, 10, and the 20pt headline)
are off it. Everything at 8–10pt rises to 10.5pt: the nine section eyebrows, the date line, the
two intake labels, the two honest-read labels, the axis names/scores/meanings, the "Your move"
lead-in, the promise group label, both when-pills, and both footer lines. Expect the PDF to
grow by roughly one page. That is a visible change and it is the point of the phase, but it is
Carl's call, not the build's (see openQuestions).

PROPOSED PER-SITE REMAP (all 20 fontSize sites):
  L127 eyebrow()  8.5/cs1.2  → overline      10.5 / lh1.429 / cs 0.84 / bold
  L207 wordmark   15         → heading-md    15   / lh1.4   / font "Bricolage"  (size unchanged;
                                                  the family changes to the display face)
  L208 date       9          → body-sm       10.5 / lh1.429
  L221 label      8/cs1      → overline      10.5 / cs 0.84   (merge with the eyebrow() helper)
  L228 meeting    9.5        → body-sm       10.5
  L231 label      8/cs1      → overline      10.5 / cs 0.84   (merge with the eyebrow() helper)
  L238 headline   20/lh1.12  → heading-xl    22.5 / lh1.2 / cs -0.225 / font "Bricolage"
  L263 axis name  10         → label-strong  10.5 / bold
  L270 axis score 10         → label-strong  10.5 / bold
  L278 meaning    9.5        → body-sm       10.5
  L289 unread     9.5        → body-sm       10.5
  L301 mint lbl   8.5/cs0.5  → label-strong  10.5 / cs 0 (sentence case, so NOT overline)
  L307 gold lbl   8.5/cs0.5  → label-strong  10.5 / cs 0
  L316 your move  9.5        → label-strong  10.5 (inline lead-in inside a body-sm line)
  L336 grp label  8/cs1      → overline      10.5 / cs 0.84
  L347 when pill  9          → label-strong  10.5   ⚠ width:66 was sized for 9pt
  L366 when pill  9          → label-strong  10.5   ⚠ width:66 was sized for 9pt
  L388 default    10.5/lh1.4 → body-sm       10.5 / lh1.429  (effectively unchanged)
  L392 footer     8.5        → body-sm       10.5  OR a documented print-chrome waiver at 8.5
  L393 folio      8.5        → body-sm       10.5  OR a documented print-chrome waiver at 8.5
Layout numbers that may need a companion nudge (not type, but caused by the type change):
  L347/L366 `width: 66` (the when column), L263 `width: 78` (the axis-name column),
  L271 `width: 26` (the score column). Check "Next 1:1" and the longest axis name at 10.5pt bold.
  L212 `x2: 499` and L387 pageMargins [48,52,48,58] are correct for A4 (595.28 − 96 = 499.28) and
  do not move.

Existing test: admin/src/ui/recap-pdf.test.ts exists and asserts CONTENT only (section
headings, sort order, promise grouping, filename). No size assertion anywhere. Phase 6 must add
one: every fontSize in buildRecapDocDefinition() is one of the seven print rungs. That test is
the only thing that can hold this file, because the CSS guard is allowlisted out of it.

================================================================================
2. backend/api/services/notifications/email-layout.ts — the fourth type system
================================================================================
Outside the guard entirely: scripts/lint-design-tokens.js:66 sets
SCAN_DIRS = ["admin/src", "frontend/src"]. backend/ is never walked. Nothing in the repo has
ever checked this file — confirmed: no test file references email-layout, and
notifications.service.test.ts asserts nothing about type or colour.
It is the ONLY file under backend/ with any type declaration, and the ONLY file under backend/
with any hex literal (verified: 0 hex matches in backend/**/*.ts outside it).

EVERY font-size, with line number:
  L31   11px    the EYEBROW. weight 600, letter-spacing 0.08em, text-transform uppercase,
                colour #5aa9e6. Used by the admin-notification and password-reset emails
                (notifications.service.ts:71 "Admin notification", :147 "Password reset").
                ★ BELOW THE 14px FLOOR by 3px. This is the breach the phase file names.
  L40   0       `font-size:0;line-height:0` on the 4px accent bar's &nbsp; spacer. NOT text.
  L43   23px    the "Sero" wordmark. weight 600, colour #1b5d91.
  L45   0       `line-height:1px;font-size:0` on the hairline rule's &nbsp;. NOT text.
  L48   22px    the email HEADING. weight 600, colour #173a56, line-height 1.25.
  L52   12px    the footer line "Sero · 1:1 prep that actually helps". colour #9aabbb.
                ★ BELOW THE FLOOR by 2px. plan.md did not flag this one.
  L63   15px    emailParagraph() — every body paragraph in every email. line-height 1.6,
                colour #4a6072. ★ 15px is banned outright by DESIGN T2.
  L71   14px    emailDetailPanel() key cell. colour #7089a0.
  L72   14px    emailDetailPanel() value cell. weight 500, colour #1b3a54.
  L85   15px    emailButton() label. weight 600, colour #ffffff. ★ 15px again.
  L92   12.5px  emailFinePrint(). colour #8ea3b5. ★ BELOW THE FLOOR, and plan.md missed it.
  So: THREE floor breaches (11, 12, 12.5), not one. Plus two banned 15px, plus 22 and 23 which
  are both off the ladder (nearest rungs 24 and 24).

EVERY letter-spacing: exactly one.
  L31   0.08em  on the eyebrow. This is --type-tracking-caps-lg VERBATIM. The eyebrow is already
                .type-overline in everything but its size and its colour.

EVERY line-height:
  L40   0       spacer.  L45  1px  spacer.  L48  1.25 on the heading.  L63  1.6 on paragraphs.
  Note both real ones are RATIOS. The role system uses absolute leadings.

EVERY colour literal (20 occurrences, 14 distinct values). Only 3 match a Sero token:
  MATCHES A TOKEN
    #5aa9e6  L31, L40, L52, L85   = --sero-primary-700 / --color-accent ✓
    #1b5d91  L43                  = --sero-primary-800 / --color-accent-dark ✓
    #ffffff  L39, L85             = --sero-offwhite-50 ✓ (but DESIGN says surfaces are
                                     never pure white on screen — #fdfefe)
  NO TOKEN ANYWHERE IN SERO
    #e9f3fc  L36 (body bg), L37 (outer table bg) — ONE DIGIT off --sero-primary-200 (#e9f3fb)
    #d9e8f6  L39  card border          (nearest --sero-primary-300 #d7eaf8)
    #eef4fa  L45  hairline, L51 footer border-top  (nearest --sero-primary-200 #e9f3fb)
    #173a56  L48  heading ink          (nearest --sero-navy-800 #133650)
    #fbfdff  L51  footer background    (nearest --sero-primary-50 #fdfeff)
    #9aabbb  L52  footer text
    #4a6072  L63  paragraph ink        (nearest --color-ink-dim #636363)
    #7089a0  L71  detail key ink
    #1b3a54  L72  detail value ink     (nearest --sero-navy-700 #1e5780)
    #f2f8fd  L76  detail panel bg      (nearest --sero-primary-100 #f5fafd)
    #e0eefa  L76  detail panel border
    #8ea3b5  L92  fine-print ink
  Four of those are colour-as-text and fail DESIGN §2's 4.5:1 bar on their own backgrounds:
    #5aa9e6 eyebrow on white ≈ 2.2:1 (and at 11px)
    #9aabbb footer on #fbfdff ≈ 2.4:1
    #8ea3b5 fine print on white ≈ 2.9:1
    #7089a0 detail key on #f2f8fd ≈ 3.6:1
  Same class of defect the 2026-07-05 a11y pass fixed on screen. Worth fixing in the same move,
  but it is a colour decision, not a type one — flag it, do not silently repaint.

FONT FAMILY: L17 `FONT` and L20 `HEAD_FONT` are a literal stack:
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif"
  HEAD_FONT === FONT (L20). This is a legitimate, documented email exemption and must stay
  literal: the file's own comment at L14-16 explains that mail clients do not load @font-face,
  so Bricolage and Inter are both unavailable. It needs an exemption note, not a fix.

WHICH CLIENTS SERO TARGETS — the file says so, three times:
  L3-5   "Built email-safe on purpose — tables + inline styles + hex colours (no <style>,
          no classes, no SVG) so it renders the same in Gmail / Outlook / Apple Mail."
  L7-8   "The logo is a hosted PNG (email clients strip inline SVG)."
  L14-16 "email clients don't load @font-face"
  Consequences that bound every fix: NO <style> block → no CSS classes and no CSS variables;
  NO media queries → no phone breakpoint (the heading cannot drop a rung on a phone);
  inline style attributes only. So the values must be baked in as literals at build time.

PROPOSED FIX — smallest thing that actually holds:
  A hand-written constants module, plus a test that reads the real stylesheets and asserts the
  constants match. NOT a code generator: a generator adds a build step and a "did you re-run it"
  failure mode, and the test alone gives the identical guarantee.

  NEW FILE  backend/api/services/notifications/email-type.ts
    export const EMAIL_TYPE = {
      overline:    { size: 14, leading: 20, weight: 600, tracking: "0.08em", upper: true },
      headingLg:   { size: 24, leading: 32, weight: 600 },
      headingMd:   { size: 20, leading: 28, weight: 600 },
      body:        { size: 16, leading: 24, weight: 400 },
      bodySm:      { size: 14, leading: 20, weight: 400 },
      label:       { size: 14, leading: 20, weight: 500 },
      labelStrong: { size: 14, leading: 20, weight: 600 },
    } as const;
    plus a helper `css(role)` that emits `font-size:16px;line-height:24px;font-weight:400;`
    so no call site writes a number.
    Comment must say WHY: mail clients load no stylesheet, so the role table is copied here as
    literals and the test below is the only thing keeping the copy honest.

  NEW FILE  backend/api/services/notifications/email-layout.test.ts
    1. Parses admin/src/styles/design/tokens.css for --type-size-*/--type-leading-* and asserts
       every EMAIL_TYPE entry matches its rung. (The pattern is already proven in
       frontend/src/stages/preparation-css.test.ts, which parses tokens.css the same way.)
    2. Renders renderSeroEmail() + all four helpers and asserts EVERY `font-size:<n>px` in the
       output HTML is 0 (a spacer) or ≥ 14 and on the ladder. This catches the 11 / 12 / 12.5px
       breach class permanently.
    3. Asserts every hex in the output is in a small named allowlist, so a fourteenth colour
       cannot appear silently.
    It is auto-discovered: scripts/run-tests.js:49 globs backend/**/*.test.ts.

  PER-SITE REMAP:
    L31  eyebrow      11px/600/0.08em/upper  → overline     14/20/600/0.08em/upper
    L43  wordmark     23px/600               → headingLg    24/32/600
    L48  heading      22px/600/lh1.25        → headingLg    24/32/600  (or headingMd 20/28 if
                                               24 crowds the 520px card; 22 is off-ladder either way)
    L52  footer       12px                   → bodySm       14/20/400
    L63  paragraph    15px/lh1.6             → body         16/24/400
    L71  detail key   14px                   → label        14/20/500
    L72  detail value 14px/500               → labelStrong  14/20/600
    L85  button label 15px/600               → labelStrong  14/20/600  (or body 16 — a CTA at 14
                                               may read small; see openQuestions)
    L92  fine print   12.5px                 → bodySm       14/20/400
    L40, L45  font-size:0 spacers            → LEAVE ALONE. They are &nbsp; struts in an
                                               email-safe table, not text. The test must allow 0.

  ALSO: add "backend/api/services/notifications" to SCAN_DIRS in lint-design-tokens.js so the
  hole cannot reopen. Cost is zero: no other backend file has a type property or a hex.

================================================================================
3. The two template-literal <style> blocks
================================================================================
admin/src/ui/account-sheet.ts — injectStyles() at :32-77 appends a <style> to document.head at
RUNTIME, so it lands after every stylesheet including the code-split satellites. It wins every
same-specificity tie. Six font-size sites, all the same declaration:
  L48  .acct-back            `font: inherit; font-size: var(--type-body-sm, 14px);`  (a <button>)
  L53  .acct-dots            `letter-spacing: 3px; ... font-size: var(--type-body-sm, 14px);`
  L60  .acct-input           `font-size: var(--type-body-sm, 14px); font-family: inherit;`
  L67  .acct-hint            `font-size: var(--type-body-sm, 14px);`
  L69  .acct-page .btn       `padding: 8px 14px; font-size: var(--type-body-sm, 14px);`
  L70  .acct-label           `font-size: var(--type-body-sm, 14px);`
  All six also register as relative-font-size (the var() fallback) and unsanctioned-size-token
  (--type-body-sm is not a --type-size-*). 6 of the 33 and 6 of the 439.
  L53's `letter-spacing: 3px` is NOT tracking: it spreads the eight bullet characters in the
  masked-password display. Decorative. Leave it, waive it, and say why.

CAN THEY TAKE ROLE CLASSES? Yes, and markup is the better route here.
  Every one has real markup: .acct-hint ×2 (L102, L107), .acct-label ×4 (L104, L136, L141, L143),
  .acct-input ×5 (L103, L105, L125, L142, L144), .acct-back ×1 (L117), .acct-dots ×1 (L136).
  Because the injected block loads LAST, grouping the selectors into type.css would NOT work on
  its own — that is exactly the half-applied failure P2 hit with coach-panel.css. The block must
  give up its type declarations either way. Once it has, both routes are safe; markup classes
  are fewer edits (13 attributes vs 6 selector-list entries plus 6 deletions plus a phone-block
  repeat), and they read correctly to the next person.
  RECOMMEND: delete all six declarations from the injected block; add `type-body-sm` to .acct-hint
  and .acct-back, `type-label` to .acct-label, `type-body-sm` to .acct-input and .acct-dots.
  Delete the `.acct-page .btn` rule's font-size outright — it only exists to beat
  buttons-inputs.css's `.btn` size, and once .btn takes a role in Phase 3/4 the override is dead
  weight. Keep its padding.
  `font: inherit` on .acct-back (L48) and `font-family: inherit` on .acct-input (L60) both go
  with the size: a <button> and an <input> do not inherit the page face, so the role class has to
  be the one thing giving them a face. This is the exact move P2 made for .cp-seg (type.css:170-174).

admin/src/ui/profile-badge.js — injectMenuStyles() at :39-71, same runtime-injected pattern.
  L59  .profile-badge__mi   `background: transparent; color: var(--color-ink); font: inherit;`
  L60  .profile-badge__mi   `font-size: var(--type-body-sm, 14px); text-align: left;`
  One font-size site (the account dropdown's three menu items), plus the `font: inherit` above it.
  Markup exists at :90, :91, :92 — three <button class="profile-badge__mi"> items.
  RECOMMEND: delete L59's `font: inherit` and L60's font-size; add `type-body-sm` to all three
  buttons. (A <button> needs an explicit face, so the role class must carry it.)
  ALSO IN THIS FILE: L43 `color: var(--color-ink-subtle, var(--color-ink))` — --color-ink-subtle
  is defined nowhere in either app. It is one of the three undefinedToken hits and it blocks the
  undefinedToken flip. The fallback works, so nothing is visibly wrong; swap it to
  var(--color-ink-dim) or var(--color-ink) and drop the fallback.

================================================================================
4. THE GUARD FLIP
================================================================================
Measured today, `node scripts/lint-design-tokens.js --json`: 207 files scanned, 0 errors.

RULE-BY-RULE. "count today" = the live number; "ceiling" = scripts/test-design-guard.js:43-97.

A. relative-font-size          33 / 33     WILL NOT REACH ZERO
   All 33 are `var(--token, <fallback>)`. Zero em/%/calc left (P0 cleared the last two).
   By file: error-log.css 11 (:20,36,37,63,65,68,73,76,80,83,96) · feedback-inbox.css 8
   (:32,41,53,69,72,89,100,125) · account-sheet.ts 6 · finish-feedback-modal.css 3 (:7,15,16) ·
   profile-badge.js 1 (:60) · run-detail.css 1 (:40) · stage-extras.css 1 (:56) ·
   test-engine.css 1 (:16) · ux-audit-fixes.css 1 (:26).
   Zero requires: every one of those loses its fallback (or its declaration).
   Covered: error-log.css (P3), finish-feedback-modal.css + stage-extras.css + run-detail.css (P4),
            account-sheet.ts + profile-badge.js (P6).
   NOT COVERED by any phase: feedback-inbox.css (8) — and it is LANE-BLOCKED by session 080b9104,
            test-engine.css (1), ux-audit-fixes.css (1). ⇒ 10 hits remain at the end of P5.

B. off-ladder-font             22 / 22     REACHES ZERO ONLY IF ONE ORPHAN IS ADOPTED
   guided.css ×15 (:93,108,110,113,122,142,178,180,181,200,241,272,328,339,367,376 — mixed
   --type-body-md 15px and --type-body-lg 17px) and team-card.css ×2 (:31 15px, :47 17px) →
   both are P4 territory (guided.css named; team-card.css NOT named).
   about-stage.css:105 (17px) → P4 ✓ · meeting-arcs.css:18 (1.1rem = 17.6px) → P4 ✓ ·
   admin-tables.css:386 (1.75rem = 28px) → P3 file ✓ · test-engine.css:139 (1.05rem = 16.8px)
   → NOT NAMED anywhere.
   ⇒ 3 hits (team-card ×2, test-engine ×1) sit outside every phase.

C. unsanctioned-size-token    439 / 439    THE MIGRATION ITSELF; WILL NOT REACH ZERO AS PLANNED
   Every font-size still pointing at an old token. Top files: guided.css 42 · buttons-inputs.css 33 ·
   preparation-lab.css 28 · stage-extras.css 24 · design-stage.css 22 · admin-tables.css 18 ·
   start-stage.css 18 · base.css 17 · notes-panel.css 17 · test-engine.css 16 · admin-pulse.css 15 ·
   briefing.css 15 · stage-review.css 14 · meeting-arcs.css 14 · promise-agree.css 12 ·
   error-log.css 11 · about-stage.css 10 · run-log.css 10 · preparation.css 9 · auth.css 8 ·
   feedback-inbox.css 8 · run-detail.css 7 · session-topbar.css 7 · axes.css 6 · account-sheet.ts 6 ·
   team-card.css 6 · add-person-modal.css 5 · primitives.css 5 · guide.css 5 · test-gallery.css 5 ·
   member-home.css 4 · finish-feedback-modal.css 3 · pulse-drilldowns.css 3 · persona-bench.css 2 ·
   promise-checkin.css 2 · then 12 files at 1 each.
   Zero requires: every font-size in both apps points at a --type-size-* token, i.e. Phase 5's
   token deletion lands AND the sixteen unnamed files are swept.
   ⇒ ~104 hits live in files no phase file names (see §0). Plus 8 lane-blocked in feedback-inbox.css.

D. literal-font-size           12 / 12     WILL NOT REACH ZERO — one is deliberate
   add-person-modal.css:20 (1.25rem/20px) NOT NAMED · admin-pulse.css:23 (30px) P5 ✓ ·
   admin-tables.css:386 (1.75rem/28px) P3 ✓ · buttons-inputs.css:62 (clamp 20→28) P4 ✓ ·
   design-stage.css:516 (1.5rem/24px) NOT NAMED · member-runs.css:59 and :66 (0.875rem/14px)
   NOT NAMED · run-detail.css:10 (1.125rem/18px) P4 ✓ · test-engine.css:139 (1.05rem) NOT NAMED ·
   meeting-arcs.css:18 (1.1rem) P4 ✓ · guided.css:208 (30px) P5 ✓ ·
   ★ mobile.css:298 `font-size: max(1rem, 1em)` — the iOS input-zoom guard. There is no token
     form of `max(1rem, 1em)`; the guard's own comment (lint-design-tokens.js:281-287) says this
     is the case the max() branch exists to keep green. It CANNOT become a token. It needs a
     `lint-tokens-ignore` waiver with the reason, or the rule stays a warning forever.

E. undefined-token              3 / 3      REACHES ZERO WITH TWO ONE-LINE FIXES
   start-stage.css:226 and :250 → var(--sero-radius-pill), defined nowhere. Both declarations
   are DROPPED at render today (no fallback), so the pills already render with no radius from
   this line. Named in no phase. Fix: --sero-radius-full.
   profile-badge.js:43 → var(--color-ink-subtle, var(--color-ink)). Phase 6's own file.

F. clamp-off-rung              10 / 10     REACHES ZERO IF PHASE 5 LANDS
   Eight are the three fluid tokens Phase 5 deletes: --type-display (base.css:58, :68,
   briefing.css:6), --type-h1 (auth.css:48), --type-h2 (admin-tables.css:110, auth.css:119,
   auth.css:178, base.css:77, preparation-lab.css:516).
   Two are hand-written: buttons-inputs.css:62 `clamp(1.25rem, 3.5vw, 1.75rem)` (P4 ✓).
   ⚠ auth.css holds 3 of the 8 and is named in NO phase.

G. display-face-below-20        7 / 7      4 OF 7 SIT OUTSIDE EVERY PHASE
   design-stage.css:42 (18px) NOT NAMED · session-topbar.css:52 (18px) P3 ✓ ·
   test-gallery.css:26 (18px) NOT NAMED · guided.css:91 (14px!) P4 ✓ · guided.css:365 (18px) P4 ✓ ·
   team-card.css:31 (15px) NOT NAMED · team-card.css:47 (17px) NOT NAMED.

H. font-family-literal          8 / 8      REACHES ZERO, BUT ONE IS LOAD-BEARING
   base.css:24 — the `body` stack. tokens.css:355-361 states --type-family-base must stay
   BYTE-IDENTICAL to it, and two parked prototypes depend on that. Replacing the literal with
   var(--type-family-base) is safe and produces the identical stack, but it inverts the
   dependency: after the swap tokens.css is the source and base.css the consumer. Update the
   tokens.css comment in the same commit or it becomes a lie.
   run-log.css:36, :108, :126, :134, :148, :229 — six copies of the same mono stack → .type-code (P3 ✓).
   guide.css:29 — a seventh, slightly different mono stack (no Consolas) → .type-code. NOT NAMED.

I. font-shorthand-resets-numeric  0 / 0    ALREADY ZERO. Flip is free.

J. nonTokenFont (legacy)        7 / 7      DO NOT FLIP — DELETE IT
   scripts/lint-design-tokens.js:684-693 keeps it px-only on purpose and its own comment says
   "retired in Phase 6". Its 7 hits are a strict subset of literal-font-size's 12. Flipping it
   would double-report the same debt under two names. Remove the rule, its CEILINGS entry
   (test-design-guard.js:44) and its byFile() branch (test-design-guard.js:191-195).

K. THE HEADLINE RULE DOES NOT EXIST YET — it is a WRITE, not a FLIP.
   phase-6.md:9 says font-size, line-height, font-weight, letter-spacing, font-family,
   text-transform, font-variant-numeric and `font` may appear ONLY in tokens.css and type.css.
   scripts/lint-design-tokens.js has NO rule counting line-height, font-weight, text-transform
   or font-variant-numeric anywhere. It has to be written from scratch:
     new rule `type-prop-outside-sanctioned`, one hit per declaration, allowlist = exactly
     design/tokens.css + design/type.css, honouring the existing per-line lint-tokens-ignore
     waiver and the TYPE_EXEMPT gallery skip.
   Its count today is ~1,413 declarations across 65 files (1,484 total minus type.css's 69 minus
   recap-pdf.ts's 2 false positives). Adding it as an ERROR is only possible after C reaches zero.
   Add it as a WARNING with a ceiling first, measure, then flip in the same commit as the rest —
   otherwise the build goes red on day one, which is the exact failure test-design-guard.js's
   header comment (lines 13-16) was written to avoid.

TESTS THAT BREAK WHEN THE FLIP LANDS (all three are hard fails, none are flagged in phase-6.md):
  frontend/src/stages/preparation-css.test.ts:112 `assert.ok(/font-size\s*:/.test(css))` —
    "at least one font-size declared" in preparation.css. Once P4 strips that sheet, FAILS.
  frontend/src/stages/preparation-css.test.ts:126 `assert.ok(declarations.length > 0)` — same cause.
  frontend/src/stages/preparation-css.test.ts:119 `assert.ok(TOKENS.has("--type-body-sm"))` —
    P5 deletes --type-body-sm from tokens.css. FAILS.
  admin/src/styles/design/chip-system.test.ts:40 `GEOMETRY = /(border-radius|padding|font-size|
    font-weight)\s*:/` reading base.css — P5 already flags the repoint; note it also has to stop
    expecting font-size/font-weight to live in a component sheet at all.

ALLOWLIST / DESIGN.md §6 TWINNING (lint-design-tokens.js:44-53 says "change one, change the other"):
  recap-pdf.ts keeps its entry, but the comment must change from "each hex names its token" to
  "each hex names its token AND each fontSize is a print rung derived from the roles; held by
  admin/src/ui/recap-pdf.test.ts".
  stages/design.js keeps its entry (item 7).
  Add TYPE_EXEMPT (admin/src/stages/tests/) to DESIGN.md §6 Exemptions — it is in the code
  (lint-design-tokens.js:98) but NOT in DESIGN.md today, so the twinning is already broken.
  Add email-layout.ts's literal font stack as a named exemption (mail clients load no webfont).

================================================================================
5. THE HEADLINE INVARIANT — see §0. Answer: 67 files today; the "two files" target is
   unreachable and the check must be replaced. Full list in §0.
================================================================================

================================================================================
6. DESIGN.md §3 — verbatim quotes and what is now false
================================================================================
Section 3 runs DESIGN.md:167-229. Quoted verbatim:

  L167  ## 3. Typography
  L169  **Display:** Bricolage Grotesque (600) — page names, person names, the briefing headline.
  L170  **Body:** Inter — everything else. Weights 400/500/600.
  L172  ### Hierarchy
  L173  - **Display** (Bricolage 600, ~40px, lh 1.1): one per screen.
  L174  - **Headline** (Bricolage 600, ~30px): section-level page titles.
  L175  - **Title** (Inter 600, 20px): card and section headings.
  L176  - **Body** (Inter 400, 16px, lh 1.55): all reading. Line width capped by T5 below.
  L177  - **Label** (Inter 500, 14px): metadata, table headers, eyebrows. **14px is the floor —
        nothing smaller, ever.**
  L179  ### The nine type rules
  L181  **T1. Four levels per screen, no more.** A screen carries at most four text treatments
        (e.g. display, title, body, label). A fifth idea reuses one of the four rather than
        inventing a fifth.
  L184  **T2. Make levels obviously different.** Two levels on one screen differ by at least one
        rung of the ladder below, and ideally by weight or ink as well. A 1–2px difference is not
        a level, it's a bug: **15px and 17px are noise, not hierarchy.** The 14→16 rung is the one
        narrow pair (14%), so those two must also differ in weight or ink colour.
  L189  **T3. The ladder: 14 · 16 · 18 · 20 · 24 · 30 · 40.** Seven rungs; most screens use three
        or four. Nothing sits between rungs. Fluid `clamp()` sizes start and end on a rung.
  L192  **One rung, one token name.** A rung has exactly one `--type-*` token. Caption, Label and
        Lead used to have their own size tokens that resolved to a rung another token already
        owned (14px three times over, 18px twice), which is four ways to write the same thing and
        no way to tell them apart on screen. They are **treatments, not sizes**: a label is
        `--type-body-sm` + weight 500 + `--type-tracking-wider`, set where it is used.
  L198  > Known drift (2026-07-26, reported not fixed): `--type-h1` (32–44px) currently renders
        *larger* than `--type-display` (30–42px), so the top of the ladder is inverted; and
        `--type-body-md` (15px) and `--type-body-lg` (17px) fail T2. Fixing these is a separate
        pass with screenshots.
  L202  **T4. Line-height falls as size rises.** 14→1.4 · 16→1.5 · 20→1.3 · 24→1.25 · 30→1.2 ·
        40→1.1. Big type already has presence; extra leading just fragments it. One global
        line-height is wrong.
  L205  **T5. Reading content caps at 66 characters per line** (75 absolute max). This governs
        prose: the briefing, recaps, anything generated. Tables and working surfaces are **not**
        capped by measure — their width comes from their columns.
  L209  **T6. Bricolage only at 20px and above.** The display face is cut for size. Inter carries
        all body, labels, controls, table cells and captions. Bricolage below 20px is a defect.
  L212  **T7. Tabular numerals for anything that lines up or changes.** Add
        `font-variant-numeric: tabular-nums` to tables, right-aligned numeric columns, timers,
        scores, and any figure that updates in place while the reader watches. Prose keeps
        proportional figures.
  L216  **T8. One bold phrase per paragraph, maximum.** In generated prose, never bold a whole
        sentence and never bold the lead-in of every bullet. Blanket bolding is the loudest AI
        tell and it destroys the scanning value bold is meant to buy.
  L220  **T9. Let CSS absorb unknown lengths.** Model output can't be hand-tuned, so headings
        carry `text-wrap: balance` (no one-word last lines) and prose carries `text-wrap: pretty`.

And §6 rule 14, DESIGN.md:351-353, verbatim:
  14. **Do** keep type on the ladder (**14 · 16 · 18 · 20 · 24 · 30 · 40**), at most **four levels**
      per screen, each visibly different; **don't** invent 15px or 17px. Bricolage ≥20px only; prose
      capped at 66 characters a line (see §3, T1–T6).

EVERY STATEMENT THE ADOPTED SYSTEM NOW CONTRADICTS:
  1. L173 "~40px" for Display. FALSE. The top rung is 36 (--type-size-4xl: 2.25rem). Tailwind's
     ramp has no 40 and the scale was adopted whole; Carl signed off the 36px hero at the specimen.
  2. L173 "lh 1.1" for Display. FALSE as a ratio. display is 36/40 = 1.111, and it is declared as
     an absolute 2.5rem, not a multiplier.
  3. L176 "lh 1.55" for Body. FALSE. body is 16/24 = 1.5, declared absolutely as 1.5rem.
  4. L189 T3 "14 · 16 · 18 · 20 · 24 · 30 · 40". FALSE at the top rung. It is 36.
  5. L192 "a label is `--type-body-sm` + weight 500 + `--type-tracking-wider`". FALSE twice:
     --type-body-sm is deleted by Phase 5, and .type-label uses --type-tracking-wide (0.02em),
     not --type-tracking-wider (0.04em). type.css:161-167.
  6. L198-200 the "Known drift" block. NOW FIXED / BEING FIXED and must be deleted outright:
     the h1-over-display inversion dies with Phase 5's token deletion; 15px and 17px die in
     Phase 4. Leaving a "reported not fixed" note against fixed work is the drift the guard exists
     to stop.
  7. L202 T4 "Line-height falls as size rises. 14→1.4 · 16→1.5 · 20→1.3 · 24→1.25 · 30→1.2 · 40→1.1".
     FALSE in FORM and in VALUE.
     Form: leadings are now absolute px married to a size, not ratios. tokens.css:331-335 warns
     explicitly that the two families (--type-leading-tight/snug/normal/relaxed multipliers vs
     --type-leading-sm..4xl absolute lengths) are not interchangeable.
     Value: T4 says 16→1.5 (true, 24/16) but 20→1.3 while heading-md is 20/28 = 1.4; 24→1.25 while
     heading-lg is 24/32 = 1.333; 30→1.2 (true, 36/30); 14→1.4 while body-sm is 14/20 = 1.4286.
     T4's own premise ("line-height falls as size rises") is also broken by the real ramp: 18px
     takes 28 (1.556) which is HIGHER than 16px's 1.5. The real rule is "every leading lands on
     the 4px grid", not "the ratio falls monotonically".
  8. L177 "**Label** (Inter 500, 14px): metadata, table headers, eyebrows". PARTLY FALSE. There
     are now THREE distinct 14px chrome roles separated by weight and tracking, not one:
     label (500/0.02em), label-strong (600/none), overline (600/0.08em/uppercase).
  9. L179 "The nine type rules" heading survives, but nothing in §3 says WHERE type may be
     declared or HOW a screen joins a role — the two facts that govern every change from here.
     That is an omission, not a contradiction, and it is the most important thing to add.
 10. §6 rule 14 (L351-353) repeats the 40 and the "don't invent 15px or 17px" framing. Both need
     the same correction, and the rule should name the two-file law.

DRAFT REPLACEMENT for §3 (build agent may lift this verbatim):

## 3. Typography

**Display:** Bricolage Grotesque (600) — page names, person names, the briefing headline.
20px and up only.
**Body:** Inter — everything else. Weights 400/500/600.
**Mono:** one stack, `--type-family-mono`, for code and machine output.

The scale is Tailwind's default, adopted whole rather than invented here (read from
`tailwindcss/defaultTheme`). Seven rungs, each a locked size/leading PAIR. Every leading lands
on the 4px spacing grid, so type and spacing keep one rhythm. There is no 12px rung on purpose:
14px is the floor, and a token below it is an invitation to breach it. The top rung is **36, not
40** — adopting a standard scale means taking its top step too (Carl, specimen sign-off,
2026-07-30).

### The ladder (Layer 1 — `design/tokens.css`)

| token pair | size | leading |
|---|---|---|
| `--type-size-sm` / `--type-leading-sm` | 14px | 20px |
| `--type-size-base` / `--type-leading-base` | 16px | 24px |
| `--type-size-lg` / `--type-leading-lg` | 18px | 28px |
| `--type-size-xl` / `--type-leading-xl` | 20px | 28px |
| `--type-size-2xl` / `--type-leading-2xl` | 24px | 32px |
| `--type-size-3xl` / `--type-leading-3xl` | 30px | 36px |
| `--type-size-4xl` / `--type-leading-4xl` | 36px | 40px |

Use them in pairs. A size taken without its matching leading is how a heading ends up on a
line-height meant for body copy.

### The fourteen roles (Layer 2 — `design/type.css`)

A screen picks a role by what the text **is** ("this is a card title", "this is a field label"),
never by how big it should be, so the same decision made on two screens lands on the same numbers.

| role | size / leading | weight | family | carries |
|---|---|---|---|---|
| `.type-display` | 36 / 40 | 600 | Bricolage | tracking -0.02em, balanced wrap. One per screen. |
| `.type-heading-xl` | 30 / 36 | 600 | Bricolage | page title. Drops to 24/32 below 640px. |
| `.type-heading-lg` | 24 / 32 | 600 | Bricolage | section heading. |
| `.type-heading-md` | 20 / 28 | 600 | Bricolage | card heading. The last Bricolage rung (T6). |
| `.type-heading-sm` | 18 / 28 | 600 | Inter | below the display face's floor. |
| `.type-heading-xs` | 16 / 24 | 600 | Inter | |
| `.type-body-lg` | 18 / 28 | 400 | Inter | lede. Measure 44rem. |
| `.type-body` | 16 / 24 | 400 | Inter | all reading. Measure 38rem. |
| `.type-body-sm` | 14 / 20 | 400 | Inter | quiet supporting lines. |
| `.type-label` | 14 / 20 | 500 | Inter | tracking 0.02em. |
| `.type-label-strong` | 14 / 20 | 600 | Inter | |
| `.type-overline` | 14 / 20 | 600 | Inter | uppercase, tracking 0.08em. |
| `.type-code` | 14 / 20 | 400 | mono | |
| `.type-metric` | 30 / 36 | 600 | Bricolage | tabular figures. |

The three 14px chrome roles separate by **weight and tracking, not size**, so nothing here can
ever be shrunk to distinguish it.
Modifiers: `.type-body--narrow` (46ch) and `.type-body--full` (no cap). They are not roles: they
adjust one property of a body role and mean nothing alone.
Layer 3 is one `--type-role-*` composite per role, for a canvas or an inline style. Read the
warning at the head of `design/type.css` first: the `font:` shorthand carries only
weight/size/leading/family and **resets** `font-variant-numeric`, the Inter stylistic sets and
everything outside the font group; and the phone breakpoint targets the class, not the composite.

### Where type may be declared
`font-size`, `line-height`, `font-weight`, `letter-spacing`, `font-family`, `text-transform`,
`font-variant-numeric` and the `font` shorthand belong in **`design/tokens.css` and
`design/type.css` and nowhere else**. `npm run lint:tokens` fails the build otherwise.

### How a screen joins a role
`design.css` imports `type.css` **before** `base.css`, and component sheets import later still
(some are code-split and injected later again), so a role loses every same-specificity tie it
could be in. There are exactly two ways in, and both require the component's own sheet to hold
**zero** type declarations:
1. Group the component selector into the role's selector list in `type.css`. No markup changes.
   This is the `base.css:131` pattern (ten chip families on one recipe) and `:188` (three
   segmented controls). Anything grouped into `.type-heading-xl` must also be repeated by hand in
   the phone block at the foot of `type.css` — a class selector cannot match a descendant one.
2. **Replace** the old class in markup with the role class.
A role added *beside* an old class does nothing: the old class still wins.

### The nine type rules
**T1. Four levels per screen, no more.** (unchanged)
**T2. Make levels obviously different.** Two levels on one screen differ by at least one rung,
and ideally by weight or ink as well. A 1–2px difference is not a level, it's a bug. 15px and
17px are gone from the product; do not reintroduce them. The 14→16 rung is the one narrow pair
(14%), so those two must also differ in weight or ink colour.
**T3. The ladder: 14 · 16 · 18 · 20 · 24 · 30 · 36.** Seven rungs; most screens use three or four.
Nothing sits between rungs. Fluid `clamp()` sizes start and end on a rung — and prefer a role and
the phone breakpoint over a clamp.
**T4. Leading is absolute, and married to its size.** 14→20 · 16→24 · 18→28 · 20→28 · 24→32 ·
30→36 · 36→40. Every one lands on the 4px grid, so type and spacing share a rhythm. Never mix
the seven `--type-leading-sm..4xl` absolute lengths with the four legacy
`--type-leading-tight/snug/normal/relaxed` multipliers: swapping one family for the other turns a
24px leading into a 1.5 ratio with no lint error and no failing test.
**T5. Reading content caps at 66 characters per line** (75 absolute max). The body roles carry
the measure themselves; use `.type-body--full` only where a cell or a chip genuinely must fill
its container.
**T6. Bricolage only at 20px and above.** (unchanged)
**T7. Tabular numerals for anything that lines up or changes.** `.type-metric` bakes it in — and
declares it last, because a `font:` shorthand above it resets the figures back to proportional.
`base.css`'s `.num-tabular` is the standalone escape hatch.
**T8. One bold phrase per paragraph, maximum.** (unchanged)
**T9. Let CSS absorb unknown lengths.** The heading roles carry `text-wrap: balance` and the body
roles `text-wrap: pretty`, so you do not add them by hand.

### Print and email
Neither surface can read a CSS variable, so both carry a derived copy of the table above, held by
a test rather than by the linter.
**PDF** (`ui/recap-pdf.ts`): pdfmake measures in points, so `pt = px × 0.75`. Its `lineHeight` is
a multiplier (`leadingPx ÷ sizePx`) and its `characterSpacing` is absolute points (`em × sizePt`).
Only three static faces ship, so Inter 500 and Inter 600 have no PDF form and fall to 400 or 700,
and `.type-code` has no PDF form at all.
**Email** (`api/services/notifications/email-layout.ts`): mail clients load no stylesheet and no
webfont, so the shell uses inline styles, hex literals and a system-sans stack by design. Sizes
come from `email-type.ts` and are asserted against this table by `email-layout.test.ts`.

DRAFT REPLACEMENT for §6 rule 14:
  14. **Do** take a **role** from `design/type.css` rather than declaring type on a screen. Type
      properties are legal in `design/tokens.css` and `design/type.css` only — anywhere else fails
      `npm run lint:tokens`. Keep to the ladder (**14 · 16 · 18 · 20 · 24 · 30 · 36**), at most
      **four levels** per screen, each visibly different. Bricolage ≥20px only; prose capped at 66
      characters a line (see §3).
Also add to §6 Exemptions:
  - **The parked gallery** (`admin/src/stages/tests/`) — five design sketches behind /test. Exempt
    from the structural type rules only; the 14px floor and the colour rules still apply in full.
  - **The email shell** (`api/services/notifications/email-layout.ts`) — mail clients load no
    stylesheet and no webfont, so its font stack is written out and its colours are hex. Its sizes
    are held by `email-layout.test.ts` instead.

================================================================================
7. admin/src/stages/design.js — the in-app design sheet
================================================================================
Guard-allowlisted at lint-design-tokens.js:73 (`/(^|[\\/])stages[\\/]design\.js$/`) and in
DESIGN.md §6 line 361. It can drift silently, and it has.

WHAT IT SHOWS TODAY. The "Type" section is `typeHtml()` at design.js:210-222, five lines:
  L215  <p class="text-display">Display. Bricolage Grotesque</p>
  L216  <p class="h2">Headline. Bricolage Grotesque</p>
  L217  <p class="h3">Title. Inter semibold</p>
  L218  <p class="body">Body 16. Inter regular. Most reading happens here; keep lines under 75
        characters.</p>
  L219  <p class="caption">Small 14. Inter, secondary details. This is the floor; nothing goes
        smaller.</p>
Its container `.ds-type` (design-stage.css:185-189) is layout only — a flex column with a
24px gap. No type declared there.
So the sheet shows FIVE levels off the OLD system, sized by the aliases in base.css:
  .text-display → --type-display (clamp 30–42px), lh 1.1 (base.css:56-64)
  .h2           → --type-h2 (clamp 28–36px), lh 1.2  (base.css:75-83)
  .h3           → --type-h3 (20px), lh 1.35          (base.css:84-89)
  .body         → --type-body (16px), lh 1.6         (base.css:102-106)
  .caption      → 14px                                (base.css:275)
Every one of those five tokens is deleted by Phase 5 (phase-5.md:11). The moment that lands, the
design sheet renders four of its five specimen lines with an INVALID font-size and silently
inherits — and because the file is allowlisted, nothing fails. That is exactly the "it can drift
silently" risk phase-6.md:11 names, and it is a hard dependency, not a nice-to-have.

Two further drifts in the same file, both allowlisted-invisible:
  L45 the RULES array still says only "Nothing under 14px" — no ladder, no roles, no two-file law.
  L571 and L784 use `font-size: var(--type-h4)` inline on the avatar/brandbadge demos. Same token,
  same Phase 5 deletion, same silent failure.

WHAT IT MUST SHOW INSTEAD. Two blocks in place of the five lines:
  (a) THE LADDER — seven rows, each rendering a live sample at that rung with its numbers beside
      it: "14 / 20", "16 / 24", "18 / 28", "20 / 28", "24 / 32", "30 / 36", "36 / 40", and the
      token pair name. A line saying there is no 12px rung on purpose and 36 is the top.
  (b) THE FOURTEEN ROLES — one row per role, the text rendered IN its own `.type-*` class (so the
      sheet is the class, not a description of it), with role name, size/leading, weight, family
      and what it is for. Group them: display + six headings, three body, three label/chrome,
      code, metric. Note the two modifiers below.
  Plus one line on how a screen joins a role (group the selector, or replace the class — never
  add beside), and one on the two-file law.
  Add a RULES entry: "Type comes from a **role** in `design/type.css`. Never declare a size on a
  screen." And convert the two inline `var(--type-h4)` avatar demos to a role class.
  Everything must use REAL classes so the sheet cannot describe a system the app does not have.

================================================================================
8. LANE CHECK against LANES.md
================================================================================
This session is `1a2e5006`. Its claimed lane (row 5) is:
  docs/plans/doing/type-system/, admin/src/styles/design/tokens.css, .../base.css, .../type.css,
  admin/tailwind.config.js, .../admin-tables.css, .../briefing.css, admin/src/styles/design.css,
  admin/src/styles/coach-panel.css, admin/src/stages/questioning.js,
  scripts/lint-design-tokens.js, scripts/test-type-rules.js, scripts/test-design-guard.js,
  frontend/src/stages/preparation-css.test.ts, .claude/launch.json

ALREADY CLAIMED BY THIS SESSION (Phase 6 can edit freely):
  scripts/lint-design-tokens.js · scripts/test-design-guard.js · scripts/test-type-rules.js ·
  frontend/src/stages/preparation-css.test.ts · docs/plans/doing/type-system/

NOT IN ANY LANE — must be ADDED to row 1a2e5006 before Phase 6 touches them:
  admin/src/ui/recap-pdf.ts · admin/src/ui/recap-pdf.test.ts · admin/src/ui/account-sheet.ts ·
  admin/src/ui/profile-badge.js · admin/src/stages/design.js ·
  admin/src/styles/design/design-stage.css · DESIGN.md ·
  backend/api/services/notifications/email-layout.ts · backend/api/services/notifications/email-type.ts (new) ·
  backend/api/services/notifications/email-layout.test.ts (new) ·
  admin/src/styles/design/start-stage.css (the two --sero-radius-pill fixes)

HELD BY ANOTHER SESSION — do NOT edit through, surface to Carl:
  admin/src/styles/design/stage-lookback.css — session `a6878b4e` ("Stage look-back"), claimed
    2026-07-27. It holds 4 type declarations and 1 unsanctioned-token hit. Three days old, so it
    is within a whisker of the 2-day stale rule; check with Carl rather than assuming.
  backend/api/services/sessions/* — session `c91a58a9`. Not touched by Phase 6, but it is the
    only other live backend claim; adding backend/ to the guard's SCAN_DIRS does not edit those
    files, so there is no collision.
  admin/src/stages/bank.js — session `f1363886`. Not touched by Phase 6.

NOT ON THE BOARD AT ALL but named as a collision by plan.md:29 and phase-3.md:17 / phase-4.md:15:
  session `080b9104` (brief star rating) holds admin/src/styles/feedback-inbox.css and
  frontend/src/stages/preparation.css. That session has NO ROW in LANES.md today, so the hook will
  not stop an edit. Between them those two files hold 17 unsanctioned-token hits and 8 of the 33
  relative-font-size hits, and the guard flip cannot reach zero without them. Ask Carl whether
  that session is finished before Phase 3/4 run, and re-check before the Phase 6 flip.


## Work items (32)

| file | line | selector | today | role | kind | note |
|---|---|---|---|---|---|---|
| admin/src/ui/recap-pdf.ts | 124 | `new PRINT ladder const block, above eyebrow()` | no ladder exists; 8 free-floating pt values | all fourteen | chrome | Write the derived ladder as one exported const with a comment stating pt = px x 0.75 (1pt=1/72in, 1px=1/96in), that pdfmake lineHeight is a multiplier (leadingPx/sizePx) and characterSpacing is absolute pt (em x sizePt). Cite that defaultStyle 10.5/1.4 already equals body-sm, which is the evidence for the factor. |
| admin/src/ui/recap-pdf.ts | 127 | `eyebrow() helper - all nine section eyebrows` | fontSize: 8.5, bold: true, characterSpacing: 1.2, color: COLOR.accentDark, text uppercased | overline | chrome | 10.5pt / lineHeight 1.429 / characterSpacing 0.84 (0.08em x 10.5) / bold. bold maps to inter-bold 700 because no inter-semibold.ttf ships; the role wants 600. |
| admin/src/ui/recap-pdf.ts | 221 | `'WHO THIS WAS FOR' and 'WHAT SERO WAS TOLD GOING IN' (also line 231) and the promise group label (line 336)` | fontSize: 8, bold: true, characterSpacing: 1, color: COLOR.accentDark, uppercased | overline | chrome | Three more copies of the eyebrow object at a different size and tracking. Route all three through eyebrow() rather than remapping them separately: one uppercase label recipe, not four. |
| admin/src/ui/recap-pdf.ts | 238 | `the briefing headline` | font: "Bricolage", fontSize: 20, color: COLOR.ink, lineHeight: 1.12 | heading-xl | heading | 22.5pt / lineHeight 1.2 / characterSpacing -0.225 (-0.01em x 22.5), font Bricolage. 20pt = 26.67px is off-ladder. This is the most visible change in the PDF: the headline grows 12.5%. |
| admin/src/ui/recap-pdf.ts | 207 | `the 'Sero' wordmark in the header band` | fontSize: 15, bold: true, color: COLOR.accentDark (inherits font Inter) | heading-md | heading | 15pt is ALREADY exactly heading-md (20px x 0.75). Size does not move. Add font: "Bricolage" and lineHeight 1.4 so the wordmark uses the display face, as it does on screen. |
| admin/src/ui/recap-pdf.ts | 263 | `axis name (:263), axis score (:270), 'Your move' lead-in (:316), the two honest-read labels (:301, :307), both when-pills (:347, :366)` | fontSize: 10 / 10 / 9.5 / 8.5 cs0.5 / 8.5 cs0.5 / 9 / 9, all bold | label-strong | chrome | All seven become 10.5pt bold, characterSpacing dropped to 0. The two honest-read labels are sentence case, so overline is wrong for them. WARNING: the when-pills carry width:66, sized for 9pt. Check 'Next 1:1' at 10.5pt bold before shipping. |
| admin/src/ui/recap-pdf.ts | 208 | `date line (:208), 'Meeting: x' (:228), axis meaning (:278), unread-axes line (:289)` | fontSize: 9 / 9.5 / 9.5 / 9.5 | body-sm | prose | All four to 10.5pt, matching defaultStyle so they stop being four near-identical quiet sizes. |
| admin/src/ui/recap-pdf.ts | 388 | `defaultStyle - all body copy: bullets, understanding paragraph, intake notes, honest-read bodies, promise/suggestion actions, reminders` | defaultStyle: { font: "Inter", fontSize: 10.5, color: COLOR.ink, lineHeight: 1.4 } | body-sm | prose | Effectively unchanged: 10.5pt IS body-sm. Only lineHeight moves 1.4 -> 1.4286 (20/14). Recording it makes the derivation explicit rather than coincidental. |
| admin/src/ui/recap-pdf.ts | 392 | `footer credit (:392) and page folio (:393)` | fontSize: 8.5, color: COLOR.inkMute (both) | body-sm | unclear | Either 10.5pt like everything else, or a documented print-chrome waiver at 8.5. A running folio is page furniture, not content, and 8.5pt folios are normal in print. Needs Carl. Do not silently pick. |
| admin/src/ui/recap-pdf.test.ts | 93 | `new test: every fontSize is a print rung` | content assertions only (headings, sort order, promise grouping, filename). Zero size assertions. | n/a | chrome | Walk buildRecapDocDefinition()'s output and assert every fontSize is in {10.5, 12, 13.5, 15, 18, 22.5, 27} and every lineHeight is its partner. This is the ONLY thing that can hold this file: it is allowlisted out of the CSS guard at lint-design-tokens.js:79. |
| backend/api/services/notifications/email-type.ts |  | `NEW FILE - the role table as literals` | does not exist | all fourteen (seven used) | chrome | Hand-written consts plus a css(role) helper emitting font-size/line-height/font-weight, so no call site writes a number. NOT a generator: the test below gives the same guarantee without a build step. |
| backend/api/services/notifications/email-layout.ts | 31 | `the eyebrow div` | font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#5aa9e6 | overline | chrome | 14/20/600, tracking already correct (0.08em IS --type-tracking-caps-lg). THREE PX BELOW THE FLOOR today. Also #5aa9e6 as 11px text on white is about 2.2:1 - flag the colour, do not repaint silently. |
| backend/api/services/notifications/email-layout.ts | 43 | `the 'Sero' wordmark span` | font-size:23px;font-weight:600;color:#1b5d91 | heading-lg | heading | 24/32/600. 23px is off-ladder by 1px, which is the exact T2 defect. |
| backend/api/services/notifications/email-layout.ts | 48 | `the email heading div` | font-size:22px;font-weight:600;color:#173a56;line-height:1.25 | heading-lg | heading | 24/32/600. Off-ladder at 22. If 24 crowds the 520px card, heading-md (20/28) is the alternative - but no media query is possible in email, so it cannot drop on a phone. Colour #173a56 has no token. |
| backend/api/services/notifications/email-layout.ts | 63 | `emailParagraph() - every body paragraph in every email` | font-size:15px;line-height:1.6;color:#4a6072 | body | prose | 16/24/400. 15px is banned outright by DESIGN T2 and this is the most-read line in the product's email. |
| backend/api/services/notifications/email-layout.ts | 71 | `emailDetailPanel() key cell (:71) and value cell (:72)` | key: font-size:14px;color:#7089a0  |  value: font-size:14px;color:#1b3a54;font-weight:500 | label / label-strong | chrome | Sizes are already on the floor. Key -> label (14/20/500), value -> label-strong (14/20/600). Key colour #7089a0 on #f2f8fd is about 3.6:1 and fails DESIGN section 2. |
| backend/api/services/notifications/email-layout.ts | 85 | `emailButton() label` | font-size:15px;font-weight:600;color:#ffffff | label-strong | control | 14/20/600 by the table, but a primary CTA at 14px in a 520px card may read small. body (16/24) with weight 600 is the alternative. Judgement call - see openQuestions. |
| backend/api/services/notifications/email-layout.ts | 52 | `the footer line (:52) and emailFinePrint() (:92)` | footer font-size:12px;color:#9aabbb  |  fine print font-size:12.5px;color:#8ea3b5 | body-sm | prose | Both 14/20/400. TWO MORE FLOOR BREACHES that plan.md missed (it lists only the 11px eyebrow). Both colours also fail 4.5:1 (about 2.4:1 and 2.9:1). |
| backend/api/services/notifications/email-layout.ts | 40 | `the accent-bar strut (:40) and the hairline strut (:45)` | height:4px;...font-size:0;line-height:0  |  height:1px;...line-height:1px;font-size:0 | none - leave alone | chrome | These are &nbsp; struts in an email-safe table, not text. The new test must explicitly allow font-size:0 or it will report two false breaches. |
| backend/api/services/notifications/email-layout.test.ts |  | `NEW FILE` | does not exist - nothing in the repo has ever checked this file | n/a | chrome | Three assertions: (1) every EMAIL_TYPE entry matches a rung parsed from admin/src/styles/design/tokens.css (the pattern preparation-css.test.ts already uses); (2) every font-size in the rendered HTML of renderSeroEmail + all four helpers is 0 or >=14 and on the ladder; (3) every hex is in a named allowlist. Auto-discovered by scripts/run-tests.js:49. |
| scripts/lint-design-tokens.js | 66 | `SCAN_DIRS` | const SCAN_DIRS = ["admin/src", "frontend/src"]; | n/a | chrome | Add "backend/api/services/notifications". Verified free: it is the only backend file with a type property AND the only backend .ts with a hex literal, so nothing else lights up. This is what stops a fifth type system appearing unseen again. |
| admin/src/ui/account-sheet.ts | 48 | `.acct-back, .acct-dots, .acct-input, .acct-hint, .acct-page .btn, .acct-label (lines 48, 53, 60, 67, 69, 70)` | six identical `font-size: var(--type-body-sm, 14px)` plus `font: inherit` (:48) and `font-family: inherit` (:60) | body-sm / label | chrome | Delete all six plus the two inherits. Add type-body-sm to .acct-back (:117), .acct-hint (:102, :107), .acct-input (:103, :105, :125, :142, :144), .acct-dots (:136); type-label to .acct-label (:104, :136, :141, :143). MARKUP, not grouping: this sheet is injected into document.head at runtime so it loads last, and P2 proved a grouped role loses that fight. Delete .acct-page .btn's font-size outright - it only exists to beat buttons-inputs.css and dies when .btn takes a role. Keep its padding, and keep .acct-dots' letter-spacing:3px (it spreads the password bullets, it is not tracking) with a lint-tokens-ignore and the reason. |
| admin/src/ui/profile-badge.js | 59 | `.profile-badge__mi` | line 59 `font: inherit;` and line 60 `font-size: var(--type-body-sm, 14px);` | body-sm | chrome | Delete both; add type-body-sm to the three menu buttons at :90, :91, :92. A <button> does not inherit the page face, so the role class must be the only thing giving it one - same move P2 made for .cp-seg (type.css:170-174). |
| admin/src/ui/profile-badge.js | 43 | `.profile-badge__caret` | color: var(--color-ink-subtle, var(--color-ink)) | n/a | chrome | --color-ink-subtle is defined nowhere in either app. One of the three undefinedToken hits and it blocks that flip. Swap to var(--color-ink-dim), drop the fallback. Renders identically today because the fallback fires. |
| admin/src/styles/design/start-stage.css | 226 | `lines 226 and 250` | var(--sero-radius-pill) | n/a | chrome | The other two undefinedToken hits. No fallback, so both declarations are DROPPED at render today. Replace with --sero-radius-full. Named in no phase file; without it undefinedToken cannot flip to error. |
| scripts/lint-design-tokens.js | 433 | `TYPE_RULES - flip nine warnings to errors` | nine entries pushed to acc.typeWarns; only sub-14px-font, raw-hex, rgb-literal and hex-fallback are errors | n/a | chrome | Flip relative-font-size 33, off-ladder-font 22, unsanctioned-size-token 439, undefined-token 3, clamp-off-rung 10, display-face-below-20 7, font-family-literal 8, font-shorthand-resets-numeric 0, literal-font-size 12 into acc.errors. Do this LAST, after the counts are actually zero - a flip on a non-zero count reds the build for everyone sharing this checkout. |
| scripts/lint-design-tokens.js | 684 | `the legacy non-token-font rule (FONT_SIZE_PX loop, lines 684-693)` | px-only warning, 7 hits, frozen ceiling 7 | n/a | chrome | DELETE, do not flip. Its own comment says 'retired in Phase 6', and its 7 hits are a strict subset of literal-font-size's 12. Flipping it would report one debt under two names. Remove the CEILINGS entry (test-design-guard.js:44) and the byFile() branch (test-design-guard.js:191-195) in the same commit. |
| scripts/lint-design-tokens.js | 449 | `NEW rule: type-prop-outside-sanctioned` | does not exist - no rule counts line-height, font-weight, text-transform or font-variant-numeric anywhere | n/a | chrome | phase-6.md's headline rule is a WRITE, not a flip. Count every declaration of the eight type properties outside design/tokens.css and design/type.css. Current value about 1,413 declarations across 65 files (1,484 total minus type.css's 69 minus recap-pdf.ts's 2 pdfmake false positives). Land it as a WARNING with a measured ceiling first, then flip in the same commit as the rest. |
| scripts/test-design-guard.js | 43 | `CEILINGS` | nonTokenFont 7, relativeFontSize 33, offLadderFont 22, unsanctionedSizeToken 439, literalFontSize 12, undefinedToken 3, clampOffRung 10, displayFaceBelow20 7, fontFamilyLiteral 8, fontShorthandResetsNumeric 0 | n/a | numeric | Delete the ten type-rule ceilings once the rules are errors (an error needs no ceiling). Keep literalRadius and offGridSpacing exactly as they are - different request. Keep the header comment explaining WHY a ceiling existed; that is the record of how the debt was paid. |
| admin/src/styles/design/mobile.css | 298 | `the iOS input-zoom guard` | font-size: max(1rem, 1em) | none - permanent waiver | unclear | literalFontSize CANNOT reach zero because of this line. There is no token form of max(1rem, 1em), and lint-design-tokens.js:281-287 documents the max() branch as existing precisely to keep it green. Needs a lint-tokens-ignore with the reason, or literalFontSize stays a warning forever. |
| DESIGN.md | 167 | `section 3 Typography (lines 167-229) and rule 14 (lines 351-353) and the section 6 Exemptions list (357-371)` | the bespoke T1-T9 ladder topping at 40, T4 as ratios, and a 'Known drift (2026-07-26, reported not fixed)' block at 198-200 | n/a | prose | Replace with the draft in findings section 6. Ten specific contradictions listed there, headline three: top rung is 36 not 40 (T3, Hierarchy, rule 14); T4's leading ramp is absolute px on the 4px grid, not falling ratios (T4 says 20->1.3, heading-md is 20/28 = 1.4); the Known drift block describes fixed work and must be deleted. Also add the two missing sections: where type may be declared, and how a screen joins a role. Also add the parked-gallery and email-shell exemptions - TYPE_EXEMPT is in the code at lint-design-tokens.js:98 but not in DESIGN.md, so the stated twinning is already broken. |
| admin/src/stages/design.js | 210 | `typeHtml() - the in-app design sheet's Type section` | five <p> lines using .text-display, .h2, .h3, .body, .caption (lines 215-219). Also RULES[1] at :45 and two inline `font-size: var(--type-h4)` avatar demos at :571 and :784 | the seven rungs + all fourteen roles | prose | HARD DEPENDENCY, not cosmetic: all five aliases resolve to tokens Phase 5 deletes (--type-display, --type-h2, --type-h3, --type-body), and the file is guard-allowlisted so four of the five specimens will render with an invalid size and silently inherit with nothing failing. Replace with two blocks: the seven rungs with their size/leading numbers, and the fourteen roles each rendered IN its own .type-* class so the sheet IS the system rather than a description of it. Add a RULES entry naming the two-file law, and convert the two inline var(--type-h4) demos to a role class. |

## Risks
- The Phase 6 done-when grep can never return two files. tokens.css contains zero occurrences of the string "font-size" (it defines --type-size-* but never uses the property), and ~17 files will legitimately still match after the phase: 5 test files that assert on the string, design.js, the 8 parked gallery files, orb.css, app-nav.css, plus two files where "font-size" appears only in a comment. The check must be replaced with the guard's own new rule plus the two new unit tests, or the phase closes on a number that cannot be reached.
- Sixteen files carrying type are named in NO phase file: design-stage.css (46 declarations), start-stage.css (46), stage-review.css (39), test-engine.css (34), auth.css (23), axes.css (15), team-card.css (15), add-person-modal.css (13), pulse-drilldowns.css (12), test-gallery.css (11), primitives.css (9), guide.css (9), shared-components.css (7), promise-checkin.css (5), persona-bench.css (4), member-runs.css (3). Between them they hold about 104 of the 439 unsanctioned-size-token hits, 3 of 22 off-ladder, 4 of 7 display-face-below-20, and 3 of 10 clamp-off-rung. The guard flip cannot reach zero unless Phase 3's "~150 chrome selectors" is read as silently covering them. This is the largest hole in the plan and it should be resolved before Phase 3 starts, not discovered at the flip.
- literalFontSize can never reach zero. admin/src/styles/design/mobile.css:298 is `font-size: max(1rem, 1em)`, the iOS input-zoom guard. There is no token form, and the linter's own max() branch (lines 281-287) exists specifically to keep it green. It needs an explicit lint-tokens-ignore waiver or that rule stays a warning permanently.
- relativeFontSize will still be at 10 when Phase 5 closes. feedback-inbox.css holds 8 (lines 32, 41, 53, 69, 72, 89, 100, 125) and is claimed by session 080b9104; test-engine.css:16 and ux-audit-fixes.css:26 hold one each and are in no phase. If 080b9104 is still live at the flip, the phase cannot be closed honestly.
- Session 080b9104 has NO ROW in LANES.md, yet plan.md:29, phase-3.md:17 and phase-4.md:15 all name it as holding feedback-inbox.css and preparation.css. The hook therefore will NOT stop an edit to those files. Someone will edit through a claim that only exists in prose.
- Three assertions in frontend/src/stages/preparation-css.test.ts hard-fail on the work Phases 4 and 5 do: line 112 requires at least one font-size in preparation.css, line 126 requires declarations.length > 0, and line 119 requires tokens.css to still define --type-body-sm. None of these are flagged in phase-6.md. All three break BEFORE Phase 6 runs.
- The PDF grows. Six of its eight sizes (8, 8.5, 9, 9.5, 10 and the 20pt headline) sit below or off the print ladder, and the ladder has no rung under 10.5pt because the screen ladder has none under 14px. Every eyebrow, label, axis line, when-pill and footer line rises. Expect roughly one extra page. That is a visible change to a document customers forward and file, and it is a design decision, not a build one.
- Four Sero roles have NO PDF equivalent because only three static faces ship: .type-label (weight 500) has no inter-medium.ttf; .type-heading-sm, .type-heading-xs, .type-label-strong and .type-overline all want Inter 600 and there is no inter-semibold.ttf, so all four fall to inter-bold 700 and print visibly heavier than the screen; .type-code has no mono TTF at all; and .type-metric's tabular figures cannot be delivered because pdfmake exposes no font-feature control. phase-6.md anticipates one extra font file. Honestly it is two (inter-medium, inter-semibold) or five documented substitutions.
- email-layout.ts has three floor breaches, not one. plan.md and phase-6.md name only the 11px eyebrow; the 12px footer (line 52) and the 12.5px fine print (line 92) are also below 14. Four of its text colours also fail DESIGN section 2's 4.5:1 bar (#5aa9e6 eyebrow about 2.2:1, #9aabbb footer about 2.4:1, #8ea3b5 fine print about 2.9:1, #7089a0 detail key about 3.6:1). Fixing type without fixing those leaves the email readable-in-size but not readable-in-contrast.
- Eleven of email-layout.ts's fourteen hex values match no Sero token at all, and #e9f3fc (the email background, used twice) is ONE DIGIT off --sero-primary-200 (#e9f3fb). That is a typo that has been shipping.
- admin/src/stages/design.js is guard-allowlisted, and all five of its type specimens use aliases that resolve to tokens Phase 5 deletes. The moment Phase 5 lands, four of five render with an invalid font-size and silently inherit, with nothing failing anywhere. The same is true of its two inline var(--type-h4) avatar demos at lines 571 and 784. This is a hard Phase 5 dependency dressed as a Phase 6 tidy-up.
- The headline guard rule does not exist and cannot be flipped. There is no rule anywhere in lint-design-tokens.js counting line-height, font-weight, text-transform or font-variant-numeric. It must be written from scratch against about 1,413 declarations across 65 files. Landing it directly as an error would red the build for every parallel session sharing this checkout, which is exactly what the ceiling mechanism (test-design-guard.js:13-16) was built to prevent.
- base.css:24's literal font stack is load-bearing in the wrong direction. tokens.css:355-361 states --type-family-base must stay byte-identical to it and that two parked prototypes depend on that. Converting base.css to var(--type-family-base) to clear fontFamilyLiteral inverts the dependency; if the tokens.css comment is not updated in the same commit it becomes a lie that will mislead the next reader.
- A fifth type system exists outside everything: docs/reports/sero-how-it-works.html (53 font-size) and docs/reports/sero-changelog.html (21). Both are customer-facing pages Carl keeps updated alongside the LinkedIn post. Phase 6 does not touch them, so "font-size exists in exactly two files in the whole repo" will remain untrue for the repo even after a clean flip. Say so rather than quietly narrowing the claim to admin/src + frontend/src.
- admin/src/styles/design/stage-lookback.css holds 4 type declarations and is claimed by session a6878b4e since 2026-07-27 - three days old, right on the 2-day stale boundary. Do not assume it is stale; ask Carl.

## Open questions
- PDF body size. The recap PDF's running text is 10.5pt today, which is exactly .type-body-sm (14px x 0.75). Taking .type-body instead (16px = 12pt) would make the PDF read like the app, but at 12pt the 499pt text column runs about 90 characters a line and breaches T5's 66-character cap, so the page margins would have to widen too. (A) Keep 10.5pt = body-sm and document it as a deliberate one-rung-down for print. (B) Move to 12pt = body and widen pageMargins to hold about 70 characters. RECOMMEND A: it keeps the page count and 10.5pt is a normal print body size, and the deviation is honest and written down.
- The PDF footer. The credit line and the page folio are 8.5pt. Under a straight conversion they rise to 10.5pt like everything else, which makes the running furniture as loud as the content. (A) 10.5pt, no exceptions, one ladder. (B) A single documented print-chrome waiver at 8.5pt for the footer band only, on the grounds that a folio is page furniture and print has no 14px floor. RECOMMEND B, because holding a screen accessibility floor over a printed folio is applying the rule where it was not aimed - but it is a deviation and it needs Carl's yes, not the build's.
- The email CTA button. The role table puts a 600-weight 14px label on .type-label-strong, but a primary call to action at 14px inside a 520px email card may read small, and email has no media query to grow it on a phone. (A) label-strong 14/20/600, no exceptions. (B) body 16/24 at weight 600, treating the CTA as reading text rather than chrome. RECOMMEND B for the button only, recorded as a deviation.
- The email heading. It is 22px today and 23px for the wordmark, both off-ladder. The nearest rung up is 24 (heading-lg) and down is 20 (heading-md). 24px in a 520px card with no phone breakpoint may crowd on a narrow phone. (A) heading-lg 24/32 for both. (B) heading-md 20/28 for the heading, heading-lg 24/32 for the wordmark. RECOMMEND A, but it wants one look on a real phone before it is called done - which is what Phase 6 test scenario 2 already asks for.
- Extra PDF font files. Four roles want Inter 600 and one wants Inter 500, and neither file ships. (A) Generate inter-semibold.ttf and inter-medium.ttf from the same @fontsource variable fonts the screens use, so the PDF matches the app exactly. Costs about 130KB of static assets and two more fetches on first PDF. (B) Ship nothing new and document five substitutions (600 -> bold 700, 500 -> regular 400). RECOMMEND A for inter-semibold only: it covers four of the five gaps, .type-label barely appears in the PDF, and every heading in the document currently prints heavier than it looks on screen.
- Whether Phase 3's '~150 chrome, table and label selectors' is meant to sweep the sixteen files that no phase names. If yes, phase-3.md should list them so the build can plan; if no, Phase 6 cannot flip the guard and the plan needs a Phase 5b. This is the one that decides whether the lock is real. It should be answered before Phase 3 starts, not at the flip.
- Whether session 080b9104 (brief star rating) is still live. It holds feedback-inbox.css and preparation.css, which together carry 17 unsanctioned-token hits and 8 of the 33 relative-font-size hits, and it has no row in LANES.md so the hook will not stop an edit. If it is finished, add nothing and sweep them; if it is live, the guard flip has to wait or those two files need an explicit temporary waiver.
- Whether the two customer-facing HTML docs (docs/reports/sero-how-it-works.html, 53 font-size; docs/reports/sero-changelog.html, 21) are in scope for the lock. They are user-facing and Carl keeps them current, but they are standalone pages with no access to the app's stylesheets, so they would need the same generated-constants treatment as the email. RECOMMEND parking them explicitly in plan.md's Parked list rather than leaving the 'exactly two files in the whole repo' claim quietly false.
