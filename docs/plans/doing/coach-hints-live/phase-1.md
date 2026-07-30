# Phase 1 — The agenda question gets its own coaching

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built, awaiting Carl's walk

## Built (2026-07-30)

- `backend/api/services/sessions/sessions.service.ts` — `buildAgendaCheck` now carries the three hints below and is exported. It builds `const q: Question` before freezing, the same shape `buildCarryForwardQuestion` uses: inside a bare object literal TypeScript widens `kind` to `string`, which fails `QuestionHint`.
- `backend/api/services/sessions/sessions.service.test.ts` — the existing intro-queue test now asserts the hints reach the queue, plus a new guard, "every question built in code carries 3 tagged coaching hints", walking both code-minted questions for count, both kinds, non-empty text, no em dash, and the under-20-words craft rule.

Wording as shipped:
- **How to ask** — Name your own one or two items first, then stop and let them fill the rest.
- **Listen for** — Whether they name something of their own, or just agree to your list.
- **Listen for** — Whether what they want out of today is a decision, help, or just to be heard.

Offline proof:
- Baseline before touching anything: `npm test` 219/219, `npm run typecheck` clean. No pre-existing failures, so nothing below is inherited.
- After: `npm test` 219/219, `npm run typecheck` clean, `npm run lint:copy` PASS.
- The guard was watched failing before the fix (`expected exactly 3 coaching hints, got 0`) and watched failing on the OTHER question by temporarily corrupting its first hint, which tripped both the em-dash and the 20-word rules. That edit was reverted; `git diff backend/engine/agenda.ts` is empty.
- Destination, not routing: a session created through the real API persisted its queue as `q_open_since_last_spoke -> q_intro_agenda_check -> q_intro_biweekly_pace -> q_intro_biweekly_friction`, with the agenda check carrying all three hints.

Not verified on screen. The panel component itself is untouched by this phase, so the on-screen check is scenario 1 below, for Carl to walk.

## Goal
The early agenda question stops borrowing whole-meeting prep cues and carries three coaching lines written for itself.

## Changes
- `backend/api/services/sessions/sessions.service.ts` — `buildAgendaCheck` gains a `hints` array of three lines (one "how to ask", two "listen for"), written the same way its sister `buildCarryForwardQuestion` was.
- `backend/engine/questions.test.ts` — the guard test that walks intro/seed/opener content also covers the two questions built in code, so a code-minted question can never again ship without coaching.
- `backend/api/services/sessions/sessions.service.test.ts` — assert the served question carries its three hints through the wire shape.

Proposed lines (final wording lands with the build):
- **How to ask** — Name your own one or two items first, then stop and let them fill the rest.
- **Listen for** — Whether they name something of their own, or just agree to your list.
- **Listen for** — Whether what they want out of today is a decision, help, or just to be heard.

## Not in this phase
- Anything that makes hints react to the answers. That is phase 2.
- The fallback panel's own styling and its all-"Listen for" pills (parked).
- The formulaic feel of model-written hints (parked).

## Done when
- [ ] `npm test` and `npm run typecheck` clean.
- [ ] The guard test fails if the hints are removed from either code-minted question (checked by deleting them and watching it go red, then putting them back).
- [ ] A real run's saved question payload for `q_intro_agenda_check` carries the three hints, read back from the API response, not inferred from the source.
- [ ] Screenshot of the real panel on that question, showing the three lines and no "From your prep brief" label.
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.

1. **The agenda question reads right** — `local > admin test runner > Questioning`. Start a run and go forward until you reach "I've got a couple of things to cover. What do you want to get out of today?". You should see three cards on the right, one "How to ask" and two "Listen for", all about agendas and what they want from the time. ❌ Not OK if the grey line "From your prep brief for <name>. Written for the whole meeting, not this question." is still above them.

2. **It's not the same as the next question** — press on to the question after it. The right panel should change to different lines. ❌ Not OK if the three cards are word-for-word the same.

3. **The rest of the run is untouched** — carry on to the end. Every question should still show three cards. ❌ Not OK if any question shows an empty panel or "No coaching hints for this question yet".
