# docs — index

The map of everything under `docs/`. **Where are we right now?** → [`STATUS.md`](../STATUS.md)
(tactical) · [`SERO_BOARD.md`](../SERO_BOARD.md) (strategic) · the **Tasks** screen in the admin
app (live plan board, auto-built from the plan folders).

The rooms (refreshed 2026-07-26):

| Folder | What lives here | Committed? |
|---|---|---|
| [`reference/`](reference/) | Living canonical specs — the docs that stay true. | yes |
| [`reports/`](reports/) | Point-in-time outputs, date-prefixed, plus the two hand-maintained customer-facing pages. Spent ones move to [`reports/archive/`](reports/archive/). | yes |
| [`plans/`](plans/) | Multi-phase build work — [`doing/`](plans/doing/) (active), [`future/`](plans/future/) (parked), [`done/`](plans/done/) (completed). One folder per plan; the folder's bucket IS its status. | yes |
| [`decisions/`](decisions/) | One file per decision later work has to obey. | yes |
| [`design/`](design/) | Design source material and mock references. | yes |
| [`research/`](research/) | External evidence reviews behind product calls. | yes |
| [`carl-method/`](carl-method/) | The portable pack of how this project is run, for use outside this repo. | yes |
| [`archive/`](archive/) | Superseded plans, old artifacts. | yes |
| `chat-history/` | Past conversation transcripts, rebuilt by `scripts/chat-log.py`. | **no, local only** |

---

## reference/ — living specs

| Doc | What it is |
|---|---|
| [conventions.md](reference/conventions.md) | How code is named + laid out. |
| [structure.md](reference/structure.md) | Repo folder map + lifecycle. |
| [contracts.md](reference/contracts.md) | Engine/data contracts. |
| [guardrails.md](reference/guardrails.md) | The five drift types Claude checks every request against. |
| [trackers.md](reference/trackers.md) | Which file answers "where are we?" (the two sources of truth). |
| [handover.md](reference/handover.md) | Session/agent handover notes. |
| [parallel-sessions.md](reference/parallel-sessions.md) | Running many sessions safely (worktrees, path-scoped commits). |
| [prompt-improvement-spec.md](reference/prompt-improvement-spec.md) | The no-inference ruling + prompt spec. |
| [prompt-review-ledger.md](reference/prompt-review-ledger.md) | Append-only `/reviewrun` trend ledger. |
| [reviewrun-output-spec.md](reference/reviewrun-output-spec.md) | Canonical spec for `/reviewrun` output. |
| [night-test-prompt.md](reference/night-test-prompt.md) | The overnight-QA operator prompt. |
| [gtm-validation-plan.md](reference/gtm-validation-plan.md) | The first corridor-test plan (needs names). |
| [design.md](reference/design.md) | Sero design-token spec (colours, type, spacing). |
| [features.md](reference/features.md) | Feature inventory snapshot (active work lives in SERO_BOARD.md). |
| [engine-map.md](reference/engine-map.md) | How the 5-stage pipeline fits together, for agents. |
| [agent-decisions.md](reference/agent-decisions.md) | Carl's recurring judgment calls, written as decision tables. |
| [repo-map.md](reference/repo-map.md) | The measured repo brain (kept after an A/B test: big win on conceptual questions). |
| [RENDER_SETUP.md](reference/RENDER_SETUP.md) | The live deploy's environment table. |
| [db-backup-restore.md](reference/db-backup-restore.md) | How to back up and restore the database. |
| [claude-cheat-sheet.html](reference/claude-cheat-sheet.html) | One-page cheat sheet for driving this repo. |

## reports/ — point-in-time outputs

| Report | What |
|---|---|
| [sero-changelog.html](reports/sero-changelog.html) | Customer/internal changelog homepage (hand-maintained, refreshed at each track close). |
| [sero-how-it-works.html](reports/sero-how-it-works.html) | Founder-facing how-it-works deck (hand-maintained). |
| [2026-07-18-agency-audit.md](reports/2026-07-18-agency-audit.md) | The outside-agency code audit and its 17 findings. |
| [2026-07-25-lab-traceability-research.md](reports/2026-07-25-lab-traceability-research.md) | The three committee follow-ups (replay bridge, build traceability, durable triage), with Carl's option-A decisions. |
| [cleanup/](reports/cleanup/) | One file per repo clean-up sweep. |
| [archive/](reports/archive/) | Spent reports kept for the record. |

## plans/ — build work

One folder per plan, filed by state — the folders ARE the source of truth (don't hand-list
them here; the list drifts). Live view: the **Tasks** screen in the admin app + [`STATUS.md`](../STATUS.md).

- **[doing/](plans/doing/)** — actively in-flight (6 tracks as of 2026-07-26).
- **[future/](plans/future/)** — parked / not started (12 folders, each carrying a banner that says
  exactly where it stopped; one sentence un-parks any of them).
- **[done/](plans/done/)** — completed, signed-off tracks (80 folders; git history has the rest).

## archive/ — superseded + completed

| Section | What |
|---|---|
| [prototype-to-production/](archive/prototype-to-production/) | The 8-phase Prototype→Production line (overview, progress, per-phase). |
| [screenshots/](archive/screenshots/) · [logs/](archive/logs/) · [questions/](archive/questions/) | Old screenshots, log/question zip snapshots. |
| [darren.md](archive/darren.md) · [sero-engine-update.html](archive/sero-engine-update.html) · [sero-roadmap.html](archive/sero-roadmap.html) | Misc archived notes + decks. |

> **Not indexed here:** `chat-history/` is git-ignored and local-only (generated by `scripts/chat-log.py`) — it stays out of the tree on purpose.
