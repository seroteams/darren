---
name: commit
description: "Save this session's work to git locally — never pushes. Trigger when Carl says /commit, 'commit', 'commit my work', 'save my work'. Groups related changes, writes a plain conventional message, commits path-scoped to this session's own files (never sweeping a parallel chat's work), and reports in plain words what was saved. Local only — /release is what puts work live."
argument-hint: "[optional message hint]"
user-invocable: true
disable-model-invocation: true
---

Save Carl's work to git on this machine. **Never push** — that's `/release`'s job.

## Steps

1. **Look at what changed** — `git status` + `git diff --stat`. Carl runs many sessions in this one folder, so some changes may not be this session's.
2. **Only commit this session's work.** Classify every entry: **mine** (created or edited by THIS session, traceable to the current task) vs **foreign** (another session's WIP, Carl's own edits, generated artifacts like `content/questions/_runtime/*`). Assume parallel sessions are live — anything unclassifiable is foreign. Add **specific paths** (`git add <path>`), never `git add -A`/`.`/`commit -a`. If the tree holds foreign files, leave them and say so in the reply.
   - **Carl asked for "everything" and foreign files exist?** List them plainly and ask one lettered question: **A)** commit only this session's files ⭐ · **B)** include the listed foreign files too · **C)** stop, let him look first.
   - **Never** bulk-commit or bulk-delete untracked files under `content/questions/` — runtime artifacts with their own rules.
3. **Group + message.** One commit if it's one logical change; split if there are clearly separate ones. Message = conventional style, plain words: `type(scope): what changed` (e.g. `fix(login): stop double-submit`). Use Carl's hint if given.
4. **Commit** — path-scoped, local only:
   ```
   git commit -m "<message>

   Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>" -- <path> [<path> ...]
   ```
5. **Report in plain words** — what was saved, in one or two lines. Name the files. If anything was left uncommitted (another session's, or gitignored like `.secrets/`), say so and why.

## Rules
- **Never push.** No `git push`, no PR. Saving ≠ releasing.
- **Never sweep foreign work** into the commit. Path-scoped adds only.
- **Never commit secrets.** `.env`, `.secrets/` are gitignored — keep it that way; if a secret-looking file is staged, stop and flag it.
- Plain language in the reply — no git jargon dumps.
