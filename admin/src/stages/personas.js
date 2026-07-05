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

const COST_LINE =
  "Runs the full engine with this persona's scripted answers. Costs about $0.35 in AI and takes 1–2 minutes.";

let pollTimer = null;

export function unmount() {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}

export async function mount(root) {
  root.innerHTML = `
    <div class="stage-medium l-stack l-stack--8">
      <header class="page-header">
        <div class="eyebrow">Team</div>
        <h1 class="h1">Test engine</h1>
        <div class="text-ink-dim text-sm max-w-measure">
          The demo people Sero practises on. Press <strong>Run</strong> on anyone to put the whole engine through its paces with their scripted answers, then review the result.
        </div>
      </header>
      <div class="thinking-host min-h-[60px] flex items-center text-ink-mute">Loading personas…</div>
      <div class="result-host l-stack l-stack--3"></div>
    </div>
  `;

  const thinkingHost = root.querySelector(".thinking-host");
  const resultHost = root.querySelector(".result-host");

  let personas = [];
  try {
    const res = await getPersonaBench();
    personas = Array.isArray(res) ? res : res.personas || [];
  } catch (e) {
    console.warn("[personas] fetch failed:", e);
    thinkingHost.textContent = "Couldn't load personas — make sure the dev server is running.";
    return;
  }

  // Which personas are also in the regression suite (cross-link badge). Optional.
  let suiteIds = new Set();
  try {
    const reg = await runRegression();
    suiteIds = new Set((reg.cases || []).map((c) => c.id));
  } catch { /* badge is best-effort */ }

  // Last finished run per persona, for the history line + verdict badge. Optional.
  let lastRunByPersona = new Map();
  try {
    lastRunByPersona = await loadLastRunByPersona();
  } catch { /* history line is best-effort */ }

  thinkingHost.remove();
  if (!personas.length) {
    resultHost.innerHTML = `<p class="text-ink-mute">No personas defined.</p>`;
    return;
  }
  resultHost.innerHTML = personas
    .map((p) => cardHtml(p, suiteIds.has(p.id), lastRunByPersona.get(p.id)))
    .join("");

  wireCards(resultHost, personas);

  // If a run is already going (e.g. the page was reopened mid-run), pick it up.
  try {
    const job = await getPersonaRunCurrent();
    if (job && job.status === "running") startPolling(resultHost);
  } catch { /* nothing running / not reachable */ }
}

// Newest finished run per persona id, from the org's finished runs (which now
// carry personaId + review badge inputs). Manual runs (no personaId) are ignored.
async function loadLastRunByPersona() {
  const res = await getFinishedRuns();
  const runs = Array.isArray(res.runs) ? res.runs : [];
  const byPersona = new Map();
  for (const r of runs) {
    if (!r || !r.personaId) continue;
    const prev = byPersona.get(r.personaId);
    if (!prev || (r.lastSeenAt || 0) > (prev.lastSeenAt || 0)) byPersona.set(r.personaId, r);
  }
  return byPersona;
}

function cardHtml(p, inSuite, lastRun) {
  const title = esc(p.displayName || p.name || p.id);
  const sub = [p.role, p.seniority].filter(Boolean).map(esc).join(" · ");
  const meta = [p.meeting_type, p.issue].filter(Boolean).map(esc).join(" · ");
  const badge = inSuite
    ? `<span style="font-size:var(--type-small,14px);color:var(--color-positive);background:var(--sero-success-light);border-radius:999px;padding:1px 9px;margin-left:8px;white-space:nowrap;">in regression suite</span>`
    : "";
  const script = Array.isArray(p.script) ? p.script : [];
  const scriptHtml = script.length
    ? `<details style="margin-top:8px;">
         <summary style="cursor:pointer;font-size:var(--type-small,14px);color:var(--color-ink-mute,#6b7280);">View the scripted conversation (${script.length} turns)</summary>
         <div class="l-stack l-stack--2" style="margin-top:8px;">
           ${script
             .map(
               (s) =>
                 `<div style="font-size:var(--type-small,14px);"><div style="color:var(--color-ink-mute,#6b7280);">${esc(s.name || s.alias || "")}</div><div>${esc(s.answer || "")}</div></div>`
             )
             .join("")}
         </div>
       </details>`
    : "";

  const canRun = script.length > 0;
  const runControls = canRun
    ? `<button class="btn js-run" data-persona="${esc(p.id)}" style="white-space:nowrap;">▶ Run</button>`
    : `<span class="text-ink-mute" style="font-size:var(--type-small,14px);">No script — can't run</span>`;

  return `
    <div class="card js-card" data-persona="${esc(p.id)}" style="padding:0.85rem 1.1rem;">
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap;">
        <div style="font-weight:500;">${title}${badge}</div>
        <div style="font-size:var(--type-small,14px);color:var(--color-ink-mute,#6b7280);">${sub}</div>
      </div>
      <div style="font-size:var(--type-small,14px);color:var(--color-ink-dim,#4b5563);margin-top:2px;">${meta}</div>
      ${historyHtml(lastRun)}
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px;">
        ${runControls}
        <span class="js-cost text-ink-mute" style="font-size:var(--type-small,14px);">${canRun ? COST_LINE : ""}</span>
      </div>
      <div class="js-progress" style="font-size:var(--type-small,14px);color:var(--color-ink-dim,#4b5563);margin-top:8px;display:none;"></div>
      ${scriptHtml}
    </div>`;
}

// The last-run line: date + verdict badge + a link into the review screen.
function historyHtml(lastRun) {
  if (!lastRun) return "";
  const badge = libraryBadge(lastRun.reviewStatus, lastRun.overall);
  return `
    <div class="js-history" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:var(--type-small,14px);margin-top:6px;">
      <span class="text-ink-mute">Last run ${esc(fmtDate(lastRun.lastSeenAt))}</span>
      <span class="lib-badge lib-badge--${badge.tone}">${esc(badge.label)}</span>
      <button class="btn btn--ghost btn--sm js-see-result" data-run="${esc(lastRun.id)}">See result</button>
    </div>`;
}

function fmtDate(ms) {
  if (!ms) return "";
  try {
    return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function wireCards(resultHost, personas) {
  resultHost.querySelectorAll(".js-run").forEach((btn) => {
    btn.addEventListener("click", () => onRun(resultHost, btn.dataset.persona, personas));
  });
  resultHost.querySelectorAll(".js-see-result").forEach((btn) => {
    btn.addEventListener("click", () => setState({ stage: STAGES.REVIEW_RUN, reviewRunId: btn.dataset.run }));
  });
}

async function onRun(resultHost, personaId, personas) {
  setRunningLock(resultHost, true);
  const card = resultHost.querySelector(`.js-card[data-persona="${cssEscape(personaId)}"]`);
  const progress = card?.querySelector(".js-progress");
  if (progress) {
    progress.style.display = "block";
    progress.textContent = "Starting…";
  }
  try {
    await startPersonaRun(personaId);
  } catch (e) {
    if (progress) progress.textContent = `Couldn't start: ${e.message}`;
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

  if (job.status === "running") {
    const turn = job.turn && job.total ? ` — question ${job.turn} of ${job.total}` : "";
    progress.textContent = `Running: ${job.stageLabel || "…"}${turn}`;
  } else if (job.status === "done") {
    const cost = typeof job.costUsd === "number" ? ` (about $${job.costUsd.toFixed(2)} in AI)` : "";
    progress.innerHTML = `<span style="color:var(--color-positive);">Finished${esc(cost)}.</span> `;
    if (job.sessionId) {
      const link = document.createElement("button");
      link.className = "btn btn--sm";
      link.style.marginLeft = "6px";
      link.textContent = "Review it";
      link.addEventListener("click", () =>
        setState({ stage: STAGES.REVIEW_RUN, reviewRunId: job.sessionId })
      );
      progress.appendChild(link);
    }
  } else if (job.status === "failed") {
    progress.innerHTML = `<span style="color:var(--color-negative);">Run failed: ${esc(job.error || "unknown error")}</span>`;
  }
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
