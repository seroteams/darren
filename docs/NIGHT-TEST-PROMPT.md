# Sero — Overnight FULL QA Pass (paste this into a fresh session)

You are running an **unattended, exhaustive overnight QA pass** of the entire Sero app: every page, every toggle/button/tab/filter/form, the API layer, auth + role gating, error/empty states, responsive + dark mode — then 4 paid live pipeline runs. Carl is asleep. Work autonomously, do NOT stop to ask, and append everything to `docs/NIGHT-TEST-REPORT.md` as you go.

## Operating rules
- **Honesty first — this is the whole point.** Report every failure, console error, broken toggle, ugly layout, wrong status code, unhandled empty state. A red result reported plainly is success. Never paper over a problem.
- **Budget: 4 paid pipeline runs, ~$1.40 total** (~$0.35 each), pre-approved. NOTHING else may hit the OpenAI API: no `smoke`, no `eval`, no full 8-case gate, no `/checks/run`, `/regression/run`, `/suggest-fix`, and no extra `POST /sessions` beyond the 4. One retry max on a failed paid run, then move on.
- **Everything else is free** — offline tests, typecheck, lint, fixture replays, the whole live page + toggle walk, and all read/auth API calls. Do all of it thoroughly.
- **Append after every phase** (don't wait till the end — a crash must still leave a record). Mark each check ✅ / ⚠️ / ❌.
- **Don't commit, push, or open PRs. Don't fix anything** — QA only; log issues for Carl. Leave the tree clean except the report file. If you create test accounts or test data, note them so Carl can clean up.
- Use the **preview tools** for the browser (never bash for servers). Drive **live sessions via the API**, not by clicking through the SPA — the render queue stalls on scripted browser walks (known harness artifact).

---

## Phase 0 — Baseline (free)
Record the state before touching anything:
- `git status` (note it's dirty — that's expected).
- `npm test` (full offline suite — `node scripts/run-tests.js`), `npm run typecheck`, `npm run typecheck:admin`, `npm run lint`.
- Fixture replays (free): `node scripts/replay-scenario.js <id> --fixtures-only` for `biweekly-priya`, `performance-tom`, `growth-ahmed`, `feels-off-james`.
Log exact failing names for anything red. This is the baseline — pre-existing failures are NOT tonight's regressions, but list them.

---

## Phase 1 — API layer (free endpoints)
Start `sero-api` (port 3001) via preview. Hit each endpoint with fetch/curl and record **status code + response shape (or error)**. Prefix `/api/v1`.

**Health / catalog (GET, expect 200):**
`/heartbeat` · `/pipeline/status` · `/meeting-types` · `/personas` · `/persona-runs/current` · `/library` · `/arcs` · `/role-lexicons` · `/lexicon/promotions/pending`

**Runs (GET):** `/runs/recent` · `/runs/finished` · `/runs/mine` · `/runs/clonable` · `/runs/about-me`

**Team (GET):** `/team/people` · `/team/linkable-users` · `/team/aliases`

**Admin (GET — expect these to REQUIRE admin):** `/admin/errors` · `/admin/feedback` · `/admin/registered` · `/admin/users/:id/runs`

**Auth cycle (free, full loop):**
1. `POST /auth/register` — create a throwaway **manager** test user (note the email you used).
2. `POST /auth/login` → capture the session cookie/token.
3. `GET /auth/me` → expect your user back.
4. `POST /auth/logout` → then `GET /auth/me` again → expect logged-out.

**Auth-gating check (security-relevant):** while logged OUT, call an admin endpoint (e.g. `/admin/registered`) and a manager endpoint → expect **401/403, not data**. Record any endpoint that leaks data unauthenticated as a ❌.

**Writes (free but mutate — smoke ONE each on throwaway data, then note):**
`POST /feedback` (submit dummy feedback) · `POST /errors` (log a dummy client error). For `/team/rename`, `/team/merge`, `/team/aliases`, `/role-lexicons/term*`, `/lexicon/promotions` — verify they reject unauthenticated, but do NOT run destructive merges on real data.

**Do NOT call tonight (paid / pipeline):** `POST /sessions` (except the 4 in Phase 4), `/checks/run`, `/regression/run`, `/suggest-fix`.

Record a table: Endpoint | Method | Status | Auth-gated correctly? | Shape OK? | Notes.

---

## Phase 2 — Full live page + toggle walk (free)
Start both front-ends via preview: **admin** = `sero-web` (3000) + `sero-api` (3001); **customer** = `sero-customer` (3002) + `sero-api`.

**Method for EVERY page:**
1. Navigate.
2. `preview_snapshot` → **enumerate every interactive control** (button, toggle, tab, filter, dropdown, checkbox, text input, link).
3. `preview_console_logs` (errors + warns) and `preview_network` (failed requests).
4. **Exercise each control** — click every toggle/tab/button, type into each input, open each dropdown — and snapshot after to confirm the state actually changed (tab switches, filter narrows, modal opens/closes, form validates). Record any control that does nothing, throws, or breaks layout.
5. `preview_inspect` on body/meta text to enforce the **14px floor** — flag anything smaller.
6. `preview_screenshot` for visual sanity.
7. Check the **empty state** (e.g. a fresh account with no runs/team) and an **error state** (bad deep-link id) where the page supports it.

**Admin pages (port 3000):**
`/login` · `/register` · `/home` · `/team` · `/runs` · `/run` · `/new` · `/flow` · `/focus` · `/prepare` · `/bank` · `/interview` · `/evaluate` · `/briefing` · `/debrief` · `/compare` · `/library` · `/universe` · `/tasks` · `/personas` · `/guide` · `/lexicon` · `/job-lexicons` · `/meeting-arcs` · `/about` · `/privacy` · `/feedback` · `/admin/errors` · `/admin/feedback` · `/admin/registered`

**Customer pages (port 3002):**
`/login` · `/register` · `/` (manager start) · `/home` (member) · `/team` · `/runs` · `/runs/:id` · `/team/:person` · `/new` · `/flow` · `/focus` · `/prepare` · `/bank` · `/interview` · `/evaluate` · `/briefing` · `/debrief` · `/run` · `/run/:id` · `/about` · `/privacy` · `/feedback`

**Cross-cutting toggles to hit at least once each:** any global nav switch, meeting-type selector on `/new`, any manager↔member view toggle, dark-mode toggle if present, and any filter/sort on `/runs`, `/team`, `/library`, `/personas`.

**Responsive + theme:** run at least 3 representative pages at `preview_resize` mobile (375) and tablet (768), and 3 pages with `colorScheme: dark`. Flag overflow, clipping, unreadable contrast.

Record the per-page table: Page | App | Renders | Controls found | Controls broken | Console errors | Failed reqs | <14px | Empty/error state | Screenshot note.

---

## Phase 3 — Auth & role flows (free)
1. **Register + login** a manager and a member test account (via UI or API). Note emails.
2. **Manager view:** confirm manager lands on `/` (start) and can reach `/team`, `/runs`, `/new`, `/run`.
3. **Member view:** confirm a plain member lands on `/home` and is **bounced** from manager-only screens (`/` and `/run/:id`) back to Home. Record if a member can see manager data — that's a ❌.
4. **Admin/internal pages** (`/admin/*`, `/universe`, `/tasks`, `/library`) — confirm they require admin. If you can't get admin creds, note it and don't guess.
5. Logout from each and confirm protected pages redirect to `/login`.

---

## Phase 4 — 4 PAID live pipeline runs (~$1.40, pre-approved)
Run the full engine on all 4 meeting types (covers both arc-gate exclusion types), **one at a time**, smallest command each. **Wrap each in a wall-clock timer** (record start→end seconds — this is the pipeline speed number):
1. `node scripts/gate.js --only biweekly-priya`   (bi-weekly — competencies excluded)
2. `node scripts/gate.js --only performance-tom`   (performance)
3. `node scripts/gate.js --only growth-ahmed`      (growth)
4. `node scripts/gate.js --only feels-off-james`   (feels-off — competencies excluded)

Record the gate verdict (PASS/WARN/FAIL), any trust-check hard-fail names, and the run-log dir. One retry max per run. **Stop at 4 — no 5th.**

## Phase 4b — Deep run assessment + quality score (free — reads the run logs)
For **each** of the 4 runs, open its log dir under `logs/<month>/<run-id>/` and read **all** the data — don't sample:
- `session-state.json`, `transcript.json`, `axis-state.json`, `eligibility-log.json`, `scenario-pack.json`
- every stage folder: `00b-role-profile/`, `01-focus-points/`, `01b-preparation/`, `03-question-bank/`, `04-dynamic-answers/` (every `NN-turn.json` + response), and the **final briefing** file (`final.json` — the shipped briefing, NOT the raw `response.json`).

Then score the run **0–100** across these weighted dimensions (they mirror the real trust-checks in `evals/trust-checks.ts` — grep it for the exact rules):
| Dimension | Weight | What "good" looks like |
|---|---|---|
| **Grounding / evidence** | 20 | Claims anchor to the manager notes; no `INFERRED_STATE_LEAK`, no `STATE_ASSERTIONS` beyond input |
| **No leakage** | 20 | Zero `FOCUS_ARC_LEAK` / `QUESTION_ARC_LEAK` / `ROLE_PROFILE_ARC_LEAK` / `ENGINE_VOCAB_LEAK` / `PRIVATE_NOTE_LEAK` / `DEBUG_TEXT` |
| **Question integrity** | 15 | Questions specific, on-topic, non-duplicated (`QUESTION_INTEGRITY`, specificity score) |
| **Thread coherence** | 15 | Each turn follows the prior answer; no reset/repeat across turns |
| **No overdiagnosis on thin input** | 10 | `OVERDIAGNOSIS_ON_THIN` / `THIN_INPUT_SUPPRESSION` respected |
| **Briefing completeness** | 10 | All `REQUIRED_BRIEFING_KEYS` present, valid schema, no placeholders |
| **Honesty / no masking** | 10 | Raw model weaknesses surfaced, not hidden or hardcoded over |

Give each run: the number, the sub-scores, **2–3 concrete strengths and 2–3 concrete weaknesses with quotes** from the actual output, and a one-line verdict. Also QA the output **rendering** (free): load the run into `/run/:id` + `/briefing` + `/debrief` and confirm it renders cleanly (no raw JSON, no `<14px`, no masked/placeholder text).

## Phase 4c — Speed & responsiveness (free)
**Pipeline speed** (from Phase 4 timers): per-run wall-clock seconds, the average, and the slowest run. If per-stage timing is derivable from stage-file modified-times, note the slowest stage. Flag any run over ~90s.

**App responsiveness** (via preview tools, on both apps): for ~6 representative pages measure — using `preview_eval` with the Navigation Timing / `performance.now()` API — **page load time** (navigationStart→load) and **first-content render**; from `preview_network` capture the **slowest API request** per page (ms). Click 3 heavy interactions (open a run, switch a tab, run a filter) and record the **interaction→update latency**. Flag anything: page load >3s, API request >2s, interaction lag >500ms, or visible jank.

Record a speed table: Item | Metric | Value | Flag.

---

## Phase 5 — Tidy up (leave it clean for the morning)
Before writing the report, put everything back:
- **Remove test data you created** — delete the throwaway manager/member accounts, dummy feedback, and dummy error logs (via the API/DB, or list exactly what's left if you can't). Sero must look untouched.
- **Stop every preview server** you started (`preview_stop` each).
- **Restore the working tree** — `git status` should show only the two report files as new; revert any stray edits you made while testing. Don't commit, don't push.
- Move any scratch screenshots into one folder so they're not scattered.

## Phase 6 — Nice visual morning report
Produce a **clean, scannable HTML dashboard** at `docs/NIGHT-TEST-REPORT.html` — this is the thing Carl opens first, so make it genuinely nice (Carl is a visual thinker; show, don't wall-of-text). Self-contained, plain language, 14px+ text. Include:
- **Top banner:** one big 🟢/🟡/🔴 verdict + one-line summary + the date and paid-run cost.
- **Scorecard row:** small cards — Offline tests (X/Y), API (X/Y endpoints OK), Pages (X/Y clean), Toggles (X broken), Auth/roles (pass/fail), Paid runs (X/4 pass), **Avg run quality (0–100)**, **Avg pipeline speed (s)**, **App responsiveness (worst page-load)**. Colour each green/amber/red.
- **Run quality panel:** the 4 runs side by side — quality score, sub-score bars per dimension, and the top strength + weakness quote for each. A visual bar per dimension, not just numbers.
- **Speed panel:** pipeline seconds per run (bar chart) + the app-responsiveness table (page loads, slowest API, interaction latency) with flags.
- **Top issues, worst first** — a ranked list (5–10), each row: severity dot · page/endpoint · what's wrong · one-line why it matters. This is the part Carl acts on.
- **Collapsible detail** per phase: the full tables (API, per-page + toggles, auth, paid-run verdicts, full per-run assessments). Embed key screenshots inline (`<img>`), especially any broken page.
- **Footer:** test accounts/data created, servers stopped ✅, tree clean ✅.
Keep `docs/NIGHT-TEST-REPORT.md` too as the raw log the HTML is built from.

When the HTML is done, send it to Carl with `SendUserFile` (status: proactive, display: render) so it's waiting for him.

Then **stop.** No fixes, no commits, no push — leave that for Carl.
