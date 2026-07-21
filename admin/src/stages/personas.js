// Test engine — the persona hub. Browse the demo people Sero practises on, and
// RUN one: it drives the full engine end-to-end with that persona's scripted
// answers, then routes to the review screen so you can mark it. The same persona
// set powers the homepage demo dropdown and the Regression safety suite.

import { STAGES, setState } from "../state.js";
import {
  getPersonaBench,
  runRegression,
  getFinishedRuns,
  startPersonaRun,
  getPersonaRunCurrent,
} from "../../../shared/api.js";
import { libraryBadge } from "../ui/review-serialize.js";
import { escapeHtml as esc } from "../ui/html.js";
import { formatDate } from "../ui/time.ts";
import { icon } from "../ui/icon.js";
import { Play, X, Check, Sparkles } from "lucide";

const COST_LINE =
  "Runs the full engine with this persona's scripted answers. Costs about $0.35 in AI and takes 1–2 minutes.";

// The engine stages, in the order the runner drives them — the staged progress bar
// lights these up one by one. Kept plain-language (not the internal stage names).
const RUN_STEPS = ["Setup", "Focus", "Prep", "Interview", "Recap"];

// Map the runner's live stageLabel onto a step index. The labels come from
// persona-runs.runner.ts: "Starting session" / "Role profile" → Setup, then
// "Focus points", "Preparation", "Questions", "Final briefing".
function runStageIndex(label) {
  const l = String(label || "").toLowerCase();
  if (l.includes("brief")) return 4;
  if (l.includes("question")) return 3;
  if (l.includes("prep")) return 2;
  if (l.includes("focus")) return 1;
  return 0; // starting / role profile
}

let pollTimer = null;

export function unmount() {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}

export async function mount(root, opts = {}) {
  root.innerHTML = `
    <div class="stage-medium l-stack l-stack--8">
      <header class="page-header">
        <div class="eyebrow">Team</div>
        <h1 class="h1">Test engine</h1>
        <div class="text-ink-dim max-w-measure">
          The demo people Sero practises on. Press <strong>Run</strong> on anyone to put the whole engine through its paces with their scripted answers, then review the result.
        </div>
      </header>
      <div class="safety-strip-host"></div>
      <div class="thinking-host min-h-[60px] flex items-center text-ink-mute">Loading personas…</div>
      <div class="result-host l-stack l-stack--3"></div>
    </div>
  `;

  mountSafetyStrip(root.querySelector(".safety-strip-host"), opts);

  const thinkingHost = root.querySelector(".thinking-host");
  const resultHost = root.querySelector(".result-host");

  let personas = [];
  try {
    const res = await getPersonaBench();
    personas = Array.isArray(res) ? res : res.personas || [];
  } catch (e) {
    console.warn("[personas] fetch failed:", e);
    thinkingHost.textContent = "Couldn't load personas. Make sure the dev server is running.";
    return;
  }

  // Which personas are also in the regression suite (cross-link badge). Optional.
  let suiteIds = new Set();
  try {
    const reg = await runRegression();
    suiteIds = new Set((reg.cases || []).map((c) => c.id));
  } catch { /* badge is best-effort */ }

  // Finished runs per persona (newest first), for the history line + verdict badge
  // + "compare with previous". Optional.
  let runsByPersona = new Map();
  try {
    runsByPersona = await loadRunsByPersona();
  } catch { /* history line is best-effort */ }

  thinkingHost.remove();
  if (!personas.length) {
    resultHost.innerHTML = `<p class="text-ink-mute">No personas defined.</p>`;
    return;
  }
  resultHost.innerHTML = personas
    .map((p) => cardHtml(p, suiteIds.has(p.id), runsByPersona.get(p.id) || []))
    .join("");

  wireCards(resultHost);

  // If a run is already going (e.g. the page was reopened mid-run), pick it up.
  try {
    const job = await getPersonaRunCurrent();
    if (job && job.status === "running") startPolling(resultHost);
  } catch { /* nothing running / not reachable */ }
}

// Finished runs grouped by persona id (newest first), from the org's finished
// runs (which now carry personaId + review badge inputs). Manual runs (no
// personaId) are ignored.
async function loadRunsByPersona() {
  const res = await getFinishedRuns();
  const runs = Array.isArray(res.runs) ? res.runs : [];
  const byPersona = new Map();
  for (const r of runs) {
    if (!r || !r.personaId) continue;
    const list = byPersona.get(r.personaId) || [];
    list.push(r);
    byPersona.set(r.personaId, list);
  }
  for (const list of byPersona.values()) list.sort((a, b) => (b.lastSeenAt || 0) - (a.lastSeenAt || 0));
  return byPersona;
}

function cardHtml(p, inSuite, runs) {
  const title = esc(p.displayName || p.name || p.id);
  const sub = [p.role, p.seniority].filter(Boolean).map(esc).join(" · ");
  const meta = [p.meeting_type, p.issue].filter(Boolean).map(esc).join(" · ");
  const badge = inSuite
    ? `<span style="font-size:var(--type-small);color:var(--color-positive);background:var(--sero-success-light);border-radius:999px;padding:1px 9px;margin-left:8px;white-space:nowrap;">in regression suite</span>`
    : "";
  const script = Array.isArray(p.script) ? p.script : [];
  const scriptHtml = script.length
    ? `<details style="margin-top:8px;">
         <summary style="cursor:pointer;font-size:var(--type-small);color:var(--color-ink-mute);">View the scripted conversation (${script.length} turns)</summary>
         <div class="l-stack l-stack--2" style="margin-top:8px;">
           ${script
             .map(
               (s) =>
                 `<div style="font-size:var(--type-small);"><div style="color:var(--color-ink-mute);">${esc(s.name || s.alias || "")}</div><div>${esc(s.answer || "")}</div></div>`
             )
             .join("")}
         </div>
       </details>`
    : "";

  const canRun = script.length > 0;
  const runControls = canRun
    ? `<button class="btn js-run" data-persona="${esc(p.id)}" style="white-space:nowrap;">${icon(Play, { size: 16 })} Run</button>`
    : `<span class="text-ink-mute" style="font-size:var(--type-small);">No script. Can't run</span>`;

  return `
    <div class="card js-card" data-persona="${esc(p.id)}" style="padding:0.85rem 1.1rem;">
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap;">
        <div style="font-weight:500;">${title}${badge}</div>
        <div style="font-size:var(--type-small);color:var(--color-ink-mute);">${sub}</div>
      </div>
      <div style="font-size:var(--type-small);color:var(--color-ink-dim);margin-top:2px;">${meta}</div>
      ${historyHtml(runs)}
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px;">
        ${runControls}
        <span class="js-cost text-ink-mute" style="font-size:var(--type-small);">${canRun ? COST_LINE : ""}</span>
      </div>
      <div class="js-progress" style="font-size:var(--type-small);color:var(--color-ink-dim);margin-top:8px;display:none;"></div>
      ${scriptHtml}
    </div>`;
}

// The last-run line: date + verdict badge + a link into the review screen, and —
// when the persona has 2+ runs — a link into Compare, pre-loaded with the two
// newest side by side.
function historyHtml(runs) {
  if (!runs || !runs.length) return "";
  const lastRun = runs[0];
  const badge = libraryBadge(lastRun.reviewStatus, lastRun.overall);
  const compareBtn =
    runs.length >= 2
      ? `<button class="btn btn--ghost btn--sm js-compare" data-a="${esc(runs[0].id)}" data-b="${esc(runs[1].id)}">Compare with previous run</button>`
      : "";
  return `
    <div class="js-history" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:var(--type-small);margin-top:6px;">
      <span class="text-ink-mute">Last run ${esc(fmtDate(lastRun.lastSeenAt))}</span>
      <span class="lib-badge lib-badge--${badge.tone}">${esc(badge.label)}</span>
      <button class="btn btn--ghost btn--sm js-see-result" data-run="${esc(lastRun.id)}">See result</button>
      ${compareBtn}
    </div>`;
}

function fmtDate(ms) {
  // One date format everywhere (DESIGN.md rule 9) — shared, locale-proof.
  return formatDate(ms);
}

function wireCards(resultHost) {
  resultHost.querySelectorAll(".js-run").forEach((btn) => {
    btn.addEventListener("click", () => onRun(resultHost, btn.dataset.persona));
  });
  resultHost.querySelectorAll(".js-see-result").forEach((btn) => {
    btn.addEventListener("click", () => setState({ stage: STAGES.REVIEW_RUN, reviewRunId: btn.dataset.run }));
  });
  resultHost.querySelectorAll(".js-compare").forEach((btn) => {
    btn.addEventListener("click", () =>
      setState({ stage: STAGES.COMPARE, compareA: btn.dataset.a, compareB: btn.dataset.b })
    );
  });
}

// The free safety check (no AI), lifted from the old Regression page as a compact
// strip: a one-line summary + Re-check + only the failing rows (a clean run stays
// quiet). Keeps the nav alert dot in sync via the injected callback.
async function mountSafetyStrip(host, opts) {
  if (!host) return;
  host.innerHTML = `
    <div class="card" style="padding:0.6rem 0.9rem;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
        <div style="font-size:var(--type-small);">
          <strong>Free safety check</strong> <span class="text-ink-mute">(no AI)</span>
         . <span class="js-safety-summary text-ink-mute">checking…</span>
        </div>
        <button class="btn btn--ghost btn--sm js-safety-recheck" type="button" disabled>Re-check</button>
      </div>
      <div class="js-safety-fails l-stack l-stack--2" style="margin-top:6px;"></div>
    </div>`;

  const summaryEl = host.querySelector(".js-safety-summary");
  const recheckBtn = host.querySelector(".js-safety-recheck");
  const failsEl = host.querySelector(".js-safety-fails");

  async function check() {
    recheckBtn.disabled = true;
    summaryEl.textContent = "checking…";
    let data;
    try {
      data = await runRegression();
    } catch {
      summaryEl.textContent = "couldn't run the check. Is the API running?";
      recheckBtn.disabled = false;
      return;
    }
    const s = data?.summary || {};
    const cases = Array.isArray(data?.cases) ? data.cases : [];
    const needs = s.regressed || 0;
    const errs = s.error || 0;
    summaryEl.innerHTML =
      `${s.ok || 0} still good` +
      (needs ? ` · <strong style="color:var(--color-negative);">${needs} need${needs === 1 ? "s" : ""} a look</strong>` : "") +
      (errs ? ` · ${errs} error` : "") +
      ` · last checked ${esc(new Date().toLocaleTimeString())}`;
    // Only the problem rows — a clean run stays quiet.
    const bad = cases.filter((c) => c.status !== "ok");
    failsEl.innerHTML = bad
      .map(
        (c) =>
          `<div style="font-size:var(--type-small);color:var(--color-negative);">${icon(X, { size: 16 })} ${esc(c.name || c.id)}${
            (c.reasons || []).length ? ": " + esc(c.reasons[0]) : ""
          }</div>`
      )
      .join("");
    opts?.refreshRegressionAlert?.(data); // keep the nav dot in sync, no extra fetch
    recheckBtn.disabled = false;
  }

  recheckBtn.addEventListener("click", check);
  await check();
}

async function onRun(resultHost, personaId) {
  setRunningLock(resultHost, true);
  const card = resultHost.querySelector(`.js-card[data-persona="${cssEscape(personaId)}"]`);
  const progress = card?.querySelector(".js-progress");
  if (progress) {
    progress.style.display = "block";
    progress.innerHTML = runBarHtml({ status: "running", stageLabel: "Starting session" });
  }
  try {
    await startPersonaRun(personaId);
  } catch (e) {
    if (progress) progress.innerHTML = `<span style="color:var(--color-negative);font-size:var(--type-small);">Couldn't start: ${esc(e.message)}</span>`;
    setRunningLock(resultHost, false);
    return;
  }
  startPolling(resultHost);
}

// Every 2s: read the single active job and paint it onto the matching card.
function startPolling(resultHost) {
  const tick = async () => {
    let job;
    try {
      job = await getPersonaRunCurrent();
    } catch {
      pollTimer = setTimeout(tick, 2000);
      return;
    }
    paintJob(resultHost, job);
    if (job.status === "running") {
      pollTimer = setTimeout(tick, 2000);
    } else {
      pollTimer = null;
      setRunningLock(resultHost, false);
    }
  };
  tick();
}

function paintJob(resultHost, job) {
  const card = resultHost.querySelector(`.js-card[data-persona="${cssEscape(job.personaId || "")}"]`);
  const progress = card?.querySelector(".js-progress");
  if (!progress) return;
  progress.style.display = "block";
  progress.innerHTML = runBarHtml(job);
  // The "Review it" button (done state) needs a live listener after innerHTML.
  const reviewBtn = progress.querySelector(".js-review-it");
  if (reviewBtn) {
    reviewBtn.addEventListener("click", () =>
      setState({ stage: STAGES.REVIEW_RUN, reviewRunId: job.sessionId })
    );
  }
}

// The staged progress bar: a row of steps that light up as the engine advances,
// a fill track (shimmering while live, mint on finish), and a status line. During
// the Interview step the fill grows question by question, so it never looks stuck.
function runBarHtml(job) {
  const running = job.status === "running";
  const done = job.status === "done";
  const failed = job.status === "failed";

  const current = done ? RUN_STEPS.length : runStageIndex(job.stageLabel);
  const inInterview = running && current === 3 && job.turn && job.total;
  const withinFrac = inInterview ? Math.min(1, job.turn / job.total) : 0;
  const pct = done
    ? 100
    : failed
      ? (current / RUN_STEPS.length) * 100
      : Math.max(5, ((current + withinFrac) / RUN_STEPS.length) * 100);

  const steps = RUN_STEPS.map((label, i) => {
    let cls = "run-step--todo";
    let glyph = String(i + 1);
    if (done || i < current) {
      cls = "run-step--done";
      glyph = icon(Check, { size: 16 });
    } else if (failed && i === current) {
      cls = "run-step--failed";
      glyph = "!";
    } else if (running && i === current) {
      cls = "run-step--active";
    }
    return `<div class="run-step ${cls}"><span class="run-step__dot">${glyph}</span><span class="run-step__label">${esc(label)}</span></div>`;
  }).join("");

  const fillCls = done ? "run-bar__fill--done" : failed ? "run-bar__fill--failed" : "run-bar__fill--running";

  let status;
  if (done) {
    const cost = typeof job.costUsd === "number" ? ` · about $${job.costUsd.toFixed(2)} in AI` : "";
    status =
      `<span style="color:var(--color-positive);font-weight:500;">${icon(Sparkles, { size: 16 })} Finished${esc(cost)}</span>` +
      (job.sessionId ? `<button class="btn btn--sm js-review-it" style="margin-left:8px;">Review it</button>` : "");
  } else if (failed) {
    status = `<span style="color:var(--color-negative);">Run failed: ${esc(job.error || "unknown error")}</span>`;
  } else {
    const turn = inInterview ? `. Question ${job.turn} of ${job.total}` : "";
    status = `<span class="text-ink-dim">${esc(job.stageLabel || "Working…")}${esc(turn)}</span>`;
  }

  return `
    <div class="run-bar" data-state="${done ? "done" : failed ? "failed" : "running"}">
      <div class="run-steps">${steps}</div>
      <div class="run-bar__track"><div class="run-bar__fill ${fillCls}" style="width:${pct.toFixed(1)}%;"></div></div>
      <div class="run-bar__status" style="margin-top:6px;">${status}</div>
    </div>`;
}

// One run at a time: while a job is live, every Run button is disabled so a second
// start can't be fired (the server also refuses it, this is just the honest UI).
function setRunningLock(resultHost, locked) {
  resultHost.querySelectorAll(".js-run").forEach((btn) => {
    btn.disabled = locked;
    btn.style.opacity = locked ? "0.5" : "";
    btn.style.cursor = locked ? "not-allowed" : "";
  });
}

// Persona ids are simple slugs, but guard the selector anyway.
function cssEscape(v) {
  return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(v) : String(v).replace(/"/g, '\\"');
}
