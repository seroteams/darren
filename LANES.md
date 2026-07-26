# Lane board — who's working on what

Each Claude chat claims a lane here before touching files, and clears it when done.
A hook checks every file edit against this board: editing inside ANOTHER chat's lane
stops the edit and surfaces a warning instead of ploughing in.

**Format (one row per active chat):**

| session | area | paths | claimed |
|---------|------|-------|---------|
| 35146fdf | Carl Method portable pack | docs/carl-method/ | 2026-07-25 |
| 4b899314 | Audit fix-up P2 (shell + layout) | docs/plans/doing/audit-fixes-jul-25/, audits/full-app-audit-2026-07-25/p2-proof/, admin/src/styles/design/primitives.css, admin/src/styles/design/session-topbar.css, admin/src/styles/design/app-nav.css, admin/src/ui/session-topbar.js, frontend/src/router.js, frontend/src/ui/app-nav-flow.test.ts | 2026-07-25 |
| d03316aa | Component consolidation P3 (the button renderer) | docs/plans/doing/component-consolidation/, admin/src/ui/button.ts, admin/src/ui/button.test.ts, admin/src/ui/wizard-footer.ts, admin/src/ui/notes-panel.js, admin/src/ui/save-pip.ts, admin/src/ui/action-error.ts, admin/src/ui/stale-run-recovery.ts, admin/src/stages/briefing.js, admin/src/stages/lexicon-review.js, admin/src/stages/meeting-arcs.js, admin/src/stages/compare.js, admin/src/stages/personas.js, admin/src/stages/questioning-actions.ts, admin/src/stages/login.js, admin/src/stages/reset-password.js, admin/src/stages/error.ts, frontend/src/stages/guided/, frontend/src/stages/team.ts, frontend/src/stages/team-card.ts, frontend/src/stages/members.ts, frontend/src/stages/member-home-view.ts, frontend/src/stages/welcome.ts, frontend/src/stages/person-detail.ts | 2026-07-26 |
| 70b40d36 | Shape-matched loading skeletons P2 (lists + tables) | docs/plans/doing/skeleton-shapes/, admin/src/ui/skeleton.js, admin/src/ui/skeleton-parts.ts, admin/src/ui/skeleton-presets.ts, admin/src/ui/skeleton-presets.test.ts, admin/src/ui/screen-scaffold.ts, admin/src/styles/design/motion.css, admin/src/stages/runs.ts, admin/src/stages/library.js, admin/src/stages/start-core.js, admin/src/stages/start-core.test.ts, admin/src/stages/admin-registered.ts, admin/src/stages/admin-runs.ts, admin/src/stages/admin-ratings.ts, admin/src/stages/admin-gate1.ts, admin/src/stages/admin-guest-runs.ts, frontend/src/stages/member-home.js | 2026-07-26 |
| 3a8bfd02 | Design system clean-up (invisible pass) | docs/plans/doing/design-cleanup-invisible/, admin/src/styles/design/tokens.css, admin/src/styles/design.css, admin/src/styles/DESIGN-SYSTEM.md, admin/tailwind.config.js, scripts/lint-design-tokens.js, scripts/lint-copy.js, scripts/test-design-guard.js, DESIGN.md | 2026-07-26 |

**Rules (for Claude sessions — Carl never has to touch this file):**

- `session` = first 8 chars of the session id (from the scratchpad path).
- `paths` = comma-separated files or folders (folders end with `/` or just match by prefix).
- Claim your lane as soon as the work area is clear; keep it narrow.
- Remove your row when the work is committed / wrapped up.
- Claims older than 2 days are treated as stale and ignored by the hook.
- If the hook stops you: tell Carl which chat holds the lane and let HIM decide —
  never edit through another chat's claim silently.
