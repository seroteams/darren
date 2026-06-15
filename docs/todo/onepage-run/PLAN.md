# One-page run — a grow-down flow

**Goal:** A brand-new run mode where the whole flow (setup → focus points → prep brief → interview → briefing) happens on **one page that grows downward** — you answer, the next bit appears below, the page scrolls — instead of screen-after-screen. Same questions, same engine; just a different shape.
**Driver:** Carl
**Created:** 2026-06-13

## Done means
- From the start screen you can pick a **one-page run** (the normal screen-by-screen run still works, untouched).
- You answer the first thing; the next question/section appears **below** it and the page scrolls down. This holds all the way from setup to the final briefing.
- Sections you've finished stay **visible but settled** — clearly done and behind you, not editable. They look "completed", **not** greyed-out/disabled.
- It uses the **same engine and answers** as a normal run — nothing about the briefing quality changes.
- Existing screen-by-screen flow and all current tests still pass.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 4 | Briefing as closing section | After the interview, synthesis + the final briefing land inline as the bottom sections (reuse `briefing.js`) | 🔨 |
| 5 | Polish + close-out | Mobile, reduced-motion, focus/scroll, copy pass; move folder to done/ | 🔨 |

⬜ not started · 🔨 built, awaiting product-owner QA · ✅ done (tested)

_Phases 1, 2, 3, 6 done + signed off (grow-down setup → focus → prep → interview, plus the "language of this role" section). Detail in git history. Code in `7b8921a`._

## Current state
**Phases 4 + 5 built (2026-06-16) — awaiting your walkthrough.** On the last interview answer
(or "Skip to briefing"), `onepage.js` now removes the live-scores rail, streams synthesis as an
inline "Writing the brief…" orb, then mounts the existing `briefing.js` renderer as the closing
`.flow-briefing` section — no jump to a separate screen. Phase-5 polish folded in: smooth-scroll is
gated on `prefers-reduced-motion`, new sections scroll-into-view + focus the right field (existing
behaviour), and the reveal transforms were already reduced-motion-gated in CSS.

Self-verified offline (no paid run): `/flow` loads clean, zero console errors, and `briefing.js`
mounted into an inline sub-container renders the full briefing (headline, bullets, footer) inside
`.flow-steps`. `npm test` 27/27 green.

**What's left before close-out:** your live walkthrough of the phase-4 + phase-5 scenarios. That
needs one full one-page run, which hits the API (~$0.35) — say go and I'll either run it or you
walk it. Folder moves to `done/` on your green light.

## Parked
- Editing a past answer (jump back up). Out of scope — past sections are deliberately locked.
- A progress map / "you are here" rail down the side of the page.
- Collapsing settled sections to one-line summaries to keep a long page compact.
- Animations/flourish beyond reusing the existing reveal — save for Phase 5 or later.
