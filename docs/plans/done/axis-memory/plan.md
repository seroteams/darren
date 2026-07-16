# Axis memory — "since last time" the manager can see

**Goal:** A manager opening a person's page before their next 1:1 can see where that person's four health axes stood last time — so Sero visibly *remembers* the person instead of cold-starting every meeting.
**Driver:** Carl
**Created:** 2026-07-16

## Done means
- On a person's page, a manager sees a plain "Last 1:1" line: each axis's read from the most recent completed 1:1 (e.g. *Engagement +6 · Clarity −5 · Wellbeing not read · Growth not read*), dated.
- Axes that weren't read last time say **"not read"** — never a fake 0. (Honesty rule.)
- Nothing about scoring changes — this session's scores are still earned only from this session. The remembered read is clearly labelled as *last time*, kept separate.
- (Phase 2, if taken) the manager sees a multi-1:1 **trend** (a → b → c), not just the last point.

## Resolved before we start
Dug out of the code so the phases don't stall:

- **The honesty decision (locked).** We do **NOT** seed the score counter with last run's scores — that would make a flat conversation inherit a read it didn't earn (silent masking). Instead we **surface the prior read as labelled "last time" context**, separate from this session's earned score. Same honest pattern focus-freshness uses for topics.
- **The data is already on the client.** `frontend/src/stages/person-detail.ts` already fetches the latest run's full briefing to render its existing "Since last time" block, and `briefing.axes` (`[{id, score, read_status, …}]`) already rides along in that payload (`runs-store.ts` `toMemberRow`). Phase 1 needs **no backend change** — only render what's already sent.
- **Axis vocab source of truth:** `admin/src/ui/axes.js` (`AXIS_ORDER`, `AXIS_LABELS`) on the frontend; `backend/engine/axes.ts` on the backend. Any new line reuses these.
- **read/not-read is honest already:** the briefing's per-axis `read_status` is authoritative (`briefing.js:221` trusts it). We reuse it, not the legacy score-0 guess.
- **Finding #7 (person-key mismatch) is sidestepped by design.** Phase 2's history reader keys on **personId + userId** (the correct `focus-history.ts` fence), never the buggy name-slug that `person-profile.ts` uses. So we build on the right key from the start.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Last-1:1 axis read on the person page | A dated "Last 1:1" axis line on the manager's person page — display only, data already present, no scoring touch | ✅ |
| 2 | Multi-1:1 axis trend | Per-axis trend across the last ≤4 1:1s (oldest→newest) on the person page, reusing the fenced `getMyRun` | ✅ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 ✅ GREEN-LIT 2026-07-16 (Carl: "signed off"), commit `075b1aec`.** The "Last 1:1" axis line ships on the manager's person page. Helper 7/7, typecheck + build clean, verified on screen (14px, unread = "not read"). Committed my-own-files-only to `main` (local); **not pushed** — `main` carries 8 other sessions' unpushed commits, so a release ships all of them; held for Carl's separate "go live". (2 backend test fails in the tree are a parallel session's uncommitted `router.ts`, not this work.) STATUS.md left untouched — another chat has it open with uncommitted edits.
**✅ TRACK COMPLETE 2026-07-16 — both phases signed off by Carl.** Phase 1 (P1 commit `075b1aec`) + Phase 2 trend (P2 commit `3f17304f`). Per-axis trend across the last ≤4 1:1s on the manager's person page; display-only, no scoring/engine change; honest "not read", never a fake 0. **Deviation from the original Phase 2 plan (simpler + lower-risk):** reused the already-fenced `getMyRun` per run instead of a new backend `axis-history.ts` reader — same personId+userId fence, no new API surface, no touch to the risky `runs-store.ts`. The dedicated backend reader is only needed for the parked "engine uses the trend" version. Helper 8/8, full suite 146/146, typecheck + build clean, verified on screen. **Not live yet** — Carl deploys via `/release` (a push ships 19 mixed commits from ~5 chats, so it's his conscious call). Folder moved to done/.

## Parked
- **The full engine-uses-it version** (the trend feeds the questioning/focus so the engine re-probes a dipped axis) — Carl chose "manager sees it" first; this is the later "engine uses it" build.
- **Recalibrating the scoring dial** (finding #1 — scores only ever move down) — separate track (was Phase B of the roadmap).
- **Varying the briefing mould** (finding #4 — same sentence shape every time) — separate track (roadmap Phase C).
- **Question-bank bloat + blind lint** (findings #5/#6) — separate track (roadmap Phase D).
- Reviving `person-profile.ts` as the live trend source — not needed; the fenced reader in Phase 2 replaces it on the correct key.
