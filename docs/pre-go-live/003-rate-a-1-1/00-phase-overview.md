# Phase 003 — Rate a 1:1

## Goal (plain)
Let a manager say how useful a 1:1 was — a quick 1–5 star rating with an optional one-line note — so the
tool learns what's landing, and Carl gets honest signal.

## What you'll have when it's done
- A gentle **one-tap rating right at the end of a 1:1** (the moment the memory is fresh) — *"Did this help
  you run the 1:1?"* 1–5 stars — always with **Skip**. The same control also sits on the run detail so a
  rating can be set or changed later.
- On a low rating (≤2 stars), a one-line **"What missed?"** prompt reveals the optional note — so the
  honest *why* gets captured when it exists (uses the same single note field, not a separate flow).
- The rating shows as a small star badge on the Runs list row; a person's average shows **with its count**
  ("3.0 avg · 4 rated"), so a blunt average isn't over-read.
- Carl (admin/superadmin) can see all managers' ratings — the honest read on what's useful.
- A low rating is kept and surfaced as-is — **never hidden** (engine-honesty rule). The manager is
  **never** shown an "X unrated" nag; the unrated state is neutral and inviting ("Rate this?").

## A grounding example (before → after)
- **Before:** a manager finishes a 1:1 and there's no way to tell Sero it missed.
- **After:** they open the run, tap ★★☆☆☆, add "too generic for Priya", and it's saved — and Carl sees
  that 2-star note when reviewing the alpha.

## The steps (to be detailed when this phase starts)
1. **Backend, test-first:** `POST /api/v1/runs/mine/:id/rating` (member-safe, fenced by org+user) writes
   `{ stars: 1–5, note, ratedAt }` to a **`rating.json` sidecar** in the run's `logDir` — mirroring the
   existing `review.json` / `archive.json` pattern in
   [runs.service.ts](../../../backend/api/services/runs/runs.service.ts). Write **atomically** (temp-file +
   `rename`, the same way `setArchived` does) so an edit can't tear the file.
2. Surface the rating in `memberRunView` and in the member run list, so the UI can show it.
3. **Frontend:** the end-of-briefing one-tap rating + the same widget on the run detail + a compact star
   badge on the list row. The star control is **keyboard-operable and labelled as a rating** (1–5 settable
   by keyboard, visible focus, ≥14px) — meet the bar the admin verdict widget already sets.
4. Validation: stars 1–5 only; note trimmed + capped; logged-out → 401; not-owner → 404.

## What we reuse (don't rebuild)
- The sidecar-in-`logDir` pattern and org+user fencing already used by review/archive.

## Decision (from the CTO review): keep the sidecar file — do NOT add DB columns yet
The `runs` DB table is a stub nothing writes to on the run path; the live source of truth is the on-disk
run state. For a 2–3 manager alpha, reading a handful of `rating.json` files to average them is trivial,
and the superadmin view (Phases 006–008) reads ratings the same way. Moving ratings to a DB column is the
**parked scale-up trigger** (when the alpha grows past a handful of managers) — noted in PROGRESS, not built now.

## Privacy (rating note is HR-sensitive)
The free-text note can name a person + a judgment, so it's a **private manager field** in the same class
as `brutal_truth_manager`: it must **never** reach any employee-facing/shared surface, and it's never
logged. `rating.json` lives under `logs/**` (git-ignored); add a belt-and-braces `**/rating.json` ignore.

## How we'll know it's done (full list in `99-qa-signoff.md`)
- Rate a run → reload → the stars persist (**verify the destination**: the `rating.json` file, not just
  the code). Change it → it updates.
- The badge appears on the list row.
- `npm test` covers the new endpoint (valid write, bad stars → 400, logged-out → 401, not-owner → 404).
- No OpenAI calls; typecheck clean.

## Note
Rating is stored per run. A person-level average ("how useful have my 1:1s with Priya been?") is computed
in Phase 004/005 from these per-run stars.

> **Status:** overview only. Detailed step files get written when we start this phase.
