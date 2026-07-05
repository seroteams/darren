// Operator guide (internal, for the founder/tester — dev-gated entry point).
// A single read-only reference for the whole project: how to run it, what each
// pipeline stage and screen does, the QA tooling, the core concepts, where things
// live on disk, and the known gaps. Static content, no API calls. Modeled on
// library.js: build innerHTML, Back button + Esc -> Home, clean up on unmount.

import { STAGES, setState } from "../state.js";
import { getArcs, getVersion, getMeetingTypes } from "../../../shared/api.js";

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

const COMMANDS = [
  ["npm run dev", "Web app for testing — API on :3001, Vite UI on :3000 (two processes)."],
  ["npm run up", "One-command dev launcher (scripts/dev.ps1)."],
  ["npm run build && npm start", "Production build (Vite) served from one Node process."],
  ["npm test", "Unit + engine tests (scripts/run-tests.js)."],
  ["npm run typecheck", "TypeScript, no emit (typecheck:admin for the UI)."],
  ["npm run lint", "ESLint over the repo."],
  ["npm run smoke", "Scenario smoke tests."],
  ["npm run eval", "Offline engine checks — prompt rules + replay."],
  ["npm run gate", "Full quality gate (needs API key)."],
  ["npm run replay", "Replay-regression check against saved runs."],
  ["npm run sweep", "Full 5-type sweep (needs API key) → logs/sweeps/."],
  ["npm run db:migrate", "Apply Drizzle migrations (db:generate to author them)."],
  ["npm run rebuild-question-index", "Regenerate content/questions/_index.json (--prune)."],
];

const ENV = [
  ["OPENAI_API_KEY", "Required for every OpenAI stage."],
  ["GEMINI_API_KEY", "Used instead when a stage is pointed at a Gemini model."],
  ["OPENAI_MODEL", "Default model for all stages."],
  ["OPENAI_MODEL_<STAGE>", "Per-stage override: FOCUS_POINTS, PREPARATION, BANK, PLANNER, EVALUATION, JUDGE, FIXER, ROLE_PROFILE."],
  ["DATABASE_URL", "Postgres connection — accounts, auth sessions, runs. Falls back to on-disk JSON if unset."],
  ["SUPERADMIN_EMAILS", "Allowlist for the cross-company superadmin views."],
  ["DEV_AUTOLOGIN", "Dev-only convenience login."],
  ["API_PORT", "API port — 3001 in dev."],
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

const SCREENS_FLOW = [
  ["intake.js", "New session form: name → role → seniority → meeting type → notes."],
  ["onepage.js", "Single-page flow variant of a run."],
  ["focus-points.js", "Shows the focus points; you choose which to keep."],
  ["preparation.js", "Streams the pre-meeting brief."],
  ["bank.js", "Streams the question bank, then hands to the conversation."],
  ["questioning.js", "Live Q&A loop — jot answers, axes update live."],
  ["eval.js", "Streams the final synthesis."],
  ["briefing.js", "The final briefing; verdict capture on scripted runs."],
  ["run-debrief.js", "Post-run stats; copy the QA prompt."],
  ["lexicon-review.js", "Accept or reject phrase candidates."],
];

const SCREENS_MEMBER = [
  ["login.js · register.js", "Sign in / create an account."],
  ["member-home.js", "A member's own landing page."],
  ["team.js", "Team — the people you run 1:1s with (auto-built from your runs)."],
  ["runs.ts", "Past 1:1s — your own finished runs."],
  ["run-detail.ts", "One of your own runs, opened read-only."],
  ["person-detail.ts", "One person's page — their history across 1:1s."],
];

const SCREENS_ADMIN = [
  ["start.js", "Home (admin) — recent runs, persona-bench demo launcher, resume/delete."],
  ["library.js", "Every finished run — filter, search, review."],
  ["compare.js", "Two runs side by side."],
  ["review-run.js", "8-dimension Keep/Fix/Block review of one run."],
  ["regression.js", "Regression dashboard — golden checks against saved runs."],
  ["personas.js", "Persona bench — the demo personas."],
  ["meeting-arcs.js", "Edit the meeting arcs (each type's stage sequence)."],
  ["job-lexicons.js", "Role words — the per-role lexicon editor."],
  ["tasks.js", "Prototype → Production build board."],
  ["universe.ts", "3D live map of the app (admin-only eye candy)."],
  ["admin-registered.ts · admin-user-detail.ts", "User management — cross-company view (superadmin only)."],
  ["guide.js", "This page (dev only)."],
];

const SCREENS_SHARED = [
  ["about.js", "\"What is Sero?\" one-pager."],
  ["feedback.js", "Send-feedback form (stored locally)."],
  ["privacy.js", "Privacy note."],
  ["error.ts", "Error screen with retry."],
];

const NAV = [
  ["Left rail", "Brand mark + icon strip down the left edge; opens on hover. Admin sees the full toolset; a member sees just Home · Team · Past 1:1s."],
  ["Admin links", "Home · New session · Library · Compare runs · Regression · Personas · Coaching phrases · Role words · Meeting arcs · Tasks · Universe · User management (Guide in dev only)."],
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
  ["Members & team", "GET /api/v1/runs/mine · /runs/mine/:id · POST /runs/mine/:id/rating · GET /api/v1/team/aliases · POST /api/v1/team/{merge,rename}."],
  ["Lexicon", "GET /api/v1/sessions/:id/lexicon/{candidates,scope} · POST /:id/lexicon/decisions · GET /api/v1/lexicon/promotions/pending · POST /api/v1/lexicon/promotions."],
  ["Admin tooling", "GET /api/v1/arcs · /role-lexicons · /pipeline/{status,manifest} · /regression/run · POST /checks/run · /suggest-fix."],
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
  ["Meeting types", "Bi-weekly check-in, Performance & feedback, Growth & career plan, Something feels off, Onboarding check-in. Each has its own arc (stage sequence) and tone."],
  ["The four axes", "Wellbeing, Engagement, Clarity, Growth — range −10 to +10. Read by magnitude: ±0–1 weak, ±2–4 watch, ±5–7 real pattern (act), ±8–10 defining."],
  ["Question budget", "About 9 per run — ~4 opening (intro queue) + ~5 dynamic follow-ups. Caps stop over-drilling: drill cap, max 2 wellbeing clarifiers in a row, 1 tangent, and shallow-answer gating that zeroes positive deltas on ≤2-word answers."],
  ["Accounts & roles", "admin / manager / member. Manager = the end user who runs 1:1s; member = the managed; admin = internal (Carl). Accounts live in Postgres, gated per company."],
  ["Focus points & notes", "Focus points steer the question bank; the notes panel captures your own thoughts per stage."],
  ["Role profiles", "Cached per title + seniority context (backend/engine/role-profile.ts) so the pipeline doesn't re-derive the role each run."],
];

const FILES = [
  ["backend/engine/", "The pipeline + scoring: generate, preparation, question-generator, queue-manager, reviewer, lexicon, plus the shared ai-client and models."],
  ["backend/api/", "The HTTP server (server.ts) + one service folder per domain (services/<domain>/) and middleware/ (auth, v1 routing)."],
  ["backend/db/", "Postgres via Drizzle — schema.ts (organizations, users, runs, invitations, authSessions) + migrations/."],
  ["admin/src/", "The web app — stages/ (screens), ui/, state.js, router.js. Built to admin/dist/ for prod."],
  ["content/", "All the tunable data: prompts/, questions/, lexicons/, config/models.json, axes.json, focus-points.json, scenarios/, data/."],
  ["logs/<month>/<run-id>/", "One folder per run. Stage folders 00b-role-profile/, 01-focus-points/, 01b-preparation/, 04-dynamic-answers/, 05-evaluation/ — each with inputs.json, prompt.md, response.json."],
  ["…run root", "session-state.json, axis-state.json, transcript.json, pipeline-lock.json, and feedback.json once you leave a verdict."],
  ["content/config/models.json", "Which model each stage uses (persona-bench config sits alongside)."],
  ["content/data/openai-models.json", "Model pricing table for cost tracking."],
  ["scripts/", "One-off tooling: eval, gate, sweep, run-tests, rebuild-question-index, dev.ps1."],
  ["docs/", "Plans (docs/todo/), trackers (STATUS.md, SERO_BOARD.md), reports. evals/ holds the golden dataset + replay fixtures."],
];

const GAPS = [
  "Quality gate is young — a golden dataset + scoreRun() gate exist (npm run gate, evals/golden, the /regression screen), but coverage is thin; most prompt changes are still checked by hand.",
  "Model drifts on hard rules — e.g. the drill cap is stated many times but still gets ignored; caught only by eye.",
  "Shallow-answer counting is a heuristic — a refused answer can flip a run into \"partial read\" mode.",
  "Web hardening — the new-session rate limit still trusts X-Forwarded-For (bypassable); there's no request-body size cap yet.",
  "Cost numbers under-report silently for any model missing from content/data/openai-models.json.",
  "Auth & DB are new — Postgres accounts + cookie sessions landed recently and are still pre-go-live: the invitations table is scaffolded and the superadmin views are read-only.",
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
  return `<div class="card l-stack l-stack--2"><h3 class="h3">${esc(title)}</h3><p class="text-ink-dim text-sm">${esc(body)}</p></div>`;
}

// ---------- live meeting arcs (UPDATE button) ----------
// The arcs can be edited anywhere in the system, so this section pulls them live
// instead of hand-listing them. UPDATE fetches the current arcs, diffs them against
// the last snapshot (kept in localStorage), shows what changed, then saves the new
// snapshot so the next check has a baseline.

const ARC_SNAP_KEY = "seroGuideArcsSnapshot";

// Refresh glyph for the check/update pills.
const REFRESH_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>`;

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
  .g-arc-bar { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
  .g-arc-status { font-size:var(--type-body-sm); color:var(--color-ink-mute); }
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
  .g-arc-note--ok { color:var(--color-ink-dim); }
  .g-arc-note--err { color:var(--sero-rose-700, #b4232a); }
  .g-arc-note--change { border:1px solid var(--color-border-strong); border-radius:10px;
    padding:12px 14px; background:var(--sero-soft-200); }
  .g-arc-note__title { font-weight:600; margin-bottom:6px; }
  .g-arc-note--change ul { margin:0; padding-left:18px; }
  .g-arc-note--change li { margin:3px 0; }
  .js-sys-note:empty { display:none; }
  .sys-note { font-size:var(--type-body-sm); }
  .sys-note--ok, .sys-note--err { display:inline-block; padding:8px 13px; border-radius:10px;
    border:1px solid var(--color-border); background:var(--color-surface); }
  .sys-note--ok { color:var(--color-ink-dim); }
  .sys-note--err { color:var(--sero-rose-700, #b4232a); border-color:var(--sero-rose-700, #b4232a); }
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

function diffArcs(oldArr, newArr) {
  const oldBy = new Map(oldArr.map((a) => [a.slug, a]));
  const newBy = new Map(newArr.map((a) => [a.slug, a]));
  const added = newArr.filter((a) => !oldBy.has(a.slug)).map((a) => a.label);
  const removed = oldArr.filter((a) => !newBy.has(a.slug)).map((a) => a.label);
  const changed = [];
  const seq = (a) => a.phases.map((p) => p.id).join(" → ");
  for (const a of newArr) {
    const b = oldBy.get(a.slug);
    if (!b) continue;
    const notes = [];
    if (a.label !== b.label) notes.push("name");
    if (seq(a) !== seq(b)) notes.push("phase order/set");
    else if (JSON.stringify(a.phases) !== JSON.stringify(b.phases)) notes.push("phase details");
    if ((a.tone || "") !== (b.tone || "")) notes.push("tone");
    if (JSON.stringify(a.anti) !== JSON.stringify(b.anti)) notes.push("anti-patterns");
    if (notes.length) changed.push({ label: a.label, notes });
  }
  return { added, removed, changed };
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

function changesHtml(diff, hadBaseline) {
  if (!hadBaseline) return `<p class="g-arc-note g-arc-note--ok">First check — saved a snapshot. The next UPDATE will show what changed.</p>`;
  const { added, removed, changed } = diff;
  if (!added.length && !removed.length && !changed.length) {
    return `<p class="g-arc-note g-arc-note--ok">No changes since your last check.</p>`;
  }
  const items = [];
  if (added.length) items.push(`<li><strong>Added:</strong> ${added.map(esc).join(", ")}</li>`);
  if (removed.length) items.push(`<li><strong>Removed:</strong> ${removed.map(esc).join(", ")}</li>`);
  for (const c of changed) items.push(`<li><strong>${esc(c.label)}</strong> — ${c.notes.map(esc).join(", ")} changed</li>`);
  return `<div class="g-arc-note g-arc-note--change">
      <div class="g-arc-note__title">Changed since your last check</div>
      <ul>${items.join("")}</ul>
    </div>`;
}

function readArcSnap() {
  try {
    return JSON.parse(localStorage.getItem(ARC_SNAP_KEY) || "null");
  } catch {
    return null;
  }
}

function writeArcSnap(arcs) {
  try {
    localStorage.setItem(ARC_SNAP_KEY, JSON.stringify({ at: new Date().toISOString(), arcs }));
  } catch {
    /* storage full/blocked — the button still works, it just won't diff next time */
  }
}

function wireArcs(root) {
  const host = root.querySelector(".js-arcs-host");
  const status = root.querySelector(".js-arcs-status");
  const btn = root.querySelector(".js-arcs-update");
  if (!host || !btn) return;

  const showStatus = (snap) => {
    status.textContent = snap?.at ? `Last checked ${shortWhen(snap.at)}` : "Not checked yet.";
  };

  const initial = readArcSnap();
  if (initial?.arcs?.length) host.innerHTML = initial.arcs.map(arcRowHtml).join("");
  showStatus(initial);

  btn.addEventListener("click", async () => {
    setBtnBusy(btn, true, "Checking…");
    try {
      const res = await getArcs();
      const live = (Array.isArray(res?.arcs) ? res.arcs : []).map(normalizeArc);
      const snap = readArcSnap();
      const diff = diffArcs(snap?.arcs || [], live);
      host.innerHTML = changesHtml(diff, Boolean(snap?.arcs?.length)) + live.map(arcRowHtml).join("");
      writeArcSnap(live);
      showStatus(readArcSnap());
    } catch (e) {
      host.innerHTML = `<p class="g-arc-note g-arc-note--err">Couldn't reach the arcs — is the API running? (${esc(e?.message || "error")})</p>`;
    } finally {
      setBtnBusy(btn, false, "Update arcs");
    }
  });
}

// ---------- system check (page-level "Check for changes") ----------
// The guide is mostly hand-written, so it drifts. This checks the parts the API
// can report live — the running build (git SHA), the meeting types, and the
// meeting arcs — against the last snapshot (localStorage) and says what moved.

const SYS_SNAP_KEY = "seroGuideSystemSnapshot";

async function readSystem() {
  const [ver, mt, arcRes] = await Promise.all([
    getVersion().catch(() => null),
    getMeetingTypes().catch(() => null),
    getArcs().catch(() => null),
  ]);
  const arcs = (Array.isArray(arcRes?.arcs) ? arcRes.arcs : [])
    .map(normalizeArc)
    .map((a) => ({ slug: a.slug, label: a.label, seq: a.phases.map((p) => p.id).join(" → ") }));
  return {
    build: ver?.build || "unknown",
    types: (Array.isArray(mt?.types) ? mt.types : []).map((t) => t.label).filter(Boolean).sort(),
    arcs,
  };
}

function diffSystem(oldS, now) {
  const lines = [];
  if (oldS.build !== now.build) {
    lines.push(`Build <code>${esc(oldS.build)}</code> → <code>${esc(now.build)}</code> — the running server is on new code.`);
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
      const prev = readSysSnap();
      if (!prev?.sys) {
        note.innerHTML = `<div class="sys-note sys-note--ok">First check — saved a snapshot of the build, meeting types and arcs. The next check will show what moved. <span class="sys-note__meta">Build ${esc(now.build)}.</span></div>`;
      } else {
        const lines = diffSystem(prev.sys, now);
        note.innerHTML = lines.length
          ? `<div class="sys-note sys-note--change"><div class="sys-note__title">Changed since your last check</div><ul>${lines.map((l) => `<li>${l}</li>`).join("")}</ul></div>`
          : `<div class="sys-note sys-note--ok">No changes since your last check. <span class="sys-note__meta">Build ${esc(now.build)}.</span></div>`;
      }
      writeSysSnap(now);
      showStatus(readSysSnap());
    } catch (e) {
      note.innerHTML = `<div class="sys-note sys-note--err">Couldn't reach the API — is it running? (${esc(e?.message || "error")})</div>`;
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
          <h1 class="h1">Sero — operator guide</h1>
          <button class="btn btn--ghost js-back" type="button">Back</button>
        </div>
        <div class="page-header__lede">Your map of the whole project — how to run it, what each part does, and where things live. Internal, just for you.</div>
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
        <div class="card-flat">${COMMANDS.map(([c, d]) => ref(c, d)).join("")}</div>
        <div class="eyebrow">Environment</div>
        <div class="card-flat">${ENV.map(([c, d]) => ref(c, d)).join("")}</div>
        <p class="text-ink-mute text-sm">Loaded from <code>.env</code> at the repo root. Under the preview tools, keep the API on 3001 and run Vite-only on 3000.</p>
      </section>

      <section class="guide-section" id="g-pipeline">
        <h2 class="h2">The pipeline</h2>
        <p class="text-ink-dim text-sm">A run flows top to bottom. Each stage's model comes from <code>content/config/models.json</code> (keys: focus_points, preparation, bank, planner, evaluation), overridable per stage by env var. A cached role profile is derived first.</p>
        <div class="card-flat">${PIPELINE.map(([n, t, b, f]) => step(n, t, b, f)).join("")}</div>
      </section>

      <section class="guide-section" id="g-screens">
        <h2 class="h2">The screens</h2>
        <p class="text-ink-dim text-sm">Each screen is a stage module in <code>admin/src/stages/</code>, wired to a URL in <code>router.js</code>.</p>
        <div class="eyebrow">The run flow</div>
        <div class="card-flat">${SCREENS_FLOW.map(([c, d]) => ref(c, d)).join("")}</div>
        <div class="eyebrow">The member app</div>
        <div class="card-flat">${SCREENS_MEMBER.map(([c, d]) => ref(c, d)).join("")}</div>
        <div class="eyebrow">Admin tooling</div>
        <div class="card-flat">${SCREENS_ADMIN.map(([c, d]) => ref(c, d)).join("")}</div>
        <div class="eyebrow">Shared &amp; utility</div>
        <div class="card-flat">${SCREENS_SHARED.map(([c, d]) => ref(c, d)).join("")}</div>
        <div class="eyebrow">Getting around</div>
        <div class="card-flat">${NAV.map(([t, d]) => labelRow(t, d)).join("")}</div>
      </section>

      <section class="guide-section" id="g-api">
        <h2 class="h2">API</h2>
        <p class="text-ink-dim text-sm">What the client calls. Routes in <code>backend/api/server.ts</code>, handlers under <code>backend/api/services/&lt;domain&gt;/</code>. Every <code>/api/v1/</code> route has a legacy <code>/api/…</code> alias (id in the query string) kept so the admin is unaffected.</p>
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
        <p class="text-ink-dim text-sm">Pulled live from the system — not hand-written, so it can't go stale. Hit <strong>UPDATE</strong> to fetch the current arcs and see what's changed since your last check. Edit them on the <code>Meeting arcs</code> screen.</p>
        <div class="g-arc-bar">
          <button class="guide-btn js-arcs-update" type="button">${REFRESH_ICON}<span class="js-btn-label">Update arcs</span></button>
          <span class="g-arc-status js-arcs-status"></span>
        </div>
        <div class="card-flat js-arcs-host"><p class="text-ink-mute text-sm">Click UPDATE to load the current meeting arcs.</p></div>
      </section>

      <section class="guide-section" id="g-files">
        <h2 class="h2">Where things live</h2>
        <div class="card-flat">${FILES.map(([c, d]) => ref(c, d)).join("")}</div>
      </section>

      <section class="guide-section" id="g-gaps">
        <h2 class="h2">Known gaps</h2>
        <p class="text-ink-dim text-sm">What to keep an eye on.</p>
        <div class="card-flat"><ul class="guide-gaps">${GAPS.map((g) => `<li>${esc(g)}</li>`).join("")}</ul></div>
      </section>
    </div>
  `;

  wireArcs(root);
  wireSystemCheck(root);

  const back = () => setState({ stage: STAGES.START });
  root.querySelector(".js-back").addEventListener("click", back);
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
