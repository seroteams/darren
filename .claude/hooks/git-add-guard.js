#!/usr/bin/env node
// Git sweep guard (PreToolUse on Bash/PowerShell).
// Parallel chats share this folder: a blanket stage (git add -A / --all / . / -u)
// or git commit -a would sweep another chat's uncommitted work into this
// session's commit. Block those; commits must name their own files.

let input = '';
process.stdin.on('data', d => (input += d));
process.stdin.on('end', () => {
  try {
    const evt = JSON.parse(input);
    const cmd = (evt.tool_input && evt.tool_input.command) || '';
    if (!/\bgit\b/.test(cmd)) process.exit(0);

    const sweepAdd = /\bgit\s+(?:-[^\s]+\s+|-c\s+\S+\s+)*add\s+(?:[^|;&]*\s)?(?:-[a-zA-Z]*A[a-zA-Z]*\b|--all\b|-u\b|--update\b|\.\/?(?=[\s"']|$))/;
    const sweepCommit = /\bgit\s+(?:-[^\s]+\s+|-c\s+\S+\s+)*commit\s+(?:[^|;&]*\s)?-[a-zA-Z]*a[a-zA-Z]*m?\b/;

    // Quoted text is DATA, not a command to run: `echo "never git add -A"`,
    // `grep "git add -A" file`, and `git commit -m "docs: ... git add -A ..."`
    // are all read-only or path-scoped and must not be blocked just because a
    // sweep phrase appears inside a string literal. Detect on a copy with
    // quoted runs emptied out, so only flags actually being passed to git
    // trigger the guard. Trade-off accepted: a quoted flag written as
    // `git add "-A"` (identical to `git add -A` in the shell, but nobody
    // writes it that way) slips past -- narrower than blocking real commit
    // messages, which is the false positive this fixes.
    const quotesEmptied = cmd.replace(/'[^']*'/g, "''").replace(/"[^"]*"/g, '""');

    if (sweepAdd.test(quotesEmptied) || sweepCommit.test(quotesEmptied)) {
      process.stderr.write(
        'GIT SWEEP BLOCKED: this command stages everything in the shared folder and would ' +
        'sweep a parallel chat\'s uncommitted work. Stage and commit ONLY the files this ' +
        'session touched: git add -- <my paths> && git commit -m "..." -- <my paths>.'
      );
      process.exit(2);
    }
    process.exit(0);
  } catch (e) {
    process.exit(0); // never break work on a hook bug
  }
});
