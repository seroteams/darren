# Progress Log — Prototype → Production

> **Archived append-only log — decisions + lessons, NOT a status source.** The Prototype →
> Production migration is complete; this is its historical record, frozen at archive time.
> For where the build is *now*, check `STATUS.md` (tactical) and `SERO_BOARD.md` (strategic) at the
> repo root. The playbook was **[OVERVIEW.md](OVERVIEW.md)**. The "Where we are now" / "Phase status"
> snapshots below are frozen at archive time — trust `STATUS.md` over them.

---

## Where we are now
- **2026-07-12** — **forgot-password TRACK CLOSED ✅ (both phases, Carl "this is good push it"), $0, pushed live.** Email-based
  password reset for everyone (one shared login → managers, members, admin). **P1** backend: `password_reset_tokens` (`0014`,
  sha256/single-use/1h), `forgot-password`+`reset-password` endpoints (always-200 no enumeration, rate-limited), branded
  seroapp.com email — proven end-to-end on the dev DB + a real inbox email. **P2** UI: "Forgot password?" link + request/reset
  screens shared by both apps. **Lessons:** (1) *look before you overwrite* — `.env` already had a working verified sender;
  surfacing that beat clobbering it. (2) **parallel-session merge without sweeping** — Phase 2 was built in a worktree to dodge
  three admin-shell files another session had dirty; landed on main by `git stash push -- <just those files>` → `git merge` →
  `git stash pop`, which parked + restored two sessions' WIP (a test page + a promises feature) with zero commits of their work.
  Verified non-overlapping first (their edits were in different regions). typecheck+build+browser all green; Carl walked it live.
- **2026-07-12** — **past-1on1-view P1 ✅ (backend, $0).** The member "Past 1:1" endpoint now exposes `turns[]` (the raw
  Q&A behind the briefing) for a coming Answers tab. Built by mirroring the existing compare-view projection onto
  `toMemberView` (PG) + `memberRunView` (file) — but dropping the internal planner `note` (it carries `[SHALLOW]`/`[SKIP]`
  markers that must never reach a manager). **Lesson:** the file↔PG parity test (`test-pg-runs-parity`) is the real guard
  here — any new field must be added to BOTH member views identically or that deep-equal fails; because the compare check
  already proves the two transcript sources (file `transcript.json` vs PG `state.transcript`) match, the member view
  inherits parity for free. Unit-tested via the pure exported `toMemberView` — no DB needed for the $0 proof.
- **2026-07-12** — **focus-freshness TRACK CLOSED (both phases ✅), ~$0.50 total.** P2 proved the half P1's walk couldn't:
  re-raising a covered topic in the note ("workload still heavy") brought `workload` back as `source: signal` — freshness
  never silences a real signal. Then Carl chose to run one golden gate case before closing: `biweekly-priya` PASS (1 ok /
  0 regressed / 0 error), no FOCUS_ARC_LEAK — the history block never leaks evaluative content into a relational arc.
  Folder → `docs/plans/done/focus-freshness/`. **Lesson:** a verification-only phase still needs ONE irreplaceable paid
  proof for model-behaviour claims (freshness vs signal is a prompt decision no unit test can make), but the regression
  question ("did I break the arc gate?") is answered by ONE targeted golden case, not the full 8-case sweep.
- **2026-07-12** — **focus-freshness P1 ✅ green-lit (Carl watched the live proof), ~$0.10: repeat 1:1 preps now suggest fresh
  topics.** The focus prompt carries the last 3 preps' suggested topics for the same manager+person (`focus-history.ts`, both
  stores; relational arcs never see competency history; `FOCUS_ARC_LEAK` untouched as backstop). Live proof on `ba3223d`:
  prep A suggested workload/priorities/blockers/team-connection → prep B listed them in its prompt and returned
  energy/manager-support/feedback, zero repeats. **Decisions:** unfinished preps count as history (Carl "A" — the agenda was
  suggested either way), and focus results persist at generation so abandoned preps still count. **Lessons:** (1) *verify the
  destination's DATABASE, not just the destination* — local `.env` DB ≠ live DB, which made a working feature look broken for
  an hour ("first session" was truthful on live's data); (2) a jsonb `->'key' is not null` check is true for a JSON `null`
  value — that misread ("Nikki has 4 finished runs") sent the first test walk chasing the wrong qualifier.
- **2026-07-11** — **forgot-password P1 ✅ green-lit (Carl "A"), $0: email-based password reset (backend).** One shared login
  means one reset flow covers managers, members AND admin. New `password_reset_tokens` table (`0014`) + a separate
  `PasswordResetRepo`/`createPasswordResetService` (kept apart from register/login's AuthRepo so its test fake stays
  untouched — same split as `AuthSessionRepo`). `POST /api/v1/auth/forgot-password` always returns a generic 200 (no
  account-enumeration, mirrors login) and only a real active account gets an emailed link; `/reset-password` validates a
  sha256-hashed, single-use, 1-hour token then sets the new bcrypt hash. Cloned the invitations flow throughout (token idiom,
  `requestBaseUrl`, branded email). **Lesson:** *look before you overwrite* — the plan assumed email wasn't wired, but `.env`
  already had a working verified sender; surfacing that (instead of overwriting) avoided clobbering a live config, and Carl
  chose the seroapp.com domain from there. Proven end-to-end on the real dev DB + a real branded email to Carl's inbox from
  notifications@seroapp.com. `npm run typecheck` clean, reset+notifications 27/27. Phase 2 (the UI) next.
- **2026-07-11** — **transactional-email P3 ✅ — TRACK CLOSED (Carl "a"), $0: Sero can send email.** The admin now gets
  a "new member joined" alert when an invite is accepted — `notifyAdminOfNewMember` fired fire-and-forget from
  `acceptInvite()`; the shared admin-alert body was folded into one `adminAccountAlert` helper (signup + member reuse
  it, registration output unchanged). Closes the 3-phase track: P1 admin signup alert · P2 invite link emailed to the
  invitee · P3 admin new-member alert. Provider = Resend (native fetch, free tier). **Design stance held throughout:**
  only human-triggered "plumbing" emails ship; engagement/nudge emails stay PARKED (they'd contaminate the
  unprompted-return validation metric). `npm test` 122/122, typecheck clean. Folder → done/. Live delivery is Carl's
  inbox confirmation once Resend is set up.
- **2026-07-11** — **transactional-email P2 ✅ green-lit (Carl "a"), $0: invited members get their join link by email.**
  The invite flow minted a one-time `/join` link and handed it back to the manager to copy-paste ("no email infra in
  the alpha"). Now `createInvite` also fire-and-forgets an email to the invitee — new `notifyInviteeOfInvite` composer
  (names inviter + org, clean fallback, escaped) + an absolute join URL built from `APP_BASE_URL` or the request
  origin. Reuses the already-tested `preview()` for the names; the link is still returned so the manager can resend;
  a failed email never blocks the invite. **Lesson:** an emailed link must be an ABSOLUTE URL — deriving base from the
  request origin (with an `APP_BASE_URL` override for the proxy) keeps it config-free local and correct on Render.
  `npm test` 122/122, typecheck clean. Phase 3 (admin "new member joined" alert) next.
- **2026-07-11** — **transactional-email P1 ✅ green-lit (Carl "a"), $0: Sero can send email.** New `email-client.ts`
  (Resend via native `fetch`, mirroring `ai-client.ts`'s timeout+retry; `sendEmail` throws, `sendEmailQuietly` is
  fire-and-forget) + a `notifications` service that emails the `SUPERADMIN_EMAILS` admin on every new signup. Wired
  as one non-awaited line in `auth.controller.ts` `register()` so a failed email can never break a signup. Provider
  chosen = Resend (free tier dwarfs validation volume, no SDK). **Lessons:** ① Render only hosts — it can't send
  email; a transactional provider is mandatory. ② Kept the engagement/nudge emails (reminders, digests) PARKED —
  they'd contaminate the unprompted-return validation metric; only human-triggered "plumbing" emails ship now.
  ③ Live-send is the real proof but lives in Carl's inbox — recorded honestly as his confirmation, not my check.
  `npm test` 120/120, typecheck clean. Phase 2 (invite emails) next.
- **2026-07-11** — **thread-follow P2 ✅ — TRACK CLOSED (~$0.70 paid): the engine finally follows a volunteered thread.**
  The relaxed drill-pressure bail was built 2 days earlier, but the first paid gate roll scored 0/8 — an honest
  miss that a free read of the saved turn logs turned into the real find: **the runtime thread-follow could never
  fire.** Its only stem ("…can you say more about what that means…") is the exact phrase `question-validator.ts`
  bans on substantive answers, and only substantive answers trigger a follow — mutually exclusive by construction,
  on every run since the validator landed in June. Fixed test-first: the stem now quotes the answer's own
  contiguous words and probes the cause (`You said "…" — what's behind that…`), with a new QUOTED_MIRROR validator
  backstop so fabricated quotes stay impossible; the vague-stem ban itself untouched. Re-roll:
  `plan_thread_follow` 0.125 → 0.43, PASS, zero new hard-fails/warnings. **Lessons:** ① a metric that refuses to
  move is data, not noise — the 0/8 was the doorway to the real bug, and masking it with a re-roll would have
  buried it. ② when a guard (validator) and a producer (stem builder) are owned by different fixes months apart,
  test the pair: a lock even *enshrined* the dead mint as intended ("skips on a long substantive answer"). ③ score
  a crashed paid run from its saved session before paying again — roll 1's diagnosis cost $0.
- **2026-07-11** — **universe-monitoring P3 ✅ (walk waived) — cost per run lands and the TRACK CLOSES (5 phases, $0).**
  A shared pure `costFromState()` puts real model spend on both stores' finished feeds; the Universe's run
  panel says "Cost to run · $0.38 (9 model calls)", people total their priced runs, and pre-tracking runs
  honestly show nothing. **Two lessons:** ① when the long-running dev API predates a feed change, spin up a
  FRESH API + web pair on new ports and prove the feed against real data (19/25 runs priced, 4 rated) instead
  of waiving verification along with the walk — the walk is Carl's, the proof is ours. ② the frontend's local
  `asRecord` returns null while the backend's returns {} — a red test caught the crash before it shipped;
  helper twins with different null behavior are worth a glance whenever code hops the boundary.
- **2026-07-11** — **validation-kit P5 ✅ — one vocabulary, phone-fit — and the TRACK CLOSES (all 6 phases).**
  Two audits fanned out in parallel (copy consistency + phone-width) mapped the whole customer journey before a
  single edit. Copy sweep to one set of words (1:1 · prep brief · briefing · notes): welcome "one-to-one"→"1:1",
  the login hero's hype ("your 1:1s are broken") → the calm Welcome voice, the briefing empty-state's engine
  jargon ("session/evaluation/run") → plain 1:1 with its two exclamation marks removed, UK spelling, and the
  input recap settled on "Your notes". Phone side was near-clean (the customer surface already had a 5-phase
  mobile pass) — only real fix was the session-menu buttons under the 40px tap floor. Glossary written to the
  plan folder as the standing reference. $0, 116/116. **Lessons:** ① a broad two-dimension sweep is a clean
  parallel-agent job — two read-only audits returned file:line findings, I applied the surgical fixes and kept
  the judgment calls (login rewrite) flagged. ② the preview pane renders at a fixed wide viewport, so a true
  ~380px media-query walk can't be machine-done here — verify copy/CSS via the served bundle + CSSOM and hand
  the real-phone read back honestly as the owner's scenario, don't fake it. ③ closing into a busy shared
  checkout: STATUS.md + this log carried a parallel session's uncommitted edits, so the phase commit stayed
  path-scoped to validation-kit's own files and left the shared trackers for their owner (safe-commit).
- **2026-07-11** — **universe-monitoring P2 ✅ (walk waived) — the map now shouts only about problems.**
  Health signals: a live session untouched 30+ minutes goes STILL and warn-red (motion means alive; color not
  motion, so reduced-motion safe) with a plain-words Health row; QA-flagged runs wear amber/red rings +
  "QA check · Blocked — 4 areas flagged"; the finished feed finally carries the member's star rating —
  bare number from BOTH stores, the manager's private note test-locked out of the feed. The build immediately
  caught real state: "12 live sessions (12 stalled)". **Two lessons:** ① the artifact check earned its keep
  again — Carl's rapid "a" was checked against the API process age (started 00:35, predating the build), so
  the close records a WAIVED walk and names the residual (Rating row appears after his next API restart)
  instead of pretending scenario 4 ran. ② the parity test's existing seed already wrote a 4★ rating, so
  adding `rating` to both stores' finished rows was covered by deep-equal for free — check what a parity
  seed already exercises before extending it.
- **2026-07-11** — **validation-kit P4 ✅ — first-run guidance where the manager actually lands.** The
  dependency check corrected the plan mid-flight: a zero-run manager boots straight to intake, never Home
  (`frontend/src/main.js:307-322`), so the guidance lives on intake, not on an empty Home a fresh account
  never sees. A pure copy module (`intake-firstrun.ts`, mirroring `welcome.ts`) keeps the orientation card +
  honest notes example unit-testable; intake gates them on `listRecentRuns(1)` being empty. **Lessons:**
  ① always land onboarding where the router actually sends the new user — the "obvious" Home empty state was
  the wrong host, caught only by reading the boot routing. ② the detached-mount verification trick hangs on
  `swapField`'s transitionend when the node is off-screen; mounting into an *attached, visible* container and
  polling the DOM (without awaiting mount's stalling tail) exercised both gate branches cleanly and stays $0.
- **2026-07-11** — **universe-monitoring P1b ✅ — the Universe learns to be quiet.** Carl's "it's very busy
  and I don't really get it" became a declutter + panel pass: session labels stopped piling in the middle
  (label collision-skip, hover/selection always win), cross-link lines appear only on hover/select/focus,
  reference kinds dimmed so people/sessions/pipeline carry the scene, pulses capped to the main flow, and
  the HUD now explains the picture before the controls. Every panel earns its click (core tallies, stage
  machinery + parked sessions, type usage counts, lexicon linked people) — all panel data computed in the
  tested pure model, never by the renderer walking the graph. $0, 115/115. **Two lessons:** ① "quieter"
  never meant hiding data — every line/label removed from the default view stays reachable by hover, focus,
  or search, which kept the honesty rule and the declutter compatible. ② canvas label collision is cheap if
  you collect label candidates during the draw loop and place them in one priority pass afterwards
  (hover > core > nearest), instead of fighting per-node z-order.
- **2026-07-10** — **validation-kit P3b ✅ — one Finish modal, typed inbox; and the night the dev DB ran dry.**
  Carl's real P3 walk immediately produced the right UX call: two stacked feedback asks became ONE skippable
  modal on Finish (stars + verdict; Done/Skip/Escape/backdrop all proceed — the exit can never be blocked), the
  inline cards left the page for logged-in users (guests keep theirs — they have no Finish), and the Feedback
  inbox types every card via a tiny tested `FEEDBACK_KINDS` map. **Three lessons:** ① localhost cookies span
  ports — the preview browser inherited Carl's login, which killed the anonymous-guest test path but enabled a
  BETTER one (clone a run owned by the cookie's user and walk the real logged-in flow; the person wall 404'ing
  a colleague's session was a correct fence seen live). ② mid-close the artifact check failed with "data
  transfer quota exceeded" — the local Neon free tier ran dry (every API boot SELECTs the whole sessions table;
  today's many verification restarts contributed). Carl upgraded the plan on the spot; his 3b walk overlapped
  the outage so his tap couldn't be row-verified — recorded as-is, the agent's pre-quota E2E proof stands.
  ③ two sessions finishing in the same files resolved cleanly by waiting for Carl's "that session is done"
  before wiring into them — the phase commit carries the finished redesign alongside, stated in the message.
- **2026-07-10** — **universe-monitoring P1 ✅ green-lit — the Universe map starts earning its keep.**
  Return-visit glow: person planets brighten on a 7-day half-life from their newest 1:1's `lastSeenAt`,
  fading (never vanishing) when a manager goes quiet — the Gate-1 "do they come back" signal on one screen;
  panel adds a plain-words "Last 1:1 · N days ago" line. Pure math in `universe.model.ts` (test-first,
  red→green), renderer injects `Date.now()` so `buildUniverse` stays deterministic. $0, 114/114.
  **Two lessons:** ① exploration before promising features caught that star ratings are dead code in the
  Universe (feed omits the column; model reads the wrong type) and that per-run safety-gate outcomes
  don't exist at all — Phase 2 was scoped to real recorded data (review verdict, rating, staleness)
  instead of a fictional "gate" signal. ② the embedded Browser pane runs `document.hidden=true` so
  rAF-driven canvas never draws (black canvas, screenshot timeouts) — shim rAF onto setTimeout and
  re-mount the stage via SPA navigation to verify; noted in memory for future canvas work.
- **2026-07-10** — **validation-kit P3 ✅ closed (walk waived) — every live briefing now asks its one question.**
  "Would you run this 1:1 differently now?" — Yes/No + optional line, saved on tap, guests included (the write
  route deliberately has no login wall, mirroring error reports), **upserted one-row-per-run** so re-taps and late
  comments can't pile up rows; migration 0013 added `run_id`/`verdict` to `feedback_notes` (one store, one inbox).
  Test-first (6 red→green), $0. **Two lessons:** ① the artifact check earned its keep *three times in one close* —
  Carl's rapid "A"s were each checked against reality (API process age + a DB row query), caught that no walk had
  happened, and the close honestly records a WAIVED walk instead of a fictional one. ② reaching a live briefing
  without a paid run is possible: clone a finished session ownerless in SQL (org_id column keeps its placeholder —
  NOT NULL; ownership truth lives in the state jsonb) and guest-resume it via localStorage — but mind that
  `state.mode === "scripted"` hides customer-only UI, and the API's in-memory session map loads at BOOT, so
  DB-inserted rows need a restart + fresh `lastSeenAt` to survive the TTL sweep. ⚠️ Residual: the inbox-render
  hunks ride uncommitted in `admin-feedback.ts`/`feedback-inbox.css` — a parallel session's live redesign owns
  those files (safe-commit); fold them into that session's commit or a quiet-tree follow-up.
- **2026-07-10** — **engine-hardening P3 ✅ green-lit — positive briefing-grounding checks (TRACK CLOSED).**
  New `runManagerBriefingGroundingChecks(briefing, ctx)` in golden-checks.ts: warn-level positive
  assertions (names the person / cites real data) to complement the file's banned-phrase gates —
  mirrors old-Sero's "names the person / cites real data" scoring. **Lesson (no false alarms):** the
  first draft of check 2 fired when *no* axis was `read_status: "read"` — which false-alarmed on the
  real `priya_performance_quality_jun02` golden fixture, whose axes predate the `read_status` field
  (all undefined). Tightened it to fire only when *every* axis is EXPLICITLY `not_read`, giving
  legacy/undefined shapes the benefit of the doubt; verified quiet against that fixture before
  closing. Kept warn-level (NOT wired into live `evaluate()` — promotion Parked). Test-first (4
  cases), suite 114/114, typecheck clean, **$0**. Whole 3-phase track closed in one sitting, $0 total.
- **2026-07-10** — **engine-hardening P2 ✅ green-lit — concurrency cap + circuit breaker on live AI calls.**
  New `ai-guard.ts`: a FIFO semaphore (capped by `AI_MAX_CONCURRENCY`, default 4) and a
  closed→open→half-open circuit breaker (injectable clock for tests). Wired into `callAI`'s live
  provider path only — cassette-replay returns before the guard, so offline evals stay deterministic
  and unthrottled. Test-first (4 cases), my 6 engine-hardening tests pass 5/5 loops, suite 113/113,
  **$0**. **Lesson (honesty):** mid-phase the project typecheck went red with 8 errors — all in a
  parallel session's unfinished `feedback.service.test.ts`, none mine. Verified by listing the
  error-file set (only that one file) before reporting; surfaced it to Carl and left it untouched
  rather than "fixing" foreign work or masking the red. Committed only my 3 files (path-scoped).
- **2026-07-10** — **engine-hardening P1 ✅ green-lit — per-call latency capture.** New side track, mined from
  Carl's review of the old-Sero `RUNNER.md`: the old build logged per-call latency; the current cost tracker
  didn't. Now every recorded AI call carries `ms` and the run summary sums `total_ms` (live OpenAI/Gemini fetches
  timed with `Date.now()`; cassette-replay stays `ms: 0` — honest, no network happened). Test-first (2 cases,
  red→green), `npm test` 112/112, typecheck clean, **$0 — offline only**. **Lesson:** the whole track is
  unit-testable, so the Darren-Method "baseline = `npm run gate`" step was swapped for the free `npm test` +
  typecheck baseline — the money rule (free first) overrides the skill's default paid baseline when the work
  never touches the API.
- **2026-07-10** — **validation-kit P2 ✅ green-lit — User management now answers "did they come back?" per manager.**
  The superadmin run reads project `createdAt` (run start; legacy rows fall back to lastSeenAt, and rows with no
  timestamps report null — never a fake 1970 date), and the service derives `firstRunAt` / `gapDays` (first two
  runs only — a third run can't shrink the gap) / `cameBack` (2nd prep ≤ 14 days) / `internal` (superadmin or
  @seroteams.com). Test-first (7 red→green), read-only, no schema change, $0, 111/111. **Two lessons:** ① the
  verify-the-green-light rule caught a real one — Carl's first "A" arrived while his API was still the 18:27
  process, i.e. a build that predated the phase; flagged it, he restarted (fresh 20:29 process verified) and
  re-walked before the close. ② the DESTINATION check was an independent direct-SQL recompute against Neon
  (not the app's own code path) — it matched the page exactly, which is what "verified" should mean.
- **2026-07-10** — **validation-kit P1 ✅ green-lit — /tasks is now a live per-phase checklist.** The heartbeat
  gained `listPhases()` (ordered `{label, status}` rows parsed from each plan.md's phase table — same one-glyph
  row rule the counter already used, so `countPhases` now derives from it) and the /tasks Docs cards render the
  ⬜/🔨/✅ list, moving column automatically when a phase flips. Test-first (4 tests red→green), $0, 109/109 +
  typecheck clean. Two working practices held up: ① the DESTINATION check — proof was editing plan.md on disk and
  watching the page follow on refresh, not reading the code path; ② Carl's one-word "done" was verified against an
  artifact before phase-close (the API on :3001 was a fresh process — so his walk ran the new build, not a stale
  one). One environment lesson: the API on 3001 belonged to another live session, so verification ran on its own
  pair (3081/3083) with `DEV_AUTOLOGIN` — never restart a port you don't own.
- **2026-07-10** — **plan-turn-slim P1+P2 ✅ green-lit — restored a broken prompt-cache discount, ~halving run cost — two lessons.** ① *The regression was invisible in our own trackers and OpenAI-side, not ours:* runs quietly doubled (~$0.15 → ~$0.38) from 2026-06-12 because OpenAI stopped caching large gpt-5.4 prompts; only a token-level read of 69 cost logs (plan-turn = 9 calls/run, ~90% of spend, cache-hit rate 74–88% → 0% overnight) plus a live probe surfaced it — the `grounding` schema field and `prompt_cache_key` were both tested and *ruled out* before blaming our code. ② *Pin the constraint before cutting to it:* a $0.10 bracket probe pinned the cache cliff at ~9,600 tokens (caches at 9,502, dead at 9,795), which relaxed the target from an unachievable 8,500 to 9,300 and turned a quality-risky rewrite into a safe one. Slimmed plan-turn.md 9,823→~5,900 System tokens + compacted messages.ts JSON (worst filled prompt 13,739 → **9,186**); every rule preserved (consolidated duplication + compressed only prose already backstopped by code gates, verified section-by-section). `npm test` 109/109, typecheck clean, placeholder set identical to HEAD. **The lesson:** when a metric drifts, read the raw numbers over the dashboards, and measure the wall before you decide how much to knock down. Phase 3 (one paid live run to prove caching + cost + quality) pending Carl's go.
- **2026-07-09** — **postgres-runtime-data P7 ✅ → TRACK CLOSED (files retired; Postgres is the only store in live) — two lessons.** ① *The plan's one-liner hid the real work:* "echo off in live" was already true; the actual leak was every-turn `persist()` + five log-writers firing unconditionally — found only by auditing every `writeFileSync` in the run path, not by trusting the phase file. ② *A shared checkout is an active hazard:* mid-phase, another session's merge dropped conflict markers into a file I'd just committed, and its "rescued" pool-hang fix turned out to be a STATUS note with no code behind it — the commit was recovered from a worktree branch (`c98d8324` → `9e92b14f`), conflict-resolved so both fixes coexist, and verified by test (109/109). Verify claimed fixes in code, never in trackers. P7 shipped live same-day (`25fb3926`); zero-files proven by a free offline live-config run. `scripts/backfill-runs.ts` imported the full Library history into Postgres — local Neon (102 sessions / 2,207 artifacts) and, on Carl's separate go, live Neon (70 / 1,248); the 4,912-question pool landed identically on both. Cross-environment ownership remapped by email (local ids don't exist on live); ownerless runs kept ownerless (guest pile); unmappable owned runs skipped honestly, never guessed. **The lesson:** at close I re-counted both DBs read-only rather than trusting the tracker's "imports done" line — the numbers matched/exceeded the plan (the extra rows are runs made since P2's dual-write), which is what let P6 close with confidence. ⚠️ The live *site* still needs the next `/release` to read the DB. Next: P7 retires the files (the rollback net).
- **2026-07-09** — **thread-follow P1 ✅ (pin the follow-up) — and the honest catch that shaped the phase split.**
  The 8–9 Jul night test scored thread-following 55–65/100 on every run: people volunteer a thread and the
  coverage engine / drill cap march the pre-planned queue over it. Root cause is gate *order* in
  `queue-manager.ts` (thread-follow prepends first, drill-cap can then eat it). P1 pins a slot-0 runtime
  thread-follow so drill-cap slices/advances around it (mirror of coverage's `insertAt` guard) — red→green
  unit lock, 105/105. **The lesson:** reading the code for the phase split surfaced that today thread-follow
  *bails* exactly when drill-cap *acts* (`consecutiveDrillCount >= 2` on both sides) — so the two never
  collide on current runs, and P1 changes no run's output. Rather than oversell a "before/after replay" that
  would show nothing, the phase was reframed honestly as load-bearing groundwork proven by test, with the
  run-level payoff (and the paid metric) deferred to P2. Surfacing the no-visible-change truth *before*
  sign-off beat discovering it after.
- **2026-07-09** — **postgres-runtime-data P3 (read cutover) ✅ — and the lesson that keeps paying: verify on
  the REAL wiring, not just tests.** 101/101 unit/parity tests were green, yet staging Carl's walk over real
  HTTP caught two bugs they missed: the dev side-door's non-uuid ids would have 500'd the Library (raw SQL on
  a uuid column throws where the file store matched nothing), and `upsertSession` never updated `org_id` on
  conflict — so a guest run claimed after login silently vanished from every org-fenced list. Pattern for all
  storage cutovers: double-fence (SQL narrows, the engine's own wall functions re-check each row) means a
  drifted column can hide but never leak; and a deep-equal parity test between old and new stores catches
  shape drift before a human does.
- **2026-07-08 (night)** — **Sero is HOSTED. render-deploy P1–P3 done; live at https://sero-obwq.onrender.com.**
  Render free plan (Frankfurt) via a `render.yaml` blueprint that auto-deploys on every push to `main`. Lessons
  worth keeping: (1) the pre-existing origin guard was **localhost-only** — it would have 403'd every browser
  save on the real host; a hosting task must audit any same-origin/CORS/cookie-`Secure` assumption baked in
  during localhost-only development, not just the build/start commands. (2) `npm ci` **drops devDependencies**
  under `NODE_ENV=production`, so a Vite build needs `--include=dev`. (3) The env-guard's live/local DB assertion
  turned the "paste the right DATABASE_URL" risk into a **fail-safe** (wrong DB = refuse to boot, not silent
  cross-env writes) — worth having before any hosting. (4) A production **dress-rehearsal boot** locally
  (real `NODE_ENV`+`PORT`+built SPA) caught the serving path before Render did. **P4 ✅ closed same night** —
  `/commit` (save local, never push) + `/release` (free checks → push main → poll Render API until live →
  plain-words report; fix only with Carl's yes) skills shipped. Lesson from the live `/release` walk: on a
  folder shared by many parallel sessions, "commit anything unsaved" must be **path-scoped to this session's
  own work** — a blanket save would sweep another session's half-done changes live. The skill honours that,
  and correctly reported "already live, nothing of yours to push" rather than shipping foreign work.
  **Track CLOSED (4/4).**
- **2026-07-08** — **pre-go-live track CLOSED (9/9).** PG9 (Tidy-up merge/rename + roll-ups) green-lit in
  Carl's blanket "go to everything waiting on me" — the same go that closed frontend-admin-split (P4,
  customer-only serving fence) and plan-turn-runner-gates (all 3 phases) in their own sessions. Lesson
  worth keeping: with many parallel sessions receiving one blanket go, each session must claim only its
  own track and check the others' live state before closing or spending — this session verified the
  siblings' closes independently (98/98, offline replay PASS) instead of redoing them, and handed the
  guest-run paid walk to its dedicated session to avoid a double OpenAI spend.
- **Active phase:** 009 — Ready to share (alpha). **Phase 1 ✅ signed off** (`e68c4c8c`) and **Phase 4 ✅**
  (QA pile cleared). **001–008 are `done`.** Now finishing the remaining **non-hosting** phases (3·5·6·7·8)
  in one ultra batch (2026-07-01) — nothing live, no paid runs. Hosting (Phase 2) parked.
- **Live tactical tracker:** [../../STATUS.md](../../../STATUS.md) is the current per-phase source of truth —
  trust it over the table below. This log is now append-only decisions + lessons, not a status source.
- **Status:** 007 (login screen) shipped and closed to `done/login-screen/`; auth-hardening and
  admin-access-guard also built and closed. 009 Phase 1 (safety floor / executes 008) is signed off — DB
  null-org audit done, anonymous session-start decided (kept open + walled for the alpha), escape hatch
  closed (`f0e5401d`). Human-expert security review waived/deferred for the small alpha.
- **Free checks:** `npm test` **52/52** green · `npm run typecheck` clean (offline, $0).
- **Last updated:** 2026-07-01

## Next up (this can change as we learn)
**Phase 009 — the ultra batch of non-hosting phases (3·5·6·7·8).** The live detail is in
[../../STATUS.md](../../../STATUS.md) and [../todo/009-ready-to-share/plan.md](../../archive/done/009-ready-to-share/plan.md).
Phases 1 and 4 are signed off; Phase 2 (hosting) is parked. Building the rest in dependency order, each
landing built + offline-verified + committed, awaiting Carl's QA walk. Hosting resumes on Carl's word.

## Phase status
| # | Phase | Status |
|---|---|---|
| 001 | Monorepo reorg | `done` |
| 002 | Conventions & skills | `done` |
| 003 | TypeScript conversion | `done` |
| 004 | Backend API v1 (RESTful, TDD) | `done` |
| 005 | Postgres foundation | `done` |
| 006 | Auth (org model, password, SSO-ready) | `done` |
| 007 | Frontend app | `done` |
| 008 | Security | `done` — executed + signed off inside 009 Phase 1 (`e68c4c8c`) |

Status flow: `not-started` → `planned` → `in-progress` → `awaiting-qa` → `done`.

## Decisions made (append-only)
- **2026-06-19** — Locked the shape decisions: AI engine lives in `backend/engine/`; existing UI →
  root `admin/` console; new root-level `frontend/` is the customer app; repos co-located with services;
  Postgres in scope for **organisations + users + sessions** (heavy per-run logs stay as files on disk, indexed by id).
- **2026-06-19** — Locked the standing engineering standards: **TypeScript + tight contracts**;
  **TDD red→green** as law (obra/superpowers skill); tests **mirror the system** (not flat); kebab-case
  file names with role suffix + shallow inheritance (interfaces over deep class trees); **RESTful,
  versioned `/api/v1/`** API; Postgres conventions (`uuid` keys, `snake_case` plural tables,
  `timestamptz`, `jsonb` not `text`, versioned migration files); **multi-tenant org model**
  (signup creates an org, basic roles, invites scaffolded for later); **SSO-ready** auth (identity
  decoupled from credentials); **security/PII + AI-key protection + required human-expert review**.
- **2026-06-19** — TypeScript conversion gets its **own phase (003)**, after conventions (002) and
  before the backend scaffold (004), so everything built afterward stands on typed code.
- **2026-06-24** — **Phase 002 borrow-vs-build → Option 1.** Borrow TDD (`obra/superpowers/
  test-driven-development`) + one general security skill (`getsentry/skills` → `security-review`);
  park Trail of Bits for Phase 008; build `backend-conventions` + `frontend-conventions` ourselves.
- **2026-06-28** — **Phase 005 migration tool = Drizzle** (chosen by Carl). Over Prisma because the schema
  is plain TypeScript (one language, no separate DSL), it's SQL-first, and it drops cleanly behind the
  Phase-004 repo seam (Prisma's generated client competes with hand-written repos). Comparison in
  [../todo/postgres-foundation/plan.md](../../archive/done/postgres-foundation/plan.md).

## Parked (good ideas — not now)
- Teammate invitations as a full feature (resend / sent-at / expires-at flows). DB + code are
  **scaffolded** for it in Phases 005–006; the feature itself is later.
- SSO (Google / Microsoft) sign-in. Structure is designed for it in Phase 006; the integration is later.

## Lessons learned (one line per phase — what surprised us, so it compounds)
- **001 Monorepo reorg** — a previous run-ahead left untracked duplicate file copies that polluted the
  baseline; clean the working tree *before* trusting a "tests green" baseline.
- **002 Conventions** — borrowing proven community skills (TDD, security-review) beat writing our own;
  only the project-specific rulebooks were worth hand-authoring.
- **003 TypeScript** — leaf-first, strict-from-the-start conversion kept every step green; the discipline
  that paid off was banning `any`/`@ts-ignore` escapes rather than papering over unclear shapes.
- **004 Backend API** — the real test of clean layering wasn't the routes, it was "can storage swap
  without touching the service" — writing each test before its code forced that seam to stay honest.
- **005 Postgres** — **the load-order bug:** the live server picked file-vs-Postgres at module load but
  loaded `.env` *after* imports, so it silently wrote to files despite `DATABASE_URL`. The round-trip test
  missed it because it bypassed the controller. Lesson: verify the *destination* (query the DB), don't
  infer persistence from routing logic; test the wiring path the live server actually takes.
- **006 Auth** — "done" can be half-true at the seam: the back-end front door works fully, but there's no
  login *screen* yet. Name what a phase does **not** cover at sign-off so the next phase's scope is clear.

## Activity log (newest first)
- **2026-07-09** — **guest-run → TRACK CLOSED (4/4). P4 (superadmin Guest runs screen) built test-first
  and signed off by DELEGATION** — Carl: "Sign this off if you can"; the agent's live verification stands
  in for the walk and the phase file records exactly what was and wasn't seen (walls proven at three
  layers; a populated list in DB mode wasn't seeable — empty until postgres P6 imports the old runs or a
  new guest finishes). **Lessons:** ① a rail row needs THREE registrations in app-nav (LINKS item, onNav
  dispatch, ACTIVE_BY_STAGE) — the missing onNav entry made the click a silent no-op; caught live, not by
  tests. ② A feature that lists historical data must be checked against the CURRENT storage mode — the
  spec (written pre-read-cutover) assumed the file walk; the DB-mode list is empty until the import phase,
  and saying so in the phase file beats a surprised owner. ③ Delegated sign-offs are fine when explicit —
  record the delegation verbatim and the residual risk in the same breath.
- **2026-07-08** — **guest-run Phase 3 (save-at-end + auto-claim) closed with the WALK WAIVED (Carl's "B").**
  Built test-first the same evening P2 was walked; free proofs strong (5 claim tests, save card rendered
  on a real ownerless briefing, scenario 1 walked live — a broken save can't strand a login). The paid
  end-to-end walk was attempted but derailed: the long-running dev API's **Postgres pool starved** (every
  DB-touching request hung; file endpoints fine) — restart fixed it, bug flagged to postgres-runtime-data.
  **Lessons:** ① verify the destination before believing "done" — two "walk done" messages tonight were
  contradicted by disk + DB (turn 0, no new account since Jul 5); with many parallel agent chats, a
  green light can belong to a different session's walk, so check the artifact, not the words. ② When
  killing a hung shared dev process, expect siblings to die with it — the web server shared a parent and
  went down too; re-verify every port after, not just the one you fixed. The waived risk (fresh run →
  save → register → Past 1:1s as one live flow) rides until a real guest saves a run; a half-spent guest
  run (bank generated, turn 0) is parked for a cheap future walk.
- **2026-07-08** — **frontend-admin-split → TRACK CLOSED (5/5 phases Carl-walked in one day, $0 total).**
  Phase 4 (serve + fence) green-lit on a one-command walk: the public deploy serves the customer app
  only (Carl's pick — the admin console never ships, no login wall to trust), enforced by an always-on
  test that rebuilds the bundle, greps it for internal-tool/key markers, and boots a REAL production
  server to check what `/` serves. **Lesson (cross-track):** two same-day tracks can each be correct
  and still combine into a broken deploy — render-deploy's blueprint built `admin/dist` while this
  track flipped prod serving to `frontend/dist`; only reading the other track's just-landed files
  before committing caught it. When two in-flight tracks touch the same seam (what prod builds/serves),
  re-read the other's output at every phase boundary, not just at track start. **Lesson (TDD shape):**
  "grep the dist for secrets" checks rot silently against a stale build — making the test build the
  bundle itself before grepping costs ~2s and removes the whole staleness class. Phase 2
  (Universe honest ring) green-lit after a staged live walk: the ring now derives from
  `TOPBAR_STAGES` (the app's real flow) instead of a private copy; a fake stage added to the flow
  was announced by Update both ways ("Pipeline step added/removed: Shadow review"). **Two lessons:**
  (a) the spec missed that a ring change = a code change = a page reload that wipes the in-memory
  diff baseline — "announce a change" features need their baseline persisted (localStorage snapshot,
  same trick as /guide's last-check); (b) diff wording that deliberately mutes a "fixed" kind
  (stages were excluded from the change summary) silently outlives the assumption that made it
  true — when a constant becomes derived, grep for where its constancy was baked in.
- **2026-07-08** — **frontend-admin-split Phase 3 (slim the admin app) green-lit.** F-005 finally dead:
  the persona bench is an admin-only module composed onto a shared benchless start core — the customer
  bundle greps zero bench/persona code. Five customer-shell files physically moved to `frontend/`;
  admin dropped /team + /join; `frontend/` got its own browser tsconfig. **Lesson (decision):** the
  phase file as written ("remove the prep flow from admin") would have broken the persona bench — the
  internal QA tools RIDE the customer flow. A one-question check with Carl ("do you QA on :3000?")
  reshaped the phase before any file moved. Scope text written days earlier deserves a dependency check
  against how the owner actually works, not just against the code. **Lesson (mechanical):** a moved
  co-located test silently drops out of the runner if the collection glob doesn't cover its new home —
  extend the glob in the same commit as the move. Also: mid-verification the long-running dev API wedged
  on DB-backed routes (`/auth/me` hung, `/health` fine) — a scratch API pair isolated it as environmental
  in minutes; suspect stale Neon connections in a process that survives many parallel-session workdays.
- **2026-07-08** — **frontend-admin-split Phase 2b (catch the customer app up) green-lit.** The four
  post-snapshot drifts (guest welcome door, /join links, guest reload resume, member only-runs view) are
  mirrored into the customer app; :3002 now matches :3000 on every customer surface. **Lesson:** a
  cross-imported "snapshot" app drifts silently the moment the source keeps moving — the customer app
  missed four product changes in three days and nothing failed loudly. Until a physical split (P3) ends
  the sharing, any track that touches a customer surface in admin must also check :3002. Corollary: when
  resuming a track built as a snapshot, diff *behaviour* against the source app, not just whether it builds.
- **2026-07-08** — **page-heartbeat Phase 3 (planner syncs from plan folders) green-lit after a staged
  live walk; only Phase 2 (Universe ring) left.** /tasks now fills itself from `docs/plans/doing/` on
  open and "Update from docs" reconciles the Docs cards (hand-added cards untouched — Carl's option A).
  The walk staged real repo changes step-by-step (flip a phase status → card pulses; move a throwaway
  plan folder to done/ → card fades; delete it → card removed), then cleaned every artifact up.
  **Lesson:** a "built, awaiting walk" card had quietly been *extended* by a later checkpoint commit
  (`1e9a42b4` removed the seed board and added sync-on-open) — on pickup, diff what's on disk against
  what the phase file claims before proposing the walk, and fold the extras into the same walk.
- **2026-07-08** — **guest-run Phase 2 (guest lane frontend) green-lit ("yeah looks good"); Phase 3 starts.**
  Walked 3 days after build — and the double-check before proposing the walk paid off: two tracks had
  landed on top of the lane in between (start-screen made `/` a second guest door; people-roster put a
  person picker in intake). Neither broke it — the rail leak seen in start-screen QA was already fixed
  (`093981e1`) and the picker free-text-falls-back for guests. **Lesson:** when a "built, awaiting walk"
  phase sits for days in a many-session repo, re-verify its QA scenarios against what landed since —
  the walk instructions may name doors/screens that have moved. Next: P3 save-at-end (the plan's only
  paid walk, ~$0.35–0.60, explicit go required).
- **2026-07-08** — **manager-ready → TRACK CLOSED (2/2 phases Carl-walked, $0 spend).** The paying
  customer's rail (P1) + the design polish (P2): Bricolage headings, 4px buttons, one date format,
  14px floor held. **Lesson:** the plan's *phase table* is machine-read (the /tasks board counts its
  ✅/🔨/⬜ rows), so a stale table isn't cosmetic — it made the board card read "0/2 phases done" on a
  track that was really 1 walked + 1 built. When prose and table disagree, fix the table first; and a
  3-day-old "not committed / hot file" warning deserves a re-check against git before repeating it —
  P2 had in fact been committed cleanly all along (`c6eca72f`).
- **2026-07-08** — **frontend-admin-split Phase 2 (stand up the customer app) green-lit.** The customer
  app on :3002 is approved: customer-only rail, `/universe`/`/tasks` bounce to Home, admin app untouched.
  **Lesson:** the "double check this still needs doing" ask paid off — not because the work was stale
  (it builds clean and shares screens live from `admin/src`), but because it surfaced a collision:
  render-deploy serves `admin/dist` at the *public* URL, so this split's Phases 3–4 quietly became the
  thing that makes the public URL customer-only. Re-derive a parked track's *why* against the newest
  tracks before resuming it, not just its code health. Also: a $0 agent pre-walk (drive the QA scenarios
  in the preview browser first) turned Carl's walk into a 2-minute confirm instead of a debugging session.
- **2026-07-08** — **hide-ai-words → TRACK CLOSED (2/2 phases Carl-walked, $0 spend).** Managers hide / restore
  the AI's role words on "Words of each role"; overlay sidecar records the choice, the AI's file is untouched,
  hidden words drop out of real 1:1s. **Lesson:** the phase sat "awaiting QA" for 3 days while its blocker note
  ("restart your dev server first") had silently gone stale — a five-minute re-verify (probe the running server:
  401 not 404) turned a stuck card into a same-day close. Re-check a track's *blockers* before assuming it's
  still blocked. Also: Phase 2's code had been swept into a checkpoint commit (`cf8cdabe`) by another session —
  the plan's "uncommitted" note was wrong; trust `git log -S`, not the plan's memory of git state.
- **2026-07-08** — **engine-improvements (back-catalogue read) green-lit — TRACK CLOSED, $0 spend.** Reading all
  169 runs' manager inputs produced a 5-item list that, after validating each against real recorded engine output,
  shrank to **one** real code fix: the smoke-test gate checked only 6 of the engine's 8 required prep keys, blind to
  the honesty fields `confidence`/`dontAssume` — so a brief could ship without its honesty guard, tests green. Fixed
  `c12ad562` (gate reads the engine's exported `PREP_REQUIRED_KEYS`, one source of truth). #2/#3 ("infer intent",
  "thin notes") were already handled in the live prep path — closed by evidence, no build. Double-checked before
  closing: fix wired, nothing uncommitted, `npm test` 96/96. **Lesson:** "improvement lists" from a data read are
  mostly already-solved or decision-gated — validate each item against actual output before treating it as build
  work; three items (#1 stonewall exit, B2 refuse-a-weak-brief, #4 paid coverage) are real forks needing a Carl
  decision or spend, not code, and stay parked in the plan. Folder → `docs/plans/done/engine-improvements/`.
- **2026-07-08** — **feedback-inbox green-lit — TRACK CLOSED, both phases.** Superadmin-only Feedback
  inbox screen (reads the `feedback_notes` Neon table, migration `0006`) + per-row permanent Delete.
  Was already built + committed since 2026-07-05/06; Carl signed both phases off together ("close it")
  without a live re-walk. Lesson: a built-but-uncommitted feature can sit behind files held for other
  parallel sessions — this one only became runnable from a clean checkout once those tracks committed
  `shared/api.js` + `app-nav.js`. Re-confirmed wiring intact after the `0006`→`0011` DB drift. Folder → `docs/plans/done/feedback-inbox/`.
- **2026-07-08** — **agent-native P5 (prompt↔gate coupling registry) green-lit — TRACK CLOSED, 5/5 phases
  in one day, $0.** `content/prompts/rule-registry.ts` names the 7 prompt rules that have a hardcoded gate
  twin; its test breaks `npm test` naming the pair when either side is edited alone (was: a confusing paid
  gate failure). Two lessons: **① only register couplings verified on BOTH sides** — the sweep found one
  prompt rule (briefing plain-language bans) with NO code gate at all; that's a finding to park, not a row
  to fake. **② an incomplete rename staying green is the test being RIGHT** — the first demo rename touched
  only the definition, the identifier legitimately still existed at use sites; verify the demo breaks
  reality before trusting red. Track total: tests 92→96, all offline; the audit's five structural gaps
  (wrong maps, paid-only verification, tribal judgment, dual-orchestrator drift, invisible couplings) all closed.
- **2026-07-08** — **agent-native P4 (orchestrator parity guard) green-lit.** The twice-wired pipeline
  (web SSE handlers + CLI stage drivers) now has its order declared once (`backend/engine/stage-sequence.ts`)
  and an offline test that names the exact drift when either side changes alone. Lesson: **assert what's
  actually true, not what's convenient** — the web handlers' source order is NOT execution order (the client
  drives it), so the test checks strict order only where order is real (CLI) and coverage where it isn't;
  an order assertion on the web file would have been a green lie. Also: the sequence constant is anchored
  to reality (each declared costLabel must appear in its engine file) so the registry itself can't go stale
  silently. `npm test` 95/95, $0.
- **2026-07-08** — **agent-native P3 (decision tables) green-lit.** The three judgments that ended every
  workstream on "ask Carl" — paid run?, flag/retry/refuse?, good enough? — are now written tables
  (`docs/reference/agent-decisions.md`), each pre-walked against a real past call so the table provably
  lands where Carl landed. Lesson: **capture judgment as decision tables WITH calibration rows** — a table
  that cites the historical case it reproduces can be re-checked forever; genuinely-Carl decisions (B2,
  stonewall policy) are marked as parked proposals rather than silently decided. Docs only, $0.
- **2026-07-08** — **agent-native P1 (offline cassette replay) green-lit — the flagship.** Every model call
  already routed through one function (`callAI`), so record/replay landed as one seam
  (`backend/engine/cassette.ts`): any saved run folder now replays the whole 5-stage pipeline offline
  (~5s, $0.00, no API key) and `repro-from-bundle` answers REPRODUCES: yes/no on a bug report. Two
  lessons: **① the recon beat the assumption** — the "needs one paid seed run (~$0.35)" plan step died
  when a 30-minute read showed every stage already logs its raw model string; check what's on disk
  before budgeting spend. **② replay must not mask** — the placeholder guard runs before the cassette
  short-circuit and replay calls are cost-logged honestly at $0, so offline mode can't hide prompt bugs
  or fake usage. TDD throughout; `npm test` 94/94.
- **2026-07-08** — **agent-native P2 (fix stale agent maps) green-lit.** The always-apply `.cursor` rule
  still described the pre-monorepo tree (`src/`, `cli.js`) a month after Phase 001 moved everything —
  any agent auto-loading it got a wrong map. Rewritten as a thin pointer that holds no point-in-time
  state; 18 stale `.js` comment refs fixed (one named the wrong file outright); new
  `docs/reference/engine-map.md` one-pager. Lesson: **an always-loaded doc that duplicates project
  state WILL rot — keep orientation files thin and point at the living trackers instead.** `npm test`
  92/92, typecheck clean, $0.
- **2026-07-01** — **009 Phase 1 signed off + ultra batch authorized.** Phase 1 (safety floor / execute
  008) was green-lit and committed (`e68c4c8c`); 008 is now `done`, not "in-progress". Phase 4 (clear the
  QA pile) also closed — all 9 built-but-un-QA'd features signed off. Carl then switched to **ultracode**
  and authorized finishing every remaining **non-hosting** phase in one batch (3 privacy/first-run, 5
  feedback/one-pager, 6 repo-tidy 3–4, 7 docs/README, 8 continuity). Hosting (Phase 2) **parked** — not
  hosting yet. Standing limits held: **nothing live, no paid runs**; built work is "built — awaiting QA",
  never self-certified. *Lesson recorded:* a batch build trades the Darren per-phase green-light for
  bisectable local commits + offline verification at each step; QA is deferred, not skipped.
- **2026-07-01** — **Tracker reconciliation (doc-only, $0).** A deep code audit of the in-flight plans
  found this log had drifted: it still read "007 next / not-started" and "008 not-started", while 001–007
  are all `done` (login screen shipped + closed) and 008's security floor is being executed inside 009
  Phase 1. Corrected "Where we are now", "Next up", and the phase-status table to reality, and re-affirmed
  STATUS.md as the live per-phase tracker (this file is append-only). Also verified while auditing (free):
  frontend-admin-split Phase 1 is genuinely built — `shared/api.js`+`sse.js` moved out of `admin/src`, all
  27 admin importers repointed to `shared/`, `npm run build` resolves every stage; `npm test` 52/52,
  typecheck clean.
- **2026-06-29** — **Full pre-007 audit + tracker reconciliation.** Confirmed phases 001–006 all done,
  signed off, and archived in `done/` (`npm test` 49/49, typecheck clean, offline). Found three of the
  project's five progress trackers had drifted stale (`SERO_BOARD.md` still said "005 active", this
  `PROGRESS.md` had 006 as `not-started`, the how-it-works changelog stopped at Jun 14) plus a wrong
  "nothing pushed / main ahead" claim (`main` is in sync with origin). Reconciled all three to
  006-done/007-next, corrected the push-state claim, and added the Lessons section below. Doc-only, $0.
- **2026-06-29** — **Phase 006 (Auth — the front door) → ✅ DONE & SIGNED OFF.** Built across 4 sub-phases:
  (1) `auth_sessions` table + bcryptjs ready (`2e43a42e`); (2) register & login, bcrypt hashing, raw
  password never stored — proven by test (`d1a6b8c6`); (3) session cookie on login + a guard that refuses
  logged-out access to protected pages, plus a `DEV_AUTOLOGIN` one-click side-door hard-sealed in prod
  (`c303f136`); (4) signup creates the org + first-user-owner, every query fenced to the caller's company —
  proven company A can't read company B (`0789c1e0`). Build-board badges marked done (`b812915f`).
  Live-proved against Postgres (login flow + two-company isolation). All free — no OpenAI run. **Phase 007
  (frontend app / login screen) is now next.** Note: 006 delivered the *back-end* front door only — there's
  still no login *screen* in the clickable app; that's 007.
  Phase 4 (boot-restore in `startSweep`, `backend/db/README.md`, boot-restore assertion in the round-trip
  test; 47/47). A pre-commit DB check caught a **load-order bug**: the sessions controller picks
  file-vs-Postgres at module load, but `server.ts` loaded `.env` in its body (after imports), so the live
  server silently fell back to **files despite `DATABASE_URL`** — Carl's first run (`2026_Jun28_22-21`)
  went to files (the earlier "it saved to the DB" claim was wrong, corrected). Fix
  `backend/api/env-boot.ts` (loads `.env` as the first import) committed with the close-out; verified — the
  live "DB Wiring Test" run is in Postgres. Closed out: PLAN → ✅, folder → `docs/archive/done/`, badge →
  Built, this log → done. Free (no OpenAI). **Parked:** (1) regression test for the live DB-wiring path
  (round-trip test missed the bug — bypasses the controller) — spun off as a task; (2) planner question
  drift (separate engine track) — review next. **Phase 006 (Auth) is now active.**
- **2026-06-28** — **Phase 005 · Phase 3 (connection pool + repo swap) → ✅ signed off, committed, pushed.**
  DB-run pick = **managed Neon Postgres** (Docker not installed). Carl created the DB + added `DATABASE_URL`
  to the gitignored `.env`; `db:migrate` built the 5 tables (+ `0001` adding `sessions.session_key`, since
  session ids are slugs not uuids). Swapped session storage file → Postgres behind the **same
  `SessionsRepo` interface** (`sessions.service.ts` untouched): lazy pool (`backend/db/client.ts`), async
  durable layer (`backend/db/sessions-store.ts`), `pgSessionsRepo` (write-through mirror — in-memory Map
  stays the sync hot store; create/persist mirror to PG fire-and-forget), controller switch
  (`DATABASE_URL` set → Postgres, else file). Round-trip test proves a session reads back **from the DB**
  (9/9); skips when no `DATABASE_URL` so `npm test` stays green offline. **47/47**, typecheck clean. All
  free — no OpenAI. Neon password rotated after it was pasted in chat. `UsersRepo` deferred to 006 (no
  consumer yet). **Phase 4 (boot-restore wiring + setup docs + restart walk) is next.**
- **2026-06-28** — **Phase 005 · Phase 2 (schema + first migration) → ✅ signed off, committed, pushed.**
  Carl walked the QA and approved. Built on Drizzle: `backend/db/schema.ts` (5 tables per the locked
  rules) + generated migration `0000_glorious_sunset_bain.sql`, `drizzle.config.ts`, `db:generate` /
  `db:migrate` scripts. `npm test` 46/46, typecheck clean. Then **opened Phase 3 (repo swap) and hit a
  blocker:** the round-trip proof needs a running Postgres and **Docker is not installed** on this machine.
  Put the DB-run choice to Carl (Docker Desktop / no-Docker in-process test DB / native or managed
  Postgres) before writing pool + repo code. Still $0 — no OpenAI run.
- **2026-06-28** — **Phase 005 tool locked = Drizzle; handover written.** Carl picked Drizzle; wrote
  [../todo/postgres-foundation/handover.md](../../archive/done/postgres-foundation/handover.md) for a fresh thread to
  continue the build (write phase-2/3/4 in Drizzle's shape, then Phase 2 — first migration). No code yet —
  handover only, so the next thread starts clean.
- **2026-06-28** — **Phase 004 (Backend API v1) → `done` & SIGNED OFF.** Carl owner-walked and approved
  ("approved!"). Close-out done: steps 3 & 4 → ✅ in
  [../todo/done/backend-api-v1/plan.md](../../archive/done/backend-api-v1/plan.md); build-plan badge
  (`admin/src/stages/tasks.js`) Phase 004 → ✅ Built (steps 3 & 4 `s:"done"`); folder moved to
  `docs/archive/done/backend-api-v1/`. **Phase 005 is now the active phase.** Approved on the **free**
  owner-walk — no paid gate run was triggered, so the **$3 budget is untouched**. The full backend is now
  controller → service → repo under `/api/v1/`, file-backed behind a swappable repo seam — exactly what
  Phase 005 swaps to Postgres.
- **2026-06-28** — **Phase 005 (Postgres foundation) → `planned` (build gated).** At Carl's request
  ("go for 005"), scaffolded the Darren working folder
  [../todo/postgres-foundation/plan.md](../../archive/done/postgres-foundation/plan.md) + `phase-1.md` (the
  tool-choice decision step). Phase 1 writes up the gating decision — **Drizzle (recommended) vs
  Prisma** — with a tailored comparison; phases 2–4 are outlined, detail to be written once the tool is
  locked (same rhythm as 004's D1–D5). **Flagged pace drift:** 005 rewrites 004's repo seam, so **no
  005 code lands until Carl approves Phase 004.** Planning was $0 — no paid run. Also corrected the
  stale Phase-004 status here (`not-started` → `awaiting-qa`; it's been built + committed since 06-28).
- **2026-06-24** — **Phase 003 (TypeScript conversion) → `planned`.** Re-verified Phase 002 (free
  checks: `npm test` 30/30, `typecheck` clean, offline replay green; 4 skills load, links resolve,
  `clamp` proof 3/3) — Carl gave a complete sign-off. Set up the Phase 003 plan folder
  [../todo/typescript-conversion/plan.md](../../archive/done/typescript-conversion/plan.md) with the JS surface
  (engine 63 / api 37 / cli 1 = 101 backend files; +69 scripts; +46 admin) and a scope survey
  (A backend-only *recommended* / B +tooling / C +admin) + strategy (leaf-first, strict, test-first).
  Awaiting Carl's scope pick before detailed step files + step 1.
- **2026-06-24** — **Phase 002 (Conventions & skills) → `done` & SIGNED OFF.** Carl walked the QA
  (CLAUDE.md §7 surfaces the right rulebook for backend vs frontend) and gave the go. Shipped: TDD +
  security-review skills installed, `backend-conventions` + `frontend-conventions` written, strict
  TypeScript rails + mirrored test layout, CLAUDE.md wired, and a test-first proof (`clamp`) in
  correctly-named files. Verified: 4 skills load, typecheck clean, 8/8 links resolve, `npm test` 30/30.
  Folder moved to `docs/archive/done/convention-skills/`. Phase 003 (TypeScript conversion) is next.
- **2026-06-24** — **Phase 002 step 5 — rules wired + proof landed (Phase → awaiting-qa).** `CLAUDE.md`
  §7 maps work → rulebook (backend/frontend/feature/security); all 4 links resolve. Test-first proof:
  `backend/shared/clamp.ts` + co-located `clamp.test.ts` (named per backend rulebook), red→green, 3/3.
  Finished TS tooling (`@types/node`, `types:["node"]`, `allowImportingTsExtensions`); `npm run
  typecheck` clean repo-wide. Guide links 8/8 resolve; `npm test` 30/30. Step 4 committed `5874347c`.
- **2026-06-24** — **Phase 002 step 4 — TS safety rails laid (awaiting Carl's QA).** Added strict
  `tsconfig.json` (`noEmit`, `allowJs:false` — existing JS untouched; conversion is Phase 003),
  `typecheck` script + `typescript@^6` dev-dep, and the mirrored `tests/` skeleton
  (`README` + `integration/` + `e2e/`). Strict proven on a throwaway file (caught implicit-any +
  null-assign; passed clean code). Repo `typecheck` says "no inputs" until step 5's first `.ts`.
  Lint exit 0 (6 pre-existing warnings); `npm test` 30/30. 1 pre-existing npm advisory left for Carl.
  Step 3 committed `6d2694f`.
- **2026-06-24** — **Phase 002 step 3 — two rulebooks written (awaiting Carl's QA).** Hand-authored
  `backend-conventions` + `frontend-conventions` skills in `.claude/skills/` from the locked
  conventions (no new rules invented). Both load (`npx skills ls` lists them; both surfaced
  in-session). Step 2 committed `913cca2` after Carl's go.
- **2026-06-24** — **Phase 002 step 2 — skills installed (awaiting Carl's QA).** Installed into
  `.claude/skills/`: `test-driven-development` (obra/superpowers, MIT) and `security-review`
  (getsentry, CC BY-SA 4.0 / OWASP). Read both SKILL.md + confirmed licences first. Both in
  `skills-lock.json`; `npx skills ls` lists both; TDD skill surfaced as available in-session. Removed
  installer spillover (`.kiro/`, `.agents/`). `npm test` 30/30. Not committed until Carl's QA.
- **2026-06-24** — **Phase 002 broken into 5 steps; step 1 (borrow-vs-build survey) written.**
  Researched skills.sh / GitHub. Recommendation written into
  [../todo/done/convention-skills/plan.md](../../archive/done/convention-skills/plan.md): borrow **TDD**
  (`obra/superpowers/test-driven-development`) + one general **security** skill
  (`getsentry/skills` → `security-review`), park **Trail of Bits** for Phase 008, and **build**
  our two rulebooks (`backend-conventions` + `frontend-conventions`). Nothing installed — awaiting
  Carl's pick (Option 1/2/3). Baseline before work: `npm test` 30/30 (free/offline).
- **2026-06-24** — **Phase 001 (Monorepo reorg) → `done`.** Files moved into five rooms
  (`backend` `admin` `frontend` `content` `docs`) + address book `backend/engine/paths.js`
  (25 engine files read locations from it). Verified: `npm test` 30/30 (= pre-move baseline),
  offline replay clean, tree + paths correct, no stale root references. Owner walked the app +
  CLI and signed off. Removed an empty leftover root `lexicons/` folder (untracked debris; the
  real one is `content/lexicons/`). Plan folder moved to `docs/archive/done/monorepo-reorg/`.
- **2026-06-19** — Reworked the plan to 8 phases: added **003 TypeScript conversion** and **008 Security**,
  renumbered backend/DB/auth/frontend accordingly, and folded in the new standards (TypeScript, TDD,
  RESTful `/api/v1/`, DB conventions + migrations, org/multi-tenant model, SSO-ready auth). Updated
  OVERVIEW and every phase overview.
- **2026-06-19** — Set up `docs/prototype-to-production/`: `OVERVIEW.md` (orchestrator + map) and a
  `00-phase-overview.md` for each phase, and initialised this `PROGRESS.md`.
