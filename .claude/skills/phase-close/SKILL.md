---
name: phase-close
description: "The close-out ritual when Carl approves a phase. Trigger when Carl says 'close the phase', 'phase approved', 'green light', 'tested, good', 'sign it off', or otherwise confirms a Darren-Method phase passed his QA walk. Runs the ordered checklist of every tracker that must move together — plan.md, STATUS.md, SERO_BOARD.md, build badges, progress log, changelog — then commits. Skipping any one of these is how trackers drift."
argument-hint: "<workstream slug, if not obvious from context>"
user-invocable: true
---

Carl said "tested, good". Now every tracker moves together — this exact list, this order.
(Three separate reconciliation audits were needed because steps got skipped. Don't add a fourth.)

## The checklist

- [ ] **1. The workstream** — `docs/plans/doing/<slug>/`:
      phase status → ✅ in `plan.md`'s Phases table, update "Current state" (what landed, how
      tested, what's next). Add the `## ✅ GREEN-LIT <date>` header to the phase file (see the
      darren-method phase template).
- [ ] **2. [STATUS.md](../../../STATUS.md)** — tick the phase's `[ ]` boxes → ✅, open the next
      phase (🔨 if starting), refresh the ▶ Your move banner.
- [ ] **3. [SERO_BOARD.md](../../../SERO_BOARD.md)** — only if a board-level feature moved
      (finished a whole workstream, changed strategy). Per-phase ticks don't belong here.
- [ ] **4. Build badges** — [admin/src/stages/tasks.js](../../../admin/src/stages/tasks.js):
      flip the matching step's `s` field (`"doing"` → `"done"`). Both the page badges AND the
      auto-generated "Copy continue prompt" read this — a stale `s` produces a stale handoff.
- [ ] **5. Progress log** — [docs/archive/prototype-to-production/progress.md](../../../docs/archive/prototype-to-production/progress.md):
      **append** the decision/lesson from this phase. Append-only — never restate status there.
- [ ] **6. Founder-facing docs** — when something big landed:
      [docs/reports/sero-how-it-works.html](../../../docs/reports/sero-how-it-works.html) +
      [docs/reports/sero-changelog.html](../../../docs/reports/sero-changelog.html) (manual refresh — they never self-update).
- [ ] **7. Commit** — green light = commit, right away, local only (no push/PR unless asked).
      Follow [safe-commit](../safe-commit/SKILL.md): path-scoped, never sweeping foreign work.
- [ ] **8. All phases ✅?** Move the folder to `docs/plans/done/<slug>/` and roll STATUS.md
      to the next active plan.

A phase close IS a checkpoint-save — the [checkpoint](../checkpoint/SKILL.md) rules (STATUS 📍 note, chat-log refresh) ride along with step 7.

## If trackers disagree

STATUS.md wins for tactical (this phase, right now); SERO_BOARD.md wins for strategic. Everything
else (progress log, badges, changelog) is subordinate. The map: [docs/reference/trackers.md](../../../docs/reference/trackers.md).

## Rules

- [ ] Only Carl's green light triggers this — never self-certify a phase closed.
- [ ] Do the whole list in one sitting. A half-closed phase is worse than an open one.
- [ ] Batch nothing "for later" — step 4's `s` flip commits WITH the phase, not after.
