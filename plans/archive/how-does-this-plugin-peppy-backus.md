# Plan: How does the caveman plugin actually help?
**Version:** v1

## Caveman version
Plugin = system-prompt injector. Hook fires every session/message. Tells Claude: drop fluff, short sentences, fragments OK. Saves ~75% tokens. Has helpers: `/caveman-commit`, `/caveman-review`, `/caveman-compress`, `/caveman-stats`. Three sub-agents (investigator/builder/reviewer) — small, focused, Haiku model. **Catch:** only runs in `claude.cmd` CLI. Your VSCode extension chat = unaffected. No code to write. Decision needed: use it or skip it.

## Changelog
- v1: Initial informational plan answering "how does this plugin help"

## Context

You installed the caveman plugin via the standalone `claude` CLI. You asked what it actually does for you — not the marketing pitch. This plan answers that and flags one important constraint about your setup before you decide whether to keep using it.

## What it actually does (mechanically)

The plugin is **not** post-processing or output rewriting. It's a **system-prompt injector** that runs via Claude Code hooks:

1. **`SessionStart` hook** — reads `skills/caveman/SKILL.md`, filters it to the active mode (lite/full/ultra/wenyan), and injects the ruleset as hidden system context at session start.
2. **`UserPromptSubmit` hook** — runs on every message. Parses `/caveman` commands (or natural-language triggers like "talk like caveman"), updates a flag file at `~/.claude/.caveman-active`, and re-injects a per-turn "attention anchor" so the style sticks across turns.
3. **Statusline script** — reads the flag file and shows `[CAVEMAN]` or `[CAVEMAN:ULTRA]` in your statusline.

The "compression" is just the rule body in [SKILL.md](C:\Users\User\.claude\plugins\cache\caveman\caveman\63a91ecadbf4\skills\caveman\SKILL.md): drop filler/articles/conjunctions, use fragments, abbreviate (DB/auth/cfg/fn), use arrows for causality (X → Y). Auto-clarity escape: reverts to normal English for security warnings, irreversible actions, or when you seem confused.

## Concrete things it gives you

| Feature | What it does | Useful when |
|---|---|---|
| `/caveman [lite\|full\|ultra]` | Sets compression intensity for the session | Long sessions where token budget matters |
| `/caveman-commit` | Generates Conventional Commit, ≤50 char subject | Routine commits |
| `/caveman-review` | One-line PR feedback: `L<line>: <emoji> <problem>. <fix>.` | Quick PR scans |
| `/caveman-compress <file>` | Rewrites a markdown file in caveman style, saves `.original.md` backup | Shrinking long memory/CLAUDE.md files |
| `/caveman-stats` | Reads session log, reports actual tokens saved | Measuring ROI |
| `cavecrew-investigator` (subagent) | Haiku-powered read-only locator. Output: `<path:line> — <symbol> — <6-word note>` | Cheap, fast code search |
| `cavecrew-builder` (subagent) | Surgical editor, refuses scope >2 files | Forces small diffs |
| `cavecrew-reviewer` (subagent) | Haiku, one-line findings | Quick review pass |

## The catch you need to know

**The plugin is installed in the standalone `claude` CLI, scoped to this project.** Your day-to-day chat in the VSCode extension is a separate runtime — it does **not** load `~/.claude/plugins/`, so none of this fires here. You'll only see caveman behavior when you launch `claude.cmd` from a terminal and work inside that session.

If you mostly use the VSCode extension, the plugin will sit unused.

## Other things worth knowing

- **Per-session, not global** — mode resets when you exit `claude`. No persistent setting changes.
- **Runs unconditionally** — both hooks fire on every session start and every message (light I/O, but always-on).
- **`/caveman-stats` intercepts the message** — running it blocks your prompt and returns stats instead. Re-run your real prompt after.
- **`/caveman-compress` edits in place** — only safety net is the `.original.md` backup. No dry-run.
- **Subagent quality is the real win**, IMO — the investigator-only-finds, builder-refuses-big-scope, reviewer-one-line pattern is a useful guardrail independent of the compression gimmick.

## Recommendation / decision needed

Three reasonable paths:

1. **Try it for one real `claude.cmd` session** — toggle `/caveman full`, do a normal task, then `/caveman-stats` to see whether the savings feel worth the terser style.
2. **Cherry-pick the subagents** — keep the plugin installed but mainly use `cavecrew-investigator` / `cavecrew-builder` / `cavecrew-reviewer` and skip the compression modes.
3. **Uninstall** — if you'll stay in the VSCode extension, the plugin won't fire anyway. Run `/plugin uninstall caveman` inside `claude.cmd` to remove it.

No verification step needed — nothing was changed in your project codebase.
