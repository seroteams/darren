# Phase 1 — Focus areas preview + readable display

## What was built

**Backend (no-drift):**
- `assembleFocusPoints(inputs)` in `src/generate.js` — reuses `catalogueForArc` + `buildMessages`, returns `{ model, prompt }` (byte-for-byte what would be sent). Exported.
- Registered `FOCUS_POINTS` in `frontend/server/handlers/preview.js` `ASSEMBLERS` (uses `session.ctx` only — no prior stage needed).

**Display (cross-cutting — reused by all later stages):**
- `frontend/client/src/ui/stage-data-tab.js`: new `splitSystemUser()` + `renderPromptSplit()`. The prompt now shows as two labelled collapsible sections — **"Instructions to the model (system)"** and **"Your meeting's data (user)"** — plus a collapsed **"Everything exactly as sent (raw)"** toggle. Used by preview, logged stages, and per-turn Q&A.

## QA scenarios (product owner walks these in the app)

1. Start a session → reach **Focus areas** → open right-rail **Sent** tab.
   - ✅ It no longer says "Waiting for this stage to run…".
   - ✅ Shows **Model**, then **system** and **user** sections (open), plus a **raw** toggle (collapsed).
2. The **user** section contains this meeting's real data — name, role, seniority, meeting type, and your private note (the friction / HR-time-off text).
3. The **system** section is the fixed instruction prompt (the "You are Sero…" rules).
4. Open **raw** → it equals system + user combined, exactly. **Copy** on each section copies that section's text.
5. Edit an intake field (e.g. notes) and return to Focus areas → the user section reflects the change (refresh happens on stage/tab change).
6. Text is readable, ≥14px. Nothing reworded or hidden vs. raw.

## Sign-off

- [ ] Product owner green light → commit (local).
