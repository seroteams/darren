# file-notes — deep summaries, opened on demand

The [repo-map.md](../repo-map.md) gives one line per file. When one line isn't enough,
a file can have a **deep note** here. A 📄 next to a map line means a note exists.

- **One note per meaningful file** (or cluster). Not every file needs one — only the
  ones worth a closer look before opening the source.
- **Filename mirrors the path**, `/` → `__`, keeping the extension, e.g.
  `backend/engine/briefing.ts` → `backend__engine__briefing.ts.md`. That keeps them
  greppable, avoids `.ts`/`.md` collisions, and lets the generator detect them.
- **Notes are never overwritten** by `npm run build-map` — they're yours.

## Shape (keep it ~5–12 lines)

```
# <path>
Role:   what this file is for, in one plain sentence.
Key:    the main export(s)/function(s) other code calls.
Types:  the key types it produces/consumes, and where they live.
Couples to: the files it must move in lockstep with.
Gotcha: the thing that bites — an invariant, a mirrored regex, an incident rule.
```

Fill only the lines that matter for that file. Plain language over jargon.
