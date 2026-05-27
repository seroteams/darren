# Update `data/openai-models.json` with latest pricing

**Version:** 1
**Caveman version:** full

## Context
[data/openai-models.json](../data/openai-models.json) fetched 2026-04-22. Today 2026-05-27. Source page now lists new flagship models and dropped several entries we carry.

## Diff vs current file (WebFetch 2026-05-27, https://developers.openai.com/api/docs/pricing)

### New / changed
| Model | Input | Cached | Output | Status |
|---|---|---|---|---|
| `gpt-5.5` | 5.00 | 0.50 | 30.00 | **new flagship** |
| `gpt-5.5-pro` | 30.00 | — | 180.00 | **new** |
| `gpt-5.4` | 2.50 | 0.25 | 15.00 | unchanged |
| `gpt-5.4-mini` | 0.75 | 0.075 | 4.50 | unchanged |
| `gpt-5.4-nano` | 0.20 | 0.02 | 1.25 | unchanged |
| `gpt-5.4-pro` | 30.00 | — | 180.00 | unchanged |
| `chat-latest` | 5.00 | 0.50 | 30.00 | **new id** (likely supersedes `gpt-5.3-chat-latest`) |
| `gpt-5.3-codex` | 1.75 | 0.175 | 14.00 | unchanged |
| `gpt-realtime-2` (audio) | 32.00 | 0.40 | 64.00 | **replaces gpt-realtime-1.5** |
| `gpt-realtime-2` (text) | 4.00 | 0.40 | 24.00 | new text row |
| `gpt-realtime-mini` | 10.00 | 0.30 | 20.00 | unchanged |
| `gpt-image-2` | 8.00 | 2.00 | 30.00 | **new** |
| `gpt-image-1.5` | 8.00 | 2.00 | 32.00 | **new** |
| `computer-use-preview` | 1.50 | — | 6.00 | unchanged |
| `deep-research` | 5.00 | — | 20.00 | **new** |

### Dropped from upstream (still in file)
`gpt-4.1`, `gpt-4.1-mini`, `gpt-4.1-nano`, `gpt-4o`, `gpt-4o-mini`, `o3`, `o4-mini`, `o3-mini`, `gpt-5.3-chat-latest`, `gpt-realtime-1.5`. APIs may still serve, pricing no longer published.

### Impact on stage selection
[config/models.json](../config/models.json) picks `gpt-4o` for all 5 stages; [src/models.js:5](../src/models.js#L5) fallback is `gpt-4o-mini`. If we drop `gpt-4o*`, [src/cost.js:31-33](../src/cost.js#L31-L33) returns `usd:null` for every call → cost tracker breaks. Must either keep legacy entries OR switch stage config to a current model in same edit.

## Proposed change (scope = pricing file only)

Edit [data/openai-models.json](../data/openai-models.json):

1. Bump `_meta.fetched_at` → `2026-05-27`.
2. Add: `gpt-5.5`, `gpt-5.5-pro`, `gpt-realtime-2` (single audio entry — text variant lives in same id), `gpt-image-2`, `gpt-image-1.5`, `deep-research`, `chat-latest`.
3. Replace `gpt-realtime-1.5` → `gpt-realtime-2`.
4. Legacy models — decision pending (see clarify).

## Verification
- `node -e "console.log(require('./src/cost').priceOf('gpt-5.5'))"` → non-null
- `node -e "JSON.parse(require('fs').readFileSync('data/openai-models.json'))"` → no parse error
- Run smoke (`node smoke-test.js`) → cost tracker non-null for active stage model

## Critical files
- [data/openai-models.json](../data/openai-models.json) — only file edited

## Changelog
- v1: initial plan
