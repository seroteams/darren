# Prose snapshots — "did a change make the writing worse?" (harness H5)

The gate checks trust-check **verdicts**; the offline replay re-grades a **frozen**
model response. Neither notices a prompt edit that stays schema-valid and
trust-clean but makes the write-up **blander or less specific**.

This harness re-runs the golden cases **live** and compares the produced
write-up's *prose* to an approved snapshot stored here (`<case-id>.json`).

## Usage (PAID — runs the real pipeline)

```
# bless the current output as the approved wording (do this once, when happy)
node scripts/golden-prose-snapshot.js --only biweekly-priya --update

# later: check whether a change drifted the wording (~$0.35 for one case)
npm run prose -- --only biweekly-priya

# full sweep of all 8 cases (~$3) — only when you mean it
npm run prose -- --all

# add an advisory better/worse/same from the LLM judge
npm run prose -- --only biweekly-priya --judge
```

A field reworded past the similarity floor (`--tolerance`, default 0.8) is the
hard signal (exit 1). The judge verdict is advisory only.

Snapshots are blessed by a human and committed here; an empty directory just
means nothing has been blessed yet.
