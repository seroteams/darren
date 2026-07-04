# See before sent — live preview of the AI payload for the current stage

**Goal:** In the live runner, the **Sent** tab shows the exact text we're *about to* send to the AI
for the current stage — *before* it runs — so nothing leaves the machine unseen. Security, compliance,
and quality.
**Driver:** Carl
**Created:** 2026-06-20

## Why
Today the Sent tab only reads the run's disk logs (`prompt.md`), which exist only *after* a stage runs.
So in a live run it always shows "Waiting for this stage to run…" — you can never see what the current
stage is about to send. This adds a **preview**: assemble the same payload the run would send, with
**zero** API calls, and show it before the stage runs.

## Decisions (locked with Carl)
- **Preview = view only.** No approval gate; the run proceeds normally.
- **Scope = the current stage only.** Prove it on Preparation (Step 3), extend stage-by-stage later.
- **Engine honesty:** preview must reuse the *same* assembly code the real send uses — preview == send,
  no drift. Pure string assembly, never calls OpenAI, costs nothing.

## Done means
- Hitting the preview endpoint for a live session at Preparation returns the model + the full prompt
  text, makes **zero** OpenAI calls, and matches `prompt.md` byte-for-byte after a real run.
- In the runner at Step 3, opening **Sent** shows the real prompt (your notes, name, focus points)
  *before* the stage runs, clearly labelled a not-yet-sent preview.
- After the stage runs, Sent falls back to the existing logged "exact text sent" view, unchanged.
- Other stages still show their current placeholders until extended.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Backend preview | Shared assembler for Preparation + `GET /api/preview?s=<id>` returning the payload, no API call | ✅ |
| 2 | Sent-tab preview | Sent tab fetches + renders the preview when the stage hasn't logged yet, labelled "about to send" | ✅ |

⬜ not started · 🔨 built, awaiting product-owner QA · ✅ done (tested)

## Current state
**Audit reconciliation (2026-07-01):** both phases are **built, committed, and wired live** — not "awaiting commit".
Code-verified: `assemblePreparation` (`backend/engine/preparation.ts`), `PREVIEW_ASSEMBLERS.PREPARATION` +
`GET /api/v1/sessions/:id/preview` (`sessions.service.ts`, `server.ts`), and the Sent-tab `renderPreview()`
fallback (`admin/src/ui/stage-data-tab.js`). The genuinely outstanding item is only Carl's on-screen QA of the
"about to send" banner — badge stays 🔨 until he ticks. (`npm test` now 52/52, up from the 30/30 below.)

**✅ Both phases ticked 2026-07-01** (QA-pile clear-out). Walked live on the Maya session: (1) preview
endpoint `GET /api/v1/sessions/:id/preview?stage=PREPARATION` returned the full ~19k-char prompt with
**zero** API calls; (2) on the Prep-brief step, the **Sent** tab showed the payload clearly labelled
*"Not sent yet — this is the exact text we'll send the moment this step runs. Nothing has left your
machine"* with a "preview — not yet sent" reveal (screenshot captured). Byte-for-byte match vs the real
logged prompt was confirmed by the prior audit. One preparation stage was run to capture the in-tab
screenshot (Carl-approved paid check).

Both phases **built in one pass** (Phase 1 isn't visible in the UI on its own, so they QA together).

Verified so far (free, no API spend):
- `npm test` → 30/30. `frontend` client build → all bundles resolve (incl. new `getStagePreview` import).
- `assemblePreparation()` → returns the full 18.3k-char prompt (incl. the private notes), with **zero**
  network calls (http/https.request tripped to prove it).
- Preview endpoint, end-to-end offline (synthetic session at Preparation): `GET /api/preview` → 200,
  `{ stage:"PREPARATION", model, prompt, preview:true }`, zero network. A session still on Focus points
  → `{ supported:false }` (only Preparation wired, as scoped).
- **No-drift:** guaranteed by construction — both the live run and the preview run the identical
  `buildPrepInput → buildMessages → .filled`. The literal byte-for-byte vs `prompt.md` check needs a
  real (paid) run — left for Carl's QA.

In-browser run (Carl approved a paid run): drove a fresh session via the UI to Step 3 on an isolated
prod stack (port 3098). Results:
- The preview endpoint output for that browser-created run is **byte-for-byte identical** (20,026 chars)
  to its real `01b-preparation/prompt.md`, and contains the private notes I typed in setup
  (marker "CONFIDENTIAL-PREVIEW-CHECK-7731"). Same byte-for-byte result on a second, older real run
  (19,404 chars). No drift, confirmed on real data.
- **Cost note (honesty):** I quoted ~$0.35 (one Focus-points call) but **two** AI stages actually ran
  — Focus points *and* Preparation — because resuming the session auto-ran prep. So ~**$0.70**, not
  $0.35. My mistake for not re-checking before resuming.
- **Not visually captured:** the literal "about to send (preview)" banner in the Sent tab. The headless
  test browser aborted the Focus-points SSE (blocking the normal Continue path) and wouldn't switch the
  right-rail tab. The render path is covered by the clean build + the proven endpoint, but the on-screen
  banner itself is the one thing left for Carl's eyes.

**Carl's 30-second check:** restart `npm run dev`, open a run, go to **Step 3 (Preparation)** before it
runs, open **Sent** → you should see "Show exact text we're about to send (preview — not yet sent)".

## Parked
- **Extend the preview to every stage, one at a time** (absorbed from the folded-in `see-before-sent` plan,
  2026-07-04): Focus points, Question bank (BANK), Synthesis (EVAL), Live Q&A (per-turn, QUESTIONING), and
  the final Briefing note. Each reuses the same `assembleX`/`buildMessages` the live send uses — no drift,
  zero API calls — mirroring how Preparation was done here. Build one stage per phase, QA, then the next.
- **Readable System/User split display** (also from `see-before-sent`): lay the payload out labelled +
  skimmable so a non-engineer can eyeball "is the engine sending the right thing?", with the raw text one
  click away — rather than one raw block. Applies to `admin/src/ui/stage-data-tab.js`.
- An **approval gate** (hold the call until you click Send) — out of scope for now.
- Secret/PII redaction in the preview view.
