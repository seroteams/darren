# Phase 003 · Step 01 — Rate a 1:1 from its detail page

## 1. Goal (plain)
On a reopened 1:1, let the manager tap 1–5 stars for "Did this help you run the 1:1?" and,
if it was poor (≤2 stars), jot a one-line "what missed?". It saves and sticks.

## 2. What you'll have when it's done
- A small, accessible **star control** on the run-detail page. Tapping a star saves instantly.
- The saved rating shows when you reopen the run (stars filled in; the note if there was one).
- A **low score (≤2)** reveals a single "What missed?" line; a good score doesn't nag for one.
- The rating is written to the run's **`rating.json`** file (verified on disk, not just in the UI).

## 3. A grounding example (before → after)
- **Before:** you reopen the Priya 1:1 — just the briefing, no way to say it missed.
- **After:** you tap ★★☆☆☆, a "What missed?" line appears, you type "too generic for Priya",
  and it's saved. Reopen later → ★★☆☆☆ and your note are still there.

## 4. The technical detail
The **backend already exists and is tested** — this step only consumes it:
- Endpoint: `POST /api/v1/runs/mine/:id/rating` ([server.ts:261](../../../backend/api/server.ts))
  → `rateMine` ([runs.service.ts](../../../backend/api/services/runs/runs.service.ts)): validates
  stars 1–5 (else 400), fences org+user (else 404), trims the note + caps at 4000, preserves the
  first `createdAt`, writes `rating.json` atomically.
- The current rating is **already in the payload**: `memberRunView` returns
  `rating: { stars, note, updatedAt } | null` ([run-history.ts](../../../backend/engine/run-history.ts)).
  So run-detail already receives `run.rating`.

Frontend work:
1. **Client call** — add to [shared/api.js](../../../shared/api.js), beside `getMyRun`:
   ```js
   export async function rateRun(id, stars, note) {
     return postJson(`/api/v1/runs/mine/${encodeURIComponent(id)}/rating`, { stars, note });
   }
   ```
   (`postJson` already sends the origin header the mutating route needs.)
2. **A reusable star widget** — a small module (e.g. `admin/src/ui/star-rating.js`) that renders
   five stars and calls back with the chosen value. **Accessibility is required, not optional**
   (match the bar the admin verdict widget sets):
   - a labelled group (`role="radiogroup"`, `aria-label="Rate this 1:1, 1 to 5 stars"`), each star a
     `role="radio"` button with `aria-checked`;
   - **keyboard operable** — arrow keys / Enter set the value, visible focus ring;
   - star glyphs render **≥14px**.
3. **Place it on run-detail** ([run-detail.ts](../../../admin/src/stages/run-detail.ts)) under the
   briefing, in a `card()` block titled e.g. "How useful was this?". Seed it from `run.rating.stars`.
   On change → call `rateRun(id, stars, note)`; on success reflect the new state.
4. **Low-score note** — when the chosen value is ≤2, reveal one text input ("What missed?"), seeded
   from `run.rating.note`; save on blur/enter via the same call. A score ≥3 hides it (existing note
   still kept server-side; never auto-deleted).
5. Escape every value; keep copy plain and ≥14px.

**Do NOT in this step:** the end-of-1:1 in-flow prompt is **Step 02**; the list-row star badge is
**Step 03**. Don't touch the backend (it's done). No "unrated" counter anywhere.

## 5. How to check it worked
- `npm test` green, `npm run typecheck` clean (no backend change; frontend types tight).
- **Verify the destination:** after rating, the run's `rating.json` on disk holds `{ stars, note,
  createdAt, ratedAt }` — not just the screen. (QA sheet gives the exact walk.)
- Reopen the run → stars + note persist. Change the stars → the file updates, `createdAt` unchanged.
- The widget is fully operable by keyboard with a visible focus ring.
