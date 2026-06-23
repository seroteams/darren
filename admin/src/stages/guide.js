// Operator guide (internal, for the founder/tester — dev-gated entry points).
// A single read-only reference for the whole project: how to run it, what each
// pipeline stage and screen does, the QA tooling, the core concepts, where things
// live on disk, and the known gaps. Static content, no API calls. Modeled on
// library.js: build innerHTML, Back button + Esc -> Home, clean up on unmount.

import { STAGES, setState } from "../state.js";

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
  ["files", "Where things live"],
  ["gaps", "Known gaps"],
];

const COMMANDS = [
  ["npm run dev", "Web app for testing — API on :3001, Vite UI on :3000."],
  ["npm run build && npm start", "Production build, served from one process."],
  ["npm test", "Unit + engine tests."],
  ["npm run lint", "ESLint over the repo."],
  ["npm run smoke", "Scenario smoke tests."],
  ["npm run eval", "Offline engine checks — prompt rules + replay."],
  ["npm run sweep", "Full 5-type sweep (needs API key) → logs/sweeps/."],
  ["npm run rebuild-question-index", "Regenerate questions/_index.json."],
];

const ENV = [
  ["OPENAI_API_KEY", "Required for every OpenAI stage."],
  ["GEMINI_API_KEY", "Used instead when a stage is pointed at a Gemini model."],
  ["OPENAI_MODEL", "Default model for all stages."],
  ["OPENAI_MODEL_<STAGE>", "Per-stage override: FOCUS_POINTS, PREPARATION, BANK, PLANNER, EVALUATION."],
  ["API_PORT", "API port — 3001 in dev."],
  ["PORT", "Fallback API port if API_PORT is unset (3000 in prod)."],
  ["NODE_ENV", "production makes npm start serve the built UI on one port."],
  ["SESSION_TTL_MS", "Web-session expiry (default 2 hours)."],
  ["NO_COLOR", "Turns off colour in CLI output."],
];

const PIPELINE = [
  ["1", "Focus points", "Picks 2–5 topics worth raising.", "src/generate.js · prompts/generate-focus-points.md"],
  ["2", "Preparation", "Pre-meeting brief: core issue, opening question, what to listen for, what to avoid, a good outcome, a suggested action.", "src/preparation.js · prompts/preparation.md"],
  ["3", "Question bank", "8–12 tailored questions laid out along the meeting arc.", "src/question-generator.js · prompts/generate-questions.md"],
  ["4", "Live planning + scoring", "Scores each answer on the four axes and re-plans the remaining questions every turn.", "src/queue-manager.js · prompts/plan-turn.md"],
  ["5", "Final evaluation", "The briefing: headline, patterns, axes, the honest reads, next actions.", "src/reviewer.js · prompts/final-evaluation.md"],
  ["6", "Lexicon review (optional)", "Suggests wording to fold into the lexicon for future questions.", "src/lexicon/review-core.js · prompts/review-session-for-lexicon.md"],
];

const SCREENS = [
  ["start.js", "Home — recent runs, persona-bench demo launcher, resume/delete."],
  ["intake.js", "New session form: name → role → seniority → meeting type → notes."],
  ["focus-points.js", "Shows the focus points; you choose which to keep."],
  ["preparation.js", "Streams the pre-meeting brief."],
  ["bank.js", "Streams the question bank, then hands to the conversation."],
  ["questioning.js", "Live Q&A loop — jot answers, axes update live."],
  ["eval.js", "Streams the final synthesis."],
  ["briefing.js", "The final briefing; verdict capture on scripted runs."],
  ["run-debrief.js", "Post-run stats; copy the QA prompt."],
  ["lexicon-review.js", "Accept or reject phrase candidates."],
  ["compare.js", "Two runs side by side."],
  ["library.js", "Every finished run — filter, search, review."],
  ["review-run.js", "8-dimension Keep/Fix/Block review of one run."],
  ["error.js", "Error screen with retry."],
];

const NAV = [
  ["Top nav", "Home · New session · Compare runs · Phrase library (Guide shows in dev only)."],
  ["Home buttons", "New session · Library · Compare runs (Guide in dev)."],
  ["Demo picker", "On Home — pick a persona, choose manual or scripted, start a demo run."],
  ["Session topbar", "Breadcrumb to review past stages mid-run."],
  ["Notes panel", "Your own notes, kept per stage, on the right."],
];

const API = [
  ["Session & flow", "POST /api/start · GET /api/session · GET /api/question · GET /api/suggest-answers · POST /api/answer · POST /api/notes · POST /api/agenda/cover"],
  ["Streaming (SSE)", "GET /api/focus-points/stream · /preparation/stream · /bank/stream · /plan/stream · /evaluation/stream · POST /api/focus-points/select"],
  ["Runs & review", "GET /api/runs/recent · /finished · /:id/full · /:id/overview · DELETE /api/runs/:id · POST /api/runs/:id/review · POST /api/verdict · POST /api/suggest-fix"],
  ["Lexicon", "GET /api/lexicon/candidates · /scope · /promote/pending · POST /api/lexicon/decisions · /promote"],
  ["Meta", "GET /api/meeting-types · /api/persona-bench · /api/pipeline/status · /api/pipeline/manifest"],
];

const QA = [
  ["Demo / scripted runs", "Home → pick a persona → Start demo session. Manual, or scripted replay of fixed answers."],
  ["Verdicts", "Keep / Fix / Block on a finished briefing (scripted runs), with an issue type + note. Saved as ground truth."],
  ["Per-run review", "The review page scores 8 dimensions + an overall verdict, saved to review.json."],
  ["Library", "Filter all / unreviewed / keep / fix / block, search, open a review or copy the block."],
  ["Compare runs", "Same persona, different prompt versions, side by side."],
  ["suggest-fix", "Ask the model for a fix on a stage, given the run + your verdict."],
  ["QA prompt", "Copy a ready-made prompt to review the run's notes with Claude."],
  ["Auto-QA", "Drive the API per turn (not the browser) to replay a scripted persona plus your per-question notes."],
];

const CONCEPTS = [
  ["Meeting types", "Bi-weekly check-in, Performance & feedback, Growth & career plan, Something feels off, Onboarding check-in. Each has its own arc (stage sequence) and tone."],
  ["The four axes", "Wellbeing, Engagement, Clarity, Growth — range −10 to +10. Read by magnitude: ±0–1 weak, ±2–4 watch, ±5–7 real pattern (act), ±8–10 defining."],
  ["Question budget", "About 9 per run — ~4 opening (intro queue) + ~5 dynamic follow-ups. Caps stop over-drilling: drill cap, max 2 wellbeing clarifiers in a row, 1 tangent, and shallow-answer gating that zeroes positive deltas on ≤2-word answers."],
  ["Focus points & notes", "Focus points steer the question bank; the notes panel captures your own thoughts per stage."],
];

const FILES = [
  ["logs/<month>/<run-id>/", "One folder per run. Stage folders 01-focus-points/, 01b-preparation/, 03-question-bank/, 04-dynamic-answers/, 05-evaluation/ — each with inputs.json, prompt.md, response.json (04 holds NN-turn.json per answer)."],
  ["…run root", "session-state.json, pipeline-lock.json, transcript.json, axis-state.json, notes.md, review.html, and feedback.json once you leave a verdict."],
  ["questions/", "Question library — YAML files, _intro/ seeds, _index.json."],
  ["lexicons/<role>/<seniority>.yaml", "Canonical lexicons; pending ones under _candidates/."],
  ["config/models.json", "Which model each stage uses (persona-bench config sits alongside)."],
  ["axes.json", "Axis definitions + seeds."],
  ["prompts/", "Every prompt the pipeline sends."],
  ["scripts/", "One-off tooling: eval, sweep, run-tests, rebuild-question-index."],
  ["data/openai-models.json", "Model pricing table for cost tracking."],
];

const GAPS = [
  "No quality regression gate — prompt changes are checked against text, not model behaviour.",
  "Model drifts on hard rules — e.g. the drill cap is stated many times but still gets ignored; caught only by hand.",
  "Shallow-answer counting is a heuristic — a refused answer can flip a run into \"partial read\" mode.",
  "Engine bugs to verify — empty signature silently zeroes scoring; shared-object mutation in queue helpers; JSON shape checks are incomplete.",
  "Web hardening — the new-session rate limit trusts X-Forwarded-For (bypassable); also watch debug logging and the missing request-body size cap.",
  "Cost numbers under-report silently for any model missing from the pricing table.",
  "Accessibility — the accent on white is ~2.5:1 contrast, below the 4.5:1 target.",
  "Tier-1 next step — build a golden dataset + a scoreRun() regression gate.",
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

export function mount(root) {
  root.innerHTML = `
    <div class="stage-medium l-stack l-stack--8 guide">
      <header class="page-header">
        <div class="page-header__row">
          <h1 class="h1">Sero — operator guide</h1>
          <button class="btn btn--ghost js-back" type="button">Back</button>
        </div>
        <div class="page-header__lede">Your map of the whole project — how to run it, what each part does, and where things live. Internal, just for you.</div>
        <nav class="guide-toc">
          ${TOC.map(([id, label]) => `<a href="#g-${id}">${esc(label)}</a>`).join("")}
        </nav>
      </header>

      <section class="guide-section" id="g-run">
        <h2 class="h2">Run it</h2>
        <div class="card-flat">${COMMANDS.map(([c, d]) => ref(c, d)).join("")}</div>
        <div class="eyebrow">Environment</div>
        <div class="card-flat">${ENV.map(([c, d]) => ref(c, d)).join("")}</div>
        <p class="text-ink-mute text-sm">Under the preview tools, keep the API on 3001 and run Vite-only on 3000.</p>
      </section>

      <section class="guide-section" id="g-pipeline">
        <h2 class="h2">The pipeline</h2>
        <p class="text-ink-dim text-sm">A run flows top to bottom. Each stage's model comes from <code>config/models.json</code> (keys: focus_points, preparation, bank, planner, evaluation), overridable per stage by env var.</p>
        <div class="card-flat">${PIPELINE.map(([n, t, b, f]) => step(n, t, b, f)).join("")}</div>
      </section>

      <section class="guide-section" id="g-screens">
        <h2 class="h2">The screens</h2>
        <p class="text-ink-dim text-sm">Each screen is a stage module in <code>frontend/client/src/stages/</code>.</p>
        <div class="card-flat">${SCREENS.map(([c, d]) => ref(c, d)).join("")}</div>
        <div class="eyebrow">Getting around</div>
        <div class="card-flat">${NAV.map(([t, d]) => labelRow(t, d)).join("")}</div>
      </section>

      <section class="guide-section" id="g-api">
        <h2 class="h2">API</h2>
        <p class="text-ink-dim text-sm">What the client calls. Routes in <code>frontend/server/server.js</code>, handlers in <code>frontend/server/handlers/</code>.</p>
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

      <section class="guide-section" id="g-files">
        <h2 class="h2">Where things live</h2>
        <div class="card-flat">${FILES.map(([c, d]) => ref(c, d)).join("")}</div>
      </section>

      <section class="guide-section" id="g-gaps">
        <h2 class="h2">Known gaps</h2>
        <p class="text-ink-dim text-sm">From <code>plans/AUDIT.md</code> — what to keep an eye on.</p>
        <div class="card-flat"><ul class="guide-gaps">${GAPS.map((g) => `<li>${esc(g)}</li>`).join("")}</ul></div>
      </section>
    </div>
  `;

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
