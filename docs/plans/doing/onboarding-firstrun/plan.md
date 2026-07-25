# Onboarding first-run (Direction A: show the brief first)

**Goal:** A brand-new manager's first visit shows what Sero is and what it makes BEFORE asking for any typing; the full app unfolds only after their first real brief.
**Driver:** Carl
**Created:** 2026-07-25
**Mockup:** https://claude.ai/code/artifact/25371d5f-477e-4869-bd97-4b6a905b8f2b — approved 2026-07-25 (Direction A + explainer video right of the intro)

Origin: committee session 2026-07-25 (log: logs/committee/2026-07-25-new-manager-onboarding.html) + research report (artifact 5132bc5d, "Onboarding research: six answers"). Carl accepted all starred picks on 25 July.

## Done means
- A fresh manager signup lands on the brief-first welcome: positioning line, the labelled Sofia sample brief, the explainer video, one blue button.
- The intake wizard's beginner help shows for genuinely new managers again (live bug today).
- The sidebar shows its full manager rows only once the account has a real brief; Log out never disappears (the "quiet rail").
- Funnel numbers (signed up / started a prep / finished a brief) read weekly from the existing free report during the corridor test.

## Resolved before we start (from the research, so phases don't stall)
- **One rule, one place:** "has real (non-demo) 1:1s" becomes a shared helper next to `rowModel` in `admin/src/stages/start-rows.ts`. Home, the wizard, the rail gate, and demo-member P2's "Remove example" all call it. Two copies of this rule is exactly how the live bug happened.
- **Never claim `login.js` / `register.js`** (google-signin holds them now, entry-redesign next). Direction A never needs them: landing stays Home.
- **The rail keeps its shell.** The only Log out lives in the rail; two layouts offset themselves by rail width; the mobile strip is nav-owned. Hide rows, not the rail.
- **Positioning line (Carl's pick):** "Before your next 1:1: type rough notes, walk in with a clear plan."
- **Video:** YouTube `Xve0NyKH7Co` ("How Sero Uses AI to Improve Manager 1:1s"), embedded to play in place, starting at 0:49.
- **Scope guard:** brand-new MANAGER accounts only; members and returning users see no change.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | One first-run rule | Shared has-real-runs helper; wizard beginner help works again (bug fix, buildable now) | ✅ |
| 2 | Brief-first welcome | The approved Direction A first screen: line + sample brief + video + one button | ✅ |
| 3 | Quiet rail | Manager rows appear after the first real brief; shell/Log out always present | ⬜ |
| 4 | Sweep and truth | Dependency sweep both apps, demo-member alignment, changelog + guide, live proof | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Process picks (live now, no build)
- **Funnel, weekly during the corridor test:** `npx tsx scripts/report-returns.ts` (free, DB read only) → signed up / started / finished per manager.
- **First-minute capture sheet** — five fixed lines in the per-manager corridor notes, written by the watcher, no prompting:
  1. First words said on landing.
  2. First click.
  3. Roughly how long before that first click.
  4. Did they open the Sofia example?
  5. What they think Sero is, in their own words (only if said unprompted).

## Current state
Board: https://claude.ai/code/artifact/a9f68c94-748e-4b76-90a3-971f7328b9f4
Phase 1 ✅ GREEN-LIT 2026-07-25 (Carl walked a fresh signup; Home's first-run card confirmed on screen).
Phase 2 ✅ GREEN-LIT 2026-07-26. Carl un-parked it on 25 July ("keep going") after asking for the explainer video in the empty space to the right, then approved the built screen. Proof screenshots in [proof/](proof/); the honest gaps he accepted are listed in [phase-2.md](phase-2.md), the main one being that the sidebar is still there until Phase 3.
Checks at Phase 2: `npm test` 187/187, typecheck, lint:copy, lint:tokens all clean. No paid runs at any point: this plan never touches the engine.
Nothing is on sero.team yet; both phases ship with the next go-live.
Next: Phase 3 (quiet rail), the phase that hides the manager rows until a first real brief exists. Not started, and no longer parked by anything except Carl's word to begin.

## Parked
- Full rail hide (research option 3B) — quiet rail chosen instead; revisit only if the quiet rail still feels heavy.
- Server-side demo exclusion from the recent-runs feed (3C/4C) — rejected, breaks Home's example row.
- Consented screen recording of first sessions (5B) — only where trivially easy.
- Member-app first-run experience — out of scope, managers only.
- Auto-hide the example once a real member exists — lives with demo-member P2.
