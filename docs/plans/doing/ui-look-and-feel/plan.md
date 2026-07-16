# Whole-project UI polish — the artifact look & feel

**Goal:** Bring the entire product (customer app + admin console, ~50 surfaces) to the bar of the
briefing artifact Carl loved — calmer type, content set in the display face, one consistent
pill/dot/chip detail language, generous even spacing, soft framed depth, and a full light + dark
theme built once at the token layer. A re-theme and polish of what exists — **not a redraw**.
**Driver:** Carl. Scope call (2026-07-17): *whole project, everything*, admin included.
**Created:** Fri 17 Jul 2026

## North star (plain words)
Sero already speaks the right language — same soft blue, same two typefaces, same calm tone. This
initiative makes the whole product speak it fluently: quieter, warmer titles; the words a manager
will actually say set in the display face; one family of pills, dots and chips instead of ~15
home-grown variants; even breathing room; and — the big new thing — dark mode built once at the
paint-pot (token) level so every screen gets it for free, in Sero's own blue-tinted darks, never
grey or black. The earliest phases visibly improve every screen at once; later phases deepen detail.

## Done means
- Any screen, either app, light or dark: looks like the artifact family (frame, labels, chips,
  spacing), passes the house rules (14px floor, one blue action, tokens-only), reads at 4.5:1.
- A toggle (and OS preference) flips the whole product between themes, choice remembered.
- DESIGN.md + the in-app design sheet document the new language; guard tests enforce it.

## Resolved before we start
Full detail in [audit-findings.md](audit-findings.md) (9-agent audit, 2026-07-17). Key facts:
- **Type + spacing tokens are done systems** — the calm comes from re-tuning a few token values and
  adopting existing tokens in stragglers, not new systems.
- **Colours are two-layer** (~40 semantic tokens used ~660×; Tailwind var-backed in both apps) —
  a dark token block flips ~80–90% of the product at once. Dark palette steps already exist.
- **The artifact's delta is enumerable:** frame treatment (`--shadow-lift` + 18px hairline frame),
  two-tier uppercase labels, display-face-for-content, chip/dot-meter motifs, tint triads
  (soft bg + same-hue line border + dark text), hue-biased dark theme.
- **Known traps:** ~8 black-rgba overlay/shadow tokens vanish on dark; phantom
  `--sero-emerald/rose` tokens (fallbacks render today — define to the exact fallback hexes first);
  inline STYLE strings in legacy JS (`admin-pulse.ts`, `test.js`, `tasks.js`, `member-home.js`)
  sit outside the cascade; 7 off-barrel CSS files + `guided.css` need explicit touching; Tailwind
  loads before design.css (check every new global rule against utility-styled elements).
- **Exempt, leave alone** (DESIGN.md §6): dev-badge, build-stamp, universe, design.js sheet.
- **Cost:** front-end only — no engine, no OpenAI, no paid runs. All verification free
  (npm test / typecheck / the running app in both themes).

## Phases
| # | Phase | What it lands | Effort | Status |
|---|---|---|---|---|
| 1 | Calm the type, fix the freebies | Token-layer retune (display size/weight, tracking + spacing + shadow/radius tokens, reading measure) + ~15 near-free defect fixes — every screen calms at once | M | ⬜ |
| 2 | Two themes, one paint layer | Full dark token block + toggle + hardcode sweep — the whole product gains dark mode | L | ⬜ |
| 3 | The label & content voice | Two-tier uppercase labels everywhere; names/questions/openers set in the display face; one brand mark | M | ⬜ |
| 4 | One chip, one button, one motif | One `.chip` primitive replaces ~15 pill families; dot-meter confidence chip; `.btn` retune; one segmented control | L | ⬜ |
| 5 | The frame & the customer flagship | The artifact's framed-screen treatment on briefing/prep; guided flow + member home join the system; skeletons everywhere | L | ⬜ |
| 6 | Long-tail sweep | Error/empty states (no more browser alerts), overlay recipe, spacing rhythm, off-barrel CSS, tasks board de-nested | L | ⬜ |
| 7 | Prove it & write it down | Both-theme contrast audit; DESIGN.md + design sheet updated; guard tests extended | M | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
Plan set up from the approved assessment + audit; awaiting Carl's go on Phase 1. Nothing built.
Baseline (free tests + typecheck) runs at the start of Phase 1.

## Open calls for Carl (flagged inside phases, not blockers now)
- **Phase 2:** where the theme toggle lives (profile menu vs nav rail).
- **Phase 5:** keep or fence the body gradient wash where the new frame is used.

## Parked
- Guided-flow **navigation paradigm** (bottom pill bar vs top stepper) — Phase 5 re-paints, never
  re-lays-out; separate decision.
- JS→TS migration of admin stages — separate track; not needed for any of this.
- Net-new component redesigns / new features — out of scope.
- **Coordination:** the in-flight Arc briefing plan (`docs/plans/doing/briefing-before-during-after/`)
  touches briefing surfaces — its QA + close-out happens first; this initiative doesn't edit those
  files until it's closed.
