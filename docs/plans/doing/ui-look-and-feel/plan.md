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
| 1 | Calm the type, fix the freebies | Token-layer retune (display size/weight, tracking + spacing + shadow/radius tokens, reading measure) + ~15 near-free defect fixes — every screen calms at once | M | ⬜ |
| 2 | The label & content voice | Two-tier uppercase labels everywhere; names/questions/openers set in the display face; one brand mark | M | ⬜ |
| 3 | One chip, one button, one motif | One `.chip` primitive replaces ~15 pill families; dot-meter confidence chip; `.btn` retune; one segmented control | L | ⬜ |
| 4 | The frame & the customer flagship | The artifact's framed-screen treatment on briefing/prep; guided flow + member home join the system; skeletons everywhere | L | ⬜ |
| 5 | Long-tail sweep | Error/empty states (no more browser alerts), overlay recipe, spacing rhythm, off-barrel CSS, tasks board de-nested | L | ⬜ |
| 6 | Prove it & write it down | Contrast audit of the light theme; DESIGN.md + design sheet updated; guard tests extended | M | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
Plan set up from the approved assessment + audit; dark mode stripped out on Carl's call
(2026-07-17) — phase files renumbered 1–6. Awaiting Carl's go on Phase 1. Nothing built.
Baseline (free tests + typecheck) runs at the start of Phase 1.

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
- **Coordination:** the in-flight Arc briefing plan (`docs/plans/doing/briefing-before-during-after/`)
  touches briefing surfaces — its QA + close-out happens first; this initiative doesn't edit those
  files until it's closed.
