# Sero house rules (slim, 2026-07-18)

Detail lives in the skills, the memories, and the Carl output style — this file is the short index that must hold every session. If this file and the output style disagree on reply format, **the style wins**.

## Commands

- `npm test` — full unit suite (free)
- `npm run typecheck` — strict TS (free)
- `node scripts/replay-scenario.js <id> --fixtures-only` — engine replay (free)
- PAID (hits OpenAI — see Cost): `npm run gate` (~$3 full; smallest proof: `node scripts/gate.js --only <case>` ~$0.35), `npm run smoke`, `npm run eval`
- Never `require()`/`import` scripts/gate.js — it executes on import. Read/grep it only.

## How to work

1. Make the reasonable call and move; state assumptions after, don't stop to ask. Only stop when genuinely blocked on something only Carl can answer.
2. Minimum code that solves the problem. No speculative features, abstractions, or configurability.
3. Surgical changes: every changed line traces to the request. Don't improve neighbouring code; clean up only your own orphans.
4. Before multi-step work, state what "done" means.
5. Anything big enough to need a plan = the `darren-method` skill (docs/plans/doing/<slug>/, ONE phase at a time, Carl green-lights each — never self-certify; visual plans get ONE artifact mockup at setup). Green light → `phase-close` skill.

## Non-negotiables

- **Git is invisible to Carl. ONE branch: `main`.** No branches, worktrees, PRs, or merges. Commit silently at natural stops, MY-OWN-FILES-ONLY: `git add -- <my paths> && git commit -m "..." -- <my paths>`. Blanket staging (`git add -A`/`.`/`-u`, `commit -a`) is blocked by a hook — parallel chats share this folder. Push ONLY on Carl's "go live" (push = deploy to Render).
- **Lane board:** claim a row in [LANES.md](LANES.md) before editing, clear it when committed. A hook blocks edits inside another live chat's lane — surface it to Carl, never edit through.
- **Engine honesty:** surface raw model output; flag problems, never hardcode rewrites to mask them.
- **Never train or fine-tune on manager notes about employees** ([docs/reference/prompt-improvement-spec.md](docs/reference/prompt-improvement-spec.md)).
- **Focus arc gate:** bi-weekly and "feels-off" meetings exclude competencies (input filter + `FOCUS_ARC_LEAK`).
- **Cost:** free checks first, always. Max ONE paid OpenAI run per task, only if free can't prove it — smallest run, state rough cost. A 2nd paid run needs Carl's explicit yes.
- **Verify before "done":** never claim done from code alone. Engine changes → run the relevant check and report it. Frontend/design → screenshot the real rendered screen (Browser pane); no screenshot = "not verified on screen yet".
- **Archive verdicts are explicit:** ✅ safe to archive / ❌ not safe yet — and only ever green-light genuinely finished, signed-off work.

## Talking to Carl

Full contract = the **Carl output style** ([.claude/output-styles/carl.md](.claude/output-styles/carl.md)). In brief: quiet middle (one committing first line, then nothing until done); recovered failures aren't news; postcard final message ~120 words that LEADS with one of three banners — 🟢 DONE (verified + archive verdict) / 🟡 YOUR TURN (test or decide, ~time) / 🔴 STUCK — then Job / Why it matters / fixed **Test it** box (breadcrumb `env > app > screen`, numbered steps, ✅ Pass · ❌ Fail) / Then-moves lettered A-B-C with ⭐ / one-line 🔧 techy bit. Blocks never numbered (numbers = test steps only); full detail only on "more" or "techy"; forks stop first with a lettered options table; ⚠️ guardrail warnings above everything.

Carl is a design leader and UX specialist, not an engineer — full engineering rigour under the hood, product meaning in the reply body. He has ADHD and is a visual thinker: plain UK English, no jargon, tables over prose, and every question self-explaining (what I'm asking / why it matters / concrete options / reversible or not / an "explain more" out — one heavy decision at a time).

## Trackers & rituals (each is a skill — trigger on the word)

- "check point" → `checkpoint` skill: mid-work = save, fresh session = restore — never ask which.
- "goodnight" → `goodnight` skill · "night test" → `night-test` skill · "clean up" → `clean-up` skill · run reviews → `reviewrun` skill.
- [STATUS.md](STATUS.md) = tactical, [SERO_BOARD.md](SERO_BOARD.md) = strategic (map: [docs/reference/trackers.md](docs/reference/trackers.md)). Stale trackers when Carl asks "where are we" is a miss.
- Chat-history log: `python scripts/chat-log.py` at session boundaries — local-only, gitignored, never commit.

## Code

- Backend → `backend-conventions` skill · frontend → `frontend-conventions` skill (14px text floor) · any feature/bugfix → `test-driven-development` + `dependency-check` skills.
- From Phase 002 on: all new code is strict TypeScript, test-first.
- Guardrails (5 drift checks) auto-inject on every prompt via hook — advise, never block ([docs/reference/guardrails.md](docs/reference/guardrails.md)).
