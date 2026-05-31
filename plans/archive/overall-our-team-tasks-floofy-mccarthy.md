# Plan: Replace 4-axis bipolar system with 5-category 1–10 lens system

**Version:** 1.1
**Caveman version:** full
**Changelog:**
- v1.1 — replaced 6-category model w/ 5 (drop Overall, Fun; final set: Team, Work, Process, Growth, Energy). Added "conversation lens" framing section. Added explicit scale-meaning anchors (1/3/5/7/10). Added delta safety rule (one ±3 per category per session, bias ±1). Added `confidence` field to delta + summary schemas. Added trend-architecture forward-looking note. Rewrote YAML migration section as ontology-rewrite warning. Added evaluation-criteria section. Added UI/visual goal section. Added scope-guardrail section. (+~110, -~25 from v1.0)
- v1.0 — initial draft (+all)

## Context

Current 1:1 review system tracks 4 axes (wellbeing, engagement, clarity, growth) on a bipolar -10..+10 scale with neutral=0. In run `2026_May18_19-47-3e7fe11b`, user flagged the axes block in briefing as "okay bit nreally helping" and asked for the 1.9-style model: discrete categories on a 1–10 scale with 5 = normal.

After scoping, the new model is **5 orthogonal categories** — **Team, Work, Process, Growth, Energy** — on a **1–10 integer scale**. Old `Overall` and `Fun` proposals were dropped: Overall becomes a dumping-ground summary; Fun reads too casual for enterprise. Five categories is cleaner and more orthogonal.

This is **not** a psychometric system. These are conversation lenses, friction lenses, manager-attention lenses. The plan documents that framing explicitly so downstream prompts and YAML rewrites stay grounded.

Out of scope for this plan: other run-feedback themes (coreIssue length, focus-points selection, question repetition, flow breaks, wind-down, notes linkage, briefing typography, actions vs watch_for). Tracked separately.

## Goals

The scoring system should feel:
- fast to understand
- human
- low-cognitive-load
- useful for managers
- enterprise-safe
- trend-friendly
- grounded in conversation signal, not fake psychology

## What these scores are (and are not)

**Are:**
- conversation lenses — where did this 1:1 land attention
- friction lenses — where is the rub right now
- manager-attention lenses — where should the manager look next

**Are not:**
- psychological truth scores
- performance ratings
- HR / calibration inputs
- scientific measurements

Prompts, evaluator guidance, and developer docs must repeat this framing. Without it, models will drift toward emotional-state inference and managers will mistake the score for clinical signal.

## Decisions

| | |
|---|---|
| Categories | **Team, Work, Process, Growth, Energy** |
| Scale | 1–10 integer |
| Scale anchors | 1 = severe issue · 3 = concern · 5 = normal/stable · 7 = healthy/positive · 10 = exceptional sustained state |
| Storage | Native 1–10 (no internal bipolar offset) |
| Initial values | All start at 5 |
| Manager-note seeding | None — preparation stage does not touch axis state |
| Delta values allowed | [-3, -1, 0, +1, +3] |
| Delta default bias | ±1. ±3 reserved for strong explicit conversation evidence. |
| Delta safety rule | **At most one ±3 per category per session.** Enforced in planner/evaluator schema. |
| Clamp | `Math.max(1, Math.min(10, score + delta))` |
| Confidence field | New: `confidence: "low" | "medium" | "high"` on each delta and on final-eval per-axis output. |
| Viz | Fill from left, ratio = score/10. No midline. No bipolar pos/neg classes. No off-scale. |

## Category descriptions (fresh draft — review at approval)

```json
{
  "axes": [
    { "id": "team",    "label": "Team",    "description": "Trust, connection, collaboration with the immediate team and cross-functional partners. High = relationships feel supportive and productive. Low = friction, isolation, distrust." },
    { "id": "work",    "label": "Work",    "description": "The work itself: load, fit, sense of meaningful contribution. High = work feels meaningful and manageable. Low = grind, overwhelm, or under-utilization." },
    { "id": "process", "label": "Process", "description": "Tools, rituals, ways of working. High = process supports the work. Low = overhead drowning the work — too many channels, unclear ownership, noise." },
    { "id": "growth",  "label": "Growth",  "description": "Trajectory, learning, stretch, useful feedback loops. High = getting better, being invested in. Low = plateau, stuck, no visible path." },
    { "id": "energy",  "label": "Energy",  "description": "Sustainability, capacity, recovery. High = sustainable pace. Low = running hot, masked fatigue, drift toward burnout." }
  ]
}
```

Wording is draft; user reviews at plan-approval.

## Files to modify

### Source of truth
- **`axes.json`** — replace entire array with 5 categories above.

### Backend (`src/`, `cli.js`)
- **[src/axes.js:6](src/axes.js#L6)** — replace `SCORE_CLAMP = 10` with `SCORE_MIN = 1`, `SCORE_MAX = 10`, `SCORE_NEUTRAL = 5`.
- **[src/axes.js:12-18](src/axes.js#L12-L18)** `initState` — seed `score: 5`. Add per-axis `bigMoveUsed: false` (tracks the one-±3-per-session rule).
- **[src/axes.js:20-37](src/axes.js#L20-L37)** `applyDeltas` — new clamp `Math.max(SCORE_MIN, Math.min(SCORE_MAX, proposed))`. If `|delta| === 3`: reject if `slot.bigMoveUsed` is true (set delta to ±1 of the same sign, log a `coerced_big_move` note); else set `bigMoveUsed = true`. Accept new `confidence` field on the delta payload and persist it on the history entry.
- **[src/axes.js:48-54](src/axes.js#L48-L54)** `serialize` — also persist `bigMoveUsed` per axis.
- **[src/axes.js:62-77](src/axes.js#L62-L77)** `validateAxisState` — range 1..10; allow `bigMoveUsed` boolean.
- **[src/queue-manager.js:16](src/queue-manager.js#L16)** `AXIS_IDS` — replace 4 names with 5 new ids.
- **[src/queue-manager.js:20-28](src/queue-manager.js#L20-L28)** `AXIS_EFFECT_ITEM` schema — keep delta enum [-3,-1,0,1,3]; add optional `confidence: enum("low","medium","high")`.
- **[src/queue-manager.js:190-202](src/queue-manager.js#L190-L202)** — enforce the per-session ±3 rule at validation (delegates to applyDeltas which handles it, but surface a warning when planner over-uses ±3).
- **[src/reviewer.js:15](src/reviewer.js#L15)** `AXIS_IDS` — replace.
- **[src/reviewer.js:26-38](src/reviewer.js#L26-L38)** — schema score range 1..10; add `confidence` per axis in final eval output (`"low"|"medium"|"high"`).
- **[src/question-generator.js:18](src/question-generator.js#L18)** `AXIS_IDS` — replace.
- **[src/ui.js:33-49](src/ui.js#L33-L49)** `renderAxisLine` — terminal display `Label: N/10` (no signed prefix). Optionally append confidence as a short suffix (e.g. ` ~low`) when present.
- **[cli.js:344](cli.js#L344)** `initState()` — no signature change.

### Frontend (`frontend/client/src/`)
- **[frontend/client/src/ui/axes.js:4](frontend/client/src/ui/axes.js#L4)** `AXIS_ORDER` — `["team","work","process","growth","energy"]`.
- **[frontend/client/src/ui/axes.js:5-10](frontend/client/src/ui/axes.js#L5-L10)** `AXIS_LABELS` — 5 entries matching above.
- **[frontend/client/src/ui/axes.js:11](frontend/client/src/ui/axes.js#L11)** `VISUAL_MAX = 6` → `VISUAL_MAX = 10`.
- **[frontend/client/src/ui/axes.js:67-85](frontend/client/src/ui/axes.js#L67-L85)** `setFill` — single fill path: `ratio = score / 10`. Remove bipolar branching, midline, neutral/negative classes. Score==0 path becomes unreachable — delete.
- **[frontend/client/src/ui/axes.js:87-91](frontend/client/src/ui/axes.js#L87-L91)** `setValueText` — unsigned integer: `value.firstChild.nodeValue = String(score);`.
- **[frontend/client/src/ui/axes.js:93-119](frontend/client/src/ui/axes.js#L93-L119)** `showOffscale` / `removeOffscaleBadge` / off-scale call sites — delete. Clamp at 10 makes off-scale impossible.
- **[frontend/client/src/ui/axes.js:121-153](frontend/client/src/ui/axes.js#L121-L153)** `animateTo` — keep count-up; keep delta chip showing signed `+1`/`-3` (movement indicator, useful even on unipolar scale).
- **CSS sweep** — delete or hide: `.axis__midline`, `.axis__fill--neutral`, `.axis__fill--negative`, `.axis__caret`, `.axis__offscale`. Mechanical grep across stylesheet bundle.
- **[frontend/client/src/stages/briefing.js:99-100](frontend/client/src/stages/briefing.js#L99-L100)** — replace 4-axis init with 5, all `score: 5`.
- **[frontend/client/src/stages/questioning.js:36-39](frontend/client/src/stages/questioning.js#L36-L39)** — same.
- **Confidence rendering** — minimal for now. Optional small text suffix or muted dot beside score. No heavy UI required this pass.

### Prompts
- **[prompts/generate-questions.md:16](prompts/generate-questions.md#L16), [:24](prompts/generate-questions.md#L24), [:221-232](prompts/generate-questions.md#L221-L232)** — update axis list to 5 new ids. Insert a "Scale anchors" block stating `1=severe, 3=concern, 5=normal, 7=healthy, 10=exceptional sustained`. Insert a "Delta discipline" block: default ±1; reserve ±3 for strong explicit conversation evidence; at most one ±3 per category per session.
- **[prompts/final-evaluation.md:21-26](prompts/final-evaluation.md#L21-L26)** — output contract: 5 axes by id; `score` int 1..10; `meaning` one sentence; `confidence` enum. Remove bipolar phrasing ("positive=… negative=…") from all surrounding instruction text. Add the lens-framing paragraph ("conversation lens, not psychological truth").
- **Developer docs** — wherever the axis system is explained (READMEs, CLAUDE.md sections, internal `docs/`), repeat the scale anchors and the "not psychological truth" framing. Do not duplicate prompt content; cross-reference.

### Question YAMLs (`questions/*.yaml`) — ontology rewrite, not rename

**This is the most fragile step. It is NOT a find-and-replace.**

Old → new mapping is **not deterministic**:
- `wellbeing` may map to **Energy** (sustainability/load) *or* **Team** (psychological safety) depending on the question.
- `clarity` may map to **Process** (process noise, channel overload) *or* **Work** (role/priority clarity).
- `engagement` may map to **Work** (investment in the work) *or* **Team** (showing up for others) *or* **Growth** (leaning into stretch).
- `growth` largely maps to **Growth** but check each.

Process:
1. Validator at [src/queue-manager.js:190-202](src/queue-manager.js#L190-L202) will surface every YAML still referencing dead ids — use as worklist.
2. For each YAML, read the question text, decide the lens, rewrite `axis_effects` against new ids and the ±1 default discipline.
3. Treat this as a separate execution session after schema + prompts ship. Do not bulk-script.

## Reused functions

- [src/axes.js:39-46 `summarize`](src/axes.js#L39-L46) — unchanged.
- [src/axes.js:56-60 `coverageGap`](src/axes.js#L56-L60) — unchanged.
- [frontend/client/src/ui/axes.js:121 `animateTo`](frontend/client/src/ui/axes.js#L121) — count-up animation retained; only fill shape changes.

## Verification

### Functional
1. **Schema** → `node -e "require('./src/axes').loadAxes()"` returns 5 entries. `initState()` shows all 5 at `score: 5`, `bigMoveUsed: false`.
2. **Clamp** → applyDeltas past 10 lands at 10; below 1 lands at 1.
3. **±3 rule** → second ±3 to the same category in a session is coerced to ±1 with a `coerced_big_move` log entry.
4. **Confidence** → delta payloads accept `confidence: "low"|"medium"|"high"`; persisted to history; surfaced in final-eval output.
5. **Validator reject** → question generator and YAMLs referencing `wellbeing/engagement/clarity/growth` produce listed errors.
6. **End-to-end run** → `node cli.js` against a test scenario; `logs/<run>/axis-state.json` shows 5 ids, all scores in 1..10, history + bigMoveUsed populated.
7. **Briefing prompt** → 05-evaluation response.json has 5 axes, integer 1..10, `confidence` present, `meaning` one sentence.
8. **Frontend** → briefing UI renders 5 bars, all ~50% fill at start, no midline, no off-scale caret. Negative delta shrinks bar, value text drops as integer (e.g. `4`), delta chip shows `-1`.

### Qualitative — manager-trust checks (post-implementation)
- Manager can interpret all 5 scores in **under 3 seconds**.
- Manager can articulate **why** a score moved by skimming history.
- Score movements feel **believable** — no whiplash from single answers.
- Managers report **more trust** than the bipolar -10..+10 version.
- Bars read as **calm, stable, scannable** — not gamified, not emotionalized.

Capture these via a short post-implementation review on the next live run.

## Future-direction note (architecture should support, not build now)

The long-term value of these scores is **not the single snapshot.** It is:
- trend movement across sessions
- drift detection (slow decline before a person says anything)
- recovery patterns after a low point
- repeated friction themes (same category low across multiple 1:1s)

`axis-state.json` per run + `confidence` per delta gives us the substrate. Trend dashboards, drift alerts, longitudinal views — **not in this plan.** Do not pull them in.

## Scope guardrails

Out of scope for this plan and for follow-up work spawned from it:
- analytics dashboards
- HR-performance / calibration framing
- presenting scores as scientific truth
- emotional / clinical interpretation language anywhere in prompts or UI
- complex confidence UI (a quiet suffix is enough for now)

These are lightweight managerial guidance signals only.
