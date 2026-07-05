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

export async function mount(root, opts = {}) {
  root.innerHTML = `
    <div class="stage-medium l-stack l-stack--8">
      <header class="page-header">
        <div class="eyebrow">Team</div>
        <h1 class="h1">Test engine</h1>
        <div class="text-ink-dim text-sm max-w-measure">
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
    thinkingHost.textContent = "Couldn't load personas — make sure the dev server is running.";
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

  wireCards(resultHost, personas);

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
      ${historyHtml(runs)}
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px;">
        ${runControls}
        <span class="js-cost text-ink-mute" style="font-size:var(--type-small,14px);">${canRun ? COST_LINE : ""}</span>
      </div>
      <div class="js-progress" style="font-size:var(--type-small,14px);color:var(--color-ink-dim,#4b5563);margin-top:8px;display:none;"></div>
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
    <div class="js-history" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:var(--type-small,14px);margin-top:6px;">
      <span class="text-ink-mute">Last run ${esc(fmtDate(lastRun.lastSeenAt))}</span>
      <span class="lib-badge lib-badge--${badge.tone}">${esc(badge.label)}</span>
      <button class="btn btn--ghost btn--sm js-see-result" data-run="${esc(lastRun.id)}">See result</button>
      ${compareBtn}
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
        <div style="font-size:var(--type-small,14px);">
          <strong>Free safety check</strong> <span class="text-ink-mute">(no AI)</span>
          — <span class="js-safety-summary text-ink-mute">checking…</span>
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
      summaryEl.textContent = "couldn't run the check — is the API running?";
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
          `<div style="font-size:var(--type-small,14px);color:var(--color-negative);">✗ ${esc(c.name || c.id)}${
            (c.reasons || []).length ? " — " + esc(c.reasons[0]) : ""
          }</div>`
      )
      .join("");
    opts?.refreshRegressionAlert?.(data); // keep the nav dot in sync, no extra fetch
    recheckBtn.disabled = false;
  }

  recheckBtn.addEventListener("click", check);
  await check();
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
