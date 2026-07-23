# Detail: manager 1:1 prep flow + guided check-in

Full agent findings, 2026-07-22. Evidence cited as file:line.

**Key context:** a real wizard stepper already exists (TOPBAR_STAGES in admin/src/ui/stage-labels.js:23-31: Setup, Focus, Prep, Questions, Meeting, Wrap-up, Recap) rendered by admin/src/ui/session-topbar.js as pills with done/current/upcoming markers. The flow hides it at both ends and in the middle. That single fact explains most of the "doesn't feel like a known SaaS wizard" complaint.

## Per-screen verdicts

| Step | Screen | Verdict | Biggest familiarity break |
|---|---|---|---|
| 1 | Intake (/new) | HYBRID | Stepper hidden on Setup (session-topbar.js:189-193); no Back between substages; elastic step count (intake.js:93-97); Continue bottom-left; mixed commit models (cards auto-advance, text needs Continue); Enter submits a textarea |
| 2 | Focus points (/focus) | HYBRID | Bespoke selectable card with custom check disc (focus-points.js:90-98); no "N selected" count; staggered reveal animation; CTA cluster bottom-left; invisible global Enter |
| 3 | Prepare (/prepare) | CUSTOM | 12 layout variants in a 1004-line CSS (preparation.css); default "Arc" is a poster page (dark hero band, spine); width jumps 38rem → 56rem; Discard is a text link here but ghost button on siblings |
| 4 | Bank (interstitial) | HYBRID | Bare orb top-aligned in a 120px strip (bank.js:11-15) while Eval centres at 40dvh: two loading screens for the same moment; no context or skeleton |
| 5 | Interview (/interview) | CUSTOM | Full-screen overlay covers the stepper (coach-panel.css:8-11); full-bleed lavender half; up to five buttons in the action row (questioning.js:279-287); Esc skips the question; Enter submits the textarea; exit label mutates mid-screen |
| 6 | Evaluate | STANDARD-ish | Second, different loading treatment |
| 7 | Briefing (/briefing) | CUSTOM | ~2s staged reveal choreography with fail-open catch (briefing.js:222-227, 515-521); crowded bottom-left footer; recap has a different section grammar from briefing-view.ts |
| 8 | Debrief (internal) | CUSTOM (dev chrome) | The one blue button is "Copy QA prompt"; the actual Continue is a ghost (stages/run-debrief.js:16-19) |
| 9 | Guided (/guided/:id) | CUSTOM | A second design language: full-bleed tinted shell, centred hero headings weight 700, its own primary button colour (`--sero-primary-700`, guided.css:190-195) vs the accent sky, bottom pill tab bar instead of the top stepper, inline styles (guided.page.ts:62, guided-stages.ts:231,283) |

## Flow-level findings (the wizard test)

1. The stepper exists but is absent at the start (Intake), covered in the middle (Interview overlay), and replaced in the sibling flow (Guided bottom bar). Wayfinding exists on roughly half the journey.
2. Three competing progress systems: intake fill bar + "Step X of Y", topbar pill stepper, guided bottom tabs, plus per-screen counters.
3. Back is almost never available: none in intake substages; no return from Focus or Prepare; interview Back only from turn 2 (questioning.js:284).
4. The exit affordance mutates: ghost "Discard prep", text-link "Discard prep", "Skip to recap"/"Wrap up...", topbar "This 1:1" popover; often two visible at once with different consequences.
5. Container width churn: 38rem → 38rem → 56rem → 64rem → full-screen 2×560px → 64rem → 72rem → 72rem → 800px tinted band. Consecutive steps do not look like siblings.
6. Continue verb changes every step and always sits bottom-left; Debrief inverts primary/ghost outright.
7. "What happens next" is never told; Bank/Eval interstitials appear unannounced.
8. Loading and error language inconsistent: four loading treatments; every error navigates AWAY to the ERROR stage (e.g. focus-points.js:55-68) instead of inline retry.

## Why mockups beat the real flow

1. One width, one rhythm: mockups commit to one centred column; the flow cycles six container widths and three page paddings.
2. One section grammar: the screens mix card, card-flat, bare eyebrow sections, tinted callouts, navy bands, terminal blocks, mcr-card.
3. Content visible immediately: reveal choreography (`.reveal` opacity 0 until `.is-in`) vs mockups showing everything at once, which is how Stripe/Linear/Notion behave.
4. Header discipline: four header systems in one flow (intake progress header, page-header, interview cp-head, guided centred hero).
5. Uniform spacing generosity: l-stack 6/8/10 all used; several paddings below the 24-32px band (mcr-q 18/20px).
6. One accent: three "blues" do primary work (accent sky, guided primary-700, prep navy bands) plus a half-lavender screen.

**Highest-leverage structural fix:** make the existing session-topbar stepper the constant spine (visible from Intake, compact above the interview split, reused in Guided) and standardise a single wizard footer (Back left, primary right, one exit in the topbar).
