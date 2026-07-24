// Test engine — the persona hub. Browse the demo people Sero practises on, and
// RUN one: it drives the full engine end-to-end with that persona's scripted
// answers, then routes to the review screen so you can mark it. The same persona
// set powers the homepage demo dropdown and the Regression safety suite.
//
// Design-consolidation P6 (D2): the bench is a um-table of runnable rows; picking
// a row opens the right-hand panel with the scripted conversation, last result
// and the live run progress — no more inline dumps on the cards.

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
import { createSkeleton } from "../ui/skeleton.js";
import { Play, X, Check, Sparkles } from "lucide";
import "../styles/design/persona-bench.css";

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
        <div class="eyebrow">Build</div>
        <h1 class="h1">Test engine</h1>
        <div class="text-ink-dim max-w-measure">
          The demo people Sero practises on. Press <strong>Run</strong> on anyone to put the whole engine through its paces with their scripted answers, then review the result.
        </div>
      </header>
      <div class="safety-strip-host"></div>
      <div class="thinking-host min-h-[60px]"></div>
      <div class="result-host"></div>
    </div>
  `;

  mountSafetyStrip(root.querySelector(".safety-strip-host"), opts);

  const thinkingHost = root.querySelector(".thinking-host");
  thinkingHost.replaceChildren(createSkeleton(3)); // standard ghost cards while the bench loads
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

  // Finished runs per persona (newest first), for the last-run cell + verdict badge
  // + "compare with previous". Optional.
  let runsByPersona = new Map();
  try {
    runsByPersona = await loadRunsByPersona();
  } catch { /* last-run cell is best-effort */ }

  thinkingHost.remove();
  if (!personas.length) {
    resultHost.innerHTML = `<p class="text-ink-mute">No personas defined.</p>`;
    return;
  }

  let selectedId = null;
  let lastJob = null; // newest job state seen by the poller, repainted on re-select

  resultHost.innerHTML = `
    <div class="bench">
      <div class="um-table-wrap">
        <table class="um-table">
          <thead>
            <tr><th>Persona</th><th>Scenario</th><th>Last run</th><th class="um-actions-th"><span class="sr-only">Run</span></th></tr>
          </thead>
          <tbody>
            ${personas.map((p) => rowHtml(p, suiteIds.has(p.id), runsByPersona.get(p.id) || [])).join("")}
          </tbody>
        </table>
      </div>
      <aside class="bench__panel js-panel"></aside>
    </div>`;

  const panel = resultHost.querySelector(".js-panel");

  function personaById(id) {
    return personas.find((p) => p.id === id) || null;
  }

  function renderPanel() {
    const p = personaById(selectedId);
    if (!p) {
      panel.innerHTML = `
        <div class="card-flat l-stack l-stack--2">
          <div class="eyebrow">Persona</div>
          <p class="text-ink-dim text-sm">Pick a persona to see their scripted conversation and last result.</p>
        </div>`;
      return;
    }
    panel.innerHTML = panelHtml(p, runsByPersona.get(p.id) || []);
    wirePanel();
    // A live (or just-finished) run for this persona repaints its progress bar.
    if (lastJob && lastJob.personaId === p.id) paintProgress(lastJob);
  }

  function select(id) {
    selectedId = id;
    resultHost.querySelectorAll(".js-row").forEach((tr) =>
      tr.classList.toggle("is-selected", tr.dataset.persona === id));
    renderPanel();
  }

  // The review screen's breadcrumb points back here instead of Library when the
  // origin flag rides along (review-run.js consumes and clears it).
  const REVIEW_ORIGIN = { label: "Test engine", nav: "personas", stage: STAGES.PERSONAS };

  function wirePanel() {
    panel.querySelector(".js-see-result")?.addEventListener("click", (e) =>
      setState({ stage: STAGES.REVIEW_RUN, reviewRunId: e.currentTarget.dataset.run, reviewFrom: REVIEW_ORIGIN }));
    panel.querySelector(".js-compare")?.addEventListener("click", (e) =>
      setState({ stage: STAGES.COMPARE, compareA: e.currentTarget.dataset.a, compareB: e.currentTarget.dataset.b }));
  }

  resultHost.querySelector("tbody").addEventListener("click", (e) => {
    const runBtn = e.target.closest(".js-run");
    if (runBtn) {
      e.stopPropagation();
      select(runBtn.dataset.persona);
      onRun(runBtn.dataset.persona);
      return;
    }
    const row = e.target.closest(".js-row");
    if (row) select(row.dataset.persona);
  });

  renderPanel();

  async function onRun(personaId) {
    setRunningLock(true);
    paintProgress({ status: "running", stageLabel: "Starting session", personaId });
    try {
      await startPersonaRun(personaId);
    } catch (e) {
      const progress = panel.querySelector(".js-progress");
      if (progress) {
        progress.hidden = false;
        progress.innerHTML = `<span class="bench-status--bad text-sm">Couldn't start: ${esc(e.message)}</span>`;
      }
      setRunningLock(false);
      return;
    }
    startPolling();
  }

  // Every 2s: read the single active job and paint it onto the panel.
  function startPolling() {
    const tick = async () => {
      let job;
      try {
        job = await getPersonaRunCurrent();
      } catch {
        pollTimer = setTimeout(tick, 2000);
        return;
      }
      paintJob(job);
      if (job.status === "running") {
        pollTimer = setTimeout(tick, 2000);
      } else {
        pollTimer = null;
        setRunningLock(false);
      }
    };
    tick();
  }

  function paintJob(job) {
    lastJob = job;
    // Reopened mid-run with nothing picked yet: surface the running persona.
    if (!selectedId && job.personaId) { select(job.personaId); return; }
    if (job.personaId === selectedId) paintProgress(job);
  }

  function paintProgress(job) {
    const progress = panel.querySelector(".js-progress");
    if (!progress) return;
    progress.hidden = false;
    progress.innerHTML = runBarHtml(job);
    // The "Review it" button (done state) needs a live listener after innerHTML.
    progress.querySelector(".js-review-it")?.addEventListener("click", () =>
      setState({ stage: STAGES.REVIEW_RUN, reviewRunId: job.sessionId, reviewFrom: REVIEW_ORIGIN }));
  }

  // One run at a time: while a job is live, every Run button is disabled so a second
  // start can't be fired (the server also refuses it, this is just the honest UI).
  function setRunningLock(locked) {
    resultHost.querySelectorAll(".js-run").forEach((btn) => { btn.disabled = locked; });
  }

  // If a run is already going (e.g. the page was reopened mid-run), pick it up.
  try {
    const job = await getPersonaRunCurrent();
    if (job && job.status === "running") {
      setRunningLock(true);
      startPolling();
    }
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

function rowHtml(p, inSuite, runs) {
  const title = esc(p.displayName || p.name || p.id);
  const sub = [p.role, p.seniority].filter(Boolean).map(esc).join(" · ");
  const meta = [p.meeting_type, p.issue].filter(Boolean).map(esc).join(" · ");
  const suite = inSuite ? ` <span class="chip chip--mint bench-suite">in suite</span>` : "";
  const canRun = Array.isArray(p.script) && p.script.length > 0;
  const runCell = canRun
    ? `<button type="button" class="btn btn--sm js-run" data-persona="${esc(p.id)}">${icon(Play, { size: 16 })} Run</button>`
    : `<span class="text-ink-mute text-sm">No script</span>`;
  return `
    <tr class="um-row bench-row js-row" data-persona="${esc(p.id)}">
      <td>
        <button type="button" class="um-user__open">${title}</button>${suite}
        ${sub ? `<div class="text-ink-dim text-sm">${sub}</div>` : ""}
      </td>
      <td class="text-ink-dim">${meta || "–"}</td>
      <td>${lastRunCell(runs)}</td>
      <td class="um-actions">${runCell}</td>
    </tr>`;
}

function lastRunCell(runs) {
  if (!runs || !runs.length) return `<span class="text-ink-mute">–</span>`;
  const last = runs[0];
  const badge = libraryBadge(last.reviewStatus, last.overall);
  return `<span class="bench-last"><span class="text-ink-dim text-sm">${esc(fmtDate(last.lastSeenAt))}</span> <span class="lib-badge lib-badge--${badge.tone}">${esc(badge.label)}</span></span>`;
}

function panelHtml(p, runs) {
  const sub = [p.role, p.seniority].filter(Boolean).map(esc).join(" · ");
  const meta = [p.meeting_type, p.issue].filter(Boolean).map(esc).join(" · ");
  const script = Array.isArray(p.script) ? p.script : [];
  const canRun = script.length > 0;

  const costLine = canRun
    ? `<p class="text-ink-mute text-sm">${COST_LINE}</p>`
    : `<p class="text-ink-mute text-sm">No script. Can't run</p>`;

  let history = "";
  if (runs.length) {
    const last = runs[0];
    const badge = libraryBadge(last.reviewStatus, last.overall);
    const compareBtn = runs.length >= 2
      ? `<button type="button" class="btn btn--ghost btn--sm js-compare" data-a="${esc(runs[0].id)}" data-b="${esc(runs[1].id)}">Compare with previous run</button>`
      : "";
    history = `
      <div class="l-stack l-stack--2">
        <div class="eyebrow">Last run</div>
        <div class="bench-hist">
          <span class="text-ink-mute text-sm">${esc(fmtDate(last.lastSeenAt))}</span>
          <span class="lib-badge lib-badge--${badge.tone}">${esc(badge.label)}</span>
        </div>
        <div class="bench-hist__actions">
          <button type="button" class="btn btn--ghost btn--sm js-see-result" data-run="${esc(last.id)}">See result</button>
          ${compareBtn}
        </div>
      </div>`;
  }

  const transcript = script.length
    ? `<div class="l-stack l-stack--2">
        <div class="eyebrow">Scripted conversation · ${script.length} turns</div>
        <div class="bench-script">
          ${script.map((s) => `
            <div class="bench-turn">
              <div class="bench-turn__who">${esc(s.name || s.alias || "")}</div>
              <div class="bench-turn__text">${esc(s.answer || "")}</div>
            </div>`).join("")}
        </div>
      </div>`
    : "";

  return `
    <div class="card-flat l-stack l-stack--4">
      <div class="l-stack l-stack--1">
        <div class="eyebrow">Persona</div>
        <h2 class="h2">${esc(p.displayName || p.name || p.id)}</h2>
        ${sub ? `<div class="text-ink-dim">${sub}</div>` : ""}
        ${meta ? `<div class="text-ink-dim text-sm">${meta}</div>` : ""}
      </div>
      ${costLine}
      <div class="js-progress bench-progress" hidden></div>
      ${history}
      ${transcript}
    </div>`;
}

function fmtDate(ms) {
  // One date format everywhere (DESIGN.md rule 9) — shared, locale-proof.
  return formatDate(ms);
}

// The free safety check (no AI), lifted from the old Regression page as a compact
// strip: a one-line summary + Re-check + only the failing rows (a clean run stays
// quiet). Keeps the nav alert dot in sync via the injected callback.
async function mountSafetyStrip(host, opts) {
  if (!host) return;
  host.innerHTML = `
    <div class="card bench-safety">
      <div class="bench-safety__row">
        <div class="text-sm">
          <strong>Free safety check</strong> <span class="text-ink-mute">(no AI)</span>
         . <span class="js-safety-summary text-ink-mute">checking…</span>
        </div>
        <button class="btn btn--ghost btn--sm js-safety-recheck" type="button" disabled>Re-check</button>
      </div>
      <div class="js-safety-fails l-stack l-stack--2 bench-safety__fails"></div>
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
      (needs ? ` · <strong class="bench-safety__alert">${needs} need${needs === 1 ? "s" : ""} a look</strong>` : "") +
      (errs ? ` · ${errs} error` : "") +
      ` · last checked ${esc(new Date().toLocaleTimeString())}`;
    // Only the problem rows — a clean run stays quiet.
    const bad = cases.filter((c) => c.status !== "ok");
    failsEl.innerHTML = bad
      .map(
        (c) =>
          `<div class="bench-safety__fail text-sm">${icon(X, { size: 16 })} ${esc(c.name || c.id)}${
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
      `<span class="bench-status--good">${icon(Sparkles, { size: 16 })} Finished${esc(cost)}</span>` +
      (job.sessionId ? `<button type="button" class="btn btn--sm js-review-it">Review it</button>` : "");
  } else if (failed) {
    status = `<span class="bench-status--bad">Run failed: ${esc(job.error || "unknown error")}</span>`;
  } else {
    const turn = inInterview ? `. Question ${job.turn} of ${job.total}` : "";
    status = `<span class="text-ink-dim">${esc(job.stageLabel || "Working…")}${esc(turn)}</span>`;
  }

  return `
    <div class="run-bar" data-state="${done ? "done" : failed ? "failed" : "running"}">
      <div class="run-steps">${steps}</div>
      <div class="run-bar__track"><div class="run-bar__fill ${fillCls}" style="width:${pct.toFixed(1)}%;"></div></div>
      <div class="run-bar__status">${status}</div>
    </div>`;
}
