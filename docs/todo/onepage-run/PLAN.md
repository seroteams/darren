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
| 4 | Results = page 2 | After the interview, the final briefing shows as a separate results page (reuse the existing briefing screen) | ⬜ |
| 5 | Polish + close-out | Mobile, reduced-motion, focus/scroll, copy pass; move folder to done/ | ⬜ |

⬜ not started · 🔨 built, awaiting product-owner QA · ✅ done (tested)

_Phases 1, 2, 3, 6 done + signed off (grow-down setup → focus → prep → interview, plus the "language of this role" section). Detail in git history. Code in `7b8921a`._

## Current state
**Phases 4 (results-as-page-2) and 5 (polish + close-out) remain.** The grow-down flow works
end-to-end through the interview; what's left is the results page reuse and the final polish pass.

## Parked
- Editing a past answer (jump back up). Out of scope — past sections are deliberately locked.
- A progress map / "you are here" rail down the side of the page.
- Collapsing settled sections to one-line summaries to keep a long page compact.
- Animations/flourish beyond reusing the existing reveal — save for Phase 5 or later.
