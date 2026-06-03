# Update OpenAI pricing + stage model config

**Version:** 2
**Caveman version:** full

## Context
Two related drifts:

1. [data/openai-models.json](../data/openai-models.json) fetched 2026-04-22 (today 2026-05-27). Upstream now lists `gpt-5.5*`, `gpt-realtime-2`, `gpt-image-*`, `deep-research`; drops `gpt-4o*`, `gpt-4.1*`, `o3*` from current pricing tables.
2. [config/models.json](../config/models.json) picks `gpt-4o` for **all 5 stages**. Per cost analysis on [logs/april/2026_Apr22_10-39-8424/cost.json](../logs/april/2026_Apr22_10-39-8424/cost.json), switching to a tiered split saves **~22% per run** AND upgrades the highest-leverage stage (planner) to a stronger reasoning model.

## Change 1 — `data/openai-models.json`

| Action | Models |
|---|---|
| Add | `gpt-5.5`, `gpt-5.5-pro`, `gpt-realtime-2`, `gpt-image-2`, `gpt-image-1.5`, `deep-research`, `chat-latest` |
| Replace | `gpt-realtime-1.5` → `gpt-realtime-2` |
| Keep (legacy) | `gpt-4o`, `gpt-4o-mini`, `gpt-4.1*`, `o3`, `o4-mini`, `o3-mini`, `gpt-5.3-chat-latest`, `computer-use-preview`, `gpt-5.3-codex`, `gpt-5.4*` |
| Meta | `_meta.fetched_at` → `2026-05-27`; add `_meta.legacy_unverified_after` note for dropped-from-upstream entries |

New pricing rows (USD per 1M):

```json
"gpt-5.5":         { "family": "gpt-5.5", "input_per_1m_usd": 5.0,  "output_per_1m_usd": 30.0,  "cached_input_per_1m_usd": 0.5 }
"gpt-5.5-pro":     { "family": "gpt-5.5", "input_per_1m_usd": 30.0, "output_per_1m_usd": 180.0, "cached_input_per_1m_usd": null }
"gpt-realtime-2":  { "family": "realtime-audio", "input_per_1m_usd": 32.0, "output_per_1m_usd": 64.0, "cached_input_per_1m_usd": 0.4, "notes": "Audio tokens. Text I/O billed at 4.0/24.0 per 1M." }
"gpt-image-2":     { "family": "image", "input_per_1m_usd": 8.0, "output_per_1m_usd": 30.0, "cached_input_per_1m_usd": 2.0 }
"gpt-image-1.5":   { "family": "image", "input_per_1m_usd": 8.0, "output_per_1m_usd": 32.0, "cached_input_per_1m_usd": 2.0 }
"deep-research":   { "family": "specialised", "input_per_1m_usd": 5.0, "output_per_1m_usd": 20.0, "cached_input_per_1m_usd": null }
"chat-latest":     { "family": "gpt-5.5", "input_per_1m_usd": 5.0, "output_per_1m_usd": 30.0, "cached_input_per_1m_usd": 0.5 }
```

## Change 2 — `config/models.json`

Per-run cost on real Apr 22 token mix (38k cached + 18k uncached planner input, 2.8k planner output):

| Stage | Now | New | Per-run $ now | Per-run $ new |
|---|---|---|---|---|
| focus_points | gpt-4o | **gpt-5.4-mini** | $0.012 | $0.004 |
| preparation | gpt-4o | **gpt-5.4** | $0.013 (est) | $0.014 (est) |
| bank | gpt-4o | **gpt-5.4-mini** | $0.016 | $0.006 |
| planner | gpt-4o | **gpt-5.4** | $0.099 | $0.094 |
| evaluation | gpt-4o | **gpt-5.4-mini** | $0.012 | $0.004 |
| **Total** | | | **~$0.152** | **~$0.122** |

**Δ: −$0.030 / run (−20%)**, planner reasoning upgraded (cached input 5× cheaper on gpt-5.4 offsets +50% output rate).

Rationale per stage:
- **planner** (80% of cost, 8 calls/run) — stateful turn decisions. Reasoning-bound. Most user feedback (wind-down overshoot, broken-promise snap-back, plan flow) lands here. Upgrade gives biggest quality lift; cache savings make it cheaper than gpt-4o anyway.
- **preparation** — tone/format discipline (coreIssue length, actions>watch_for, opener phrasing) mostly prompt-fixable; modest model bump for reliability.
- **bank, focus_points, evaluation** — bulk gen / extraction / offline meta. Mini tier sufficient.

## Files touched
1. [data/openai-models.json](../data/openai-models.json)
2. [config/models.json](../config/models.json)

## Verification
- `node -e "console.log(require('./src/models').allResolved())"` → returns new per-stage mapping
- `node -e "console.log(require('./src/cost').priceOf('gpt-5.5'))"` → non-null
- `node -e "JSON.parse(require('fs').readFileSync('data/openai-models.json'))"` → no parse error
- Smoke: `node smoke-test.js` → cost tracker `usd_total` non-null, totals roughly match plan estimate
- Spot-check next live run: planner stage shows `model: "gpt-5.4"` in `cost.json`

## Open questions
None for v2 — split decided, legacy kept with note, scope = 2 files.

## Changelog
- **v2 (+72 / −7):** added cost analysis from real log; expanded scope to include `config/models.json`; locked legacy-keep decision (note-tag rather than drop); per-stage tier rationale
- v1: initial pricing-only plan
