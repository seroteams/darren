// Operator guide (internal, for the founder/tester — dev-gated entry point).
// A single read-only reference for the whole project: how to run it, what each
// pipeline stage and screen does, the QA tooling, the core concepts, where things
// live on disk, and the known gaps. The Screens and Commands sections render LIVE
// from the heartbeat endpoint (the server re-reads the repo per request); the
// UPDATE button refreshes them and reports what changed since the last snapshot.
// Modeled on library.js: build innerHTML, Back + Esc -> Home, clean up on unmount.

import { STAGES, setState } from "../state.js";
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
  dev: "Web app for testing. API on :3001, Vite UI on :3000 (two processes).",
  up: "One-command dev launcher (scripts/dev.ps1).",
  build: "Production build (Vite). Then npm start serves it from one Node process.",
  start: "Serve the production build from one Node process.",
  cli: "Run the engine from the terminal.",
  test: "Unit + engine tests (scripts/run-tests.js).",
  typecheck: "TypeScript, no emit.",
  "typecheck:admin": "TypeScript for the UI, no emit.",
  lint: "ESLint over the repo.",
  smoke: "Scenario smoke tests.",
  eval: "Offline engine checks. Prompt rules + replay.",
  gate: "Full quality gate (needs API key).",
  replay: "Replay-regression check against saved runs.",
  sweep: "Full 5-type sweep (needs API key) → logs/sweeps/.",
  "db:generate": "Author Drizzle migrations.",
  "db:migrate": "Apply Drizzle migrations.",
  "rebuild-question-index": "Regenerate content/questions/_index.json (--prune).",
  "logs:purge": "Purge old run logs.",
  "autostart:install": "Install the Windows start-with-PC task.",
  "autostart:uninstall": "Remove the Windows start-with-PC task.",
};

const ENV = [
  ["OPENAI_API_KEY", "Required for every OpenAI stage."],
  ["GEMINI_API_KEY", "Used instead when a stage is pointed at a Gemini model."],
  ["OPENAI_MODEL", "Default model for all stages."],
  ["OPENAI_MODEL_<STAGE>", "Per-stage override: FOCUS_POINTS, PREPARATION, BANK, PLANNER, EVALUATION, JUDGE, FIXER, ROLE_PROFILE."],
  ["DATABASE_URL", "Postgres connection. Accounts, auth sessions, runs. Falls back to on-disk JSON if unset."],
  ["SUPERADMIN_EMAILS", "Allowlist for the cross-company superadmin views."],
  ["DEV_AUTOLOGIN", "Dev-only convenience login."],
  ["API_PORT", "API port. 3001 in dev."],
  ["PORT", "Fallback API port if API_PORT is unset (3000 in prod)."],
  ["NODE_ENV", "production makes npm start serve the built admin on one port."],
  ["SESSION_TTL_MS", "In-memory run-session expiry (default 2 hours)."],
  ["NO_COLOR", "Turns off colour in CLI output."],
];

const PIPELINE = [
  ["1", "Focus points", "Picks 2–5 topics worth raising.", "backend/engine/generate.ts · content/prompts/generate-focus-points.md"],
  ["2", "Preparation", "Pre-meeting brief: core issue, opening question, what to listen for, what to avoid, a good outcome, a suggested action.", "backend/engine/preparation.ts · content/prompts/preparation.md"],
  ["3", "Question bank", "8–12 tailored questions laid out along the meeting arc.", "backend/engine/question-generator.ts · content/prompts/generate-questions.md"],
  ["4", "Live planning + scoring", "Scores each answer on the four axes and re-plans the remaining questions every turn.", "backend/engine/queue-manager.ts · content/prompts/plan-turn.md"],
  ["5", "Final evaluation", "The briefing: headline, patterns, axes, the honest reads, next actions.", "backend/engine/reviewer.ts · content/prompts/final-evaluation.md"],
  ["6", "Lexicon review (optional)", "Suggests wording to fold into the lexicon for future questions.", "backend/engine/lexicon-reviewer.ts · content/prompts/review-session-for-lexicon.md"],
];

// The screen LIST + each description are read live from the heartbeat — the list
// is the real files in admin/src/stages/, the description is each file's own
// header comment. Only the grouping is curated here; a file the map doesn't know
// lands in "New screens — not yet grouped" so additions are impossible to miss.
const SCREEN_GROUPS = {
  "intake.js": "flow", "focus-points.js": "flow",
  "bank.js": "flow", "questioning.js": "flow",
  "eval.js": "flow", "briefing.js": "flow", "run-debrief.js": "flow",
  "lexicon-review.js": "flow",
  "login.js": "member", "register.js": "member", "member-home.js": "member",
  "team.ts": "member", "runs.ts": "member", "run-detail.ts": "member",
  "person-detail.ts": "member",
  "start.js": "admin", "library.js": "admin", "compare.js": "admin",
  "review-run.js": "admin", "personas.js": "admin",
  "meeting-arcs.js": "admin", "job-lexicons.js": "admin",
  "admin-registered.ts": "admin", "admin-user-detail.ts": "admin",
  "guide.js": "admin",
  "about.js": "shared", "feedback.js": "shared", "privacy.js": "shared", "error.ts": "shared",
};

const SCREEN_GROUP_ORDER = [
  ["new", "New screens. Not yet grouped"],
  ["flow", "The run flow"],
  ["member", "The member app"],
  ["admin", "Admin tooling"],
  ["shared", "Shared & utility"],
];

const NAV = [
  ["Left rail", "Brand mark + icon strip down the left edge; opens on hover. Admin sees the full toolset; a member sees just Home · Team · Past 1:1s."],
  ["Admin links", "Home · New session · Library · Compare runs · Regression · Personas · Coaching phrases · Role words · Meeting arcs · User management (Guide in dev only)."],
  ["Member links", "Home · Team · Past 1:1s."],
  ["Account footer", "What is Sero? · Send feedback · Privacy · Log out."],
  ["Session topbar", "Breadcrumb to review past stages mid-run."],
  ["Notes panel", "Your own notes, kept per stage, on the right."],
];

const API = [
  ["Auth", "POST /api/v1/auth/register · /login · /logout · GET /api/v1/auth/me. Cookie session (sero_session), passwords bcrypt-hashed."],
  ["Session & flow", "POST /api/v1/sessions · GET /api/v1/sessions/:id · /:id/question · /:id/suggest-answers · /:id/role-profile · /:id/preview · POST /:id/answer · /:id/back · /:id/notes · /:id/agenda/cover · /:id/verdict."],
  ["Streaming (SSE)", "GET /api/v1/sessions/:id/{focus-points,preparation,bank,plan,evaluation}/stream · POST /:id/focus-points/select."],
  ["Runs & review", "GET /api/v1/runs/{recent,finished,clonable} · /:id/{full,stages,overview} · POST /:id/review · /:id/archive · /runs/clone · DELETE /:id."],
  ["Members & team", "GET /api/v1/runs/mine · /runs/mine/:id · POST /runs/mine/:id/rating."],
  ["Lexicon", "GET /api/v1/sessions/:id/lexicon/{candidates,scope} · POST /:id/lexicon/decisions · GET /api/v1/lexicon/promotions/pending · POST /api/v1/lexicon/promotions."],
  ["Admin tooling", "GET /api/v1/arcs · /role-lexicons · /regression/run · POST /suggest-fix."],
  ["Superadmin", "GET /api/v1/admin/registered · /admin/users/:id/runs · /admin/runs/:id (SUPERADMIN_EMAILS-gated, read-only)."],
  ["Meta", "GET /api/version · /api/v1/meeting-types · /api/v1/personas · POST /api/v1/feedback."],
];

const QA = [
  ["Demo / scripted runs", "Home → pick a persona → Start demo session. Manual, or scripted replay of fixed answers."],
  ["Verdicts", "Keep / Fix / Block on a finished briefing (scripted runs), with an issue type + note. Saved as ground truth."],
  ["Per-run review", "The review page scores 8 dimensions + an overall verdict, saved to review.json."],
  ["Regression", "The /regression screen runs golden checks against saved runs; npm run gate / eval / replay do the same offline."],
  ["Library", "Filter all / unreviewed / keep / fix / block, search, open a review or copy the block."],
  ["Compare runs", "Same persona, different prompt versions, side by side."],
  ["suggest-fix", "Ask the model for a fix on a stage, given the run + your verdict."],
  ["QA prompt / Auto-QA", "Copy a ready-made review prompt, or drive the API per turn (not the browser) to replay a scripted persona plus your notes."],
];

const CONCEPTS = [
  ["Meeting types", "Bi-weekly check-in, Performance & feedback, Growth & career plan, Something feels off. Each with its own arc (stage sequence) and tone. Plus the guided Monthly Check-in runner. Onboarding check-in left the picker 2026-07-19 (old runs still resolve)."],
  ["The four axes", "Wellbeing, Engagement, Clarity, Growth. Range −10 to +10. Read by magnitude: ±0–1 weak, ±2–4 watch, ±5–7 real pattern (act), ±8–10 defining."],
  ["Question budget", "About 9 per run. ~4 opening (intro queue) + ~5 dynamic follow-ups. Caps stop over-drilling: drill cap, max 2 wellbeing clarifiers in a row, 1 tangent, and shallow-answer gating that zeroes positive deltas on ≤2-word answers."],
  ["Accounts & roles", "admin / manager / member. Manager = the end user who runs 1:1s; member = the managed; admin = internal (Carl). Accounts live in Postgres, gated per company."],
  ["Focus points & notes", "Focus points steer the question bank; the notes panel captures your own thoughts per stage."],
  ["Role profiles", "Cached per title + seniority context (backend/engine/role-profile.ts) so the pipeline doesn't re-derive the role each run."],
];

const FILES = [
  ["backend/engine/", "The pipeline + scoring: generate, preparation, question-generator, queue-manager, reviewer, lexicon, plus the shared ai-client and models."],
  ["backend/api/", "The HTTP server (server.ts) + one service folder per domain (services/<domain>/) and middleware/ (auth, v1 routing)."],
  ["backend/db/", "Postgres via Drizzle. Schema.ts (organizations, users, runs, invitations, authSessions) + migrations/."],
  ["admin/src/", "The web app. Stages/ (screens), ui/, state.js, router.js. Built to admin/dist/ for prod."],
  ["content/", "All the tunable data: prompts/, questions/, lexicons/, config/models.json, axes.json, focus-points.json, scenarios/, data/."],
  ["logs/<month>/<run-id>/", "One folder per run. Stage folders 00b-role-profile/, 01-focus-points/, 01b-preparation/, 04-dynamic-answers/, 05-evaluation/. Each with inputs.json, prompt.md, response.json."],
  ["…run root", "session-state.json, axis-state.json, transcript.json, pipeline-lock.json, and feedback.json once you leave a verdict."],
  ["content/config/models.json", "Which model each stage uses (persona-bench config sits alongside)."],
  ["content/data/openai-models.json", "Model pricing table for cost tracking."],
  ["scripts/", "One-off tooling: eval, gate, sweep, run-tests, rebuild-question-index, dev.ps1."],
  ["docs/", "Plans (docs/plans/doing/), trackers (STATUS.md, SERO_BOARD.md), reports. evals/ holds the golden dataset + replay fixtures."],
];

const GAPS = [
  "Quality gate is young. A golden dataset + scoreRun() gate exist (npm run gate, evals/golden, the /regression screen), but coverage is thin; most prompt changes are still checked by hand.",
  "Model drifts on hard rules. E.g. the drill cap is stated many times but still gets ignored; caught only by eye.",
  "Shallow-answer counting is a heuristic. A refused answer can flip a run into \"partial read\" mode.",
  "Web hardening. The new-session rate limit still trusts X-Forwarded-For (bypassable); there's no request-body size cap yet.",
  "Cost numbers under-report silently for any model missing from content/data/openai-models.json.",
  "Auth & DB are new. Postgres accounts + cookie sessions landed recently and are still pre-go-live: the invitations table is scaffolded and the superadmin views are read-only.",
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

const ARC_STYLE = `<style>
  .g-arc { padding:12px 0; border-bottom:1px solid var(--color-border); }
  .g-arc:last-child { border-bottom:none; }
  .g-arc__head { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .g-arc__meta { margin-left:auto; font-size:var(--type-body-sm); color:var(--color-ink-dim); }
  .g-arc__chips { display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-top:8px; }
  .g-arc-chip { font-size:var(--type-body-sm); font-weight:500; padding:3px 9px; border-radius:7px;
    background:var(--sero-soft-200); color:var(--color-ink); border:1px solid var(--color-border-strong); }
  .g-arc-sep { color:var(--color-ink-dim); }
  .g-arc-edited { font-size:var(--type-body-sm); font-weight:600; padding:2px 8px; border-radius:6px;
    background:var(--sero-gold-200); color:var(--sero-gold-800); }
  .g-arc-note { font-size:var(--type-body-sm); margin:0 0 12px; }
  .g-arc-note--err { color:var(--color-negative-text); }
  .js-sys-note:empty { display:none; }
  .sys-note { font-size:var(--type-body-sm); }
  .sys-note--ok, .sys-note--err { display:inline-block; padding:8px 13px; border-radius:10px;
    border:1px solid var(--color-border); background:var(--color-surface); }
  .sys-note--ok { color:var(--color-ink-dim); }
  .sys-note--err { color:var(--color-negative-text); border-color:var(--color-negative-text); }
  .sys-note--change { border:1px solid var(--color-border-strong); border-radius:10px;
    padding:12px 14px; background:var(--sero-soft-200); color:var(--color-ink); }
  .sys-note__title { font-weight:600; margin-bottom:6px; }
  .sys-note--change ul { margin:0; padding-left:18px; }
  .sys-note--change li { margin:3px 0; }
  .sys-note__meta { color:var(--color-ink-mute); }
  .sys-note code { font-family:ui-monospace, SFMono-Regular, Menlo, monospace; }
</style>`;

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
    ${ARC_STYLE}
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
          <button class="guide-btn js-sys-update" type="button">${REFRESH_ICON}<span class="js-btn-label">Check for changes</span></button>
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
        <p class="text-ink-mute">Loaded from <code>.env</code> at the repo root. Under the preview tools, keep the API on 3001 and run Vite-only on 3000.</p>
      </section>

      <section class="guide-section" id="g-pipeline">
        <h2 class="h2">The pipeline</h2>
        <p class="text-ink-dim">A run flows top to bottom. Each stage's model comes from <code>content/config/models.json</code> (keys: focus_points, preparation, bank, planner, evaluation), overridable per stage by env var. A cached role profile is derived first.</p>
        <div class="card-flat">${PIPELINE.map(([n, t, b, f]) => step(n, t, b, f)).join("")}</div>
      </section>

      <section class="guide-section" id="g-screens">
        <h2 class="h2">The screens</h2>
        <p class="text-ink-dim">Read live from <code>admin/src/stages/</code>. The list is the real files on disk and each description is the file's own header comment, so this section can't drift. A file added to the code lands under "New screens" until it's grouped.</p>
        <div class="js-screens-host l-stack l-stack--4"><p class="text-ink-mute text-sm">Loading from the codebase…</p></div>
        <div class="eyebrow">Getting around</div>
        <div class="card-flat">${NAV.map(([t, d]) => labelRow(t, d)).join("")}</div>
      </section>

      <section class="guide-section" id="g-api">
        <h2 class="h2">API</h2>
        <p class="text-ink-dim">What the client calls. Routes in <code>backend/api/server.ts</code>, handlers under <code>backend/api/services/&lt;domain&gt;/</code>. Every <code>/api/v1/</code> route has a legacy <code>/api/…</code> alias (id in the query string) kept so the admin is unaffected.</p>
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
