# Phase 6 — Briefing note + full sweep

## Scope
- `BRIEFING`: show an explicit honest note — "Nothing new is sent here; the briefing is produced by Synthesis" — not a fabricated payload.
- Sweep every stage: each Sent tab is either a real labelled payload or an honest "doesn't send anything" note. No stage left on the generic "Waiting…" placeholder when inputs exist.

## QA scenarios
1. Reach **Briefing** → Sent tab shows the honest derived-from-Synthesis note.
2. Walk all 7 steps end to end → no stage shows a stray "Waiting…" once its inputs exist.

## Sign-off
- [ ] Product owner green light → commit (local). Then move folder to `docs/archive/done/`.
