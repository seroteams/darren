# Whole-project UI polish — the artifact look & feel

**Goal:** Bring the entire product (customer app + admin console, ~50 surfaces) to the bar of the
briefing artifact Carl loved — calmer type, content set in the display face, one consistent
pill/dot/chip detail language, generous even spacing, soft framed depth. A re-theme and polish of
what exists — **not a redraw**.
**Driver:** Carl. Scope calls: *whole project, everything* (2026-07-17); **dark mode PARKED**
(Carl, 2026-07-17: "more work for now, no need") — light-only polish.
**Created:** Fri 17 Jul 2026

## North star (plain words)
Sero already speaks the right language — same soft blue, same two typefaces, same calm tone. This
initiative makes the whole product speak it fluently: quieter, warmer titles; the words a manager
will actually say set in the display face; one family of pills, dots and chips instead of ~15
home-grown variants; even breathing room; and the artifact's soft framed depth. The earliest
phases visibly improve every screen at once; later phases deepen detail.

## Done means
- Any screen, either app: looks like the artifact family (frame, labels, chips, spacing), passes
  the house rules (14px floor, one blue action, tokens-only), reads at 4.5:1.
- DESIGN.md + the in-app design sheet document the new language; guard tests enforce it.

## Resolved before we start
Full detail in [audit-findings.md](audit-findings.md) (9-agent audit, 2026-07-17). Key facts:
- **Type + spacing tokens are done systems** — the calm comes from re-tuning a few token values and
  adopting existing tokens in stragglers, not new systems.
- **The artifact's delta is enumerable:** frame treatment (`--shadow-lift` + 18px hairline frame),
  two-tier uppercase labels, display-face-for-content, chip/dot-meter motifs, tint triads
  (soft bg + same-hue line border + dark text of the same hue).
- **Known traps:** phantom `--sero-emerald/rose` tokens (fallbacks render today — define to the
  exact fallback hexes first, so nothing shifts silently); inline STYLE strings in legacy JS
  (`admin-pulse.ts`, `test.js`, `tasks.js`, `member-home.js`) sit outside the token cascade;
  7 off-barrel CSS files + `guided.css` need explicit touching; Tailwind loads before design.css
  (check every new global rule against utility-styled elements).
- **Exempt, leave alone** (DESIGN.md §6): dev-badge, build-stamp, universe, design.js sheet.
- **Cost:** front-end only — no engine, no OpenAI, no paid runs. All verification free
  (npm test / typecheck / the running app).

## Phases
| # | Phase | What it lands | Effort | Status |
|---|---|---|---|---|
| 1 | Calm the type, fix the freebies | Token-layer retune (display size/weight, tracking + spacing + shadow/radius tokens, reading measure) + ~15 near-free defect fixes — every screen calms at once | M | 🔨 core built — Carl QA |
| 2 | The label & content voice | Two-tier uppercase labels everywhere; names/questions/openers set in the display face; one brand mark | M | 🔨 core built — Carl QA |
| 3 | One chip, one button, one motif | One `.chip` primitive replaces ~15 pill families; dot-meter confidence chip; `.btn` retune; one segmented control | L | 🔨 BUILT — Carl QA (guided kit → P4, contrast tail → P6) |
| 4 | The frame & the customer flagship | The artifact's framed-screen treatment on briefing/prep; guided flow + member home join the system; skeletons everywhere | L | 🔨 Recap slice ✅ done — rest ⬜ |
| 5 | Long-tail sweep | Error/empty states (no more browser alerts), overlay recipe, spacing rhythm, off-barrel CSS, tasks board de-nested | L | ⬜ |
| 6 | Prove it & write it down | Contrast audit of the light theme; DESIGN.md + design sheet updated; guard tests extended | M | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 core built overnight (2026-07-17), awaiting Carl's QA.** Carl chose to build all of
Phase 1 in one pass (aware it's un-eyeballed since the preview pane can't screenshot this session).
Landed: the display calm + token scaffolding + the safe defect fixes (invisible Pulse bars,
top-bar tuck-under, phantom tokens). Deferred within the phase: the briefing column + `.prep-callout`
(coordination — the Arc briefing change is still awaiting QA and shares those surfaces), the
`.stage` page-tail (centring risk), and the micro-defect long-tail (~10 un-eyeballed tweaks). Full
detail in [phase-1.md](phase-1.md). Proof: `build:all` clean, tests 54/54, typecheck unchanged.
Nothing deployed.

**The Recap redesign ✅ SHIPPED-LOCAL + GREEN-LIT (2026-07-17)** — a P4 "customer flagship" slice
pulled forward on Carl's ask, and **the first piece of this plan he's verified on the real screen**
(he ran a full 1:1 and checked it against real engine output — "looks right"). It renamed the
end-of-1:1 screen **Briefing → Recap** (a before-word was labelling the after-screen, clashing with
the "Prep brief" step) and rebuilt it into three acts: *What came out · The honest read · What to do
next* — result-first hero with an at-a-glance "Partial record" chip, honest reads split mint/gold,
the actions elevated into a framed destination carrying the screen's one blue action. Mockup-approved
first, per the artifact-mockup gate. Full detail + the honesty note on the hero:
[recap-redesign.md](recap-redesign.md). Proof: `build:all` clean, tests 22/22 (label + structure
guards added). Nothing deployed.

**Phase 2 core built overnight too (2026-07-17)** — one careful step, per Carl. A 3-agent sweep
mapped every label + name; then the safe core landed: `.eyebrow` became the blue accent-dark
section tier (matching the mock Carl liked; one-word revert), plus `.eyebrow--slot`/`.ident-name`
scaffolding. Deferred (needs eyes): slot reclassification, name-as-hero, page-header/brand. Proof:
`build:all` clean, tests 54/54. See [phase-2.md](phase-2.md). Both P1 + P2 cores await Carl's QA.

## Inbox — handed to this track
- **[Team + Past 1:1s aren't in the design system](carl-findings-team-past-1on1.md)** (Carl, 2026-07-17,
  raised while walking ux-audit-fixes; he chose THIS track to own it, not ux-audit, to avoid two chats
  in the same files). Two findings: the Past-1:1s rows are styled as **table rows** in `admin-tables.css`
  (no card/frame/chip — the person page falls off a cliff after the framed recap card), and the Team card
  meta line now **wraps** (partly caused by ux-audit's X1 " prep rating" label). Looks like Phase 4/5 work.

## Open calls for Carl (flagged inside phases, not blockers now)
- **Phase 4:** keep or fence the body gradient wash where the new frame is used.

## Parked
- **Dark mode — parked on Carl's call (2026-07-17: "more work for now, no need").** The homework
  is done and saved: [audit-findings.md](audit-findings.md) carries the dual-theme construction
  (hue-biased darks, 4-block token mechanism) and the trap list (~8 black-rgba overlay tokens,
  ~40–60 hardcode stragglers). When wanted, it's a token-layer job that slots back in as one phase.
- Guided-flow **navigation paradigm** (bottom pill bar vs top stepper) — Phase 4 re-paints, never
  re-lays-out; separate decision.
- JS→TS migration of admin stages — separate track; not needed for any of this.
- Net-new component redesigns / new features — out of scope.
- **Coordination:** ✅ the Arc briefing plan **closed 2026-07-17** — briefing/prep surfaces are now
  UNBLOCKED. The items deferred for it (the reading column + `.prep-callout` restyle) can land in a
  later step.
