# Plan: Finish the lexicon feature

**Version:** v1

## Caveman version

Two halves exist (CLI works, web is a shell). Wire web side to use the CLI's AI reviewer. Make Keep clicks save somewhere real. Add a promote step that turns approved candidates into the live lexicon the prompts read. Decide scope: stay design-only or open up.

End state: finish a 1:1 in the browser → see "anything worth keeping?" with real suggestions → Keep → run a small promote tool when you feel like it → next 1:1's questions pull from the updated lexicon.

## Changelog

- v1: Initial plan

## Open questions (decide before / during build)

1. **Per-role-family vs. per-person.** Current model: lexicon is shared across everyone in the same role + seniority + meeting type. Your gut said "per person." Per-person is more personal but every direct report starts from zero and never benefits from what worked elsewhere. Recommendation: keep role-family rollup, add a personal "overrides" file later if it becomes a felt gap.
2. **Run the AI reviewer always, or only when in scope?** Today, scope is hardcoded to Design Lead + Growth conversations. Easier-now: keep that, web shows "no candidates" for everything else. Better-eventually: drop the gate, let every 1:1 produce candidates even if the canonical file is empty — that's how new role lexicons would ever start.
3. **Promote step: button in the app, or terminal script?** App button feels native but adds UI surface. Script is 30 lines, you run it when you want. Recommendation: script first, see if you miss the button.
4. **Per-meeting-type splitting.** Today a lexicon is keyed `role/seniority/meeting`. That's three axes. Worth keeping all three? If a phrase works in Growth it probably works in Bi-weekly too. Could collapse to `role/seniority` and tag phrases with meeting-type. Defer — not blocking.

## Tradeoffs you should weigh

- **Show suggestions immediately vs. cache the trace.** Running the reviewer at end of stage 05 means a delay (~5–10s extra) before the Lexicon screen renders, but the user is already in "wrapping up" mode so it's hideable behind a "Sero is reflecting…" line. The alternative — kick off in background, screen polls — adds plumbing without much UX win.
- **Where the screen reads from.** Cleanest: AI reviewer writes its trace to disk, web endpoint reads that file. Re-uses CLI machinery, single source of truth, easy to debug (open the JSON). Less clean but tempter: web endpoint calls reviewer live — couples web latency to AI latency for no reason.

## Steps

### 1. Auto-run reviewer at end of session

After stage 05 (evaluation) writes its response, have the server kick the same `reviewSession` the CLI uses. Writes trace to `lexicons/_suggested/<sessionId>.json`. No UI change yet, just confirm a file lands.

- Verify: finish a real session in browser, check that `lexicons/_suggested/<sessionId>.json` appears with non-empty `allSuggestions` for the design/lead/growth case.

### 2. Web endpoint reads the trace

Replace the stub `GET /lexicon/candidates`. Read the trace file for that session, map suggestions to the shape the screen wants (`{ id, phrase, context }`).

- `id`: stable string per suggestion (type + value hash is fine).
- `phrase`: `value` for prefer; `value → better_as` for avoid (one row, both sides visible).
- `context`: `reason` or `evidence` — pick the one that reads more like a quote, not coaching speak.
- Verify: browser shows the same suggestions the CLI would print.

### 3. Keep clicks actually save

Today's POST handler appends a JSONL to the session dir and stops. Add: for each `keep=true` decision, look up its full suggestion in the trace, push through `appendCandidates()`. End state: `lexicons/_candidates/<role>/<seniority>.yaml` grows.

- Drops don't write anywhere new. The JSONL trail in the session dir is enough audit.
- Verify: Keep something in the browser → grep the candidate yaml, phrase is there.

### 4. Promote script — `scripts/promote-candidates.js`

Tiny CLI. For each candidate file under `lexicons/_candidates/`:
- Diff against canonical (`lexicons/<role>/<seniority>.yaml`): which phrases are net-new?
- For each new phrase, ask: `keep / drop / quit?`
- Keeps move to canonical. Drops are removed from candidate. Quits leave both alone.

- Run it whenever the candidate pile feels worth reviewing. No automation, no thresholds.
- Verify: hand-run after a session, confirm canonical updated, next session's question prompt uses the new phrase (grep the rendered prompt).

### 5. Decide scope (open question 2)

Two paths, pick one:

**A. Stay design-only.** Easier. Web shows "No lexicon candidates from this run" for non-design / non-growth. Same as today. Cost: no other role ever builds a lexicon.

**B. Open the gate.** Drop the `shouldReview` filter. Reviewer runs on every session. Canonical files for unmapped scopes don't exist yet — `loadLexicon` already handles that gracefully (returns empty, prompt renders "(none yet)"). New role-families bootstrap themselves from real conversations.

Recommendation: **B**, but only after steps 1–4 work cleanly for design. Easier to confirm the loop on the known-good scope first.

### 6. (Optional, only if missed) Promote button in app

If during real use you keep wanting to promote without leaving the browser, add a `/lexicon/promote` page that lists pending candidates with Keep / Drop / Skip. Same logic as the script, different surface. Don't build until felt needed.

## Out of scope (named so they don't drift in)

- Per-person lexicons (open question 1 — defer)
- Collapsing meeting-type axis (open question 4 — defer)
- Auto-promotion thresholds ("3 approvals → live") — adds risk, no felt need yet
- Lexicon viewer / editor in the UI (canonical yaml is fine to hand-edit for now)

## What success looks like

After this:
- Finish a Design Lead Growth 1:1 → see real phrase candidates → Keep some → run promote script → next session's questions pull from the updated lexicon. End-to-end loop closes.
- For other role + meeting combos: either nothing shows (path A) or candidates accumulate quietly for later promotion (path B).
- CLI flow keeps working — no behavior change there, web just catches up.
