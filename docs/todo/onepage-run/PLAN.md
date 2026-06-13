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
| 1 | Scaffold + setup grows down | New one-page run exists; the 5 setup questions stack and settle as you answer | ✅ |
| 2 | Focus points + prep brief | Picking focus areas and reading the prep brief happen as new sections below setup | ✅ |
| 3 | Interview grows down | The interview questions appear one below the next; each answer settles above | ✅ |
| 4 | Results = page 2 | After the interview, the final briefing shows as a separate results page (reuse the existing briefing screen) | ⬜ |
| 5 | Polish + close-out | Mobile, reduced-motion, focus/scroll, copy pass; move folder to done/ | ⬜ |
| 6 | Role language section | "The language of this role" vocabulary between prep and the interview (flow-position: after phase 2, before phase 3) | 🔨 |

⬜ not started · 🔨 built, awaiting product-owner QA · ✅ done (tested)

## Current state
**Phase 1 built — awaiting Carl's QA (2026-06-13).** Carl green-lit starting and named the CTA "One-page run", then stepped away for an hour, so I built Phase 1 and self-verified with free checks only (not committed — waiting on Carl's walkthrough of the phase-1 scenarios).

Baseline before any change: `npm test` → **23/23 passed** (clean). After the change: still **23/23** (this is frontend-only; no test touches it).

What landed: a new `ONEPAGE` stage + `/flow` route, a "One-page run" button on the start screen, and the 5 setup questions on one growing page that settle into a locked "answered" look (question + your answer + ✓, not a greyed-out disabled box). Finishing setup calls the same `startSession` as a normal run and shows a "setup saved" ready section (Phase 1 stops there by design; Phase 2 continues into focus points). No backend/prompt/engine changes anywhere — paid runs only needed to smoke-test a real end-to-end one-page run later (Carl's go-ahead, ~$0.35/run).

**Phase 1 ✅ green-lit by Carl (2026-06-13)** — he walked a full setup himself and confirmed it. Committed locally.

**Carl's direction for the rest:** he wants the *entire* flow continuous — **page 1 grows down through setup → focus areas → prep brief → questions**, and **page 2 = the final results** (the briefing). For results we reuse the existing briefing screen as page 2 (keeps it polished). Phase 4 reworded to match.

**Phase 2 ✅ verified (2026-06-13)** via a Carl-authorized ~$0.35 run: focus areas + prep brief now stream in as grow-down sections after setup, focus settles into a locked line, then an interim "Continue to interview" bridges to the existing question + briefing screens. Committed locally.

**Phase 3 built (2026-06-14), not yet committed — awaiting a live walk.** After prep, the bank builds, then questions grow down one card at a time (answer → settles into a locked Q&A line → next appears below), with a persistent "Live scores" rail. When questions end it hands to the existing EVAL → BRIEFING screens (page 2). `npm test` 23/23; module mounts clean.

**Blocker on verification:** the preview automation server kept dropping every 1–2 min, so a full interview walk couldn't complete (each answer's scoring takes 5–15s). Setup → focus generation did run (one session's worth of spend). Recommend Carl walks Phase 3 at localhost:3000 in a normal browser (stable); I'll fix anything he hits, then commit + flip to ✅.

**Phase 3 ✅ green-lit + committed (2026-06-14).** Carl walked the interview live (grow-down questions, settled answers, live flow). Two fixes from his walk: (1) the question stem rendered grey — the bold/dark `.question-stem` rule was scoped to `.questioning-card`, now extended to `.flow-section`; (2) — none other.

**Phase 6 committed but still 🔨 (on-page render unconfirmed).** Carl said "commit, it's good", so it's in — but his walk *skipped* the glossary: his prep card was already on screen (old handler) when Phase 6 landed via HMR, so his "Continue to interview" used the pre-Phase-6 path and went straight to questions. Backend is verified free (endpoint → `ready:true`, 10 terms). **Still needs one fresh one-page run** to confirm the glossary actually renders between prep and the interview — flip to ✅ after that.

Cost note: focus + prep + questions + briefing each hit the OpenAI API. I build + structurally verify for free; a real end-to-end walk is a paid run (Carl's go-ahead, ~$0.35).

## Parked
- Editing a past answer (jump back up). Out of scope — past sections are deliberately locked.
- A progress map / "you are here" rail down the side of the page.
- Collapsing settled sections to one-line summaries to keep a long page compact.
- Animations/flourish beyond reusing the existing reveal — save for Phase 5 or later.
