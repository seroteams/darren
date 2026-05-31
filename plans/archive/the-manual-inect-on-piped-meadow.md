---
version: 1
---

## Caveman summary
Add payload-dump + gate to reviewrun skill so raw LLM input audited before hypotheses.

## Changelog
- v1: initial.

## Context

Darren warned: prompt tweaks worthless if context payload broken. Missing/stale fields drive LLM wrong silently. Current `reviewrun` skill digests `inputs.json` + `prompt.md` into one-liners — risks hiding context gaps the user must catch before tuning anything.

Goal: bake a manual-inspection step into the skill so user always eyeballs the raw payload (`inputs.json` + `prompt.md`) per stage and explicitly acks before the skill emits hypotheses or sharpening questions.

User decisions:
- Mode: **dump raw payload verbatim** (no summarization of payload contents).
- Gate: **hard block** — skill stops after dump, waits for user ack before hypotheses/questions.

## File to modify

- [SKILL.md](c:\Users\User\Documents\Sero\darren\.claude\skills\reviewrun\SKILL.md) — only file changed.

## Changes

### 1. Procedure section — insert new step 3, renumber rest
After step 2 (read in parallel), before current step 3 (digest):

```
3. **Payload dump.** For each stage in order, emit:
   ### <stage-name>
   **inputs.json:**
   ```json
   <full verbatim contents>
   ```
   **prompt.md:**
   ```
   <full verbatim contents>
   ```
   No summarization. No truncation unless file > 100KB (then note size and dump head + tail 2KB each).
4. **STOP. Wait for user ack.** After dump, output exactly:
   `Payload dumped. Reply 'go' (context looks complete) or call out gaps before I continue.`
   Do not emit digest, signals, hypotheses, or questions until user replies.
5. **Digest.** (was step 3) ...
6. **Cross-stage signals.** (was step 4) ...
7. **User notes.** (was step 5) ...
8. **Output template** (was step 6) ...
```

### 2. Rules section — add two bullets
```
- **Payload dump is mandatory.** Never skip step 3 even if user seems impatient. Darren's rule: prompt tuning on broken context = wasted work.
- **Gate is hard.** No hypotheses/questions until user replies after dump. If user says "skip dump" — refuse, explain why, dump anyway.
```

### 3. Output template — add header noting two-phase output
Prepend to template:
```
(Phase 2 — emitted only after user ack on payload dump)
```

## Reuse

No new helpers. Uses existing Read tool only. `transcript.json` >50KB rule already in skill; mirror same head/tail pattern for oversize payload files.

## Verification

End-to-end test (read-only, no commit):
1. Invoke `/reviewrun C:\Users\User\Documents\Sero\darren\logs\april\2026_Apr22_09-25-0001` in a fresh conversation.
2. Confirm output order: list dir → read files → **raw dump per stage** → STOP message → wait.
3. Reply `go`. Confirm skill then emits digest + signals + hypotheses + questions per template.
4. Re-invoke. Reply with a gap callout instead of `go`. Confirm skill incorporates callout into hypotheses rather than ignoring.
5. Edge: invoke on a run with one stage missing `inputs.json`. Confirm dump notes absence, continues other stages, still gates.

## Out of scope

- No automated gap detection (user chose verbatim dump only).
- No changes to log writers / pipeline code.
- No new files.
