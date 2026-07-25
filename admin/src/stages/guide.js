// Operator guide (internal-only — the Guide row in the rail's util strip; reachable
// both locally and on live, unlike the rest of the workshop).
// A single read-only reference for the whole project: how to run it, what each
// pipeline stage and screen does, the QA tooling, the core concepts, where things
// live on disk, and the known gaps. The Screens and Commands sections render LIVE
// from the heartbeat endpoint (the server re-reads the repo per request); the
// UPDATE button refreshes them and reports what changed since the last snapshot.
// Modeled on library.js: build innerHTML, Back + Esc -> Home, clean up on unmount.

import "../styles/guide.css";
import { STAGES, setState } from "../state.ts";
import { getArcs, getVersion, getMeetingTypes, getHeartbeat } from "../../../shared/api.js";
import { icon } from "../ui/icon.js";
import { RefreshCw } from "lucide";

let keyHandler = null;

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const TOC = [
  ["run", "Run it"],
  ["pipeline", "The pipeline"],
  ["screens", "The screens"],
  ["api", "API"],
  ["qa", "Testing & QA"],
  ["concepts", "Concepts"],
  ["arcs", "Meeting arcs (live)"],
  ["files", "Where things live"],
  ["gaps", "Known gaps"],
];

// The command LIST is read live from package.json via the heartbeat — a script
// added or removed shows up on the next UPDATE. Only these notes are hand-written;
// a script with no note renders as "New — not described yet."
const COMMAND_NOTES = {
  dev: "Everything for testing, three processes: API on :3001, admin console on :3000/admin/, customer app on :3002.",
  "dev:customer": "The customer app's Vite server on its own (:3002), without the API or the console.",
  up: "One-command dev launcher (scripts/dev.ps1).",
  build: "Production build of the admin console (Vite) → admin/dist/.",
  "build:customer": "Production build of the customer app → frontend/dist/.",
  "build:all": "Both builds, console then customer. What the live deploy runs.",
  start: "Serve the production builds from one Node process.",
  cli: "Run the engine from the terminal.",
  test: "Unit + engine tests (scripts/run-tests.js). Free.",
  typecheck: "TypeScript, no emit.",
  "typecheck:admin": "TypeScript for the admin console, no emit.",
  "typecheck:customer": "TypeScript for the customer app, no emit.",
  lint: "ESLint over the repo.",
  "lint:tokens": "Design-token guard. Fails on hardcoded colours, spacing and radii.",
  "lint:copy": "Copy guard. Fails on em dashes and other banned punctuation in user-facing text.",
  prose: "Golden-prose snapshot. Catches briefing wording drifting from the approved sample.",
  smoke: "Scenario smoke tests.",
  eval: "Offline engine checks. Prompt rules + replay.",
  gate: "Full quality gate (needs API key).",
  replay: "Replay-regression check against saved runs.",
  sweep: "Full 5-type sweep (needs API key) → logs/sweeps/.",
  "db:generate": "Author Drizzle migrations.",
  "db:migrate": "Apply Drizzle migrations.",
  "rebuild-question-index": "Regenerate content/questions/_index.json (--prune).",
  "build-map": "Regenerate the repo map at docs/reference/repo-map.md.",
  "logs:purge": "Purge old run logs.",
  "errors:purge": "Purge old rows from the error log table.",
  "autostart:install": "Install the Windows start-with-PC task.",
  "autostart:uninstall": "Remove the Windows start-with-PC task.",
};

const ENV = [
  ["OPENAI_API_KEY", "Required for every OpenAI stage."],
  ["GEMINI_API_KEY", "Used instead when a stage is pointed at a Gemini model."],
  ["OPENAI_MODEL", "Default model for all stages."],
  ["OPENAI_MODEL_<STAGE>", "Per-stage override: FOCUS_POINTS, PREPARATION, BANK, PLANNER, EVALUATION, JUDGE, FIXER, ROLE_PROFILE."],
  ["DATABASE_URL", "Postgres connection. Accounts, auth sessions, runs. Falls back to on-disk JSON if unset."],
  ["APP_BASE_URL", "The site's own address. Used to build email links and the Google sign-in redirect, so it must be the domain people sign in on (sero.team)."],
  ["GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET", "Continue with Google. Server-side OAuth, no Google JavaScript on the page."],
  ["EMAIL_API_KEY / EMAIL_FROM", "Resend. Invites, password resets, signup alerts."],
  ["SUPERADMIN_EMAILS", "Allowlist for the cross-company superadmin views."],
  ["APP_ENV / SERO_ENV", "Which environment the app thinks it is. Live hides the engine workshop and blocks paid test runs."],
  ["GUEST_RUNS_PER_DAY", "Shared daily budget for visitors with no account."],
  ["SERO_RUN_USD_CAP", "Hard spend ceiling for a single run."],
  ["AI_MAX_CONCURRENCY", "How many model calls may be in flight at once."],
  ["ERROR_LOG_RETENTION_DAYS", "How long error-log rows are kept before errors:purge drops them."],
  ["DEV_AUTOLOGIN", "Dev-only convenience login."],
  ["API_PORT", "API port. 3001 in dev."],
  ["PORT", "Fallback API port if API_PORT is unset (3000 in prod)."],
  ["NODE_ENV", "production makes npm start serve both built apps from one Node process."],
  ["SESSION_TTL_MS", "In-memory run-session expiry (default 2 hours)."],
  ["NO_COLOR", "Turns off colour in CLI output."],
];

const PIPELINE = [
  ["0", "Role profile", "Derives (and caches) what this job title and seniority actually involves, so later stages don't re-work it out every run.", "backend/engine/role-profile.ts · content/prompts/generate-role-profile.md"],
  ["1", "Focus points", "Picks 2–5 topics worth raising.", "backend/engine/generate.ts · content/prompts/generate-focus-points.md"],
  ["2", "Preparation", "Pre-meeting brief: core issue, opening question, what to listen for, what to avoid, a good outcome, a suggested action.", "backend/engine/preparation.ts · content/prompts/preparation.md"],
  ["3", "Question bank", "8–12 tailored questions laid out along the meeting arc.", "backend/engine/question-generator.ts · content/prompts/generate-questions.md"],
  ["4", "Live planning + scoring", "Scores each answer on the four axes and re-plans the remaining questions every turn.", "backend/engine/queue-manager.ts · content/prompts/plan-turn.md"],
  ["5", "Final evaluation", "The briefing: headline, patterns, axes, the honest reads, next actions.", "backend/engine/reviewer.ts · content/prompts/final-evaluation.md"],
  ["6", "Lexicon review (optional)", "Suggests wording to fold into the lexicon for future questions.", "backend/engine/lexicon-reviewer.ts · content/prompts/review-session-for-lexicon.md"],
];

// The guided Monthly Check-in is a separate, manager-walked meeting: no interview
// pipeline, one AI call at the end. Listed apart so it isn't read as a 7th stage.
const GUIDED = [
  ["Monthly Check-in", "The manager walks six blocks with the person in front of them. Promises, requests and goals are tracked per person, and each block gets a rating that carries forward as the last-time marker."],
  ["Wrap-up draft", "The one model call in that meeting. Drafts the shared summary plus private suggestions for the manager. Cached unless you ask for a regenerate. content/prompts/guided-wrapup.md."],
];

// The screen LIST + each description are read live from the heartbeat — the list
// is the real files in admin/src/stages/, the description is each file's own
// header comment. Only the grouping is curated here; a file the map doesn't know
// lands in "New screens — not yet grouped" so additions are impossible to miss.
const SCREEN_GROUPS = {
  "intake.js": "flow", "intake-wizard.ts": "flow", "intake-firstrun.ts": "flow",
  "focus-points.js": "flow", "focus-points-card.ts": "flow",
  "bank.js": "flow", "questioning.js": "flow", "questioning-actions.ts": "flow",
  "eval.js": "flow", "briefing.js": "flow", "run-debrief.js": "flow",
  "finish-destination.ts": "flow", "lexicon-review.js": "flow",
  "start.js": "home", "start-core.js": "home", "start-rows.ts": "home",
  "start-welcome.ts": "home", "runs.ts": "home", "run-detail.ts": "home",
  "login.js": "auth", "register.js": "auth",
  "forgot-password.js": "auth", "reset-password.js": "auth",
  "library.js": "admin", "compare.js": "admin", "review-run.js": "admin",
  "personas.js": "admin", "meeting-arcs.js": "admin", "job-lexicons.js": "admin",
  "test.js": "admin", "design.js": "admin", "guide.js": "admin",
  "admin-pulse.ts": "admin", "admin-gate1.ts": "admin", "admin-runs.ts": "admin",
  "admin-ratings.ts": "admin", "admin-guest-runs.ts": "admin",
  "admin-feedback.ts": "admin", "admin-error-log.ts": "admin",
  "admin-registered.ts": "admin", "admin-user-detail.ts": "admin",
  "about.js": "shared", "feedback.js": "shared", "privacy.js": "shared", "error.ts": "shared",
};

const SCREEN_GROUP_ORDER = [
  ["new", "New screens. Not yet grouped"],
  ["flow", "The run flow"],
  ["home", "Home & past 1:1s"],
  ["auth", "Signing in"],
  ["admin", "Admin tooling"],
  ["shared", "Shared & utility"],
];

const NAV = [
  ["Left rail", "Brand mark + icon strip down the left edge. Pinned open by default; collapse it and the browser remembers. Below 768px it becomes a drawer behind a header strip."],
  ["Internal rail", "Grouped by job. Work: Pulse · Start 1:1 · New session · Library. Engine: Coaching phrases · Role words · Meeting arcs. Build: Test engine · Tests · Screens · Design system. Operate: User management · Guest runs · Feedback inbox · Error log. Guide sits below in the util strip."],
  ["Manager rail", "Home · Start 1:1 · Team · Past 1:1s, then What is Sero? · Send feedback · Log out."],
  ["Member rail", "Your 1:1s only. A member can read their own past 1:1s and nothing else."],
  ["Live vs local", "The Engine and Build groups are local-only. On the live site the rail is the console alone, and the same list bounces the deep links."],
  ["Avatar menu", "Top right. Managers and members get Privacy + Account (their Log out stays in the rail); internal gets Account + Log out."],
  ["Session topbar", "Breadcrumb to review past stages mid-run."],
  ["Notes panel", "Your own notes, kept per stage, on the right."],
];

const API = [
  ["Auth", "POST /api/v1/auth/register · /login · /logout · /forgot-password · /reset-password · /change-password · /update-profile · /update-company · GET /auth/me · /auth/company. Cookie session (sero_session), passwords bcrypt-hashed."],
  ["Google sign-in", "GET /api/v1/auth/google/start · /google/callback. Server-side OAuth with PKCE, no Google script on the page."],
  ["Session & flow", "POST /api/v1/sessions · /:id/claim · GET /api/v1/sessions/:id · /:id/question · /:id/suggest-answers · /:id/role-profile · /:id/preview · /:id/rules · POST /:id/answer · /:id/back · /:id/notes · /:id/agenda/cover · /:id/wrap-up · /:id/verdict."],
  ["Promises", "POST /api/v1/sessions/:id/promises · GET /:id/prior-promises · POST /:id/promise-outcomes. The agreed next actions written at wrap-up and picked back up next time."],
  ["Streaming (SSE)", "GET /api/v1/sessions/:id/{focus-points,preparation,bank,plan,evaluation}/stream · POST /:id/focus-points/select."],
  ["Runs & review", "GET /api/v1/runs/{recent,finished,clonable} · /:id/{full,stages,overview} · POST /:id/review · /:id/archive · /runs/clone · DELETE /:id."],
  ["A member's own runs", "GET /api/v1/runs/mine · /runs/mine/:id · /runs/about-me · POST /runs/mine/:id/rating."],
  ["Team & people", "GET/POST /api/v1/team/people · PATCH/DELETE /team/people/:id · POST /:id/link · /:id/unlink · /:id/invite · GET /team/linkable-users."],
  ["Org members & invites", "GET /api/v1/members · POST /members/invite · PATCH /members/:id/role · POST /members/:id/{deactivate,reactivate} · invitation revoke/resend · GET /api/v1/invites/:token · POST /invites/:token/accept (public: the invitee has no account yet)."],
  ["Monthly Check-in", "POST/GET /api/v1/guided-sessions · GET/PATCH /:id · POST /:id/complete · /:id/wrapup-draft (the one AI call) · GET /people/:id/block-scores."],
  ["Trackers", "GET/POST /api/v1/people/:id/tracker-items · PATCH /tracker-items/:id · the member's own lane: GET /me/tracker-items · POST /me/requests · PATCH /me/goals/:id."],
  ["Lexicon", "GET /api/v1/sessions/:id/lexicon/{candidates,scope} · POST /:id/lexicon/decisions · GET /api/v1/lexicon/promotions/pending · POST /api/v1/lexicon/promotions."],
  ["Internal tooling", "GET /api/v1/arcs · /role-lexicons · /regression/run · /heartbeat · /library · POST /suggest-fix · /persona-runs (blocked on live: it spends money)."],
  ["Superadmin", "GET /api/v1/admin/{registered,pulse,runs,guest-runs,errors,feedback} · /admin/users/:id/runs · role, deactivate, reactivate and delete mutations. SUPERADMIN_EMAILS-gated and audited."],
  ["Meta & health", "GET /api/version · /api/v1/health · /health/deep · /meeting-types · /personas · POST /api/v1/feedback · /feedback/verdict · /errors."],
];

const QA = [
  ["Free checks first", "npm test · typecheck · lint · lint:copy · lint:tokens · replay · prose · eval. None of them cost anything. gate, smoke, sweep and persona runs all spend OpenAI money."],
  ["Test engine", "The persona hub. Browse the demo people Sero practises on and run one end to end on scripted answers, then land on the review screen. Off on the live site: it spends money and would write test runs into the live database."],
  ["Demo / scripted runs", "Home → pick a persona → Start demo session. Manual, or a scripted replay of fixed answers."],
  ["Verdicts", "Keep / Fix / Block on a finished briefing (scripted runs), with an issue type + note. Saved as ground truth."],
  ["Per-run review", "The review page scores 8 dimensions + an overall verdict, saved to review.json."],
  ["Regression", "Runs quietly in the background on load and puts an alert dot on the rail when a golden check fails. npm run gate / eval / replay do the same offline."],
  ["Library", "Filter all / unreviewed / keep / fix / block, search, open a review or copy the block."],
  ["Compare runs", "Same persona, different prompt versions, side by side."],
  ["Tests + Screens", "Two local-only benches: Tests is throwaway UI prototypes on mock data (nothing saved), Screens is the gallery of every real screen for design review."],
  ["suggest-fix", "Ask the model for a fix on a stage, given the run + your verdict."],
  ["QA prompt / Auto-QA", "Copy a ready-made review prompt, or drive the API per turn (not the browser) to replay a scripted persona plus your notes."],
];

const CONCEPTS = [
  ["Meeting types", "Bi-weekly check-in, Performance & feedback, Growth & career plan, Something feels off. Each with its own arc (stage sequence) and tone. Plus the guided Monthly Check-in runner. Onboarding check-in left the picker 2026-07-19 (old runs still resolve)."],
  ["The four axes", "Wellbeing, Engagement, Clarity, Growth. Range −10 to +10. Read by magnitude: ±0–1 weak, ±2–4 watch, ±5–7 real pattern (act), ±8–10 defining."],
  ["Question budget", "About 9 per run. ~4 opening (intro queue) + ~5 dynamic follow-ups. Caps stop over-drilling: drill cap, max 2 wellbeing clarifiers in a row, 1 tangent, and shallow-answer gating that zeroes positive deltas on ≤2-word answers."],
  ["Accounts & roles", "admin / manager / member. Manager = the end user who runs 1:1s; member = the managed; admin = internal (Carl). Accounts live in Postgres, gated per company. Sign in with email + password or Continue with Google."],
  ["Two apps, one server", "The customer app (frontend/) is what people sign into at the root; the internal console (admin/) ships under /admin and only an internal admin can load it. Many screens are shared, so check the real URL before assuming which app you're looking at."],
  ["Guests", "A visitor with no account can take a full 1:1 and see the briefing. A shared daily budget caps them; signing up afterwards claims the run."],
  ["Team roster & join links", "A manager keeps a roster of their people. A one-time join link turns a roster person into a real login, so their own 1:1s and goals show up in their app."],
  ["Promises", "The next actions agreed at wrap-up are written onto the run, then handed back at the start of the next 1:1 to check what actually happened."],
  ["Focus points & notes", "Focus points steer the question bank; the notes panel captures your own thoughts per stage."],
  ["Role profiles", "Cached per title + seniority context (backend/engine/role-profile.ts) so the pipeline doesn't re-derive the role each run."],
];

const FILES = [
  ["backend/engine/", "The pipeline + scoring: generate, preparation, question-generator, queue-manager, reviewer, role-profile, lexicon, plus the shared ai-client and models."],
  ["backend/api/", "The HTTP server (server.ts) + one service folder per domain (services/<domain>/) and middleware/ (auth, guards, v1 routing)."],
  ["backend/db/", "Postgres via Drizzle. schema.ts (organizations, users, people, sessions, runArtifacts, invitations, authSessions, guidedSessions, trackerItems, feedbackNotes, errorLogs and the rest) + migrations/."],
  ["admin/src/", "The internal console. stages/ (screens), ui/, styles/, state.ts, router.js. Built to admin/dist/ and served under /admin."],
  ["frontend/src/", "The customer app: its own router + boot, the member and team screens, and cross-imports of the shared stages. Built to frontend/dist/ and served at the root."],
  ["shared/", "Code both apps use, api.js above all: every fetch the client makes goes through it."],
  ["content/", "All the tunable data: prompts/, questions/, lexicons/, config/models.json, axes.json, focus-points.json, scenarios/, data/."],
  ["logs/<month>/<run-id>/", "One folder per run. Stage folders 00b-role-profile/, 01-focus-points/, 01b-preparation/, 04-dynamic-answers/, 05-evaluation/. Each with inputs.json, prompt.md, response.json."],
  ["…run root", "session-state.json, axis-state.json, transcript.json, pipeline-lock.json, and feedback.json once you leave a verdict."],
  ["content/config/models.json", "Which model each stage uses (persona-bench config sits alongside)."],
  ["content/data/openai-models.json", "Model pricing table for cost tracking."],
  ["scripts/", "One-off tooling: eval, gate, sweep, run-tests, lint-copy, lint-design-tokens, rebuild-question-index, dev.ps1."],
  ["docs/", "Plans (docs/plans/doing/), reference notes, reports. Trackers sit at the root: STATUS.md is tactical, SERO_BOARD.md strategic, DESIGN.md is the design law."],
  ["evals/ · audits/ · testing/", "The golden dataset, replay fixtures and prose snapshots; the written repo audits; the tester pack and QA results."],
];

const GAPS = [
  "Quality gate is young. A golden dataset + scoreRun() gate exist (npm run gate, evals/golden, the background regression check), but coverage is thin; most prompt changes are still checked by hand.",
  "Model drifts on hard rules. E.g. the drill cap is stated many times but still gets ignored; caught only by eye.",
  "Shallow-answer counting is a heuristic. A refused answer can flip a run into \"partial read\" mode.",
  "Briefings can read the same across different people. Sameness, scoring skew and bank bloat are open findings from the July sweep of past runs.",
  "Cost numbers count any model missing from content/data/openai-models.json as unpriced. The call shows up in unknown_price_calls rather than in the money total, so a total can read low.",
  "The customer app and the console share screens. A change made for one can land in the other; check the real rendered URL, never the routing code, before calling something done.",
  "Live is one branch. Pushing main deploys, and parallel work can overwrite a deploy, so a release is only confirmed by the live build badge (/api/version), not by the host saying \"live\".",
];

function ref(code, desc) {
  return `<div class="guide-ref"><code>${esc(code)}</code><span>${esc(desc)}</span></div>`;
}

function labelRow(title, desc) {
  return `<div class="guide-ref guide-ref--text"><strong>${esc(title)}</strong><span>${esc(desc)}</span></div>`;
}

function step(n, title, body, files) {
  return `<div class="guide-step">
      <span class="guide-step__n">${esc(n)}</span>
      <div class="guide-step__body">
        <div class="guide-step__title">${esc(title)}</div>
        <p>${esc(body)}</p>
        <code class="guide-step__files">${esc(files)}</code>
      </div>
    </div>`;
}

function concept(title, body) {
  return `<div class="card l-stack l-stack--2"><h3 class="h3">${esc(title)}</h3><p class="text-ink-dim">${esc(body)}</p></div>`;
}

// ---------- live sections (heartbeat) ----------
// Screens + Commands render from GET /api/v1/heartbeat — the server re-reads the
// repo per request, so these sections can't silently drift from the code.

function commandsHtml(commands) {
  if (!Array.isArray(commands) || !commands.length) {
    return `<p class="text-ink-mute text-sm">Nothing loaded yet.</p>`;
  }
  return commands
    .map((name) => {
      const cmd = name === "test" ? "npm test" : name === "start" ? "npm start" : `npm run ${name}`;
      return ref(cmd, COMMAND_NOTES[name] || "New. Not described yet.");
    })
    .join("");
}

function screensHtml(screens) {
  if (!Array.isArray(screens) || !screens.length) {
    return `<p class="text-ink-mute text-sm">Nothing loaded yet.</p>`;
  }
  const buckets = new Map(SCREEN_GROUP_ORDER.map(([k]) => [k, []]));
  for (const s of screens) {
    buckets.get(SCREEN_GROUPS[s.file] || "new").push(s);
  }
  return SCREEN_GROUP_ORDER.filter(([k]) => buckets.get(k).length)
    .map(
      ([k, label]) => `<div class="eyebrow">${esc(label)}</div>
      <div class="card-flat">${buckets
        .get(k)
        .map((s) => ref(s.file, s.desc || "No header note in the file yet."))
        .join("")}</div>`
    )
    .join("");
}

const LIVE_ERR = `<p class="g-arc-note g-arc-note--err">Couldn't reach the API. Is it running?</p>`;

function fillLive(root, hb) {
  const screens = root.querySelector(".js-screens-host");
  const commands = root.querySelector(".js-commands-host");
  if (!hb) {
    if (screens) screens.innerHTML = LIVE_ERR;
    if (commands) commands.innerHTML = LIVE_ERR;
    return;
  }
  if (screens) screens.innerHTML = screensHtml(hb.screens);
  if (commands) commands.innerHTML = `<div class="card-flat">${commandsHtml(hb.commands)}</div>`;
}

async function loadLive(root) {
  try {
    fillLive(root, await getHeartbeat());
  } catch {
    fillLive(root, null);
  }
}

// ---------- live meeting arcs ----------
// The arcs can be edited anywhere in the system, so this section pulls them live
// instead of hand-listing them — auto-loaded on open and refreshed by the page-level
// "Check for changes" button (which also reports any that moved).

// Refresh glyph for the check pill.
const REFRESH_ICON = icon(RefreshCw, { size: 14 });

// Swap a pill's label without disturbing its icon; toggles a spinning-icon class.
function setBtnBusy(btn, busy, text) {
  const label = btn.querySelector(".js-btn-label");
  if (label && text != null) label.textContent = text;
  btn.classList.toggle("is-busy", busy);
  btn.disabled = busy;
}

// Compact "Jul 5, 12:31 PM" — shorter than a full locale string in the sticky bar.
function shortWhen(iso) {
  return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// Scoped styling for the arc rows + system notes lives in styles/guide.css (imported above).

function normalizeArc(a) {
  return {
    slug: a.slug,
    label: a.label,
    tone: a.tone_register || "",
    anti: Array.isArray(a.anti_patterns) ? a.anti_patterns : [],
    edited: Boolean(a.edited),
    phases: (Array.isArray(a.arc) ? a.arc : []).map((p) => ({
      id: p.id,
      label: p.label || "",
      intent: p.intent || "",
      target_questions: Number(p.target_questions) || 0,
    })),
  };
}

function arcRowHtml(a) {
  const chips = a.phases
    .map((p) => `<span class="g-arc-chip">${esc(p.id)}</span>`)
    .join(`<span class="g-arc-sep" aria-hidden="true">→</span>`);
  const q = a.phases.reduce((n, p) => n + (Number(p.target_questions) || 0), 0);
  return `<div class="g-arc">
      <div class="g-arc__head">
        <strong>${esc(a.label)}</strong>${a.edited ? ` <span class="g-arc-edited">edited</span>` : ""}
        <span class="g-arc__meta">${a.phases.length} ${a.phases.length === 1 ? "phase" : "phases"} · ${q} q</span>
      </div>
      <div class="g-arc__chips">${chips || '<span class="text-ink-mute text-sm">no phases</span>'}</div>
    </div>`;
}

async function loadArcs(root) {
  const host = root.querySelector(".js-arcs-host");
  if (!host) return;
  try {
    const res = await getArcs();
    const live = (Array.isArray(res?.arcs) ? res.arcs : []).map(normalizeArc);
    host.innerHTML = live.length
      ? live.map(arcRowHtml).join("")
      : `<p class="text-ink-mute text-sm">No meeting arcs found.</p>`;
  } catch {
    host.innerHTML = LIVE_ERR;
  }
}

// ---------- system check (page-level "Check for changes") ----------
// The guide is mostly hand-written, so it drifts. This checks the parts the API
// can report live — the running build (git SHA), the meeting types, and the
// meeting arcs — against the last snapshot (localStorage) and says what moved.

const SYS_SNAP_KEY = "seroGuideSystemSnapshot";

async function readSystem() {
  const [ver, mt, arcRes, hb] = await Promise.all([
    getVersion().catch(() => null),
    getMeetingTypes().catch(() => null),
    getArcs().catch(() => null),
    getHeartbeat().catch(() => null),
  ]);
  const arcs = (Array.isArray(arcRes?.arcs) ? arcRes.arcs : [])
    .map(normalizeArc)
    .map((a) => ({ slug: a.slug, label: a.label, seq: a.phases.map((p) => p.id).join(" → ") }));
  return {
    build: ver?.build || "unknown",
    types: (Array.isArray(mt?.types) ? mt.types : []).map((t) => t.label).filter(Boolean).sort(),
    arcs,
    // Heartbeat parts — null when the endpoint couldn't be read, so the diff
    // (and old snapshots without these fields) just skips them.
    hbOk: Boolean(hb),
    screens: Array.isArray(hb?.screens) ? hb.screens : null,
    commands: Array.isArray(hb?.commands) ? hb.commands : null,
    axes: Array.isArray(hb?.axes) ? hb.axes : null,
    questionCount: typeof hb?.questionCount === "number" ? hb.questionCount : null,
  };
}

function diffSystem(oldS, now) {
  const lines = [];
  if (oldS.build !== now.build) {
    lines.push(`Build <code>${esc(oldS.build)}</code> → <code>${esc(now.build)}</code>. The running server is on new code.`);
  }
  const typeAdd = now.types.filter((t) => !oldS.types.includes(t));
  const typeRem = oldS.types.filter((t) => !now.types.includes(t));
  if (typeAdd.length) lines.push(`Meeting types added: ${typeAdd.map(esc).join(", ")}`);
  if (typeRem.length) lines.push(`Meeting types removed: ${typeRem.map(esc).join(", ")}`);

  const oldBy = new Map(oldS.arcs.map((a) => [a.slug, a]));
  const nowBy = new Map(now.arcs.map((a) => [a.slug, a]));
  const arcAdd = now.arcs.filter((a) => !oldBy.has(a.slug)).map((a) => a.label);
  const arcRem = oldS.arcs.filter((a) => !nowBy.has(a.slug)).map((a) => a.label);
  const arcChg = [];
  for (const a of now.arcs) {
    const b = oldBy.get(a.slug);
    if (b && (a.label !== b.label || a.seq !== b.seq)) arcChg.push(a.label);
  }
  if (arcAdd.length) lines.push(`Meeting arcs added: ${arcAdd.map(esc).join(", ")}`);
  if (arcRem.length) lines.push(`Meeting arcs removed: ${arcRem.map(esc).join(", ")}`);
  if (arcChg.length) lines.push(`Meeting arcs changed: ${arcChg.map(esc).join(", ")}`);

  if (oldS.screens && now.screens) {
    const oldScr = new Map(oldS.screens.map((s) => [s.file, s.desc || ""]));
    const nowScr = new Map(now.screens.map((s) => [s.file, s.desc || ""]));
    const scrAdd = now.screens.filter((s) => !oldScr.has(s.file)).map((s) => s.file);
    const scrRem = oldS.screens.filter((s) => !nowScr.has(s.file)).map((s) => s.file);
    const scrChg = now.screens
      .filter((s) => oldScr.has(s.file) && oldScr.get(s.file) !== (s.desc || ""))
      .map((s) => s.file);
    if (scrAdd.length) lines.push(`Screens added: ${scrAdd.map(esc).join(", ")}`);
    if (scrRem.length) lines.push(`Screens removed: ${scrRem.map(esc).join(", ")}`);
    if (scrChg.length) lines.push(`Screen notes changed: ${scrChg.map(esc).join(", ")}`);
  }
  if (oldS.commands && now.commands) {
    const cmdAdd = now.commands.filter((n) => !oldS.commands.includes(n));
    const cmdRem = oldS.commands.filter((n) => !now.commands.includes(n));
    if (cmdAdd.length) lines.push(`Commands added: ${cmdAdd.map((n) => `<code>npm run ${esc(n)}</code>`).join(", ")}`);
    if (cmdRem.length) lines.push(`Commands removed: ${cmdRem.map((n) => `<code>npm run ${esc(n)}</code>`).join(", ")}`);
  }
  if (oldS.axes && now.axes) {
    const oldAx = new Map(oldS.axes.map((a) => [a.id, a.label]));
    const nowAx = new Map(now.axes.map((a) => [a.id, a.label]));
    const axAdd = now.axes.filter((a) => !oldAx.has(a.id)).map((a) => a.label);
    const axRem = oldS.axes.filter((a) => !nowAx.has(a.id)).map((a) => a.label);
    const axRen = now.axes
      .filter((a) => oldAx.has(a.id) && oldAx.get(a.id) !== a.label)
      .map((a) => `${esc(oldAx.get(a.id))} → ${esc(a.label)}`);
    if (axAdd.length) lines.push(`Axes added: ${axAdd.map(esc).join(", ")}`);
    if (axRem.length) lines.push(`Axes removed: ${axRem.map(esc).join(", ")}`);
    if (axRen.length) lines.push(`Axes renamed: ${axRen.join(", ")}`);
  }
  if (
    typeof oldS.questionCount === "number" &&
    typeof now.questionCount === "number" &&
    oldS.questionCount !== now.questionCount
  ) {
    lines.push(`Question library ${oldS.questionCount.toLocaleString()} → ${now.questionCount.toLocaleString()} questions`);
  }
  return lines;
}

function readSysSnap() {
  try {
    return JSON.parse(localStorage.getItem(SYS_SNAP_KEY) || "null");
  } catch {
    return null;
  }
}

function writeSysSnap(sys) {
  try {
    localStorage.setItem(SYS_SNAP_KEY, JSON.stringify({ at: new Date().toISOString(), sys }));
  } catch {
    /* storage full/blocked — the button still works, it just won't diff next time */
  }
}

function wireSystemCheck(root) {
  const btn = root.querySelector(".js-sys-update");
  const status = root.querySelector(".js-sys-status");
  const note = root.querySelector(".js-sys-note");
  if (!btn) return;

  const showStatus = (snap) => {
    status.textContent = snap?.at ? `Last checked ${shortWhen(snap.at)}` : "Not checked yet";
  };
  showStatus(readSysSnap());

  btn.addEventListener("click", async () => {
    setBtnBusy(btn, true, "Checking…");
    try {
      const now = await readSystem();
      // Redraw the live sections from the same read, so UPDATE = refresh + report.
      fillLive(root, now.hbOk ? now : null);
      void loadArcs(root);
      const prev = readSysSnap();
      if (!prev?.sys) {
        note.innerHTML = `<div class="sys-note sys-note--ok">First check. Saved a snapshot of the build, meeting types, arcs, screens, commands, axes and question count. The next check will show what moved. <span class="sys-note__meta">Build ${esc(now.build)}.</span></div>`;
      } else {
        const lines = diffSystem(prev.sys, now);
        note.innerHTML = lines.length
          ? `<div class="sys-note sys-note--change"><div class="sys-note__title">Changed since your last check</div><ul>${lines.map((l) => `<li>${l}</li>`).join("")}</ul></div>`
          : `<div class="sys-note sys-note--ok">No changes since your last check. <span class="sys-note__meta">Build ${esc(now.build)}.</span></div>`;
      }
      writeSysSnap(now);
      showStatus(readSysSnap());
    } catch (e) {
      note.innerHTML = `<div class="sys-note sys-note--err">Couldn't reach the API. Is it running? (${esc(e?.message || "error")})</div>`;
    } finally {
      setBtnBusy(btn, false, "Check for changes");
    }
  });
}

export function mount(root) {
  root.innerHTML = `
    <div class="stage-medium l-stack l-stack--8 guide">
      <header class="page-header">
        <div class="page-header__row">
          <h1 class="h1">Sero. Operator guide</h1>
        </div>
        <div class="page-header__lede">Your map of the whole project. How to run it, what each part does, and where things live. Internal, just for you.</div>
      </header>

      <div class="guide-toc">
        <nav class="guide-toc__links">
          ${TOC.map(([id, label]) => `<a href="#g-${id}">${esc(label)}</a>`).join("")}
        </nav>
        <div class="guide-toc__actions">
          <button class="btn btn--ghost btn--sm js-sys-update" type="button">${REFRESH_ICON}<span class="js-btn-label">Check for changes</span></button>
          <span class="guide-toc__status js-sys-status"></span>
        </div>
      </div>
      <div class="js-sys-note"></div>

      <section class="guide-section" id="g-run">
        <h2 class="h2">Run it</h2>
        <p class="text-ink-dim">The command list is read live from <code>package.json</code>. A new script shows up on its own; only the notes are hand-written.</p>
        <div class="js-commands-host"><div class="card-flat"><p class="text-ink-mute text-sm">Loading from the codebase…</p></div></div>
        <div class="eyebrow">Environment</div>
        <div class="card-flat">${ENV.map(([c, d]) => ref(c, d)).join("")}</div>
        <p class="text-ink-mute">Loaded from <code>.env</code> at the repo root. In dev the console is at <code>localhost:3000/admin/</code>, the customer app at <code>localhost:3002</code>, the API on 3001. Under the preview tools, keep the API on 3001 and run Vite-only on 3000.</p>
      </section>

      <section class="guide-section" id="g-pipeline">
        <h2 class="h2">The pipeline</h2>
        <p class="text-ink-dim">A run flows top to bottom. Each stage's model comes from <code>content/config/models.json</code> (keys: focus_points, preparation, bank, planner, evaluation, judge, fixer, role_profile, guided_wrapup), overridable per stage by env var.</p>
        <div class="card-flat">${PIPELINE.map(([n, t, b, f]) => step(n, t, b, f)).join("")}</div>
        <div class="eyebrow">The guided meeting (not the pipeline)</div>
        <div class="card-flat">${GUIDED.map(([t, d]) => labelRow(t, d)).join("")}</div>
      </section>

      <section class="guide-section" id="g-screens">
        <h2 class="h2">The screens</h2>
        <p class="text-ink-dim">Read live from <code>admin/src/stages/</code>. The list is the real files on disk and each description is the file's own header comment, so this section can't drift. A file added to the code lands under "New screens" until it's grouped. The customer app's own screens live in <code>frontend/src/stages/</code> and aren't in this list.</p>
        <div class="js-screens-host l-stack l-stack--4"><p class="text-ink-mute text-sm">Loading from the codebase…</p></div>
        <div class="eyebrow">Getting around</div>
        <div class="card-flat">${NAV.map(([t, d]) => labelRow(t, d)).join("")}</div>
      </section>

      <section class="guide-section" id="g-api">
        <h2 class="h2">API</h2>
        <p class="text-ink-dim">What the client calls. Routes in <code>backend/api/server.ts</code>, handlers under <code>backend/api/services/&lt;domain&gt;/</code>. Everything is on <code>/api/v1/</code> now (the old <code>/api/…</code> aliases are gone); <code>/api/version</code> is the one exception. Mutating routes carry an origin guard, and anything that can be brute-forced is rate-limited per IP.</p>
        <div class="card-flat">${API.map(([t, d]) => labelRow(t, d)).join("")}</div>
      </section>

      <section class="guide-section" id="g-qa">
        <h2 class="h2">Testing &amp; QA</h2>
        <div class="card-flat">${QA.map(([t, d]) => labelRow(t, d)).join("")}</div>
      </section>

      <section class="guide-section" id="g-concepts">
        <h2 class="h2">Concepts</h2>
        <div class="l-grid l-grid--pair">${CONCEPTS.map(([t, b]) => concept(t, b)).join("")}</div>
      </section>

      <section class="guide-section" id="g-arcs">
        <h2 class="h2">Meeting arcs (live)</h2>
        <p class="text-ink-dim">Pulled live from the system. Not hand-written, so it can't go stale. <strong>Check for changes</strong> (top) refreshes these and reports any that moved. Edit them on the <code>Meeting arcs</code> screen.</p>
        <div class="card-flat js-arcs-host"><p class="text-ink-mute text-sm">Loading from the codebase…</p></div>
      </section>

      <section class="guide-section" id="g-files">
        <h2 class="h2">Where things live</h2>
        <div class="card-flat">${FILES.map(([c, d]) => ref(c, d)).join("")}</div>
      </section>

      <section class="guide-section" id="g-gaps">
        <h2 class="h2">Known gaps</h2>
        <p class="text-ink-dim">What to keep an eye on.</p>
        <div class="card-flat"><ul class="guide-gaps">${GAPS.map((g) => `<li>${esc(g)}</li>`).join("")}</ul></div>
      </section>
    </div>
  `;

  wireSystemCheck(root);
  void loadLive(root); // fill Screens + Commands from the codebase on open
  void loadArcs(root); // fill the live meeting arcs on open

  // Guide is a top-level rail page — no per-screen Back (Breadcrumb Rule, P5);
  // Escape still hops home as a convenience.
  const back = () => setState({ stage: STAGES.START });
  keyHandler = (e) => {
    if (e.key === "Escape" && !/^(input|textarea|select)$/i.test(e.target.tagName)) back();
  };
  window.addEventListener("keydown", keyHandler);
}

export function unmount() {
  if (keyHandler) {
    window.removeEventListener("keydown", keyHandler);
    keyHandler = null;
  }
}
