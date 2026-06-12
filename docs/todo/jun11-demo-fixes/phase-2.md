# Phase 2 — Brief wording: name + plain language

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
The prep brief talks about the person by name and in plain words — no job-title-as-name, no jargon, no long-winded tails.

## Changes
- `prompts/preparation.md` — instruct: refer to {{NAME}} by name; never describe them by their job title in coreIssue/goodOutcome/suggestedAction. Plainness instruction for `suggestedAction` (kills "…and agree that intervention live").
- `src/preparation.js` — `validateBrief()`: coreIssue check looks for the *name* (role words optional, no longer pushed); missing name = flag and retry.
- Plain-language backstop: minimal jargon list, only terms seen in bad output ("air cover", "circle back", "leverage", "bandwidth", "synergy") — applied to brief fields and generated questions (`prompts/generate-questions.md`, `src/golden-checks.js`). Detect → flag → retry. Never silently rewrite (standing rule).

## Not in this phase
- Question integrity (done in Phase 1), live scores, navigation.
- Expanding the jargon list speculatively — it only grows from observed bad output.

## Done when
- [ ] Regenerated Machar brief says "Machar", no jargon, suggestedAction reads plainly.
- [ ] `npm run gate` + `npm run eval` on affected prompts green.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Name, not title** — run the Machar inputs to the prep brief. The core issue line should say "Machar". ❌ Not OK if it says "a lead partner alliance manager" or similar title-speak.
2. **Plain words** — read the whole brief aloud. ❌ Not OK if you hit "air cover", "leverage", "bandwidth", "circle back", "synergy", or anything you'd have to explain to Machar.
3. **Clean ending** — the suggested action should end like a normal sentence a manager would say. ❌ Not OK if it trails into clunky phrasing like "and agree that intervention live".
4. **Try another persona** — run one of the stock personas (e.g. Priya) and re-check 1–3 to make sure the fix isn't Machar-specific.
