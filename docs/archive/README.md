## Archived Runtime Data

This folder keeps bulky historical artifacts out of active runtime paths while preserving traceability in-repo.

- `questions/questions_archive_2026-06-02.zip`: previously `questions/_archive/` YAMLs.
- `logs/logs_nonpinned_2026-06-02.zip`: non-pinned `logs/` directories archived on 2026-06-02.

Pinned log fixtures remain in `logs/` because scripts and regression scenarios reference them directly.

## Archived docs (2026-07-01)

Finished or superseded docs moved out of the live `docs/` tree during the 009 repo-ready tidy:

- `plans/PLAN-archive.md`: superseded workstream board (all rows done) — active work lives in `SERO_BOARD.md`.
- `plans/FEATURES.md`: the old deep feature inventory — superseded by `SERO_BOARD.md` (the live board). Root README's "deep inventory" link repointed here.
- `plans/log-fix-audit.md`: one-off logging-fix audit, actioned and closed.
- `darren.md`: 2026-06-17 CTO-meeting testing notes, never actioned.
- `sero-engine-update.html`: one-off 2026-06-14 engine progress snapshot, superseded by `sero-how-it-works.html`.
- `screenshots/`: one-time tasks-board captures from the June phases.
- `plans/DESIGN.md`: early design-token spec, no longer current.
- `sero-roadmap.html`: 2026-06-21 roadmap snapshot, superseded by live planning in `SERO_BOARD.md`.
- `prototype-to-production/`: the completed 001–008 build track (phase overviews, QA checklists, `PROGRESS.md`, `009-ready-to-share.md`). All eight phases done + signed off; superseded by the active `docs/plans/doing/pre-go-live/` track. Live links (CLAUDE.md, TRACKERS.md, pre-go-live/README, 009-ready-to-share, done/{convention-skills,backend-api-v1}) repointed here. The `✓` prefix was stripped from the top folder; inner `✓NNN-*` phase folders kept their prefix.

## Archived docs (2026-07-07)

Finished report artifacts moved out of the live `docs/` root so only in-play things sit there:

- `audits/live-data-audit-2026-07-05.md`: the "is everything really connected?" audit for the **live-data-cleanup** track — that track is closed (all 4 phases signed off). The one live link (STATUS.md) was repointed here.
- `reports/overnight-qa-2026-07-06.md`: the 2026-07-06 overnight QA report — a completed, dated run log. No live links.
