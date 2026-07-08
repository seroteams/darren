# Findings / audit write-up template

For audits, health checks, "where do we stand" reports, and any orientation doc Carl will read.
This is the shape he converged on (cto-check-july findings) — visual, honest, one decision at the end.

```
# <Title — plain words, what was looked at>

## TL;DR (read this bit)
<3–5 lines max. The one thing Carl needs to know, in plain English. No jargon.>

## What I looked at
<the actual input — files, runs, date range. Short. Links.>

## What I found
<the evidence. Prefer a table, a before/after, or a simple ASCII diagram over paragraphs.
 Sample real output where it helps — quote, don't paraphrase, when wording matters.>

## Honest read
- ✅ <what's genuinely fine>
- ⚠️ <what's shaky, and why it matters>
- 👉 <the thing that actually needs a decision>

## ✅ Your move
- **A)** <recommended option> ✅ recommended — <one line why>
- **B)** <real alternative> ▶️
- **C)** <park it> ⏸️
```

Rules:
- Every option lettered so Carl can reply with one letter. Recommended pick goes first, as A.
- Honesty over comfort — a ⚠️ reported plainly beats a ✅ that hides a problem.
- If the findings span multiple files, add a `README.md` "👀 START HERE" map listing what Carl
  actually needs to read, in order.
