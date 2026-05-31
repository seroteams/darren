# Plan: Establish plan-file format rules
**Version:** v1

## Caveman version
Every plan needs a version number, a Caveman summary at the top, and a changelog. When you edit a plan, bump the version and add one line saying what changed plus the +/- line count. Saved as a feedback memory so all future plans follow this.

## Changelog
- v1: Initial plan (+0 / -0 lines)

---

## Context
User wants plans to be fast to scan and easy to track across edits. The rule applies to every plan written from now on, including this one. The rule has been saved to memory at `feedback_plan_format.md` so it survives across conversations.

## The rule
Every plan file must contain, in this order at the top:

1. **Title + Version line** — `# Plan: <title>` followed by `**Version:** v<N>`. Bump `N` on every edit.
2. **Caveman version** — short, plain-language summary. Read this first; skip the rest if it's enough.
3. **Changelog** — one bullet per version. Each edit appends a line of the form:
   `- v<N>: <one-line description of what changed> (+<added> / -<removed> lines)`
4. **The detailed plan** — Context, approach, files, verification, etc.

## On edits
When the user asks for changes to an existing plan:
- Bump the version number.
- Rewrite the Caveman version if the underlying plan meaningfully changed.
- Append a one-line changelog entry with the line-count delta (`+N / -M`).
- Keep prior changelog entries — never overwrite history.

## Storage
- Rule is persisted at `~/.claude/projects/c--Users-User-Documents-Sero-darren/memory/feedback_plan_format.md`
- Indexed in `MEMORY.md` so it loads into context every conversation.

## Verification
- Next plan written should have the version line, Caveman version, and changelog header in place.
- After any edit to a plan, the changelog should have a new line with the correct `+/-` delta.
