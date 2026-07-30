# Type system 5b — the last 164

**Goal:** No component stylesheet decides its own type. Every weight, leading, size and case comes from a role, so `type-property-outside-type-layer` reaches zero and can be flipped to a build error like the other nine.
**Driver:** Carl ("a", 2026-07-31, after walking the app)
**Created:** 2026-07-31
**Mockup:** none. No new design: this moves existing declarations into roles. Where a size genuinely changes, it is listed for Carl rather than mocked.

## Where this came from
[type-system](../../done/type-system/plan.md) closed with nine type rules at zero as errors: every size in both apps is one of seven rungs. The tenth rule, `type-property-outside-type-layer`, was frozen at **164** rather than flipped, because sixteen of the sheets holding it were named in no phase of that plan. This clears it.

## Done means
- `type-property-outside-type-layer` reports **0** and is an **error**, alongside the other nine.
- `typePropOutsideTypeLayer` is deleted from CEILINGS. Zero is the only passing value.
- The raise that plan carried, 142 to 164, is paid back rather than inherited.
- Every size that changes on a real screen is listed with its before and after, so Carl reads a list rather than discovers it.

## The 164, measured 2026-07-31
| Property | Count | The fix |
|---|---|---|
| `font-weight` | 52 | a role carrying that weight, or `.type-label` / `.type-label-strong` |
| `line-height` | 46 | mostly the locked pairs added in the closing commit: correct rendering, wrong location |
| `font-size` | 34 | all already sanctioned `--type-size-*` tokens, just not routed through a role |
| `font-variant-numeric` | 21 | **not a role.** Pair `.num-tabular` in markup: that is the sanctioned escape hatch |
| `text-transform` | 5 | `.type-overline` where it is an eyebrow; otherwise it shapes content, not size |
| `letter-spacing` | 4 | the role's tracking, or a stated waiver |
| `font-family` | 2 | a role's family |

Concentration: `buttons-inputs.css` 32, `design-stage.css` 17, `stage-extras.css` 12, `test-engine.css` 9, `admin-pulse.css` 8, `stage-review.css` 8. Twenty-five more files hold 1 to 7 each.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | The last 164 | Every component sheet gives up its type; the tenth rule becomes an error at zero | 🔨 |

⬜ not started · 🔨 in progress · ✅ done

## Current state
Folder set up 2026-07-31. Carl green-lit the sweep after walking the app.

Phase 1 built 2026-07-31. `typePropOutsideTypeLayer` measured 164 → **0**, the rule is an
error, and its ceiling is deleted. Eight things change on screen, all sub-pixel line spacing
or one typeface swap; every one is listed with a before and after measured in the running app
in [proof/p5b-measurements.md](proof/p5b-measurements.md). Waiting on Carl.

## Parked
- The reading measure sits at `--measure-read: 60ch`, roughly 74 to 82 real characters, against DESIGN.md T5's 66 (75 absolute). One token to change, and a look-at-it decision rather than an arithmetic one.
- The phone heading collision: four display-face heading roles, three rungs a phone may legally use, so one adjacent pair must share a size. Currently `.h3`/`.h4`. One rule to move it.
