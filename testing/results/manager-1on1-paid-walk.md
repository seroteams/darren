# Manager 1:1 engine walk — Dana → Sam (paid lane)

- **Role:** manager (Dana Reeves) running a real 1:1 about member Sam Patel
- **Env:** live — https://sero-obwq.onrender.com
- **Date:** 2026-07-12
- **Session:** `2026_Jul12_15-12-e0918f353c6c4ddf9d13a6bbe6ad78a1` · runId `55d6f6a8-5fc5-43d5-97fe-1a30fd772f52`
- **Meeting type:** Bi-weekly check-in
- **Goal:** judge the actual engine output quality (the core validation question), complete the run, and confirm the member then sees it.
- **Cost:** well under the $0.40 estimate — the eval step's own telemetry showed ~$0.01; whole run likely ~$0.05–0.15.

> Note on method: the browser pane's hidden-tab render stall made the engine screens hard to paint, so I drove the engine via its real API (focus-points → preparation → bank → answer → evaluation streams) and read the actual generated content. This tests the *engine output* faithfully; it does **not** test the briefing *screen's* rendering (that's a separate, tooling-blocked check — real users' visible tabs render fine).

---

## Think-out-loud log
- Picked Sam from the intake person-picker → correctly skipped role/seniority → jumped to meeting type. Chose **Bi-weekly check-in**. Wrote a specific, realistic note: Sam gone quiet in critiques, new senior designer arrived, "I suspect it's knocked Sam's confidence." Picked the **Motivation** focus pill.
- **Focus points generated** — and they're genuinely good, not generic: Energy/motivation, Feedback (how their voice is landing), Team connection (the new-designer thread), Manager support. Each tied by a `reason` to my note. Correctly **no competencies** (bi-weekly excludes them — focus-arc gate working).
- **Prep brief generated** — this is the headline. It didn't just echo my note; it **coached against my assumption** (see below).
- Built the question bank (10 Qs), answered one opener realistically, ran the evaluation → run completed (briefing written, `completedAt` set).
- Switched to Sam (member) to confirm the run shows in their history → **it did not appear.** Investigated the linkage in source.

---

## Engine output quality (the core validation question)

**Prep brief — "What to walk in with":**
- **coreIssue:** accurate, hedged ("probably about what changed for Sam in critiques… whether their design energy has dipped").
- **avoid:** *"do not open by naming a confidence problem or linking it to the new senior designer as if that is settled"* — real coaching.
- **dontAssume:** *"That Sam's quieter voice means lost confidence: it could also reflect team dynamics, meeting format, workload, or a deliberate choice to hold back."* → **The engine pushed back on the assumption I planted in my own note.** This is insight worth paying for, not an echo.
- openingQuestion, listenFor (3 observable cues), goodOutcome, suggestedAction, confidence-with-basis — all present and useful.

**Post-conversation debrief — honesty under thin data:**
- headline: *"Only 0 of 0 turns hold a note — this is a partial record, not a verdict on Sam Patel."*
- all four axes `read_status: not_read` — *"not enough signal to read."*
- It **refused to fabricate** a read when it lacked conversation data. (The "0 answers" is a test-timing artifact — I evaluated immediately after posting my answer, before its async scoring committed.)

**Verdict on value:** 🟢 Strong. A real HR manager gets a genuinely useful, honest prep brief. This is the single most important thing the test needed to establish, and it holds up.

---

## Findings

| # | Finding | Severity | Detail |
|---|---|---|---|
| 1 | **Completed run did NOT surface in the member's history** | 🔴 High — needs confirmation | Member `about-me` stayed empty after a completed run about them. See root-cause below. If real, the member's *entire* value (seeing their 1:1 history) is broken. |
| 2 | Prep brief shipped with `validation.passed: false` | 🟡 Note | Self-check flagged 2 "listenFor may lack observable cue" issues + took 2 attempts, but the brief shipped anyway. Self-validation is advisory, not blocking. Brief was still good — but worth knowing the gate doesn't hold shipping. |
| 3 | Answer submitted right before evaluation wasn't counted | 🟡 Note (likely artifact) | My one answer (202 async) didn't reach the debrief because I evaluated before scoring committed. Possible real edge: a last answer before "Skip to briefing" may be dropped. |

### Finding 1 — root cause trace (honest, not fully isolated)
`about-me` (`pgListFinishedRunsAboutPerson`) returns runs where **`finished = true` AND `personId` matches** the member's linked person.
- `finished = Boolean(session.briefing)` → my run **has** a briefing, so this should be satisfied.
- The person↔member link is correct (person `fe7a8e91…`.userId = Sam's user `c076d015…`).
- So the suspect is the run's **`personId` denormalized column** — either never stamped on the persisted row, or **stale** (the code itself comments that "the denormalized flag proved stale on real rows", runs-store.ts:441).

**I could not fully isolate** whether this is (a) a genuine product bug or (b) an artifact of my API-only path (I never clicked the real UI "Finish"/briefing flow, which may be where `personId` is persisted). **This must be confirmed with a clean UI-driven walk (or a DB peek) before the member half of the human test** — it's the highest-priority open item.

---

## ISOLATION — Finding 1 CONFIRMED (root cause pinned, free API tracing)

Traced it to a specific, reproducible correctness bug:

1. `/runs/finished` (manager's own history) was **empty** right after completing — so this is **not** a member-only or personId problem.
2. `/runs/recent` (no `finished` filter) **did** show the run → the run exists and is persisted.
3. `/runs/finished` and `/runs/about-me` both gate on the denormalized **`finished`** column → both missed it.
4. Forced a benign session write (`promises` / `focus-points/select`, both 200) → `/runs/finished` flipped **0 → 1**, and the member's `/runs/about-me` then returned the run correctly: `"Bi-weekly check-in · Dana Reeves · <date>"`.

**Root cause:** completing a run via the engine stream writes the briefing into session state but does **not** refresh the denormalized `finished` PG column to `true`. The run stays invisible in the manager's finished-runs library **and** the member's history until some *later* session write re-persists it (which sets `finished = Boolean(briefing)`).

**Why this hits real users, not just my API path:** the UI reaches the briefing through the *same* `evaluation/stream`, and the briefing screen already declares "This run is complete and saved." The only post-briefing writes (star rating + verdict, in the Finish modal) are **optional** — `saveVerdict()` returns early with no verdict, and Finish "ALWAYS proceeds." So a manager who finishes a 1:1 without leaving a rating/verdict leaves a completed run that never appears in their history or the member's.

**Fix direction (for the dev):** set/refresh `finished` (and re-upsert) at the moment the briefing is written in `evaluation/stream`, so finalization is atomic with briefing generation — not dependent on a later incidental write.

**Confidence:** High that the mechanism is real. One residual nuance: whether the star-rating write specifically re-persists the session (would narrow impact to un-rated runs). Either way the flag should be set at briefing time.

---

## FIX APPLIED (2026-07-13) — `finished` flag now set at completion

**Root cause (code):** `evaluationStream`'s `setCached` wrote the briefing but never called `service.persist` (the Postgres-mirroring persist). `runStage` calls a *disk-only* `persist` (a no-op when `DATABASE_URL` is set), so on live the briefing never reached Postgres — where `finished = Boolean(briefing)` is derived. `focusPointsStream` already persists in its `setCached`; evaluation didn't.

**Fix:** extracted the completion into `finalizeBriefing()` and made it `service.persist(session)` right after stamping the briefing (mirrors focus-points). Test-first: a red test reproduced the missing persist, then went green.

**Files:** `backend/api/services/sessions/finalize-briefing.ts` (new), `finalize-briefing.test.ts` (new), `session-streams.ts` (wired).

**Verified (free):** `tsc --noEmit` clean; `130/130` offline tests pass (incl. the new regression test).

**Verified LIVE (2026-07-13):** committed as `bb09932d`, deployed (live build `7454715` has it as parent). Ran a fresh 1:1 (`2026_Jul13_06-27…`) to completion via the engine with **no extra write** → it appeared in the manager's `/runs/finished` **and** the member's `/runs/about-me` immediately. Bug fixed and confirmed on production. (~$0.04 confirm run.)

---

## Overall verdict
- **Engine value (manager side):** 🟢 proven — genuinely useful, honest output.
- **Member sees the run (tie-together):** 🟢 works once the run is finalized — data + link + minimal shape all correct.
- **Real bug found:** 🔴 completed runs aren't marked `finished` at briefing time → can be invisible in both the manager's history and the member's until a later write. **Fix before the human test** (else testers' completed 1:1s may vanish from history).
- **Human-ready?** Manager prep + value: yes. History/member visibility: **not until the `finished`-at-completion bug is fixed.**
