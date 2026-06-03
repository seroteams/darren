# May-24 batch persona catalog

These scenarios reconstruct the first-run persona inputs from:
- `logs/may/2026_May24_batch/run-outputs.json` (primary source)
- supporting context in `README.md` and `ANALYSIS.md` in the same log directory

## Files and run mapping

- `priya-biweekly-checkin.json` - Priya - Bi-weekly check-in - `547a1f92-945`
- `tom-performance-feedback.json` - Tom - Performance & feedback - `793c8897-15f`
- `maria-growth-career-plan.json` - Maria - Growth & career plan - `ee27022e-255`
- `james-something-feels-off.json` - James - Something feels off - `f1d65bb3-502` (first James run block)
- `lin-biweekly-checkin.json` - Lin - Bi-weekly check-in - `6ae9ead8-32f`
- `sarah-performance-feedback.json` - Sarah - Performance & feedback - `f5de2465-573`
- `ahmed-growth-career-plan.json` - Ahmed - Growth & career plan - `835c2df0-e23`
- `kenji-something-feels-off.json` - Kenji - Something feels off - `9a49991f-3e8`
- `nina-biweekly-checkin.json` - Nina - Bi-weekly check-in - `704418bf-e72`
- `carlos-performance-feedback.json` - Carlos - Performance & feedback - `c298ae75-f50`
- `sam-onboarding-checkin.json` - Sam - Onboarding check-in - `synthetic-2026-05-31-sam`
- `riley-onboarding-checkin.json` - Riley - Onboarding check-in - `synthetic-2026-05-31-riley`
- `aisha-onboarding-checkin.json` - Aisha - Onboarding check-in - `synthetic-2026-05-31-aisha`
- `toby-growth-career-plan.json` - Toby - Growth & career plan - `synthetic-2026-05-31-toby`
- `elena-something-feels-off.json` - Elena - Something feels off - `synthetic-2026-05-31-elena`

## Reconstruction notes

- These are replay fixtures, not raw stdin captures from the original harness run.
- `manager_notes` are synthesized from first-run `focus_points[].reason` signals and rewritten into manager voice.
- `answers` are reconstructed from first-run preparation `listenFor` cues plus evaluation themes and transcript behavior.
- Each scenario follows the smoke-test schema:
  - `name`, `role`, `seniority`, `meeting_type`, `manager_notes`, `answers[]`
- Meeting labels are canonical values from `src/meeting-types.js`.
