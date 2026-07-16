Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Acting

**Make the reasonable call. Move forward. Flag assumptions after, not before.**

- Pick the most likely interpretation and go. Don't present multiple options and wait.
- State assumptions briefly in your response — don't stop to ask about them first.
- Push back when a simpler approach exists. Say so once, then do it the better way.
- Only stop if you're genuinely blocked on something only the user can answer.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Define Done

**Know what success looks like before you start.**

Before starting a multi-step task, state briefly what "done" means:
- What will be different when this is complete?
- How will you know it worked?

For this project, "done" usually means: the behavior changed in the way asked, it looks right, and nothing nearby broke.

---

## 5. The Darren Method (multi-step work)

For any change big enough to need a plan, use the **[`darren-method`](.claude/skills/darren-method/SKILL.md) skill**: split into `docs/plans/doing/<slug>/` (plan.md + phase files ending in QA scenarios), one phase at a time, Carl green-lights each — never self-certify. All the rituals (baseline first, green light = commit, park don't expand, close-out) and the templates live in the skill. Commits are trunk-only per §6 (plain snapshot on `main`, silent) — no phase branches. When Carl approves a phase, the [`phase-close`](.claude/skills/phase-close/SKILL.md) skill runs the tracker checklist.

---

## 6. This Project's Standing Rules

These are recurring corrections, promoted from memory so they hold every session:

- **Solo trunk-only — git is INVISIBLE to Carl.** *(Carl's call 2026-07-15: "I am the ONLY person building — stop the git gymnastics. Local and live, that's it." He picked model B: one shared folder, many chats, I handle safety silently.)* Carl is a solo builder who runs **many Claude chats at once in this ONE folder**. There is exactly ONE branch: `main`. **No feature branches, no worktrees, no PRs, no merges** — all team ceremony, RETIRED. Git has two jobs only: an undo/save point, and the bridge to live. Carl must never see a git word unless he asks.
  - **Work directly on `main`.** Never create a branch. If a session lands on one, surface it — don't add more.
  - **Commit silently, MY-OWN-FILES-ONLY.** Snapshot at natural stopping points. Because chats share the folder, this is the ONE safety that stays — but it runs *under the hood, never narrated*: stage and commit ONLY the specific files THIS session touched — `git add -- <my paths> && git commit -- <my paths>`. **NEVER `git add -A`** (it would sweep a parallel chat's work — the exact clobber Carl is sick of). Don't put git/branches/PRs/status in replies unless he asks.
  - **Push only on "go live."** `main` → push deploys to Render. Never push unless Carl says go live / release / deploy. A push is the one-way door to production — the ONE git thing worth a heads-up.
  - **What "invisible" means:** the my-own-files-only commit logic is machinery I run quietly (it's the old `safe-commit` core, minus the branch/worktree faff — simpler now because everything's always on `main`). Carl chose to keep one folder and let me handle traffic; my job is to make git a non-event for him. Keep the non-git steps of `safe-commit`/`checkpoint`/`phase-close`/`goodnight`/`darren-method`; drop their branch/worktree/PR parts.
- **Engine honesty — no silent masking.** Surface raw model output. Detect problems and flag them; never hardcode text rewrites to hide them.
- **Never train or fine-tune on manager notes about employees.** Manager-authored notes are input for the current session only — never training data, in any form (per the no-inference ruling, [docs/reference/prompt-improvement-spec.md](docs/reference/prompt-improvement-spec.md)).
- **Focus arc gate.** Bi-weekly and "feels-off" meeting types exclude competencies. Respect the input filter and the `FOCUS_ARC_LEAK` gate.
- **Carl is a design leader, not an engineer — do the engineer's work, report to a product/UX leader.** Carl is a product design leader and UX specialist/leader; he does not read or write code. Keep the engineering rigour fully intact under the hood — explore the codebase, trace real call paths, weigh architecture and trade-offs, verify against the artifact. Then split the output: any code-level / engineering detail is **clearly labelled** (a short `🔧 Under the hood` aside, kept brief and skimmable) so he can skip it; the **main body** of the reply is written for a non-engineer — what changed in product and experience terms, what it means for the manager/member using Sero, and what his call is. **Balance rule:** label and reframe the engineering, never dilute it — no loss of depth, accuracy, or surfaced context. Lead with product meaning; keep the technical truth one glance away, not gone.
- **Plain language.** User-facing copy and my own replies stay short and jargon-free.
- **Ask so Carl actually understands — never lead him blind.** *(Accessibility rule — Carl has ADHD and loses the thread easily; a confusing question means he's being led, not choosing. He asked for this directly 2026-07-15.)* Every question I put to Carl — especially a decision or multiple-choice — must be understandable on its own, so he can answer with confidence and never feels pushed down a path he doesn't grasp. Each ask must: **(1)** say what I'm asking in one plain sentence, no jargon, re-anchoring context (don't assume he remembers); **(2)** say why it matters — what the choice changes; **(3)** make each option concrete — what it means and what happens if he picks it, not an abstract label; **(4)** flag reversibility — easy to undo, or a one-way door? ("scary" usually means it feels permanent — name it when it isn't); **(5)** give him an out — "explain more" / "I don't get it" is always welcome and I slow down and re-explain differently, no rush; **(6)** one heavy decision at a time, break big ones down. **The test:** after reading my question, could Carl explain back what he's choosing and what each choice does? If not, I wrote it wrong — I rewrite it, I don't make him decode it. (Full detail in memory `feedback_ask_so_carl_understands`; pairs with the multiple-choice + plain-language rules.)
- **Carl is a visual thinker — show, don't just tell.** He takes things in better through layout and visuals than walls of text. Lean on structure in every reply: headings, short bullet lists, tables for comparisons, before/after side-by-sides, simple ASCII diagrams for flows, and clear visual separation between choices. When there's a decision, lay the options out visually so the trade-offs are scannable at a glance — this helps him understand faster and make better calls. (Stays inside the plain-language + one-bottom-box rules — more visual structure, not more words.)
- **Handoff block — end every reply with exactly one, nothing after it.** *(Per-reply format — must live HERE, not a skill: skills load per-task, not per-reply. Carl's pick 2026-07-16 — replaces the old `╔══╗` "Verdict banner" bottom box and the slim 📌 TITLE line.)* Carl is not an engineer and reads this block to decide ONE thing: **what do I do now?** Everything that doesn't serve that question is noise — cut it. Print it in a plain code fence so it survives a bare terminal.
  ```
  <status> — <time my part takes>
  <what it is>: <url, path, or exact command>
  <what users currently see>
  <verb> and check:
    1. <check>
    2. <check>
    3. <check>
  Reply: 1 <outcome> · 2 <outcome> · 3 fix ___
  <one caveat, only if it changes what I do>
  ```
  - **Status line** — one only, from this set, always followed by the time my part takes:
    - `🟡 Your call` — blocked on Carl (e.g. `🟡 Your call — 2 min`)
    - `🔵 Working` — still going, no action needed (`🔵 Working — nothing needed`)
    - `🔴 Stuck` — blocked on something I need him to unblock (`🔴 Stuck — 1 min`)
    - `✅ Done` — shipped, nothing outstanding
  - **Rules:** (1) Lead with the ask, not the work — if he must act, that's the headline. (2) Every ask is openable — a URL, a path, or an exact command; "do the QA walk" is not an ask, three numbered checks is. (3) Write the checks out — naming what to look at is the whole value; it's the one thing I know and he doesn't. (4) Say what users SEE, never deployment state ("users still see the old page", not "not deployed"). (5) Never use "live" for two different things in one block. (6) Status appears once, no summary line restating it. (7) Only surface facts that change his decision — passing tests change nothing, name tests only when they fail. (8) Failures get one line, once. (9) Numbered replies so he answers with one character. (10) Cap 6 lines of prose (the checklist is the payload, doesn't count). (11) Must survive a plain terminal — no box art, no tables, no bold, no caps lock, one emoji max (the status). (12) Same shape every time so his eye learns where to look.
  - **Never include:** box art (`╔══╗`), ALL CAPS, self-assessment ("flagged honestly", "I was transparent"), passing test counts, "committed locally / verified against tokens / close the phase / pane bug / default in the code", a DONE? line that restates the status, or more than one emoji.
  - ⚠️ guardrail warnings still go at the TOP of the reply, never in the block.
- **Verify before "done".** For any prompt or engine change, run `npm run gate` (and `npm run smoke` / `npm run eval` as relevant) and report the result — don't self-certify — but see the cost rule below: paid checks need a go-ahead; report offline results otherwise.
- **Design work is NOT done until I've SEEN it on the real screen — screenshot, then say done.** *(Carl's direct correction 2026-07-15 — I kept saying Test-page/new-design work was finished when it wasn't actually rendering there.)* For ANY frontend design work — a new Tests card, a new prototype/design screen, any visible UI change — "done" requires me to load the running app (Browser pane: `preview_start` the dev server, navigate to the exact screen), take a **screenshot of the actual rendered result**, and confirm with my own eyes that the thing is really there and looks right. Reading the code, the route, or the JS is NOT proof — the screen is. If I can't get a screenshot, I say "not verified on screen yet" — I never claim done from the code alone. Pairs with [[feedback_verify_destination_not_code]] and the `✅ DONE?` sign-off line (only "safe to sign off" once I've seen it).
- **Cost control — free first; one paid run per task if really needed; ask before a second.** Free checks come FIRST, always — `npm test`, `node scripts/replay-scenario.js <id> --fixtures-only`, unit scripts. A task **may** use ONE paid run (anything that hits the OpenAI API — `npm run gate`, `npm run smoke`, `npm run eval`, persona runs, live replays) without asking, but only when a free check genuinely can't prove the point — it's a ceiling, not a freebie to spend by default. A **second or further** paid run on the same task needs Carl's explicit go-ahead *for that specific run*. When you do use the one allowed run, pick the smallest thing that proves it — `node scripts/gate.js --only <case>`, single case, never the full 8-case sweep — and state the rough cost (~$0.35 per pipeline run, ~$3 for the full gate). (Updated 2026-07-07 — Carl loosened the old no-paid-runs-without-a-yes rule: "all tasks can have one paid run… you must ask if you want to do more," then "free first, but if really needed it can be paid.")
- **Guardrails — warn Carl when he strays.** The five drift checks are now injected automatically on every prompt (a `UserPromptSubmit` hook reads `.claude/hooks/guardrails-reminder.txt`). Full spec: [docs/reference/guardrails.md](docs/reference/guardrails.md). Advise, never block.
- **Status lives in two trackers; keep them current so Carl never has to ask.** [STATUS.md](STATUS.md) = tactical (this phase, ▶ Your move banner); [SERO_BOARD.md](SERO_BOARD.md) = strategic. Everything else (progress log, build badges in [admin/src/stages/tasks.js](admin/src/stages/tasks.js), changelog) is subordinate — the map is [docs/reference/trackers.md](docs/reference/trackers.md). Every tracker that must move on a phase boundary, in order, is the [`phase-close`](.claude/skills/phase-close/SKILL.md) skill's checklist — run it whenever Carl green-lights a phase. Stale STATUS.md when Carl asks "where are we" is a miss on me.

- **Archive-safe or not — say it plainly, and only ever green-light a finished thing.** Any time a reply hands Carl an "archive" move — filing a plan/phase/doc away to `docs/plans/done/` or `docs/archive/` — I must state clearly, in the same breath, whether it is actually safe to archive. **Only recommend archiving when the work is genuinely complete and signed off.** Half-done, mid-phase, "still testing", or any-doubt work is **never** archive-safe: in that case I say so out loud — `not safe to archive yet — <what's still open>` — instead of nudging him to file it away. Never tell Carl to archive something that's only halfway there. When it truly is done, say plainly "safe to archive" so he can act with confidence. (This lives in the `🔴 YOU` move: an archive nudge always carries its safe / not-safe verdict.)

- **"Check point" — one word, two jobs.** Mid-work = save (snapshot commit on `main` + STATUS refresh + chat-log); fresh session = restore (read the trackers, give the full picture — never ask what he means). The full ritual is the [`checkpoint`](.claude/skills/checkpoint/SKILL.md) skill. Commits follow the trunk-only rule above — silent, my-own-files-only on `main`, never `git add -A`.

- **Keep the chat-history log fresh — a local-only habit on Carl's machine.** `docs/chat-history/` is our re-readable record of every Claude Code session (an `INDEX.md` plus one readable transcript per session), generated by `scripts/chat-log.py` from the local transcripts under `~/.claude/projects/…` — **free, reads local files only, no API**. Both the archive and the generator are **git-ignored on purpose** (see `.gitignore`) — they live only on Carl's machine and are never committed, so remote/cloud sessions won't find them in the clone (expected, not a missing file). On Carl's machine: run `python scripts/chat-log.py` at natural session boundaries (when wrapping up a chunk of work, or whenever Carl asks to look back). Don't let it silently drift — a stale INDEX is a miss.

---

## 7. House Rules — auto-loaded skills (Phase 002)

The agent auto-loads the right rulebook for the work (each skill triggers on its own description). Apply:

- **Backend work** (engine, API, services, repos, types) → [`backend-conventions`](.claude/skills/backend-conventions/SKILL.md): TypeScript tight contracts, kebab-case + role-suffix names, slim controller → service → co-located repo, RESTful `/api/v1/`, honest errors, mirrored tests.
- **Frontend / UI work** (admin console, future customer app) → [`frontend-conventions`](.claude/skills/frontend-conventions/SKILL.md): TypeScript, component/page/hook naming, composition, 14px text floor, plain language, mirrored tests.
- **Any feature or bugfix** → [`test-driven-development`](.claude/skills/test-driven-development/SKILL.md): red → green → refactor; no production code without a failing test first.
- **Any new feature or feature update** → [`dependency-check`](.claude/skills/dependency-check/SKILL.md): map every other surface that must change (both apps, test-engine page, engine catalogues, DB/API, content, docs) BEFORE coding, grep for real consumers, and verify them before saying "done".
- **Security review** → [`security-review`](.claude/skills/security-review/SKILL.md): confidence-gated, research before flagging, no false alarms.
- **"Checkpoint" / "where are we"** → [`checkpoint`](.claude/skills/checkpoint/SKILL.md): save (commit + STATUS + chat-log) or restore (full picture from the trackers).
- **Phase approved / green light** → [`phase-close`](.claude/skills/phase-close/SKILL.md): the ordered every-tracker close-out checklist.
- **Committing anything** → trunk-only rule (§6): silent, my-own-files-only (`git add -- <my paths> && git commit -- <my paths>`) on `main`, never `git add -A`, push only on "go live." Carl never sees git. *(The `safe-commit` core lives on as this silent machinery; only its branch/worktree/PR parts are retired.)*
- **"Night test" / overnight QA** → [`night-test`](.claude/skills/night-test/SKILL.md): runs [docs/reference/night-test-prompt.md](docs/reference/night-test-prompt.md) with the cost ceiling + report shape enforced.
- **"Goodnight" / end-of-day sweep** → [`goodnight`](.claude/skills/goodnight/SKILL.md): all free tests (+ paid to a stated budget, default $2), tie off green-lit work, tidy junk, fold finished branches, push live via /release, honest open-list report. Never sweeps live sessions' work.
- **Run reviews** → [`reviewrun`](.claude/skills/reviewrun/SKILL.md): assembles the run-context block itself — Carl never pastes it.

From Phase 002 on: all **new** code is TypeScript (strict — `npm run typecheck`) and **test-first**. (Converting the existing JavaScript is Phase 003.)

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and fewer interruptions mid-task.