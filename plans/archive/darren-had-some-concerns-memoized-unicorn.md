# Plan: Prompt-length audit + obvious-wins flagger
**Version:** v1

## Caveman version
Big planner prompt (29 KB) probably hurting model attention. Build one read-only script `audit-prompts.js` that measures every prompt by section, draws a turn-by-turn growth curve for stage 04, flags oversized/duplicate sections, and writes a Markdown report. Humans (Darren) edit the prompt `.md` files by hand — script never rewrites prompts. After cuts, rerun existing probes to spot regressions. No prompt caching, no planner-split refactor, no AI-driven edits.

## Changelog
- v1: Initial plan

## Context

Sero sends 6 prompts to gpt-4o across a session. Stage 04 (`plan-turn`) is the hotspot: 29.6 KB template, runs ~8× per session, full transcript + axis state + queue summary + arc progress re-sent every turn. Carl's worry is **model attention / quality** — 29 KB of guidance may bury the important instructions in noise, and answers degrade.

Advisor Darren's constraint: prompts are governance-critical detail. Humans edit `prompts/*.md` manually; AI does not auto-rewrite them. Audit tooling must **measure and suggest**, never modify prompt files.

Scope: measure + obvious wins only. Not a planner refactor. Prompt caching deferred.

Goal: a reviewer can open one report in <10 minutes and answer:
1. Which section in each prompt is biggest?
2. How big does stage 04 get on its largest turn?
3. Which sections are duplicated across stages?
4. Which sections look like over-instruction outliers?

## Approach

Single new script `audit-prompts.js` at repo root. Pattern mirrors existing `rerun-eval.js`, `rerun-focus-points.js`, `probe-plan-turn-ab.js`. Read-only. Zero API calls. Writes one Markdown report to `logs/audits/prompt-audit-<ISO>.md`.

### Token counting
Vendor [`gpt-tokenizer`](https://www.npmjs.com/package/gpt-tokenizer) (pure-JS, no native deps). Exact gpt-4o token counts. ~1.5 MB to node_modules. Carl chose exact over estimated.

### Section parsing
All six prompts use `## System` / `## User` headings then `<lowercase_tag>...</lowercase_tag>` blocks. Plan agent confirmed convention is consistent. Parser splits on these and returns `{ stage, system: {tag: text}, user: {tag: text} }`. Any untagged residual is reported as "unlabeled" so nothing is silently lost.

### Static audit
For each of 6 prompts, render a table: `section | tokens | %_of_stage`, sorted desc. Total per stage.

### Dynamic audit (one representative session)
Walk `logs/<month>/<id>/<stage>/prompt.md` for each stage. Count tokens of the as-sent string. Cross-reference template tokens vs as-sent tokens — the gap is dynamic injection size.

Default session = latest in `logs/`. CLI: `node audit-prompts.js [<session-path>]` or `--no-dynamic` for static-only.

### Stage 04 growth curve
Stage 04 only persists its **last** turn's `prompt.md` on disk (one prompt per stage in current logging). To see growth across turns 1–8, reconstruct each turn's prompt offline by calling `buildMessages()` from `src/queue-manager.js` against the existing per-turn snapshots in `04-dynamic-answers/0N-turn.json`. No code change to logging. Output: small table `turn | tokens | delta-vs-turn-1`.

*(This is what the second "no idea" question was about — TL;DR we reconstruct each turn's prompt from the data already on disk, instead of saving them all live. Lower disk usage, same audit value.)*

### Duplication detector — both cross-stage and within-stage
*(This is what the third "no idea" question was about — explained briefly: find sentences/blocks that appear in more than one prompt, or twice in the same prompt. Same code path covers both; together they surface (a) shared guidance to lift to one place, and (b) immediate cuts within a file.)*

Hash each section body (lowercased, whitespace-collapsed). Flag exact-match hashes and longest-common-substring >150 chars. Report shows both excerpts side-by-side; human decides what (if anything) to lift or cut.

### Obvious-win flagger
Heuristics, one pass over parsed sections. Each flagged section listed with the snippet, the heuristic that fired, and an estimated tokens-saved-if-removed:
- `<examples>` / `<worked_examples>` >1500 tokens — likely over-illustrated
- Sections of mostly-imperative sentences (`MUST`/`Do NOT`/`Always`) totaling >800 tokens — likely over-instruction
- JSON contract fields in `<output_contract>` never referenced in surrounding rules — candidate for removal (heuristic, not proof)
- Same sentence appearing twice in one template — clean cut

All "flags" are suggestions for the human reviewer. Nothing is auto-changed.

### Report
One Markdown file. Header includes tokenizer used (`gpt-tokenizer` for gpt-4o) and a one-paragraph methodology note. Sections in stable order:
1. Per-stage summary table (sections sorted by token count)
2. Stage 04 growth curve
3. Cross-stage duplicates
4. Within-stage duplicates
5. Obvious-win flags
6. Methodology + caveats

Diffable: stable section order, stable sort within each section.

## Critical files

- **Add**: `c:\Users\User\Documents\Sero\darren\audit-prompts.js` — single root script, ~200 lines
- **Add dep**: `gpt-tokenizer` via `npm install gpt-tokenizer`
- **Read-only imports**:
  - `src/queue-manager.js` — `buildMessages()` for stage 04 turn reconstruction
  - `src/session.js` — `monthFolderFor`, `LOGS_ROOT` (copy latest-session walker pattern from `rerun-eval.js`)
- **Read-only inputs**:
  - `prompts/*.md` (all six)
  - `logs/<month>/<id>/<stage>/prompt.md`, `04-dynamic-answers/0N-turn.json`, `session-state.json`

Nothing in `prompts/` or `src/` is modified.

## Verification

After Darren edits a prompt by hand, lean on existing probes (don't build new eval infra):
1. `node probe-plan-turn-ab.js` — asserts thread-follow behavior of stage 04 against a captured session. Re-run post-edit; pass = the encoded behavior survived.
2. `node rerun-eval.js logs/<…>` — replays stage 05 against a fixed session, useful for evaluation-prompt edits.
3. `node rerun-focus-points.js` — same for stage 01.

For stages without a rerun script (preparation, question-bank, lexicon-review), spot-check by running one full session via the CLI and eyeballing the output. Building a multi-scenario eval matrix is out of scope.

Caveats (acknowledged, not fixed here):
- gpt-4o is non-deterministic even at temperature 0.4 — output diffs alone can't prove regression.
- Probes test one behavior each; they can't catch every regression. They're the existing convention and they're cheap.

## Implementation sequence

1. `npm install gpt-tokenizer` → verify import in a one-liner.
2. Section parser + static audit + report writer. Eyeball six per-stage tables.
3. Dynamic audit reading per-stage `prompt.md`.
4. Stage 04 growth curve via `buildMessages` reconstruction. Verify turn 8 > turn 1.
5. Duplication detector (cross + within) + flagger heuristics. Eyeball the flag list with Darren — does it match intuition?
6. CLI flags (`--no-dynamic`, default-to-latest-session).
7. Hand report to Darren. He edits prompts. Then `probe-plan-turn-ab.js` + `rerun-eval.js` for spot-check.

Total: ~1.5 hrs of dev before any prompt edits.

## Open questions

None outstanding — Carl chose exact tokenizer; the other two "no idea" answers got sensible defaults (offline reconstruction; both dedup scopes) explained inline above. If either default looks wrong on first read, easy to flip in v2.
