# Recap redesign — the end-of-1:1 results screen

**Part of:** [plan.md](plan.md) (this is the P4 "customer flagship" work, pulled forward on Carl's
ask). **Status:** R1 done · R2 built (2026-07-17) — awaiting Carl's on-screen QA.
**Approved mockup:** [recap-redesign-mockup.html](recap-redesign-mockup.html) ·
live: https://claude.ai/code/artifact/1b882e99-3b05-4f5a-bd0f-0d1ed2b3ce54
**Carl approved the direction 2026-07-17** ("direction's right"). The mockup is the source of truth.

## Why
The end-of-1:1 screen was called **"Briefing"** — a *before*-word colliding with the pre-meeting
"Prep brief" step. Renamed to **"Recap"** (Carl's call). And its old layout opened with a caveat as
the 40px hero ("only one note was captured… not a verdict"), so a manager landed on an apology
instead of the result. The redesign leads with the finding and demotes the caveat to a chip.

## The five moves (from the mockup)
1. **Result first** — the signal is the hero; "partial record" becomes a small gold chip.
2. **Three acts, not seven boxes** — *The read → The honest read → What to do next*. A story with a
   destination, instead of a flat stack of same-weight sections.
3. **The payoff is elevated** — "What to do next" (agreed actions + reminders) is the visual anchor,
   and the screen's single solid-blue action ("Lock these in") lives there.
4. **Honest reads split clearly** — shareable (mint/green) vs private (locked gold/amber), distinct
   at a glance; the private one carries a lock + "don't paste into shared notes".
5. **Caveat said once** — "not enough signal" was repeated ~3× (axes read, "how engaged", understood)
   — now one compact empty-state under the axis strip.

## Phases

### R1 — Rename Briefing → Recap ✅ DONE (2026-07-17)
Display strings only — the internal stage **key** `BRIEFING` is untouched (engine/pipeline contract).
- `admin/src/ui/stage-labels.js` — `BRIEFING` display + topbar tuple → "Recap".
- `admin/src/stages/briefing.js` — screen eyebrow "Recap · For X", copy-all header, headline
  fallback, "Recap not available" empty-state.
- `admin/src/ui/notes-panel-utils.js` — notes-tab label.
- Proof: `build:all` clean; run-detail + intake-firstrun tests green (11/11).
- **Rename follow-ups still on "Briefing" (do in R3, each needs care):**
  `admin/src/stages/run-detail.ts:119` (a hardcoded `>Briefing</button>` tab **+ its test**
  `run-detail.test.ts`), `compare.js:210` ("Briefing" row label), `review-run.js:180`
  ("Final briefing" section). These are internal admin/review tools, not the live flow — lower
  urgency, but rename for consistency.

### R2 — The three-act restructure (the main build) 🔨 BUILT — awaiting Carl's QA
**Honesty note (deviation from the mockup):** the mockup's hero showed a *finding* leading with the
caveat demoted to a chip. The engine owns `b.headline`, so the build keeps the engine's own headline
as the hero (unmasked) and *adds* a gold "Partial record" chip **only when no axis got a real read**
(derived from `read_status`, never invented). In a normal session the engine headline IS the finding,
so it leads automatically; only in a genuinely thin session does the caveat lead — now softened by
the chip + structure. Making the engine *always* lead with a finding is a prompt change (separate
track), not a client-side reshuffle (that would violate engine-honesty).
Built: `admin/src/stages/briefing.js` (three-act markup, hero chip, empty-act guards, Finish steps
down to ghost when "Lock these in" is present), `briefing.css` (act rhythm, calmer hero weight,
payoff frame), `stage-extras.css` (honest-read badges reworked for the recoloured cards). Honest
reads recoloured mint (share) / gold (private). Proof: `build:all` clean, run-detail + intake tests
11/11. **Not eyeballed by me — screenshots hang this session and a live Recap needs a finished 1:1.**
Rebuild `admin/src/stages/briefing.js` markup + its CSS (`run-onepage.css` / briefing blocks) to the
mockup:
- Result-first hero: honest chip (gold, "Partial record · N notes") + the finding in the display
  face + the honest sub-line. **Engine honesty holds** — the caveat text is still shown, just not as
  the hero; nothing masked.
- Three labelled acts using the `.eyebrow` section tier (P2).
- Act I: "What stood out" list + a **compact** axis read (one empty-state line, not 4 tall empty
  sliders + 2 repeat caveats).
- Act II: the two honest-read cards on the mint / locked-gold tint triads (chip primitive family).
- Act III: elevated "What to do next" container; the agreed-actions builder + reminders; the ONE
  solid-blue action ("Lock these in") lives here; "Finish" drops to a quiet button.
- **Dependency sweep before "done"** (per house rule): the briefing renderer is shared —
  `renderReadonlyBriefing` (run-detail), `review-run` final briefing, `compare`, and the copy-all
  serialiser all read the same `b.*` fields. Confirm the restructure doesn't break the read-only /
  review reuses, or fork a view cleanly.

### R3 — Consistency + guard ⬜
- The R1 rename follow-ups above (incl. updating `run-detail.test.ts`).
- A guard test locking "Recap" as the display label + the three-act structure.

## Done when (R2)
- [ ] `build:all` clean; admin tests green; no literal hex in the new CSS (token guard).
- [ ] Seen on the running app by Carl: the redesigned Recap on a real completed 1:1, matching the
      mockup's hierarchy — result-first, three acts, one blue action.
- [ ] Carl green-lights.

## QA scenarios — for Carl (R2)
Walk these on localhost:3000 after the build:
1. **Result-first** — finish a 1:1 and open the Recap. The top is the *finding*, with "Partial
   record" as a small chip — not a three-line apology.
2. **Three acts** — you can see three clear bands: the read, the honest read, what to do next.
3. **The payoff** — "What to do next" feels like the destination; exactly one solid-blue button
   ("Lock these in") on the screen; "Finish" is quiet.
4. **Honest reads** — the private reflection is unmistakably private (locked, warm) vs the shareable
   one (green).
